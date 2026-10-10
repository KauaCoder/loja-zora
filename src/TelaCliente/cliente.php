<?php

session_start();

header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/conexao.php";

try {

    // =========================================
    // VERIFICAR SE O USUÁRIO ESTÁ LOGADO
    // =========================================

    if (!isset($_SESSION["id_cliente"])) {

        http_response_code(401);

        echo json_encode([
            "sucesso" => false,
            "mensagem" => "Usuário não está logado."
        ]);

        exit;
    }

    // =========================================
    // PEGAR ID DO CLIENTE PELA SESSÃO
    // =========================================

    $idCliente = (int) $_SESSION["id_cliente"];

    // =========================================
    // BUSCAR CLIENTE + ENDEREÇO
    // =========================================

    $sql = "
        SELECT
            c.id_cliente,
            c.nome,
            c.e_mail,
            c.telefone,

            e.id_endereco,
            e.cep,
            e.endereco,
            e.numero,
            e.complemento,
            e.bairro,
            e.cidade,
            e.estado

        FROM cliente c

        LEFT JOIN endereco e
            ON e.id_cliente = c.id_cliente

        WHERE c.id_cliente = :id_cliente

        LIMIT 1
    ";

    $stmt = $conexao->prepare($sql);

    $stmt->execute([
        ":id_cliente" => $idCliente
    ]);

    $cliente = $stmt->fetch();

    // =========================================
    // CLIENTE NÃO ENCONTRADO
    // =========================================

    if (!$cliente) {

        session_unset();
        session_destroy();

        http_response_code(404);

        echo json_encode([
            "sucesso" => false,
            "mensagem" => "Cliente não encontrado."
        ]);

        exit;
    }

    // =========================================
    // RETORNAR DADOS
    // =========================================

    echo json_encode([

        "sucesso" => true,

        "cliente" => [

            "id_cliente" =>
                (int) $cliente["id_cliente"],

            "nome" =>
                $cliente["nome"],

            "email" =>
                $cliente["e_mail"],

            "telefone" =>
                $cliente["telefone"]

        ],

        "endereco" => [

            "id_endereco" =>
                $cliente["id_endereco"],

            "cep" =>
                $cliente["cep"],

            "rua" =>
                $cliente["endereco"],

            "numero" =>
                $cliente["numero"],

            "complemento" =>
                $cliente["complemento"],

            "bairro" =>
                $cliente["bairro"],

            "cidade" =>
                $cliente["cidade"],

            "estado" =>
                $cliente["estado"]

        ]

    ]);

} catch (Throwable $erro) {

    http_response_code(500);

    echo json_encode([

        "sucesso" => false,

        "mensagem" =>
            $erro->getMessage()

    ]);
}
