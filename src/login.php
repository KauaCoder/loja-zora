<?php

// Configura os parâmetros do cookie de sessão ANTES de iniciar a sessão
// Necessário para funcionar no HTTPS do Render e manter o login ativo
session_set_cookie_params([
    'lifetime' => 86400, // 24 horas
    'path'     => '/',
    'secure'   => true,   // Obriga transmissão apenas via HTTPS
    'httponly' => true,   // Protege contra scripts maliciosos no front
    'samesite' => 'Lax'   // Permite que o cookie seja enviado nas requisições do site
]);

session_start();

header("Content-Type: application/json; charset=UTF-8");

// Inclui o arquivo de conexão presente na mesma pasta (src/)
require_once __DIR__ . "/conexao.php";

try {

    $dados = json_decode(
        file_get_contents("php://input"),
        true
    );

    if (!$dados) {
        throw new Exception("Dados inválidos.");
    }

    $email = strtolower(trim($dados["email"] ?? ""));
    $senha = $dados["senha"] ?? "";

    if ($email === "" || $senha === "") {
        throw new Exception("E-mail e senha são obrigatórios.");
    }

    // =========================
    // PROCURAR CLIENTE
    // =========================

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

    $stmt->execute([
        ":email" => $email
    ]);

    $cliente = $stmt->fetch();

    // =========================
    // VERIFICAR CLIENTE
    // =========================

    if (!$cliente) {
        throw new Exception(
            "E-mail ou senha incorretos."
        );
    }

    // =========================
    // VERIFICAR SENHA
    // =========================

    if (!password_verify(
        $senha,
        $cliente["senha"]
    )) {

        throw new Exception(
            "E-mail ou senha incorretos."
        );
    }

    // =========================
    // CRIAR SESSÃO
    // =========================

    $_SESSION["id_cliente"] = (int)$cliente["id_cliente"];
    $_SESSION["nome"]       = $cliente["nome"];
    $_SESSION["email"]      = $cliente["e_mail"];
    $_SESSION["telefone"]   = $cliente["telefone"];

    // =========================
    // RESPOSTA
    // =========================

    echo json_encode([

        "sucesso" => true,

        "mensagem" =>
            "Login realizado com sucesso!",

        "cliente" => [

            "id_cliente" => (int)$cliente["id_cliente"],
            "nome"       => $cliente["nome"],
            "email"      => $cliente["e_mail"],
            "telefone"   => $cliente["telefone"]

        ]

    ]);

} catch (Exception $e) {

    http_response_code(400);

    echo json_encode([

        "sucesso" => false,

        "mensagem" => $e->getMessage()

    ]);

}
