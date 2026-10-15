<?php
declare(strict_types=1);

/**
 * ZORA — Atualização de Dados do Produto (Admin)
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
// VERIFICAR PERMISSÃO DE ADMINISTRAÇÃO
// =============================================

$isAdmin = filter_var($_SESSION['is_admin'] ?? false, FILTER_VALIDATE_BOOLEAN);

if (!isset($_SESSION['id_cliente']) || !$isAdmin) {
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_write_close();
    }

    http_response_code(403);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Acesso negado. Apenas administradores podem editar produtos.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

session_write_close();

// Localiza e carrega a conexão com o banco de dados
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
    // RECEBER JSON
    // =============================================

    $dados = json_decode((string) file_get_contents('php://input'), true);

    if (!is_array($dados)) {
        http_response_code(400);
        throw new Exception('Dados inválidos enviados na requisição.');
    }

    $idProduto = (int) ($dados['id_produto'] ?? 0);
    $nome = trim((string) ($dados['nome'] ?? $dados['nm_produto'] ?? ''));
    $precoRaw = $dados['preco'] ?? null;
    $descricao = trim((string) ($dados['descricao'] ?? ''));

    // =============================================
    // VALIDAÇÕES
    // =============================================

    if ($idProduto <= 0) {
        http_response_code(400);
        throw new Exception('ID do produto é inválido.');
    }

    if ($nome === '') {
        http_response_code(400);
        throw new Exception('O nome do produto é obrigatório.');
    }

    if (mb_strlen($nome) > 150) {
        http_response_code(400);
        throw new Exception('O nome do produto pode ter no máximo 150 caracteres.');
    }

    if (!is_numeric($precoRaw) || (float) $precoRaw < 0) {
        http_response_code(400);
        throw new Exception('Informe um preço válido maior ou igual a zero.');
    }

    $preco = round((float) $precoRaw, 2);

    // =============================================
    // VERIFICAR SE O PRODUTO EXISTE
    // =============================================

    $sqlProduto = '
        SELECT id_produto
        FROM produto
        WHERE id_produto = :id_produto
        LIMIT 1
    ';

    $stmtProduto = $conexao->prepare($sqlProduto);
    $stmtProduto->execute([':id_produto' => $idProduto]);

    if (!$stmtProduto->fetch(PDO::FETCH_ASSOC)) {
        http_response_code(404);
        echo json_encode([
            'sucesso' => false,
            'mensagem' => 'Produto não encontrado no banco de dados.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // =============================================
    // ATUALIZAR REGISTRO (POSTGRESQL)
    // =============================================

    $sql = '
        UPDATE produto
        SET
            nm_produto = :nome,
            preco = :preco,
            descricao = :descricao
        WHERE id_produto = :id_produto
        RETURNING
            id_produto,
            nm_produto,
            preco,
            descricao
    ';

    $stmt = $conexao->prepare($sql);
    $stmt->execute([
        ':nome'       => $nome,
        ':preco'      => $preco,
        ':descricao'  => $descricao,
        ':id_produto' => $idProduto
    ]);

    $produto = $stmt->fetch(PDO::FETCH_ASSOC);

    http_response_code(200);
    echo json_encode([
        'sucesso'  => true,
        'mensagem' => 'Produto atualizado com sucesso!',
        'produto'  => [
            'id_produto' => (int) $produto['id_produto'],
            'nome'       => $produto['nm_produto'],
            'preco'      => (float) $produto['preco'],
            'descricao'  => $produto['descricao']
        ]
    ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);

} catch (Throwable $erro) {
    if (http_response_code() === 200) {
        http_response_code(400);
    }

    echo json_encode([
        'sucesso'  => false,
        'mensagem' => $erro->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
