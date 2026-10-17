<?php

// Garante que qualquer erro ou aviso do PHP não corrompa o JSON de resposta
ini_set('display_errors', 0);
error_reporting(E_ALL);

header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-cache, no-store, must-revalidate");

// Inclui a conexão garantindo o caminho dinâmico a partir da raiz ou subpastas
$caminhos_conexao = [
    __DIR__ . "/conexao.php",
    __DIR__ . "/src/conexao.php",
    __DIR__ . "/../conexao.php"
];

$caminho_conexao = null;
foreach ($caminhos_conexao as $caminho) {
    if (file_exists($caminho)) {
        $caminho_conexao = $caminho;
        break;
    }
}

if (!$caminho_conexao) {
    http_response_code(500);
    echo json_encode([
        "sucesso" => false,
        "mensagem" => "Erro crítico: Arquivo de conexão não encontrado."
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once $caminho_conexao;

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
    $resumo = $stmtResumo->fetch(PDO::FETCH_ASSOC);


    // ==========================================
    // QUANTIDADE DE PRODUTOS VENDIDOS
    // ==========================================

    $sqlVendidos = "
        SELECT
            COALESCE(SUM(quantidade), 0) AS produtos_vendidos
        FROM item_pedido
    ";

    $stmtVendidos = $conexao->query($sqlVendidos);
    $vendidos = $stmtVendidos->fetch(PDO::FETCH_ASSOC);


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

    $stmtMaisVendido = $conexao->query($sqlMaisVendido);
    $maisVendido = $stmtMaisVendido->fetch(PDO::FETCH_ASSOC);


    // ==========================================
    // TODOS OS PEDIDOS (SEM LIMIT 10)
    // ==========================================

    $sqlPedidos = "
        SELECT
            pe.id_pedido,
            pe.data_pedido,
            pe.valor_total,
            pe.status,
            c.nome AS cliente,
            COALESCE(SUM(ip.quantidade), 0) AS quantidade_itens
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
    ";

    $stmtPedidos = $conexao->query($sqlPedidos);
    $dadosPedidos = $stmtPedidos->fetchAll(PDO::FETCH_ASSOC);

    $pedidos = [];

    foreach ($dadosPedidos as $pedido) {

        // Formata data caso venha no padrão timestamp do banco
        $dataFormatada = $pedido["data_pedido"]
            ? date("d/m/Y H:i", strtotime($pedido["data_pedido"]))
            : "-";

        $pedidos[] = [
            "id_pedido" => (int) $pedido["id_pedido"],
            "cliente" => $pedido["cliente"],
            "data_pedido" => $dataFormatada,
            "valor_total" => round((float) $pedido["valor_total"], 2),
            "status" => $pedido["status"] ?? "Pendente",
            "quantidade_itens" => (int) $pedido["quantidade_itens"]
        ];
    }


    // ==========================================
    // RESPOSTA
    // ==========================================

    echo json_encode([
        "sucesso" => true,
        "resumo" => [
            "faturamento" => round((float) ($resumo["faturamento"] ?? 0), 2),
            "total_pedidos" => (int) ($resumo["total_pedidos"] ?? 0),
            "produtos_vendidos" => (int) ($vendidos["produtos_vendidos"] ?? 0),
            "ticket_medio" => round((float) ($resumo["ticket_medio"] ?? 0), 2)
        ],
        "mais_vendido" => $maisVendido ? [
            "nome" => $maisVendido["nm_produto"],
            "quantidade" => (int) $maisVendido["quantidade_vendida"]
        ] : null,
        "pedidos" => $pedidos
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $erro) {

    http_response_code(500);

    echo json_encode([
        "sucesso" => false,
        "mensagem" => $erro->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
