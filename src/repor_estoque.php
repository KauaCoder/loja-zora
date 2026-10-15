<?php
declare(strict_types=1);

/**
 * ZORA — Atualização de Estoque (Admin)
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
header('Access-Control-Allow-Methods: POST, PUT, OPTIONS');
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

// =============================================
// VERIFICAR MÉTODO HTTP
// =============================================

if (!in_array($_SERVER['REQUEST_METHOD'] ?? '', ['POST', 'PUT'], true)) {
    header('Allow: POST, PUT, OPTIONS');
    http_response_code(405);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Método não permitido. Utilize POST ou PUT.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// =============================================
// VERIFICAR PERMISSÃO DE ADMINISTRAÇÃO
// =============================================

$isAdmin = filter_var($_SESSION['is_admin'] ?? false, FILTER_VALIDATE_BOOLEAN);

if (!isset($_SESSION['id_cliente']) || !$isAdmin) {
    http_response_code(403);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Acesso negado. Apenas administradores podem atualizar o estoque.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// =============================================
// CARREGAR CONEXÃO COM O BANCO DE DADOS
// =============================================

$caminhoConexao = file_exists(__DIR__ . '/src/conexao.php')
    ? __DIR__ . '/src/conexao.php'
    : __DIR__ . '/conexao.php';

if (!is_file($caminhoConexao)) {
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

    // =============================================
    // RECEBER JSON
    // =============================================

    $dados = json_decode((string) file_get_contents('php://input'), true);

    if (!is_array($dados)) {
        throw new IllegalArgumentException('Dados de requisição inválidos ou JSON malformado.');
    }

    $idProduto = (int) ($dados['id_produto'] ?? 0);
    $quantidadeAdicionar = (int) ($dados['quantidade'] ?? $dados['qtd_item'] ?? 0);

    // =============================================
    // VALIDAÇÕES
    // =============================================

    if ($idProduto <= 0) {
        throw new IllegalArgumentException('ID de produto inválido.');
    }

    if ($quantidadeAdicionar <= 0) {
        throw new IllegalArgumentException('Informe uma quantidade maior que zero para adicionar.');
    }

    // =============================================
    // TRANSAÇÃO COM O POSTGRESQL
    // =============================================

    $conexao->beginTransaction();

    // Bloqueia apenas a linha da tabela produto (FOR UPDATE OF p)
    $sql = '
        SELECT
            p.id_produto,
            p.nm_produto,
            p.qtd_item,
            p.id_item_estoque,
            COALESCE(e.qtd_max_produto, 0) AS qtd_max_produto
        FROM produto p
        LEFT JOIN estoque e
            ON e.id_item_estoque = p.id_item_estoque
        WHERE p.id_produto = :id_produto
        FOR UPDATE OF p
    ';

    $stmt = $conexao->prepare($sql);
    $stmt->execute([':id_produto' => $idProduto]);
    $produto = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$produto) {
        throw new RuntimeException('Produto não encontrado no sistema.');
    }

    // =============================================
    // VALIDAÇÃO DE LIMITES
    // =============================================

    $quantidadeAtual = (int) $produto['qtd_item'];
    $quantidadeMaxima = (int) $produto['qtd_max_produto'];
    $novaQuantidade = $quantidadeAtual + $quantidadeAdicionar;

    if ($quantidadeMaxima > 0 && $novaQuantidade > $quantidadeMaxima) {
        $disponivel = max(0, $quantidadeMaxima - $quantidadeAtual);

        throw new DomainException(
            "Não é possível adicionar {$quantidadeAdicionar} unidade(s). " .
            "O limite deste estoque é {$quantidadeMaxima}. " .
            "Você pode adicionar no máximo {$disponivel} unidade(s)."
        );
    }

    // =============================================
    // ATUALIZAR ESTOQUE DO PRODUTO
    // =============================================

    $sqlUpdate = '
        UPDATE produto
        SET qtd_item = qtd_item + :quantidade
        WHERE id_produto = :id_produto
        RETURNING qtd_item
    ';

    $stmtUpdate = $conexao->prepare($sqlUpdate);
    $stmtUpdate->execute([
        ':quantidade' => $quantidadeAdicionar,
        ':id_produto' => $idProduto
    ]);

    $quantidadeFinal = (int) $stmtUpdate->fetchColumn();

    $conexao->commit();

    // =============================================
    // RESPOSTA DE SUCESSO
    // =============================================

    http_response_code(200);
    echo json_encode([
        'sucesso' => true,
        'mensagem' => 'Estoque atualizado com sucesso!',
        'produto' => [
            'id_produto' => $idProduto,
            'nome' => $produto['nm_produto'],
            'quantidade_anterior' => $quantidadeAtual,
            'quantidade_adicionada' => $quantidadeAdicionar,
            'quantidade_atual' => $quantidadeFinal,
            'quantidade_maxima' => $quantidadeMaxima
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $erro) {
    if (isset($conexao) && $conexao instanceof PDO && $conexao->inTransaction()) {
        $conexao->rollBack();
    }

    http_response_code(400);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => $erro->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
