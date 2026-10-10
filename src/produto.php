<?php

header("Content-Type: application/json; charset=UTF-8");

// Inclui a conexão garantindo o caminho absoluto a partir da raiz do projeto
require_once __DIR__ . "/conexao.php";

try {

    // =============================================
    // VERIFICAR MÉTODO HTTP
    // =============================================

    if ($_SERVER["REQUEST_METHOD"] !== "GET") {

        http_response_code(405);

        echo json_encode([
            "sucesso" => false,
            "mensagem" => "Método não permitido. Utilize GET."
        ]);

        exit;
    }


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
            "mensagem" => "ID do produto é inválido."
        ]);

        exit;
    }

    $idProduto = (int)$idProduto;


    // =============================================
    // BUSCAR PRODUTO NO POSTGRESQL
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

    $produto = $stmt->fetch(PDO::FETCH_ASSOC);


    // =============================================
    // PRODUTO NÃO ENCONTRADO
    // =============================================

    if (!$produto) {

        http_response_code(404);

        echo json_encode([
            "sucesso" => false,
            "mensagem" => "Produto não encontrado no banco de dados."
        ]);

        exit;
    }


    // =============================================
    // RETORNAR ESTRUTURA PADRONIZADA
    // =============================================

    echo json_encode([

        "sucesso" => true,

        "produto" => [

            "id_produto" => (int) $produto["id_produto"],

            "nome"       => $produto["nm_produto"],

            "preco"      => round((float) $produto["preco"], 2),

            "estoque"    => (int) $produto["qtd_item"],

            "categoria"  => $produto["categoria"] ?? "Geral",

            "imagem"     => $produto["imagem"] ?? "default.jpg",

            "descricao"  => $produto["descricao"] ?? ""

        ]

    ]);


} catch (Throwable $erro) {

    http_response_code(500);

    echo json_encode([

        "sucesso" => false,

        "mensagem" => $erro->getMessage()

    ]);
}
