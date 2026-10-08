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


    $quantidadeAdicionar =
        (int) ($dados["quantidade"] ?? 0);


    // =============================================
    // VALIDAÇÕES
    // =============================================

    if ($idProduto <= 0) {

        throw new Exception(
            "Produto inválido."
        );
    }


    if ($quantidadeAdicionar <= 0) {

        throw new Exception(
            "Informe uma quantidade maior que zero."
        );
    }


    // =============================================
    // TRANSAÇÃO
    // =============================================

    $conexao->beginTransaction();


    // =============================================
    // BUSCAR PRODUTO E ESTOQUE
    // =============================================

    $sql = "
        SELECT
            p.id_produto,
            p.nm_produto,
            p.qtd_item,
            p.id_item_estoque,
            e.qtd_max_produto

        FROM produto p

        JOIN estoque e
            ON e.id_item_estoque =
               p.id_item_estoque

        WHERE p.id_produto =
              :id_produto

        FOR UPDATE
    ";


    $stmt =
        $conexao->prepare($sql);


    $stmt->execute([

        ":id_produto" =>
            $idProduto

    ]);


    $produto =
        $stmt->fetch();


    if (!$produto) {

        throw new Exception(
            "Produto não encontrado."
        );
    }


    // =============================================
    // QUANTIDADES
    // =============================================

    $quantidadeAtual =
        (int) $produto["qtd_item"];


    $quantidadeMaxima =
        (int) $produto["qtd_max_produto"];


    $novaQuantidade =
        $quantidadeAtual +
        $quantidadeAdicionar;


    // =============================================
    // VERIFICAR LIMITE
    // =============================================

    if (
        $quantidadeMaxima > 0 &&
        $novaQuantidade > $quantidadeMaxima
    ) {

        $disponivel =
            max(
                0,
                $quantidadeMaxima -
                $quantidadeAtual
            );


        throw new Exception(

            "Não é possível adicionar " .
            $quantidadeAdicionar .
            " unidade(s). " .
            "O limite deste estoque é " .
            $quantidadeMaxima .
            ". Você pode adicionar no máximo " .
            $disponivel .
            " unidade(s)."

        );
    }


    // =============================================
    // ATUALIZAR PRODUTO
    // =============================================

    $sqlUpdate = "
        UPDATE produto

        SET qtd_item =
            qtd_item + :quantidade

        WHERE id_produto =
            :id_produto

        RETURNING qtd_item
    ";


    $stmtUpdate =
        $conexao->prepare(
            $sqlUpdate
        );


    $stmtUpdate->execute([

        ":quantidade" =>
            $quantidadeAdicionar,

        ":id_produto" =>
            $idProduto

    ]);


    $quantidadeFinal =
        (int) $stmtUpdate->fetchColumn();


    // =============================================
    // COMMIT
    // =============================================

    $conexao->commit();


    echo json_encode([

        "sucesso" => true,

        "mensagem" =>
            "Estoque atualizado com sucesso!",

        "produto" => [

            "id_produto" =>
                $idProduto,

            "nome" =>
                $produto["nm_produto"],

            "quantidade_anterior" =>
                $quantidadeAtual,

            "quantidade_adicionada" =>
                $quantidadeAdicionar,

            "quantidade_atual" =>
                $quantidadeFinal,

            "quantidade_maxima" =>
                $quantidadeMaxima

        ]

    ]);


} catch (Throwable $erro) {

    if (
        isset($conexao) &&
        $conexao->inTransaction()
    ) {

        $conexao->rollBack();
    }


    http_response_code(400);


    echo json_encode([

        "sucesso" => false,

        "mensagem" =>
            $erro->getMessage()

    ]);
}