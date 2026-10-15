<?php

// =========================================================
// ZORA - LOGIN DO CLIENTE
// Suporte a HTTPS + Proxy Reverso (Render & Mobile)
// =========================================================

// 1. Tratamento CORS e Preflight (OPTIONS)
$origem = $_SERVER['HTTP_ORIGIN'] ?? 'https://loja-zora.onrender.com';
header("Access-Control-Allow-Origin: $origem");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 2. Reconhece HTTPS vindo do Proxy Reverso do Render
$isHttps = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ||
           (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');

if ($isHttps) {
    $_SERVER['HTTPS'] = 'on';
}

// 3. Garante que o diretório de sessões seja gravável no Render
$sessionPath = sys_get_temp_dir();
if (is_writable($sessionPath)) {
    session_save_path($sessionPath);
}

// 4. Configura os cookies da sessão
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.use_only_cookies', 1);
    ini_set('session.use_strict_mode', 1);

    session_set_cookie_params([
        'lifetime' => 86400,
        'path'     => '/',
        'secure'   => $isHttps,
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
        "sucesso" => false,
        "mensagem" => "Arquivo conexao.php não encontrado."
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once $caminho_conexao;

try {

    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        http_response_code(405);
        echo json_encode(["sucesso" => false, "mensagem" => "Método não permitido."]);
        exit;
    }

    $dados = json_decode(file_get_contents("php://input"), true);
    $email = strtolower(trim($dados["email"] ?? $dados["e_mail"] ?? ""));
    $senha = $dados["senha"] ?? "";

    if ($email === "" || $senha === "") {
        throw new Exception("E-mail e senha são obrigatórios.");
    }

    // Busca cliente no PostgreSQL
    $sql = "SELECT id_cliente, nome, e_mail, senha, telefone, COALESCE(is_admin, FALSE) AS is_admin FROM cliente WHERE e_mail = :email LIMIT 1";
    $stmt = $conexao->prepare($sql);
    $stmt->execute([":email" => $email]);
    $cliente = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$cliente || !password_verify($senha, $cliente["senha"])) {
        throw new Exception("E-mail ou senha incorretos.");
    }

    $isAdmin = filter_var($cliente["is_admin"] ?? false, FILTER_VALIDATE_BOOLEAN);

    // Grava dados na sessão PHP
    session_regenerate_id(true);
    $_SESSION["id_cliente"] = (int) $cliente["id_cliente"];
    $_SESSION["nome"]       = $cliente["nome"];
    $_SESSION["email"]      = $cliente["e_mail"];
    $_SESSION["telefone"]   = $cliente["telefone"] ?? "";
    $_SESSION["is_admin"]   = $isAdmin;

    // FORÇA A GRAVAÇÃO IMEDIATA DA SESSÃO NO DISCO DO RENDER
    session_write_close();

    // CORRIGIDO: Redireciona cliente comum para /TelaCliente/cliente.html
    $redirecionar = $isAdmin ? "/TelaAdmin/admin.html" : "/TelaCliente/cliente.html";

    echo json_encode([
        "sucesso"      => true,
        "mensagem"     => "Login realizado com sucesso!",
        "is_admin"     => $isAdmin,
        "redirecionar" => $redirecionar,
        "cliente"      => [
            "id_cliente" => (int) $cliente["id_cliente"],
            "nome"       => $cliente["nome"],
            "email"      => $cliente["e_mail"],
            "telefone"   => $cliente["telefone"] ?? "",
            "is_admin"   => $isAdmin
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    echo json_encode([
        "sucesso"  => false,
        "mensagem" => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
