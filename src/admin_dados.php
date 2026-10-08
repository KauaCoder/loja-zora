<?php
// 1. Inclui a conexão subindo um nível para a pasta src
include_once("../conexao.php");

header("Content-Type: application/json; charset=UTF-8");

// REMOVIDO: require_once "conexao.php"; (Ele causava conflito e erro de arquivo não encontrado)

try {

    $sql = "
        SELECT
            p.id_produto,
            p.nm_produto,
            p.preco,
            p.qtd_item,
            p.categoria,
            p.imagem,
            p.descricao,

            e.id_item_estoque,
            e.qtd_max_produto,

            f.id_fornecedor,
            f.nome AS fornecedor,
            f.contato

        FROM produto p

        LEFT JOIN estoque e
            ON e.id_item_estoque = p.id_item_estoque

        LEFT JOIN fornecedor f
            ON f.id_item_estoque = e.id_item_estoque

        ORDER BY p.id_produto
    ";

    // Certifique-se de usar a mesma variável definida no seu conexao.php ($conexao ou $pdo)
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

            "qtd_item" =>
                (int) $produto["qtd_item"],

            "categoria" =>
                $produto["categoria"],

            "imagem" =>
                $produto["imagem"],

            "descricao" =>
                $produto["descricao"],

            "id_item_estoque" =>
                $produto["id_item_estoque"] !== null
                    ? (int) $produto["id_item_estoque"]
                    : null,

            "qtd_max_produto" =>
                $produto["qtd_max_produto"] !== null
                    ? (int) $produto["qtd_max_produto"]
                    : 0,

            "id_fornecedor" =>
                $produto["id_fornecedor"] !== null
                    ? (int) $produto["id_fornecedor"]
                    : null,

            "fornecedor" =>
                $produto["fornecedor"],

            "contato" =>
                $produto["contato"]
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

        "mensagem" =>
            $erro->getMessage()

    ]);
}