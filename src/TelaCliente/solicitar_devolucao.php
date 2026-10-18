<?php
declare(strict_types=1);

/**
 * ZORA — Solicitar Devolução de Pedido
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

// Localização segura do conexao.php
$caminhoConexao = file_exists(__DIR__ . '/src/conexao.php')
    ? __DIR__ . '/src/conexao.php'
    : (file_exists(__DIR__ . '/conexao.php') ? __DIR__ . '/conexao.php' : __DIR__ . '/../conexao.php');

if (!is_file($caminhoConexao)) {
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_write_close();
    }
    http_response_code(500);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Não foi possível localizar o arquivo conexao.php'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once $caminhoConexao;

try {
    if (!isset($conexao) || !($conexao instanceof PDO)) {
        throw new RuntimeException('A conexão PDO não foi inicializada corretamente.');
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode([
            'sucesso' => false,
            'mensagem' => 'Método não permitido.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // VERIFICAÇÃO DE AUTENTICAÇÃO
    $idSessao = $_SESSION['id_cliente'] ?? null;

    if (!is_scalar($idSessao) || (int) $idSessao <= 0) {
        $idSessao = $_GET['id_cliente'] ?? null;
    }

    if (!is_scalar($idSessao) || (int) $idSessao <= 0) {
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_write_close();
        }

        http_response_code(401);
        echo json_encode([
            'sucesso'  => false,
            'mensagem' => 'Sessão expirada. Faça login novamente.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $idCliente = (int) $idSessao;

    // Lê os dados enviados via JSON pelo JavaScript
    $dadosEntrada = json_decode(file_get_contents('php://input'), true);
    $idPedido = (int) ($dadosEntrada['id_pedido'] ?? 0);

    if ($idPedido <= 0) {
        http_response_code(400);
        echo json_encode([
            'sucesso' => false,
            'mensagem' => 'ID do pedido inválido.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Verifica se o pedido pertence ao cliente logado
    $stmtVerifica = $conexao->prepare('SELECT id_pedido FROM pedido WHERE id_pedido = :id_pedido AND id_cliente = :id_cliente LIMIT 1');
    $stmtVerifica->execute([
        ':id_pedido' => $idPedido,
        ':id_cliente' => $idCliente
    ]);

    if (!$stmtVerifica->fetch(PDO::FETCH_ASSOC)) {
        http_response_code(403);
        echo json_encode([
            'sucesso' => false,
            'mensagem' => 'Pedido não encontrado ou não pertence a este usuário.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Atualiza o status do pedido na tabela
    $stmtUpdate = $conexao->prepare("UPDATE pedido SET status = 'Solicitação de Devolução' WHERE id_pedido = :id_pedido");
    $stmtUpdate->execute([':id_pedido' => $idPedido]);

    session_write_close();

    http_response_code(200);
    echo json_encode([
        'sucesso' => true,
        'mensagem' => 'Solicitação de devolução enviada com sucesso!'
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $erro) {
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_write_close();
    }

    error_log('ZORA: erro ao solicitar devolução: ' . $erro->getMessage());

    http_response_code(500);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Erro interno ao processar a devolução.'
    ], JSON_UNESCAPED_UNICODE);
}
