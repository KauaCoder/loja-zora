<?php

session_start();

header("Content-Type: application/json; charset=UTF-8");

require_once "conexao.php";

try {

    // =====================================================
    // VERIFICAR LOGIN
    // =====================================================

    if (!isset($_SESSION["id_cliente"])) {

        http_response_code(401);

        echo json_encode([
            "sucesso" => false,
            "mensagem" => "Sua sessão expirou. Faça login novamente."
        ]);

        exit;
    }

    $idCliente = (int) $_SESSION["id_cliente"];


    // =====================================================
    // RECEBER DADOS
    // =====================================================

    $conteudo =
        file_get_contents("php://input");

    $dados =
        json_decode($conteudo, true);


    if (!is_array($dados)) {

        throw new Exception(
            "Dados do pedido inválidos."
        );
    }


    $itens =
        $dados["itens"] ?? [];


    if (
        !is_array($itens) ||
        empty($itens)
    ) {

        throw new Exception(
            "O pedido não possui produtos."
        );
    }


    // =====================================================
    // INICIAR TRANSAÇÃO
    // =====================================================

    $conexao->beginTransaction();


    // =====================================================
    // BUSCAR PRODUTO NO BANCO
    //
    // FOR UPDATE bloqueia temporariamente a linha do produto
    // durante a compra.
    // =====================================================

    $sqlProduto = "
        SELECT
            id_produto,
            nm_produto,
            preco,
            qtd_item
        FROM produto
        WHERE id_produto = :id_produto
        FOR UPDATE
    ";


    $stmtProduto =
        $conexao->prepare($sqlProduto);


    // =====================================================
    // VALIDAR PRODUTOS E CALCULAR TOTAL
    // =====================================================

    $itensValidados = [];

    $valorTotal = 0;


    foreach ($itens as $item) {

        $idProduto =
            (int) (
                $item["id_produto"] ?? 0
            );


        $quantidade =
            (int) (
                $item["quantidade"] ?? 0
            );


        // -------------------------
        // Validar ID e quantidade
        // -------------------------

        if (
            $idProduto <= 0 ||
            $quantidade <= 0
        ) {

            throw new Exception(
                "Produto inválido no pedido."
            );
        }


        // -------------------------
        // Buscar produto
        // -------------------------

        $stmtProduto->execute([
            ":id_produto" =>
                $idProduto
        ]);


        $produto =
            $stmtProduto->fetch();


        if (!$produto) {

            throw new Exception(
                "Produto de ID " .
                $idProduto .
                " não encontrado."
            );
        }


        // -------------------------
        // Dados REAIS do banco
        // -------------------------

        $nomeProduto =
            $produto["nm_produto"];


        $preco =
            (float) $produto["preco"];


        $estoque =
            (int) $produto["qtd_item"];


        // -------------------------
        // Verificar estoque
        // -------------------------

        if ($estoque <= 0) {

            throw new Exception(
                'O produto "' .
                $nomeProduto .
                '" está sem estoque.'
            );
        }


        if ($quantidade > $estoque) {

            throw new Exception(
                'Estoque insuficiente para "' .
                $nomeProduto .
                '". Disponível: ' .
                $estoque .
                "."
            );
        }


        // -------------------------
        // Calcular subtotal
        // -------------------------

        $subtotal =
            $preco * $quantidade;


        $valorTotal +=
            $subtotal;


        // -------------------------
        // Guardar item validado
        // -------------------------

        $itensValidados[] = [

            "id_produto" =>
                $idProduto,

            "nome" =>
                $nomeProduto,

            "quantidade" =>
                $quantidade,

            "preco" =>
                $preco,

            "subtotal" =>
                $subtotal

        ];
    }


    // =====================================================
    // CRIAR PEDIDO
    // =====================================================

    $sqlPedido = "
        INSERT INTO pedido
        (
            id_cliente,
            data_pedido,
            valor_total,
            status
        )
        VALUES
        (
            :id_cliente,
            CURRENT_TIMESTAMP,
            :valor_total,
            'Pendente'
        )
        RETURNING id_pedido
    ";


    $stmtPedido =
        $conexao->prepare(
            $sqlPedido
        );


    $stmtPedido->execute([

        ":id_cliente" =>
            $idCliente,

        ":valor_total" =>
            $valorTotal

    ]);


    $idPedido =
        $stmtPedido->fetchColumn();


    if (!$idPedido) {

        throw new Exception(
            "Não foi possível criar o pedido."
        );
    }


    // =====================================================
    // PREPARAR INSERT DOS ITENS
    // =====================================================

    $sqlItem = "
        INSERT INTO item_pedido
        (
            id_pedido,
            id_produto,
            quantidade,
            preco_unitario,
            subtotal
        )
        VALUES
        (
            :id_pedido,
            :id_produto,
            :quantidade,
            :preco_unitario,
            :subtotal
        )
    ";


    $stmtItem =
        $conexao->prepare(
            $sqlItem
        );


    // =====================================================
    // PREPARAR BAIXA DO ESTOQUE
    // =====================================================

    $sqlEstoque = "
        UPDATE produto
        SET qtd_item =
            qtd_item - :quantidade
        WHERE id_produto =
            :id_produto
    ";


    $stmtEstoque =
        $conexao->prepare(
            $sqlEstoque
        );


    // =====================================================
    // INSERIR ITENS + DIMINUIR ESTOQUE
    // =====================================================

    foreach (
        $itensValidados as $item
    ) {

        // -------------------------
        // Registrar item
        // -------------------------

        $stmtItem->execute([

            ":id_pedido" =>
                $idPedido,

            ":id_produto" =>
                $item["id_produto"],

            ":quantidade" =>
                $item["quantidade"],

            ":preco_unitario" =>
                $item["preco"],

            ":subtotal" =>
                $item["subtotal"]

        ]);


        // -------------------------
        // Baixar estoque
        // -------------------------

        $stmtEstoque->execute([

            ":quantidade" =>
                $item["quantidade"],

            ":id_produto" =>
                $item["id_produto"]

        ]);

    }


    // =====================================================
    // CONFIRMAR TUDO
    // =====================================================

    $conexao->commit();


    // =====================================================
    // RESPOSTA
    // =====================================================

    echo json_encode([

        "sucesso" => true,

        "mensagem" =>
            "Pedido realizado com sucesso!",

        "id_pedido" =>
            (int) $idPedido,

        "valor_total" =>
            $valorTotal

    ]);


} catch (Throwable $erro) {


    // =====================================================
    // SE QUALQUER COISA DER ERRADO, DESFAZER TUDO
    // =====================================================

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