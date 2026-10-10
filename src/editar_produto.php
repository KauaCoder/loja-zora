<?php

header("Content-Type: application/json; charset=UTF-8");

// Inclui a conexão garantindo o caminho absoluto a partir da raiz
require_once __DIR__ . "/conexao.php";

try {

    // =============================================
    // VERIFICAR MÉTODO HTTP
    // =============================================

    if (!in_array($_SERVER["REQUEST_METHOD"], ["POST", "PUT"])) {

        http_response_code(405);

        echo json_encode([
            "sucesso" => false,
            "mensagem" => "Método não permitido. Utilize POST ou PUT."
        ]);

        exit;
    }


    // =============================================
    // RECEBER JSON
    // =============================================

    $dados = json_decode(
        file_get_contents("php://input"),
        true
    );


    if (!is_array($dados)) {

        throw new Exception("Dados inválidos enviados na requisição.");
    }


    $idProduto = (int) ($dados["id_produto"] ?? 0);

    // Aceita tanto "nome" quanto "nm_produto"
    $nome = trim($dados["nome"] ?? $dados["nm_produto"] ?? "");

    $preco = $dados["preco"] ?? null;

    $descricao = trim($dados["descricao"] ?? "");


    // =============================================
    // VALIDAÇÕES
    // =============================================

    if ($idProduto <= 0) {

        throw new Exception("ID do produto é inválido.");
    }


    if ($nome === "") {

        throw new Exception("O nome do produto é obrigatório.");
    }


    if (mb_strlen($nome) > 150) {

        throw new Exception("O nome do produto pode ter no máximo 150 caracteres.");
    }


    if (!is_numeric($preco) || (float) $preco < 0) {

        throw new Exception("Informe um preço válido maior ou igual a zero.");
    }


    $preco = round((float) $preco, 2);


    // =============================================
    // VERIFICAR SE O PRODUTO EXISTE
    // =============================================

    $sqlProduto = "
        SELECT id_produto
        FROM produto
        WHERE id_produto = :id_produto
        LIMIT 1
    ";

    $stmtProduto = $conexao->prepare($sqlProduto);

    $stmtProduto->execute([
        ":id_produto" => $idProduto
    ]);

    if (!$stmtProduto->fetch(PDO::FETCH_ASSOC)) {

        http_response_code(404);

        echo json_encode([
            "sucesso" => false,
            "mensagem" => "Produto não encontrado no banco de dados."
        ]);

        exit;
    }


    // =============================================
    // ATUALIZAR REGISTRO (POSTGRESQL)
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

    $stmt = $conexao->prepare($sql);

    $stmt->execute([
        ":nome" => $nome,
        ":preco" => $preco,
        ":descricao" => $descricao,
        ":id_produto" => $idProduto
    ]);

    $produto = $stmt->fetch(PDO::FETCH_ASSOC);


    // =============================================
    // RESPOSTA
    // =============================================

    echo json_encode([

        "sucesso" => true,

        "mensagem" => "Produto atualizado com sucesso!",

        "produto" => [

            "id_produto" => (int) $produto["id_produto"],

            "nome" => $produto["nm_produto"],

            "preco" => (float) $produto["preco"],

            "descricao" => $produto["descricao"]

        ]

    ]);


} catch (Throwable $erro) {

    http_response_code(400);

    echo json_encode([

        "sucesso" => false,

        "mensagem" => $erro->getMessage()

    ]);
}
