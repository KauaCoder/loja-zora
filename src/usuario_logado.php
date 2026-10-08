<?php

session_start();

header("Content-Type: application/json; charset=UTF-8");

include_once("../conexao.php");

try {

    // Verifica se existe cliente na sessão
    if (!isset($_SESSION["id_cliente"])) {

        echo json_encode([
            "sucesso" => true,
            "logado" => false
        ]);

        exit;
    }

    $idCliente =
        (int)$_SESSION["id_cliente"];


    // Busca os dados atuais no banco
    $sql = "
        SELECT
            id_cliente,
            nome,
            e_mail,
            telefone
        FROM cliente
        WHERE id_cliente = :id_cliente
        LIMIT 1
    ";

    $stmt =
        $conexao->prepare($sql);

    $stmt->execute([
        ":id_cliente" => $idCliente
    ]);

    $cliente =
        $stmt->fetch();


    if (!$cliente) {

        // Cliente não existe mais
        session_unset();
        session_destroy();

        echo json_encode([
            "sucesso" => true,
            "logado" => false
        ]);

        exit;
    }


    echo json_encode([

        "sucesso" => true,

        "logado" => true,

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

} catch (Throwable $erro) {

    http_response_code(500);

    echo json_encode([

        "sucesso" => false,

        "logado" => false,

        "mensagem" =>
            $erro->getMessage()

    ]);

}