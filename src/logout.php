<?php

session_start();

header("Content-Type: application/json; charset=UTF-8");

$_SESSION = [];

if (ini_get("session.use_cookies")) {

    $parametros =
        session_get_cookie_params();

    setcookie(
        session_name(),
        "",
        time() - 42000,
        $parametros["path"],
        $parametros["domain"],
        $parametros["secure"],
        $parametros["httponly"]
    );
}

session_destroy();

echo json_encode([

    "sucesso" => true,

    "mensagem" =>
        "Logout realizado com sucesso."

]);