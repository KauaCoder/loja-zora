<?php

session_start();

header("Content-Type: application/json; charset=UTF-8");

// =====================================================
// VERIFICAR MÉTODO HTTP
// =====================================================

if ($_SERVER["REQUEST_METHOD"] !== "POST") {

    http_response_code(405);

    echo json_encode([
        "sucesso" => false,
        "mensagem" => "Método não permitido. Utilize POST."
    ]);

    exit;
}

// =====================================================
// DESTRIUIR DADOS DA SESSÃO
// =====================================================

$_SESSION = [];

// Invalidar o cookie de sessão no navegador
if (ini_get("session.use_cookies")) {

    $parametros = session_get_cookie_params();

    setcookie(
        session_name(),
        "",
        [
            "expires"  => time() - 42000,
            "path"     => $parametros["path"] ?? "/",
            "domain"   => $parametros["domain"] ?? "",
            "secure"   => $parametros["secure"] ?? true,
            "httponly" => $parametros["httponly"] ?? true,
            "samesite" => $parametros["samesite"] ?? "Lax"
        ]
    );
}

session_destroy();

// =====================================================
// RESPOSTA SUCESSO
// =====================================================

echo json_encode([

    "sucesso" => true,

    "mensagem" => "Logout realizado com sucesso."

]);
