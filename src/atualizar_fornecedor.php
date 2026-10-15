<?php
declare(strict_types=1);

/**
 * ZORA — Atualização de Fornecedor (Admin)
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
        'mensagem' => 'Acesso negado. Apenas administradores podem atualizar fornecedores.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

session_write_close();

// Tenta localizar conexao.php no diretório atual ou em /src
$caminhoConexao = file_exists(__DIR__ . '/src/conexao.php')
    ? __DIR__ . '/src/conexao.php'
    : (file_exists(__DIR__ . '/conexao.php') ? __DIR__ . '/conexao.php' : __DIR__ . '/../conexao.php');

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
        throw new Exception('Dados de requisição inválidos.');
    }

    $idFornecedor  = (int) ($dados['id_fornecedor'] ?? 0);
    $idItemEstoque = (int) ($dados['id_item_estoque'] ?? 0);
    $nome          = trim((string) ($dados['nome'] ?? ''));
    $contato       = trim((string) ($dados['contato'] ?? ''));

    // =============================================
    // VALIDAÇÕES
    // =============================================

    if ($idFornecedor <= 0) {
        http_response_code(400);
        throw new Exception('Fornecedor inválido.');
    }

    if ($idItemEstoque <= 0) {
        http_response_code(400);
        throw new Exception('Estoque relacionado inválido.');
    }

    if ($nome === '') {
        http_response_code(400);
        throw new Exception('O nome do fornecedor é obrigatório.');
    }

    if (mb_strlen($nome) > 150) {
        http_response_code(400);
        throw new Exception('O nome do fornecedor pode ter no máximo 150 caracteres.');
    }

    if ($contato === '') {
        http_response_code(400);
        throw new Exception('O contato do fornecedor é obrigatório.');
    }

    if (mb_strlen($contato) > 30) {
        http_response_code(400);
        throw new Exception('O contato pode ter no máximo 30 caracteres.');
    }

    // =============================================
    // TRANSAÇÃO
    // =============================================

    $conexao->beginTransaction();

    // Localizar fornecedor com lock de linha
    $sqlFornecedor = '
        SELECT
            id_fornecedor,
            id_item_estoque,
            nome,
            contato
        FROM fornecedor
        WHERE id_fornecedor = :id_fornecedor
        FOR UPDATE
    ';

    $stmtFornecedor = $conexao->prepare($sqlFornecedor);
    $stmtFornecedor->execute([':id_fornecedor' => $idFornecedor]);
    $fornecedor = $stmtFornecedor->fetch(PDO::FETCH_ASSOC);

    if (!$fornecedor) {
        http_response_code(404);
        throw new Exception('Fornecedor não encontrado.');
    }

    // Validação da relação com o estoque
    if ((int) $fornecedor['id_item_estoque'] !== $idItemEstoque) {
        http_response_code(400);
        throw new Exception('O fornecedor não pertence ao estoque informado.');
    }

    // =============================================
    // ATUALIZAR FORNECEDOR
    // =============================================

    $sqlUpdate = '
        UPDATE fornecedor
        SET
            nome = :nome,
            contato = :contato
        WHERE id_fornecedor = :id_fornecedor
        RETURNING
            id_fornecedor,
            id_item_estoque,
            nome,
            contato
    ';

    $stmtUpdate = $conexao->prepare($sqlUpdate);
    $stmtUpdate->execute([
        ':nome'          => $nome,
        ':contato'       => $contato,
        ':id_fornecedor' => $idFornecedor
    ]);

    $fornecedorAtualizado = $stmtUpdate->fetch(PDO::FETCH_ASSOC);

    $conexao->commit();

    http_response_code(200);
    echo json_encode([
        'sucesso'    => true,
        'mensagem'   => 'Fornecedor atualizado com sucesso!',
        'fornecedor' => [
            'id_fornecedor'   => (int) $fornecedorAtualizado['id_fornecedor'],
            'id_item_estoque' => (int) $fornecedorAtualizado['id_item_estoque'],
            'nome'            => $fornecedorAtualizado['nome'],
            'contato'         => $fornecedorAtualizado['contato']
        ]
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
