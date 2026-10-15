<?php
declare(strict_types=1);

/**
 * ZORA — Criação / Finalização de Pedido
 */

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Vary: Origin');

// Lista de origens permitidas
$origensPermitidas = [
    'https://loja-zora.onrender.com',
    'http://localhost:3000',
    'http://localhost:8080'
];

$origem = $_SERVER['HTTP_ORIGIN'] ?? null;
$origemPermitida = ($origem !== null && in_array($origem, $origensPermitidas, true)) || $origem === null;

if ($origem !== null && !$origemPermitida) {
    http_response_code(403);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Origem não autorizada.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($origem !== null && $origemPermitida) {
    header('Access-Control-Allow-Origin: ' . $origem);
} else {
    header('Access-Control-Allow-Origin: https://loja-zora.onrender.com');
}

header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Tratamento de Preflight CORS (OPTIONS)
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Suporte a HTTPS no Proxy Reverso do Render
$httpsDireto = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== '' &&
    strtolower((string) $_SERVER['HTTPS']) !== 'off';
$protoEncaminhado = strtolower(trim(explode(',', (string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ''))[0]));
$isHttps = $httpsDireto || $protoEncaminhado === 'https';

if ($isHttps) {
    $_SERVER['HTTPS'] = 'on';
}

if (session_status() !== PHP_SESSION_ACTIVE) {
    ini_set('session.use_only_cookies', '1');
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_trans_sid', '0');

    session_set_cookie_params([
        'lifetime' => 86400,
        'path' => '/',
        'secure' => $isHttps,
        'httponly' => true,
        'samesite' => $isHttps ? 'None' : 'Lax',
    ]);

    session_start();
}

// Carregar conexão com o banco de dados
$caminhoConexao = file_exists(__DIR__ . '/src/conexao.php')
    ? __DIR__ . '/src/conexao.php'
    : __DIR__ . '/conexao.php';

if (!is_file($caminhoConexao)) {
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_write_close();
    }
    http_response_code(500);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Erro interno de configuração do banco de dados.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once $caminhoConexao;

try {
    if (!isset($conexao) || !($conexao instanceof PDO)) {
        throw new RuntimeException('A conexão PDO não foi inicializada corretamente.');
    }

    // =====================================================
    // VERIFICAR MÉTODO HTTP
    // =====================================================

    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        header('Allow: POST, OPTIONS');
        http_response_code(405);
        echo json_encode([
            'sucesso' => false,
            'mensagem' => 'Método não permitido. Utilize POST.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // =====================================================
    // VERIFICAR LOGIN
    // =====================================================

    $idSessao = $_SESSION['id_cliente'] ?? null;

    if (!is_scalar($idSessao) || (int) $idSessao <= 0) {
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_write_close();
        }

        http_response_code(401);
        echo json_encode([
            'sucesso' => false,
            'mensagem' => 'Sua sessão expirou. Faça login novamente.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $idCliente = (int) $idSessao;
    session_write_close();

    // =====================================================
    // RECEBER DADOS
    // =====================================================

    $conteudo = (string) file_get_contents('php://input');
    $dados = json_decode($conteudo, true);

    if (!is_array($dados)) {
        http_response_code(400);
        throw new Exception('Dados do pedido inválidos.');
    }

    $itensBrutos = $dados['itens'] ?? [];

    if (!is_array($itensBrutos) || empty($itensBrutos)) {
        http_response_code(400);
        throw new Exception('O pedido não possui produtos.');
    }

    // Agrupa itens duplicados se o mesmo id_produto for enviado mais de uma vez
    $itensConsolidados = [];
    foreach ($itensBrutos as $item) {
        $idProd = (int) ($item['id_produto'] ?? 0);
        $qtd = (int) ($item['quantidade'] ?? 0);

        if ($idProd <= 0 || $qtd <= 0) {
            http_response_code(400);
            throw new Exception('Produto ou quantidade inválida no pedido.');
        }

        if (!isset($itensConsolidados[$idProd])) {
            $itensConsolidados[$idProd] = 0;
        }
        $itensConsolidados[$idProd] += $qtd;
    }

    // =====================================================
    // INICIAR TRANSAÇÃO
    // =====================================================

    $conexao->beginTransaction();

    // =====================================================
    // BUSCAR PRODUTOS NO BANCO (FOR UPDATE)
    // =====================================================

    $sqlProduto = '
        SELECT
            id_produto,
            nm_produto,
            preco,
            qtd_item
        FROM produto
        WHERE id_produto = :id_produto
        FOR UPDATE
    ';

    $stmtProduto = $conexao->prepare($sqlProduto);

    $itensValidados = [];
    $valorTotal = 0.0;

    foreach ($itensConsolidados as $idProduto => $quantidade) {
        $stmtProduto->execute([':id_produto' => $idProduto]);
        $produto = $stmtProduto->fetch(PDO::FETCH_ASSOC);

        if (!$produto) {
            throw new Exception("Produto de ID {$idProduto} não foi encontrado.");
        }

        $nomeProduto = $produto['nm_produto'];
        $preco = (float) $produto['preco'];
        $estoque = (int) $produto['qtd_item'];

        if ($estoque <= 0) {
            throw new Exception('O produto "' . $nomeProduto . '" está sem estoque.');
        }

        if ($quantidade > $estoque) {
            throw new Exception(
                'Estoque insuficiente para "' . $nomeProduto . '". Disponível: ' . $estoque . '.'
            );
        }

        $subtotal = $preco * $quantidade;
        $valorTotal += $subtotal;

        $itensValidados[] = [
            'id_produto' => $idProduto,
            'nome'       => $nomeProduto,
            'quantidade' => $quantidade,
            'preco'      => $preco,
            'subtotal'   => $subtotal
        ];
    }

    // =====================================================
    // CRIAR REGISTRO NA TABELA PEDIDO
    // =====================================================

    $sqlPedido = "
        INSERT INTO pedido
        (
            id_cliente,
            data_pedido,
            valor_total,
            status
        )
        VALUES
        (
            :id_cliente,
            CURRENT_TIMESTAMP,
            :valor_total,
            'Pendente'
        )
        RETURNING id_pedido
    ";

    $stmtPedido = $conexao->prepare($sqlPedido);
    $stmtPedido->execute([
        ':id_cliente'  => $idCliente,
        ':valor_total' => round($valorTotal, 2)
    ]);

    $idPedido = $stmtPedido->fetchColumn();

    if (!$idPedido) {
        throw new Exception('Não foi possível gerar o pedido no banco de dados.');
    }

    // =====================================================
    // INSERIR ITENS + ATUALIZAR ESTOQUE
    // =====================================================

    $sqlItem = '
        INSERT INTO item_pedido
        (
            id_pedido,
            id_produto,
            quantidade,
            preco_unitario,
            subtotal
        )
        VALUES
        (
            :id_pedido,
            :id_produto,
            :quantidade,
            :preco_unitario,
            :subtotal
        )
    ';

    $stmtItem = $conexao->prepare($sqlItem);

    $sqlEstoque = '
        UPDATE produto
        SET qtd_item = qtd_item - :quantidade
        WHERE id_produto = :id_produto
    ';

    $stmtEstoque = $conexao->prepare($sqlEstoque);

    foreach ($itensValidados as $item) {
        $stmtItem->execute([
            ':id_pedido'      => $idPedido,
            ':id_produto'     => $item['id_produto'],
            ':quantidade'     => $item['quantidade'],
            ':preco_unitario' => $item['preco'],
            ':subtotal'       => $item['subtotal']
        ]);

        $stmtEstoque->execute([
            ':quantidade' => $item['quantidade'],
            ':id_produto' => $item['id_produto']
        ]);
    }

    // =====================================================
    // CONFIRMAR TRANSAÇÃO
    // =====================================================

    $conexao->commit();

    http_response_code(200);
    echo json_encode([
        'sucesso'     => true,
        'mensagem'    => 'Pedido realizado com sucesso!',
        'id_pedido'   => (int) $idPedido,
        'valor_total' => round($valorTotal, 2)
    ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);

} catch (Throwable $erro) {
    if (isset($conexao) && $conexao instanceof PDO && $conexao->inTransaction()) {
        $conexao->rollBack();
    }

    if (http_response_code() === 200) {
        http_response_code(400);
    }

    echo json_encode([
        'sucesso'  => false,
        'mensagem' => $erro->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
