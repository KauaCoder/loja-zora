<?php

session_start();

header("Content-Type: application/json; charset=UTF-8");

require_once "conexao.php";

try {

    // =========================
    // VERIFICAR LOGIN
    // =========================

    if (!isset($_SESSION["id_cliente"])) {

        http_response_code(401);

        echo json_encode([
            "sucesso" => false,
            "mensagem" => "Usuário não está logado."
        ]);

        exit;
    }


    $idCliente =
        (int) $_SESSION["id_cliente"];


    // =========================
    // BUSCAR PEDIDOS
    // =========================

    $sqlPedidos = "
        SELECT
            id_pedido,
            data_pedido,
            valor_total,
            status
        FROM pedido
        WHERE id_cliente = :id_cliente
        ORDER BY data_pedido DESC
    ";


    $stmtPedidos =
        $conexao->prepare($sqlPedidos);


    $stmtPedidos->execute([
        ":id_cliente" => $idCliente
    ]);


    $pedidos =
        $stmtPedidos->fetchAll();


    // =========================
    // BUSCAR ITENS
    // =========================

    $sqlItens = "
        SELECT
            ip.id_item_pedido,
            ip.id_produto,
            ip.quantidade,
            ip.preco_unitario,
            ip.subtotal,
            p.nm_produto
        FROM item_pedido ip
        INNER JOIN produto p
            ON p.id_produto = ip.id_produto
        WHERE ip.id_pedido = :id_pedido
        ORDER BY ip.id_item_pedido
    ";


    $stmtItens =
        $conexao->prepare($sqlItens);


    $historico = [];


    foreach ($pedidos as $pedido) {

        $stmtItens->execute([
            ":id_pedido" =>
                $pedido["id_pedido"]
        ]);


        $itens =
            $stmtItens->fetchAll();


        $produtos = [];


        foreach ($itens as $item) {

            $produtos[] = [

                "id_produto" =>
                    (int) $item["id_produto"],

                "nome" =>
                    $item["nm_produto"],

                "quantidade" =>
                    (int) $item["quantidade"],

                "preco" =>
                    (float) $item["preco_unitario"],

                "subtotal" =>
                    (float) $item["subtotal"]

            ];

        }


        $historico[] = [

            "id_pedido" =>
                (int) $pedido["id_pedido"],

            "data" =>
                $pedido["data_pedido"],

            "total" =>
                (float) $pedido["valor_total"],

            "status" =>
                $pedido["status"],

            "produtos" =>
                $produtos

        ];

    }


    // =========================
    // RESPOSTA
    // =========================

    echo json_encode([

        "sucesso" => true,

        "pedidos" => $historico

    ]);


} catch (Throwable $erro) {

    http_response_code(500);

    echo json_encode([

        "sucesso" => false,

        "mensagem" =>
            $erro->getMessage()

    ]);

}