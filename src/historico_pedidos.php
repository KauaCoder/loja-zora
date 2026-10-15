<?php
declare(strict_types=1);

/**
 * ZORA — Histórico de Pedidos do Cliente
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
header('Access-Control-Allow-Methods: GET, OPTIONS');
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

    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
        header('Allow: GET, OPTIONS');
        http_response_code(405);
        echo json_encode([
            'sucesso' => false,
            'mensagem' => 'Método não permitido. Utilize GET.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $idSessao = $_SESSION['id_cliente'] ?? null;

    if (!is_scalar($idSessao) || (int) $idSessao <= 0) {
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_write_close();
        }

        http_response_code(401);
        echo json_encode([
            'sucesso' => false,
            'mensagem' => 'Usuário não está logado.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $idCliente = (int) $idSessao;
    session_write_close();

    // Consulta otimizada unindo Pedidos, Itens e Produtos
    $sql = '
        SELECT
            p.id_pedido,
            p.data_pedido,
            p.valor_total,
            p.status,
            ip.id_item_pedido,
            ip.id_produto,
            ip.quantidade,
            ip.preco_unitario,
            ip.subtotal,
            prod.nm_produto,
            prod.imagem
        FROM pedido p
        LEFT JOIN item_pedido ip ON ip.id_pedido = p.id_pedido
        LEFT JOIN produto prod ON prod.id_produto = ip.id_produto
        WHERE p.id_cliente = :id_cliente
        ORDER BY p.data_pedido DESC, p.id_pedido DESC, ip.id_item_pedido ASC
    ';

    $stmt = $conexao->prepare($sql);
    $stmt->execute([':id_cliente' => $idCliente]);
    $linhas = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $pedidosAgrupados = [];

    foreach ($linhas as $linha) {
        $idPedido = (int) $linha['id_pedido'];

        if (!isset($pedidosAgrupados[$idPedido])) {
            $dataFormatada = $linha['data_pedido']
                ? date('d/m/Y H:i', strtotime($linha['data_pedido']))
                : '-';

            $pedidosAgrupados[$idPedido] = [
                'id_pedido' => $idPedido,
                'data'      => $dataFormatada,
                'data_raw'  => $linha['data_pedido'],
                'total'     => round((float) $linha['valor_total'], 2),
                'status'    => $linha['status'] ?? 'Pendente',
                'produtos'  => []
            ];
        }

        if ($linha['id_produto'] !== null) {
            $pedidosAgrupados[$idPedido]['produtos'][] = [
                'id_produto' => (int) $linha['id_produto'],
                'nome'       => $linha['nm_produto'] ?? 'Produto indisponível',
                'imagem'     => $linha['imagem'] ?? null,
                'quantidade' => (int) $linha['quantidade'],
                'preco'      => round((float) $linha['preco_unitario'], 2),
                'subtotal'   => round((float) $linha['subtotal'], 2)
            ];
        }
    }

    http_response_code(200);
    echo json_encode([
        'sucesso' => true,
        'pedidos' => array_values($pedidosAgrupados)
    ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);

} catch (Throwable $erro) {
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_write_close();
    }

    error_log('ZORA: erro ao buscar histórico de pedidos: ' . $erro->getMessage());

    http_response_code(500);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Não foi possível carregar o histórico de pedidos.'
    ], JSON_UNESCAPED_UNICODE);
}
