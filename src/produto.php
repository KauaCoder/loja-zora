<?php

header("Content-Type: application/json; charset=UTF-8");

include_once("../conexao.php");

try {

    // =============================================
    // PEGAR ID
    // =============================================

    $idProduto =
        $_GET["id"] ?? null;


    if (
        !$idProduto ||
        !is_numeric($idProduto) ||
        (int)$idProduto <= 0
    ) {

        throw new Exception(
            "ID do produto inválido."
        );
    }


    $idProduto =
        (int)$idProduto;


    // =============================================
    // BUSCAR PRODUTO
    // =============================================

    $sql = "
        SELECT
            id_produto,
            nm_produto,
            preco,
            qtd_item,
            categoria,
            imagem,
            descricao
        FROM produto
        WHERE id_produto = :id_produto
        LIMIT 1
    ";


    $stmt =
        $conexao->prepare($sql);


    $stmt->execute([
        ":id_produto" =>
            $idProduto
    ]);


    $produto =
        $stmt->fetch();


    // =============================================
    // NÃO ENCONTRADO
    // =============================================

    if (!$produto) {

        http_response_code(404);

        echo json_encode([
            "sucesso" => false,
            "mensagem" =>
                "Produto não encontrado."
        ]);

        exit;
    }


    // =============================================
    // RETORNAR PRODUTO
    // =============================================

    echo json_encode([

        "sucesso" => true,

        "produto" => [

            "id_produto" =>
                (int)$produto["id_produto"],

            "nome" =>
                $produto["nm_produto"],

            "preco" =>
                (float)$produto["preco"],

            "estoque" =>
                (int)$produto["qtd_item"],

            "categoria" =>
                $produto["categoria"],

            "imagem" =>
                $produto["imagem"],

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