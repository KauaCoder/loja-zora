<?php

session_start();

header("Content-Type: application/json; charset=UTF-8");

require_once "conexao.php";

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
        FROM Cliente
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

    $_SESSION["id_cliente"] =
        (int)$cliente["id_cliente"];

    $_SESSION["nome"] =
        $cliente["nome"];

    $_SESSION["email"] =
        $cliente["e_mail"];

    $_SESSION["telefone"] =
        $cliente["telefone"];

    // =========================
    // RESPOSTA
    // =========================

    echo json_encode([

        "sucesso" => true,

        "mensagem" =>
            "Login realizado com sucesso!",

        "cliente" => [

            "id_cliente" =>
                (int)$cliente["id_cliente"],

            "nome" =>
                $cliente["nome"],

            "email" =>
                $cliente["e_mail"],

            "telefone" =>
                $cliente["telefone"]

        ]

    ]);

} catch (Exception $e) {

    http_response_code(400);

    echo json_encode([

        "sucesso" => false,

        "mensagem" =>
            $e->getMessage()

    ]);

}