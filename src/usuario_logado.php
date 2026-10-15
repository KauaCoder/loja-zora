<?php
declare(strict_types=1);

/**
 * ZORA — Verificação de sessão ativa
 */

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Vary: Origin');

// Lista de origens permitidas (incluindo o seu domínio real do Render)
$origensPermitidas = [
    'https://loja-zora.onrender.com',
    'http://localhost:3000',
    'http://localhost:8080'
];

$origem = $_SERVER['HTTP_ORIGIN'] ?? null;

// Se a origem veio no cabeçalho e está na lista (ou se não veio, assume o mesmo domínio)
$origemPermitida = ($origem !== null && in_array($origem, $origensPermitidas, true)) || $origem === null;

if ($origem !== null && !$origemPermitida) {
    http_response_code(403);
    echo json_encode([
        'sucesso' => false,
        'logado' => false,
        'mensagem' => 'Origem não autorizada.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($origem !== null && $origemPermitida) {
    header('Access-Control-Allow-Origin: ' . $origem);
    header('Access-Control-Allow-Credentials: true');
} else {
    header('Access-Control-Allow-Origin: https://loja-zora.onrender.com');
    header('Access-Control-Allow-Credentials: true');
}

header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if (!in_array($_SERVER['REQUEST_METHOD'] ?? 'GET', ['GET', 'POST'], true)) {
    header('Allow: GET, POST, OPTIONS');
    http_response_code(405);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Método não permitido.'
    ], JSON_UNESCAPED_UNICODE);
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

    $sameSite = $isHttps ? 'None' : 'Lax';

    session_set_cookie_params([
        'lifetime' => 86400,
        'path' => '/',
        'secure' => $isHttps,
        'httponly' => true,
        'samesite' => $sameSite,
    ]);

    if (!session_start()) {
        http_response_code(500);
        echo json_encode([
            'sucesso' => false,
            'logado' => false,
            'mensagem' => 'Não foi possível iniciar a sessão.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

function responderJson(array $dados, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($dados, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
}

function encerrarSessaoAtual(): void
{
    $_SESSION = [];

    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', [
            'expires' => time() - 42000,
            'path' => $params['path'] ?? '/',
            'domain' => $params['domain'] ?? '',
            'secure' => (bool) ($params['secure'] ?? false),
            'httponly' => (bool) ($params['httponly'] ?? true),
            'samesite' => $params['samesite'] ?? 'Lax',
        ]);
    }

    if (session_status() === PHP_SESSION_ACTIVE) {
        session_destroy();
    }
}

$caminhoConexao = file_exists(__DIR__ . '/src/conexao.php')
    ? __DIR__ . '/src/conexao.php'
    : __DIR__ . '/conexao.php';

if (!is_file($caminhoConexao)) {
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_write_close();
    }
    error_log('ZORA: arquivo conexao.php não encontrado.');
    responderJson([
        'sucesso' => false,
        'logado' => false,
        'mensagem' => 'Erro interno de configuração.'
    ], 500);
    exit;
}

try {
    require_once $caminhoConexao;

    if (!isset($conexao) || !($conexao instanceof PDO)) {
        throw new RuntimeException('A conexão PDO não foi inicializada.');
    }

    $idSessao = $_SESSION['id_cliente'] ?? null;

    if (!is_scalar($idSessao) || (int) $idSessao <= 0) {
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_write_close();
        }

        responderJson([
            'sucesso' => true,
            'logado' => false,
            'is_admin' => false,
            'cliente' => null
        ]);
        exit;
    }

    $idCliente = (int) $idSessao;

    $sql = 'SELECT id_cliente, nome, e_mail, telefone, COALESCE(is_admin, FALSE) AS is_admin
            FROM cliente
            WHERE id_cliente = :id_cliente
            LIMIT 1';

    $stmt = $conexao->prepare($sql);
    $stmt->execute([':id_cliente' => $idCliente]);
    $cliente = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$cliente) {
        encerrarSessaoAtual();

        responderJson([
            'sucesso' => true,
            'logado' => false,
            'is_admin' => false,
            'cliente' => null
        ]);
        exit;
    }

    $isAdmin = filter_var($cliente['is_admin'] ?? false, FILTER_VALIDATE_BOOLEAN);

    $_SESSION['is_admin'] = $isAdmin;

    session_write_close();

    responderJson([
        'sucesso' => true,
        'logado' => true,
        'is_admin' => $isAdmin,
        'cliente' => [
            'id_cliente' => (int) $cliente['id_cliente'],
            'nome' => $cliente['nome'],
            'email' => $cliente['e_mail'],
            'telefone' => $cliente['telefone'] ?? '',
            'is_admin' => $isAdmin
        ]
    ]);
} catch (Throwable $erro) {
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_write_close();
    }

    error_log('ZORA: falha na verificação de sessão: ' . $erro->getMessage());

    responderJson([
        'sucesso' => false,
        'logado' => false,
        'is_admin' => false,
        'mensagem' => 'Não foi possível verificar a sessão. Tente novamente.'
    ], 500);
}
