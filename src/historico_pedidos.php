<?php
/* =========================================================
   ZORA - HISTÓRICO DE PEDIDOS DO CLIENTE (Supabase / PostgreSQL)
   ========================================================= */

$origem = $_SERVER['HTTP_ORIGIN'] ?? '*';
if ($origem !== '*') {
    header("Access-Control-Allow-Origin: $origem");
    header("Access-Control-Allow-Credentials: true");
} else {
    header("Access-Control-Allow-Origin: *");
}

header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$isHttps = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ||
           (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');

if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 86400,
        'path'     => '/',
        'secure'   => $isHttps,
        'httponly' => true,
        'samesite' => $isHttps ? 'None' : 'Lax'
    ]);
    session_start();
}

header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-cache, no-store, must-revalidate");

// Localiza o conexao.php dinamicamente em subpastas ou na raiz
$caminhos_conexao = [
    __DIR__ . '/conexao.php',
    __DIR__ . '/src/conexao.php',
    __DIR__ . '/../conexao.php',
    __DIR__ . '/../../conexao.php'
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
        "sucesso"  => false,
        "mensagem" => "Não foi possível encontrar conexao.php"
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once $caminho_conexao;

try {

    if ($_SERVER["REQUEST_METHOD"] !== "GET") {
        http_response_code(405);
        echo json_encode([
            "sucesso"  => false,
            "mensagem" => "Método não permitido. Utilize GET."
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // =========================================================
    // VERIFICAR LOGIN (Sessão PHP ou Parâmetro GET de Fallback)
    // =========================================================
    $idCliente = $_SESSION["id_cliente"] ?? $_SESSION["cliente_id"] ?? $_SESSION["usuario_id"] ?? null;

    if (!$idCliente && isset($_GET['id_cliente'])) {
        $idCliente = $_GET['id_cliente'];
    }

    if (!$idCliente || !is_scalar($idCliente) || (int) $idCliente <= 0) {
        http_response_code(401);
        echo json_encode([
            "sucesso"  => false,
            "mensagem" => "Usuário não está logado."
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $idClienteInt = (int) $idCliente;

    // =========================================================
    // BUSCAR PEDIDOS DO CLIENTE
    // =========================================================
    $sqlPedidos = "
        SELECT
            id_pedido,
            data_pedido,
            valor_total,
            status
        FROM public.pedido
        WHERE id_cliente = :id_cliente
        ORDER BY data_pedido DESC, id_pedido DESC
    ";

    $stmtPedidos = $conexao->prepare($sqlPedidos);
    $stmtPedidos->execute([
        ":id_cliente" => $idClienteInt
    ]);

    $pedidos = $stmtPedidos->fetchAll(PDO::FETCH_ASSOC);

    // =========================================================
    // PREPARAR BUSCA DOS ITENS VINCULADOS AOS PRODUTOS
    // =========================================================
    $sqlItens = "
        SELECT
            ip.id_item_pedido,
            ip.id_produto,
            ip.quantidade,
            ip.preco_unitario,
            ip.subtotal,
            COALESCE(p.nm_produto, p.nome, 'Produto ZORA') as nm_produto,
            p.imagem
        FROM public.item_pedido ip
        LEFT JOIN public.produto p
            ON p.id_produto = ip.id_produto
        WHERE ip.id_pedido = :id_pedido
        ORDER BY ip.id_item_pedido ASC
    ";

    $stmtItens = $conexao->prepare($sqlItens);
    $historico = [];

    // =========================================================
    // MONTAR ESTRUTURA DO HISTÓRICO
    // =========================================================
    foreach ($pedidos as $pedido) {

        $stmtItens->execute([
            ":id_pedido" => $pedido["id_pedido"]
        ]);

        $itens = $stmtItens->fetchAll(PDO::FETCH_ASSOC);
        $produtos = [];

        foreach ($itens as $item) {
            $produtos[] = [
                "id_produto" => (int) $item["id_produto"],
                "nome"       => $item["nm_produto"],
                "imagem"     => $item["imagem"] ?? null,
                "quantidade" => (int) $item["quantidade"],
                "preco"      => (float) $item["preco_unitario"],
                "subtotal"   => (float) $item["subtotal"]
            ];
        }

        // Formatação da data do pedido
        $dataFormatada = "-";
        if (!empty($pedido["data_pedido"])) {
            $timestamp = strtotime($pedido["data_pedido"]);
            if ($timestamp !== false) {
                $dataFormatada = date("d/m/Y H:i", $timestamp);
            }
        }

        $historico[] = [
            "id_pedido" => (int) $pedido["id_pedido"],
            "data"      => $dataFormatada,
            "data_raw"  => $pedido["data_pedido"],
            "total"     => (float) $pedido["valor_total"],
            "status"    => $pedido["status"] ?? "Pendente",
            "produtos"  => $produtos
        ];
    }

    // =========================================================
    // RESPOSTA EM JSON
    // =========================================================
    echo json_encode([
        "sucesso" => true,
        "pedidos" => $historico
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $erro) {

    http_response_code(500);
    echo json_encode([
        "sucesso"  => false,
        "mensagem" => "Erro ao carregar histórico: " . $erro->getMessage(),
        "detalhes" => [
            "arquivo" => $erro->getFile(),
            "linha" => $erro->getLine()
        ]
    ], JSON_UNESCAPED_UNICODE);

}
