<?php

// =========================================================
// ZORA - VERIFICAÇÃO DE SESSÃO ATIVA
// Suporte a HTTPS + Proxy Reverso (Render & Mobile)
// =========================================================

$origem = $_SERVER['HTTP_ORIGIN'] ?? '*';
if ($origem !== '*') {
    header("Access-Control-Allow-Origin: $origem");
    header("Access-Control-Allow-Credentials: true");
} else {
    header("Access-Control-Allow-Origin: *");
}

header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$isHttps = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ||
           (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');

if ($isHttps) {
    $_SERVER['HTTPS'] = 'on';
}

$sessionPath = sys_get_temp_dir();
if (is_writable($sessionPath)) {
    session_save_path($sessionPath);
}

if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.use_only_cookies', 1);
    ini_set('session.use_strict_mode', 1);

    session_set_cookie_params([
        'lifetime' => 86400,
        'path'     => '/',
        'secure'   => $isHttps,
        'httponly' => true,
        'samesite' => $isHttps ? 'None' : 'Lax'
    ]);
    session_start();
}

header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-cache, no-store, must-revalidate");

$caminho_conexao = file_exists(__DIR__ . '/src/conexao.php') ? __DIR__ . '/src/conexao.php' : __DIR__ . '/conexao.php';

if (!file_exists($caminho_conexao)) {
    echo json_encode([
        "sucesso"  => false,
        "logado"   => false,
        "mensagem" => "Não foi possível encontrar conexao.php"
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once $caminho_conexao;

try {

    if (!isset($_SESSION["id_cliente"]) || empty($_SESSION["id_cliente"])) {
        echo json_encode([
            "sucesso"  => true,
            "logado"   => false,
            "is_admin" => false,
            "cliente"  => null
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $idCliente = (int) $_SESSION["id_cliente"];

    $sql = "SELECT id_cliente, nome, e_mail, telefone FROM cliente WHERE id_cliente = :id_cliente LIMIT 1";
    $stmt = $conexao->prepare($sql);
    $stmt->execute([":id_cliente" => $idCliente]);
    $cliente = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$cliente) {
        $_SESSION = [];
        session_destroy();
        echo json_encode([
            "sucesso"  => true,
            "logado"   => false,
            "is_admin" => false,
            "cliente"  => null
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $isAdmin = false;
    try {
        $stmtAdmin = $conexao->prepare("SELECT is_admin FROM cliente WHERE id_cliente = :id_cliente LIMIT 1");
        $stmtAdmin->execute([":id_cliente" => $idCliente]);
        $rowAdmin = $stmtAdmin->fetch(PDO::FETCH_ASSOC);
        $isAdmin = filter_var($rowAdmin["is_admin"] ?? false, FILTER_VALIDATE_BOOLEAN);
    } catch (Throwable $eAdmin) {
        $isAdmin = false;
    }

    $_SESSION["is_admin"] = $isAdmin;
    session_write_close();

    echo json_encode([
        "sucesso"  => true,
        "logado"   => true,
        "is_admin" => $isAdmin,
        "cliente"  => [
            "id_cliente" => (int) $cliente["id_cliente"],
            "nome"       => $cliente["nome"],
            "email"      => $cliente["e_mail"],
            "telefone"   => $cliente["telefone"] ?? "",
            "is_admin"   => $isAdmin
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $erro) {
    echo json_encode([
        "sucesso"  => false,
        "logado"   => false,
        "is_admin" => false,
        "mensagem" => "Erro de verificação: " . $erro->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
