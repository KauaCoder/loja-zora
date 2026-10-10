<?php

// Configura cookies de sessão antes do session_start
session_set_cookie_params([
    'lifetime' => 86400, // 24 horas
    'path'     => '/',
    'secure'   => true,   // Requerido no Render (HTTPS)
    'httponly' => true,
    'samesite' => 'Lax'
]);

session_start();

header("Content-Type: application/json; charset=UTF-8");

// Inclui o conexao.php
$caminho_conexao = __DIR__ . '/src/conexao.php';
if (!file_exists($caminho_conexao)) {
    $caminho_conexao = __DIR__ . '/conexao.php';
}
require_once $caminho_conexao;

try {

    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        http_response_code(405);
        echo json_encode([
            "sucesso" => false,
            "mensagem" => "Método não permitido. Utilize POST."
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $dados = json_decode(file_get_contents("php://input"), true);

    if (!$dados || !is_array($dados)) {
        throw new Exception("Dados de requisição inválidos.");
    }

    $email = strtolower(trim($dados["email"] ?? $dados["e_mail"] ?? ""));
    $senha = $dados["senha"] ?? "";

    if ($email === "" || $senha === "") {
        throw new Exception("E-mail e senha são obrigatórios.");
    }

    // Busca cliente sem forçar a coluna is_admin na query principal
    $sql = "
        SELECT
            id_cliente,
            nome,
            e_mail,
            senha,
            telefone
        FROM cliente
        WHERE e_mail = :email
        LIMIT 1
    ";

    $stmt = $conexao->prepare($sql);
    $stmt->execute([":email" => $email]);
    $cliente = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$cliente || !password_verify($senha, $cliente["senha"])) {
        throw new Exception("E-mail ou senha incorretos.");
    }

    // Verifica se a coluna is_admin existe dinamicamente
    $isAdmin = false;
    try {
        $stmtAdmin = $conexao->prepare("SELECT is_admin FROM cliente WHERE id_cliente = :id");
        $stmtAdmin->execute([":id" => $cliente["id_cliente"]]);
        $rowAdmin = $stmtAdmin->fetch(PDO::FETCH_ASSOC);
        $isAdmin = !empty($rowAdmin["is_admin"]);
    } catch (Throwable $e) {
        // Se a coluna ainda não existir no banco, assume FALSE sem travar o login
        $isAdmin = false;
    }

    // Salva sessão
    $_SESSION["id_cliente"] = (int) $cliente["id_cliente"];
    $_SESSION["nome"]       = $cliente["nome"];
    $_SESSION["email"]      = $cliente["e_mail"];
    $_SESSION["telefone"]   = $cliente["telefone"];
    $_SESSION["is_admin"]   = $isAdmin;

    $redirecionar = $isAdmin ? "/TelaAdmin/admin.html" : "/Telainicial/index.html";

    echo json_encode([
        "sucesso" => true,
        "mensagem" => "Login realizado com sucesso!",
        "is_admin" => $isAdmin,
        "redirecionar" => $redirecionar,
        "cliente" => [
            "id_cliente" => (int) $cliente["id_cliente"],
            "nome"       => $cliente["nome"],
            "email"      => $cliente["e_mail"],
            "telefone"   => $cliente["telefone"],
            "is_admin"   => $isAdmin
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {

    echo json_encode([
        "sucesso" => false,
        "mensagem" => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);

}
