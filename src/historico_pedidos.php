<?php
declare(strict_types=1);

/**
 * ZORA — Histórico de Pedidos do Cliente (Supabase / PostgreSQL)
 * Localização: src/historico_pedidos.php
 */

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Vary: Origin');

// Lista de origens permitidas (CORS)
$origensPermitidas = [
    'https://loja-zora.onrender.com',
    'http://localhost:3000',
    'http://localhost:8080'
];

$origem = $_SERVER['HTTP_ORIGIN'] ?? null;
$origemPermitida = ($origem !== null && in_array($origem, $origensPermitidas, true)) || $origem === null;

if ($origem !== null && !$origemPermitida) {
    http_response_code(403);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Origem não autorizada.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($origem !== null && $origemPermitida) {
    header('Access-Control-Allow-Origin: ' . $origem);
} else {
    header('Access-Control-Allow-Origin: https://loja-zora.onrender.com');
}

header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Tratamento de Preflight CORS (OPTIONS)
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Suporte a HTTPS no Proxy Reverso do Render
$httpsDireto = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== '' &&
    strtolower((string) $_SERVER['HTTPS']) !== 'off';
$protoEncaminhado = strtolower(trim(explode(',', (string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ''))[0]));
$isHttps = $httpsDireto || $protoEncaminhado === 'https';

if ($isHttps) {
    $_SERVER['HTTPS'] = 'on';
}

if (session_status() !== PHP_SESSION_ACTIVE) {
    ini_set('session.use_only_cookies', '1');
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_trans_sid', '0');

    session_set_cookie_params([
        'lifetime' => 86400,
        'path'     => '/',
        'secure'   => $isHttps,
        'httponly' => true,
        'samesite' => $isHttps ? 'None' : 'Lax',
    ]);

    session_start();
}

// Localiza o conexao.php no mesmo diretório ou parentes próximos
$caminhoConexao = __DIR__ . '/conexao.php';

if (!file_exists($caminhoConexao)) {
    http_response_code(500);
    echo json_encode([
        "sucesso"  => false,
        "mensagem" => "Não foi possível encontrar conexao.php"
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once $caminhoConexao;

try {
    if (!isset($conexao) || !($conexao instanceof PDO)) {
        throw new RuntimeException('A conexão PDO não foi inicializada corretamente.');
    }

    if (($_SERVER["REQUEST_METHOD"] ?? 'GET') !== "GET") {
        header('Allow: GET, OPTIONS');
        http_response_code(405);
        echo json_encode([
            "sucesso"  => false,
            "mensagem" => "Método não permitido. Utilize GET."
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // VERIFICAR LOGIN (Sessão PHP ou Parâmetro GET de Fallback)
    $idCliente = $_SESSION["id_cliente"] ?? $_SESSION["cliente_id"] ?? $_SESSION["usuario_id"] ?? null;

    if (!$idCliente && isset($_GET['id_cliente'])) {
        $idCliente = $_GET['id_cliente'];
    }

    if (!$idCliente || !is_scalar($idCliente) || (int) $idCliente <= 0) {
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_write_close();
        }
        http_response_code(401);
        echo json_encode([
            "sucesso"  => false,
            "mensagem" => "Usuário não está logado."
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $idClienteInt = (int) $idCliente;

    // BUSCAR PEDIDOS DO CLIENTE
    $sqlPedidos = "
        SELECT
            id_pedido,
            data_pedido,
            valor_total,
            status,
            forma_pagamento
        FROM public.pedido
        WHERE id_cliente = :id_cliente
        ORDER BY data_pedido DESC, id_pedido DESC
    ";

    $stmtPedidos = $conexao->prepare($sqlPedidos);
    $stmtPedidos->execute([
        ":id_cliente" => $idClienteInt
    ]);

    $pedidos = $stmtPedidos->fetchAll(PDO::FETCH_ASSOC);

    // PREPARAR BUSCA DOS ITENS VINCULADOS AOS PRODUTOS
    $sqlItens = "
        SELECT
            ip.id_item_pedido,
            ip.id_produto,
            ip.quantidade,
            ip.preco_unitario,
            ip.subtotal,
            COALESCE(p.nm_produto, 'Produto ZORA') as nm_produto,
            p.imagem
        FROM public.item_pedido ip
        LEFT JOIN public.produto p
            ON p.id_produto = ip.id_produto
        WHERE ip.id_pedido = :id_pedido
        ORDER BY ip.id_item_pedido ASC
    ";

    $stmtItens = $conexao->prepare($sqlItens);
    $historico = [];

    // MONTAR ESTRUTURA DO HISTÓRICO
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
            $timestamp = strtotime((string) $pedido["data_pedido"]);
            if ($timestamp !== false) {
                $dataFormatada = date("d/m/Y H:i", $timestamp);
            }
        }

        $historico[] = [
            "id_pedido"       => (int) $pedido["id_pedido"],
            "data"            => $dataFormatada,
            "data_raw"        => $pedido["data_pedido"],
            "total"           => (float) $pedido["valor_total"],
            "status"          => $pedido["status"] ?? "Pendente",
            "forma_pagamento" => $pedido["forma_pagamento"] ?? "Não informada",
            "produtos"        => $produtos
        ];
    }

    session_write_close();

    http_response_code(200);
    echo json_encode([
        "sucesso" => true,
        "pedidos" => $historico
    ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);

} catch (Throwable $erro) {
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_write_close();
    }

    http_response_code(500);
    echo json_encode([
        "sucesso"  => false,
        "mensagem" => "Erro ao carregar histórico: " . $erro->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
