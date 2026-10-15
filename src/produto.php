<?php

header("Content-Type: application/json; charset=UTF-8");

// Localiza o conexao.php na pasta /src ou na raiz do projeto
$caminho_conexao = __DIR__ . '/src/conexao.php';

if (!file_exists($caminho_conexao)) {
    $caminho_conexao = __DIR__ . '/conexao.php';
}

require_once $caminho_conexao;

try {

    // =============================================
    // VERIFICAR MÉTODO HTTP
    // =============================================

    if ($_SERVER["REQUEST_METHOD"] !== "GET") {

        http_response_code(405);

        echo json_encode([
            "sucesso" => false,
            "mensagem" => "Método não permitido. Utilize GET."
        ], JSON_UNESCAPED_UNICODE);

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
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }

    $idProduto = (int)$idProduto;


    // =============================================
    // BUSCAR PRODUTO NO POSTGRESQL (COM ESTOQUE E FORNECEDOR)
    // =============================================

    $sql = "
        SELECT
            p.id_produto,
            p.nm_produto,
            p.preco,
            p.qtd_item,
            p.categoria,
            p.imagem,
            p.descricao,
            p.id_item_estoque,
            COALESCE(e.qtd_max_produto, 100) AS qtd_max_produto,
            f.id_fornecedor,
            f.nome AS fornecedor_nome,
            f.contato AS fornecedor_contato
        FROM produto p
        LEFT JOIN estoque e 
            ON e.id_item_estoque = p.id_item_estoque
        LEFT JOIN fornecedor f 
            ON f.id_item_estoque = e.id_item_estoque
        WHERE p.id_produto = :id_produto
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
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }


    // =============================================
    // CALCULAR REGRA DOS 40% E DISPONIBILIDADE
    // =============================================

    $qtdAtual = (int) $produto["qtd_item"];
    $qtdMax = (int) $produto["qtd_max_produto"];
    $percentualRestante = $qtdMax > 0 ? round(($qtdAtual / $qtdMax) * 100, 1) : 0;


    // =============================================
    // RETORNAR ESTRUTURA PADRONIZADA
    // =============================================

    echo json_encode([

        "sucesso" => true,

        "produto" => [

            "id_produto"          => (int) $produto["id_produto"],

            "nome"                => $produto["nm_produto"],

            "preco"               => round((float) $produto["preco"], 2),

            "estoque"             => $qtdAtual,

            "qtd_item"            => $qtdAtual, // Compatibilidade com chamadas legadas

            "qtd_max_produto"     => $qtdMax,

            "percentual_estoque"  => $percentualRestante,

            "estoque_baixo"       => ($percentualRestante <= 40),

            "esgotado"            => ($qtdAtual <= 0),

            "categoria"           => $produto["categoria"] ?? "Geral",

            "imagem"              => $produto["imagem"] ?? "default.jpg",

            "descricao"           => $produto["descricao"] ?? "",

            "id_item_estoque"     => $produto["id_item_estoque"] ? (int) $produto["id_item_estoque"] : null,

            "id_fornecedor"       => $produto["id_fornecedor"] ? (int) $produto["id_fornecedor"] : null,

            "fornecedor"          => $produto["fornecedor_nome"] ?? "Não cadastrado",

            "contato"             => $produto["fornecedor_contato"] ?? "-"

        ]

    ], JSON_UNESCAPED_UNICODE);


} catch (Throwable $erro) {

    http_response_code(500);

    echo json_encode([

        "sucesso" => false,

        "mensagem" => $erro->getMessage()

    ], JSON_UNESCAPED_UNICODE);
}
