<?php

session_start();

header("Content-Type: application/json; charset=UTF-8");

// Inclui o arquivo de conexão garantindo o caminho absoluto a partir da raiz
require_once __DIR__ . "/conexao.php";

try {

    // =========================
    // VERIFICAR MÉTODO HTTP
    // =========================

    if ($_SERVER["REQUEST_METHOD"] !== "GET") {

        http_response_code(405);

        echo json_encode([
            "sucesso" => false,
            "mensagem" => "Método não permitido. Utilize GET."
        ]);

        exit;
    }


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

    $idCliente = (int) $_SESSION["id_cliente"];


    // =========================
    // BUSCAR PEDIDOS DO CLIENTE
    // =========================

    $sqlPedidos = "
        SELECT
            id_pedido,
            data_pedido,
            valor_total,
            status
        FROM pedido
        WHERE id_cliente = :id_cliente
        ORDER BY data_pedido DESC, id_pedido DESC
    ";

    $stmtPedidos = $conexao->prepare($sqlPedidos);

    $stmtPedidos->execute([
        ":id_cliente" => $idCliente
    ]);

    $pedidos = $stmtPedidos->fetchAll(PDO::FETCH_ASSOC);


    // =========================
    // PREPARAR BUSCA DOS ITENS
    // =========================

    $sqlItens = "
        SELECT
            ip.id_item_pedido,
            ip.id_produto,
            ip.quantidade,
            ip.preco_unitario,
            ip.subtotal,
            p.nm_produto,
            p.imagem
        FROM item_pedido ip
        INNER JOIN produto p
            ON p.id_produto = ip.id_produto
        WHERE ip.id_pedido = :id_pedido
        ORDER BY ip.id_item_pedido ASC
    ";

    $stmtItens = $conexao->prepare($sqlItens);

    $historico = [];


    // =========================
    // MONTAR HISTÓRICO COMPLETO
    // =========================

    foreach ($pedidos as $pedido) {

        $stmtItens->execute([
            ":id_pedido" => $pedido["id_pedido"]
        ]);

        $itens = $stmtItens->fetchAll(PDO::FETCH_ASSOC);

        $produtos = [];

        foreach ($itens as $item) {

            $produtos[] = [
                "id_produto" => (int) $item["id_produto"],
                "nome" => $item["nm_produto"],
                "imagem" => $item["imagem"] ?? null,
                "quantidade" => (int) $item["quantidade"],
                "preco" => (float) $item["preco_unitario"],
                "subtotal" => (float) $item["subtotal"]
            ];

        }

        // Formata data do pedido para exibição no front-end
        $dataFormatada = $pedido["data_pedido"]
            ? date("d/m/Y H:i", strtotime($pedido["data_pedido"]))
            : "-";

        $historico[] = [
            "id_pedido" => (int) $pedido["id_pedido"],
            "data" => $dataFormatada,
            "data_raw" => $pedido["data_pedido"],
            "total" => (float) $pedido["valor_total"],
            "status" => $pedido["status"] ?? "Pendente",
            "produtos" => $produtos
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
        "mensagem" => $erro->getMessage()
    ]);

}
