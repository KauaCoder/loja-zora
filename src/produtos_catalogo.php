<?php

header("Content-Type: application/json; charset=UTF-8");

require_once "conexao.php";

try {

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
        ORDER BY id_produto
    ";

    $stmt = $conexao->prepare($sql);
    $stmt->execute();

    $dados = $stmt->fetchAll();

    $produtos = [];

    foreach ($dados as $produto) {

        $produtos[] = [

            "id_produto" =>
                (int) $produto["id_produto"],

            "nome" =>
                $produto["nm_produto"],

            "preco" =>
                (float) $produto["preco"],

            "estoque" =>
                (int) $produto["qtd_item"],

            "categoria" =>
                $produto["categoria"],

            "imagem" =>
                $produto["imagem"],

            "descricao" =>
                $produto["descricao"]
        ];
    }

    echo json_encode([
        "sucesso" => true,
        "produtos" => $produtos
    ]);

} catch (Throwable $erro) {

    http_response_code(500);

    echo json_encode([
        "sucesso" => false,
        "mensagem" => $erro->getMessage()
    ]);
}