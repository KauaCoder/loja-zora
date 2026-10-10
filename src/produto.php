<?php

header("Content-Type: application/json; charset=UTF-8");

// Garante a inclusão do arquivo de conexão na raiz do projeto
require_once __DIR__ . "/conexao.php";

try {

    // =============================================
    // PEGAR E VALIDAR ID
    // =============================================

    $idProduto = $_GET["id"] ?? null;

    if (
        !$idProduto ||
        !is_numeric($idProduto) ||
        (int)$idProduto <= 0
    ) {
        http_response_code(400);
        echo json_encode([
            "sucesso" => false,
            "mensagem" => "ID do produto inválido."
        ]);
        exit;
    }

    $idProduto = (int)$idProduto;


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

    $stmt = $conexao->prepare($sql);

    $stmt->execute([
        ":id_produto" => $idProduto
    ]);

    // Busca como array associativo obrigatoriamente
    $produto = $stmt->fetch(PDO::FETCH_ASSOC);


    // =============================================
    // NÃO ENCONTRADO
    // =============================================

    if (!$produto) {

        http_response_code(404);

        echo json_encode([
            "sucesso" => false,
            "mensagem" => "Produto não encontrado."
        ]);

        exit;
    }


    // =============================================
    // RETORNAR PRODUTO
    // =============================================

    echo json_encode([

        "sucesso" => true,

        "produto" => [

            "id_produto" => (int)$produto["id_produto"],

            "nome" => $produto["nm_produto"],

            "preco" => (float)$produto["preco"],

            "estoque" => (int)$produto["qtd_item"],

            "categoria" => $produto["categoria"],

            "imagem" => $produto["imagem"],

            "descricao" => $produto["descricao"]

        ]

    ]);


} catch (Throwable $erro) {

    http_response_code(500);

    echo json_encode([

        "sucesso" => false,

        "mensagem" => $erro->getMessage()

    ]);
}
