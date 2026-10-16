<?php
declare(strict_types=1);

/**
 * ZORA — Login do Cliente / Admin
 */

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Vary: Origin');

// Lista de origens permitidas (CORS)
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
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
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

// Localiza conexao.php na pasta atual, em /src ou na pasta pai
$caminhoConexao = file_exists(__DIR__ . '/conexao.php')
    ? __DIR__ . '/conexao.php'
    : (file_exists(__DIR__ . '/src/conexao.php') ? __DIR__ . '/src/conexao.php' : __DIR__ . '/../conexao.php');

if (!is_file($caminhoConexao)) {
    http_response_code(500);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Arquivo conexao.php não encontrado.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once $caminhoConexao;

try {
    if (!isset($conexao) || !($conexao instanceof PDO)) {
        throw new RuntimeException('A conexão PDO não foi inicializada corretamente.');
    }

    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        header('Allow: POST, OPTIONS');
        http_response_code(405);
        echo json_encode([
            'sucesso' => false,
            'mensagem' => 'Método não permitido.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $dados = json_decode((string) file_get_contents('php://input'), true);

    if (!is_array($dados)) {
        http_response_code(400);
        echo json_encode([
            'sucesso' => false,
            'mensagem' => 'Dados de requisição inválidos.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $email = strtolower(trim((string) ($dados['email'] ?? $dados['e_mail'] ?? '')));
    $senha = (string) ($dados['senha'] ?? '');

    if ($email === '' || $senha === '') {
        http_response_code(400);
        echo json_encode([
            'sucesso' => false,
            'mensagem' => 'E-mail e senha são obrigatórios.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Busca cliente no PostgreSQL
    $sql = '
        SELECT 
            id_cliente, 
            nome, 
            e_mail, 
            senha, 
            telefone, 
            COALESCE(is_admin, FALSE) AS is_admin 
        FROM cliente 
        WHERE e_mail = :email 
        LIMIT 1
    ';

    $stmt = $conexao->prepare($sql);
    $stmt->execute([':email' => $email]);
    $cliente = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$cliente || !password_verify($senha, $cliente['senha'])) {
        http_response_code(401);
        echo json_encode([
            'sucesso' => false,
            'mensagem' => 'E-mail ou senha incorretos.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $isAdmin = filter_var($cliente['is_admin'] ?? false, FILTER_VALIDATE_BOOLEAN);

    // Grava dados na sessão PHP
    session_regenerate_id(true);
    $_SESSION['id_cliente'] = (int) $cliente['id_cliente'];
    $_SESSION['nome']       = $cliente['nome'];
    $_SESSION['email']      = $cliente['e_mail'];
    $_SESSION['telefone']   = $cliente['telefone'] ?? '';
    $_SESSION['is_admin']   = $isAdmin;

    session_write_close();

    // Redireciona cliente comum para /TelaCliente/cliente.html e admin para /TelaAdmin/admin.html
    $redirecionar = $isAdmin ? '/TelaAdmin/admin.html' : '/TelaCliente/cliente.html';

    http_response_code(200);
    echo json_encode([
        'sucesso'      => true,
        'mensagem'     => 'Login realizado com sucesso!',
        'is_admin'     => $isAdmin,
        'redirecionar' => $redirecionar,
        'cliente'      => [
            'id_cliente' => (int) $cliente['id_cliente'],
            'nome'       => $cliente['nome'],
            'email'      => $cliente['e_mail'],
            'telefone'   => $cliente['telefone'] ?? '',
            'is_admin'   => $isAdmin
        ]
    ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);

} catch (Throwable $e) {
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_write_close();
    }

    error_log('ZORA: erro no processo de login: ' . $e->getMessage());

    http_response_code(400);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
