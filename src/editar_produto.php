<?php

header("Content-Type: application/json; charset=UTF-8");

include_once("../conexao.php");


try {

    // =============================================
    // RECEBER JSON
    // =============================================

    $dados = json_decode(
        file_get_contents("php://input"),
        true
    );


    if (!is_array($dados)) {

        throw new Exception(
            "Dados inválidos."
        );
    }


    $idProduto =
        (int) ($dados["id_produto"] ?? 0);


    $nome =
        trim(
            $dados["nome"] ?? ""
        );


    $preco =
        $dados["preco"] ?? null;


    $descricao =
        trim(
            $dados["descricao"] ?? ""
        );


    // =============================================
    // VALIDAÇÕES
    // =============================================

    if ($idProduto <= 0) {

        throw new Exception(
            "Produto inválido."
        );
    }


    if ($nome === "") {

        throw new Exception(
            "O nome do produto é obrigatório."
        );
    }


if (strlen($nome) > 150) {

    throw new Exception(
        "O nome do produto pode ter no máximo 150 caracteres."
    );
}


    if (
        !is_numeric($preco) ||
        (float) $preco < 0
    ) {

        throw new Exception(
            "Informe um preço válido."
        );
    }


    $preco =
        round(
            (float) $preco,
            2
        );


    // =============================================
    // VERIFICAR PRODUTO
    // =============================================

    $sqlProduto = "
        SELECT id_produto
        FROM produto
        WHERE id_produto = :id_produto
        LIMIT 1
    ";


    $stmtProduto =
        $conexao->prepare(
            $sqlProduto
        );


    $stmtProduto->execute([

        ":id_produto" =>
            $idProduto

    ]);


    if (!$stmtProduto->fetch()) {

        throw new Exception(
            "Produto não encontrado."
        );
    }


    // =============================================
    // ATUALIZAR
    // =============================================

    $sql = "
        UPDATE produto

        SET
            nm_produto = :nome,
            preco = :preco,
            descricao = :descricao

        WHERE id_produto = :id_produto

        RETURNING
            id_produto,
            nm_produto,
            preco,
            descricao
    ";


    $stmt =
        $conexao->prepare($sql);


    $stmt->execute([

        ":nome" =>
            $nome,

        ":preco" =>
            $preco,

        ":descricao" =>
            $descricao,

        ":id_produto" =>
            $idProduto

    ]);


    $produto =
        $stmt->fetch();


    echo json_encode([

        "sucesso" => true,

        "mensagem" =>
            "Produto atualizado com sucesso!",

        "produto" => [

            "id_produto" =>
                (int) $produto["id_produto"],

            "nome" =>
                $produto["nm_produto"],

            "preco" =>
                (float) $produto["preco"],

            "descricao" =>
                $produto["descricao"]

        ]

    ]);


} catch (Throwable $erro) {

    http_response_code(400);


    echo json_encode([

        "sucesso" => false,

        "mensagem" =>
            $erro->getMessage()

    ]);
}
