<?php
declare(strict_types=1);

/**
 * ZORA — Métricas e Relatórios do Painel Administrativo (Dashboard)
 */

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Vary: Origin');

// Lista de origens permitidas
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
        'path' => '/',
        'secure' => $isHttps,
        'httponly' => true,
        'samesite' => $isHttps ? 'None' : 'Lax',
    ]);

    session_start();
}

// ==========================================
// VERIFICAR PERMISSÃO DE ADMINISTRAÇÃO
// ==========================================

$isAdmin = filter_var($_SESSION['is_admin'] ?? false, FILTER_VALIDATE_BOOLEAN);

if (!isset($_SESSION['id_cliente']) || !$isAdmin) {
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_write_close();
    }

    http_response_code(403);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Acesso negado. Apenas administradores podem visualizar o dashboard.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

session_write_close();

// Carregar conexão com o banco de dados
$caminhoConexao = file_exists(__DIR__ . '/src/conexao.php')
    ? __DIR__ . '/src/conexao.php'
    : __DIR__ . '/conexao.php';

if (!is_file($caminhoConexao)) {
    http_response_code(500);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Erro interno de configuração do banco de dados.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once $caminhoConexao;

try {
    if (!isset($conexao) || !($conexao instanceof PDO)) {
        throw new RuntimeException('A conexão PDO não foi inicializada corretamente.');
    }

    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
        header('Allow: GET, OPTIONS');
        http_response_code(405);
        echo json_encode([
            'sucesso' => false,
            'mensagem' => 'Método não permitido. Utilize GET.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // ==========================================
    // RESUMO GERAL
    // ==========================================

    $sqlResumo = '
        SELECT
            COUNT(*) AS total_pedidos,
            COALESCE(SUM(valor_total), 0) AS faturamento,
            COALESCE(AVG(valor_total), 0) AS ticket_medio
        FROM pedido
    ';

    $stmtResumo = $conexao->query($sqlResumo);
    $resumo = $stmtResumo->fetch(PDO::FETCH_ASSOC);

    // ==========================================
    // QUANTIDADE DE PRODUTOS VENDIDOS
    // ==========================================

    $sqlVendidos = '
        SELECT
            COALESCE(SUM(quantidade), 0) AS produtos_vendidos
        FROM item_pedido
    ';

    $stmtVendidos = $conexao->query($sqlVendidos);
    $vendidos = $stmtVendidos->fetch(PDO::FETCH_ASSOC);

    // ==========================================
    // PRODUTO MAIS VENDIDO
    // ==========================================

    $sqlMaisVendido = '
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
    ';

    $stmtMaisVendido = $conexao->query($sqlMaisVendido);
    $maisVendido = $stmtMaisVendido->fetch(PDO::FETCH_ASSOC);

    // ==========================================
    // PEDIDOS RECENTES
    // ==========================================

    $sqlPedidos = '
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
        LIMIT 10
    ';

    $stmtPedidos = $conexao->query($sqlPedidos);
    $dadosPedidos = $stmtPedidos->fetchAll(PDO::FETCH_ASSOC);

    $pedidos = [];

    foreach ($dadosPedidos as $pedido) {
        $dataFormatada = $pedido['data_pedido']
            ? date('d/m/Y H:i', strtotime($pedido['data_pedido']))
            : '-';

        $pedidos[] = [
            'id_pedido'        => (int) $pedido['id_pedido'],
            'cliente'          => $pedido['cliente'],
            'data_pedido'      => $dataFormatada,
            'valor_total'      => round((float) $pedido['valor_total'], 2),
            'status'           => $pedido['status'] ?? 'Pendente',
            'quantidade_itens' => (int) $pedido['quantidade_itens']
        ];
    }

    // ==========================================
    // RESPOSTA
    // ==========================================

    http_response_code(200);
    echo json_encode([
        'sucesso' => true,
        'resumo' => [
            'faturamento'       => round((float) ($resumo['faturamento'] ?? 0), 2),
            'total_pedidos'     => (int) ($resumo['total_pedidos'] ?? 0),
            'produtos_vendidos' => (int) ($vendidos['produtos_vendidos'] ?? 0),
            'ticket_medio'      => round((float) ($resumo['ticket_medio'] ?? 0), 2)
        ],
        'mais_vendido' => $maisVendido ? [
            'nome'       => $maisVendido['nm_produto'],
            'quantidade' => (int) $maisVendido['quantidade_vendida']
        ] : null,
        'pedidos' => $pedidos
    ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);

} catch (Throwable $erro) {
    error_log('ZORA: erro ao carregar métricas do dashboard: ' . $erro->getMessage());

    http_response_code(500);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Não foi possível carregar as informações do painel.'
    ], JSON_UNESCAPED_UNICODE);
}
