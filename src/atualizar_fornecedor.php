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


    $idFornecedor =
        (int) ($dados["id_fornecedor"] ?? 0);


    $idItemEstoque =
        (int) ($dados["id_item_estoque"] ?? 0);


    $nome =
        trim(
            $dados["nome"] ?? ""
        );


    $contato =
        trim(
            $dados["contato"] ?? ""
        );


    // =============================================
    // VALIDAÇÕES
    // =============================================

    if ($idFornecedor <= 0) {

        throw new Exception(
            "Fornecedor inválido."
        );
    }


    if ($idItemEstoque <= 0) {

        throw new Exception(
            "Estoque relacionado inválido."
        );
    }


    if ($nome === "") {

        throw new Exception(
            "O nome do fornecedor é obrigatório."
        );
    }


    if (strlen($nome) > 150) {

        throw new Exception(
            "O nome do fornecedor pode ter no máximo 150 caracteres."
        );
    }


    if ($contato === "") {

        throw new Exception(
            "O contato do fornecedor é obrigatório."
        );
    }


    if (strlen($contato) > 30) {

        throw new Exception(
            "O contato pode ter no máximo 30 caracteres."
        );
    }


    // =============================================
    // TRANSAÇÃO
    // =============================================

    $conexao->beginTransaction();


    // =============================================
    // LOCALIZAR FORNECEDOR
    // =============================================

    $sqlFornecedor = "
        SELECT
            id_fornecedor,
            id_item_estoque,
            nome,
            contato

        FROM fornecedor

        WHERE id_fornecedor = :id_fornecedor

        FOR UPDATE
    ";


    $stmtFornecedor =
        $conexao->prepare(
            $sqlFornecedor
        );


    $stmtFornecedor->execute([

        ":id_fornecedor" =>
            $idFornecedor

    ]);


    $fornecedor =
        $stmtFornecedor->fetch();


    if (!$fornecedor) {

        throw new Exception(
            "Fornecedor não encontrado."
        );
    }


    // =============================================
    // SEGURANÇA DA RELAÇÃO
    // =============================================

    if (
        (int) $fornecedor["id_item_estoque"]
        !==
        $idItemEstoque
    ) {

        throw new Exception(
            "O fornecedor não pertence ao estoque informado."
        );
    }


    // =============================================
    // ATUALIZAR FORNECEDOR
    // =============================================

    $sqlUpdate = "
        UPDATE fornecedor

        SET
            nome = :nome,
            contato = :contato

        WHERE id_fornecedor = :id_fornecedor

        RETURNING
            id_fornecedor,
            id_item_estoque,
            nome,
            contato
    ";


    $stmtUpdate =
        $conexao->prepare(
            $sqlUpdate
        );


    $stmtUpdate->execute([

        ":nome" =>
            $nome,

        ":contato" =>
            $contato,

        ":id_fornecedor" =>
            $idFornecedor

    ]);


    $fornecedorAtualizado =
        $stmtUpdate->fetch();


    $conexao->commit();


    // =============================================
    // RESPOSTA
    // =============================================

    echo json_encode([

        "sucesso" => true,

        "mensagem" =>
            "Fornecedor atualizado com sucesso!",

        "fornecedor" => [

            "id_fornecedor" =>
                (int) $fornecedorAtualizado["id_fornecedor"],

            "id_item_estoque" =>
                (int) $fornecedorAtualizado["id_item_estoque"],

            "nome" =>
                $fornecedorAtualizado["nome"],

            "contato" =>
                $fornecedorAtualizado["contato"]

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