<?php

header("Content-Type: application/json; charset=UTF-8");

include_once("../conexao.php");
try {

    // ==========================================
    // RESUMO GERAL
    // ==========================================

    $sqlResumo = "
        SELECT
            COUNT(*) AS total_pedidos,
            COALESCE(SUM(valor_total), 0) AS faturamento,
            COALESCE(AVG(valor_total), 0) AS ticket_medio
        FROM pedido
    ";

    $stmtResumo = $conexao->query($sqlResumo);

    $resumo = $stmtResumo->fetch();


    // ==========================================
    // QUANTIDADE DE PRODUTOS VENDIDOS
    // ==========================================

    $sqlVendidos = "
        SELECT
            COALESCE(SUM(quantidade), 0) AS produtos_vendidos
        FROM item_pedido
    ";

    $stmtVendidos = $conexao->query($sqlVendidos);

    $vendidos = $stmtVendidos->fetch();


    // ==========================================
    // PRODUTO MAIS VENDIDO
    // ==========================================

    $sqlMaisVendido = "
        SELECT
            p.nm_produto,
            SUM(ip.quantidade) AS quantidade_vendida

        FROM item_pedido ip

        JOIN produto p
            ON p.id_produto = ip.id_produto

        GROUP BY
            p.id_produto,
            p.nm_produto

        ORDER BY
            quantidade_vendida DESC,
            p.id_produto ASC

        LIMIT 1
    ";

    $stmtMaisVendido =
        $conexao->query($sqlMaisVendido);

    $maisVendido =
        $stmtMaisVendido->fetch();


    // ==========================================
    // PEDIDOS RECENTES
    // ==========================================

    $sqlPedidos = "
        SELECT
            pe.id_pedido,
            pe.data_pedido,
            pe.valor_total,
            pe.status,
            c.nome AS cliente,
            COALESCE(
                SUM(ip.quantidade),
                0
            ) AS quantidade_itens

        FROM pedido pe

        JOIN cliente c
            ON c.id_cliente = pe.id_cliente

        LEFT JOIN item_pedido ip
            ON ip.id_pedido = pe.id_pedido

        GROUP BY
            pe.id_pedido,
            pe.data_pedido,
            pe.valor_total,
            pe.status,
            c.id_cliente,
            c.nome

        ORDER BY
            pe.data_pedido DESC,
            pe.id_pedido DESC

        LIMIT 10
    ";

    $stmtPedidos =
        $conexao->query($sqlPedidos);

    $dadosPedidos =
        $stmtPedidos->fetchAll();


    $pedidos = [];

    foreach ($dadosPedidos as $pedido) {

        $pedidos[] = [

            "id_pedido" =>
                (int) $pedido["id_pedido"],

            "cliente" =>
                $pedido["cliente"],

            "data_pedido" =>
                $pedido["data_pedido"],

            "valor_total" =>
                (float) $pedido["valor_total"],

            "status" =>
                $pedido["status"],

            "quantidade_itens" =>
                (int) $pedido["quantidade_itens"]

        ];
    }


    // ==========================================
    // RESPOSTA
    // ==========================================

    echo json_encode([

        "sucesso" => true,

        "resumo" => [

            "faturamento" =>
                (float) $resumo["faturamento"],

            "total_pedidos" =>
                (int) $resumo["total_pedidos"],

            "produtos_vendidos" =>
                (int) $vendidos["produtos_vendidos"],

            "ticket_medio" =>
                (float) $resumo["ticket_medio"]

        ],

        "mais_vendido" =>
            $maisVendido
            ? [
                "nome" =>
                    $maisVendido["nm_produto"],

                "quantidade" =>
                    (int) $maisVendido["quantidade_vendida"]
            ]
            : null,

        "pedidos" =>
            $pedidos

    ]);

} catch (Throwable $erro) {

    http_response_code(500);

    echo json_encode([

        "sucesso" => false,

        "mensagem" =>
            $erro->getMessage()

    ]);
}