<?php
declare(strict_types=1);

/**
 * ZORA — Detalhes do Produto
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

// Suporte a HTTPS no Proxy Reverso do Render para Sessão
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

// Localiza e carrega a conexão com o banco de dados
$caminhoConexao = file_exists(__DIR__ . '/src/conexao.php')
    ? __DIR__ . '/src/conexao.php'
    : __DIR__ . '/conexao.php';

if (!is_file($caminhoConexao)) {
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_write_close();
    }
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

    // =============================================
    // VERIFICAR MÉTODO HTTP
    // =============================================

    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_write_close();
        }
        header('Allow: GET, OPTIONS');
        http_response_code(405);
        echo json_encode([
            'sucesso' => false,
            'mensagem' => 'Método não permitido. Utilize GET.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // =============================================
    // PEGAR E VALIDAR ID
    // =============================================

    $idProdutoRaw = $_GET['id'] ?? null;

    if (!$idProdutoRaw || !is_numeric($idProdutoRaw) || (int) $idProdutoRaw <= 0) {
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_write_close();
        }
        http_response_code(400);
        echo json_encode([
            'sucesso' => false,
            'mensagem' => 'ID do produto é inválido.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $idProduto = (int) $idProdutoRaw;

    // Apenas administradores enxergam informações sensíveis do fornecedor
    $isAdmin = filter_var($_SESSION['is_admin'] ?? false, FILTER_VALIDATE_BOOLEAN);

    if (session_status() === PHP_SESSION_ACTIVE) {
        session_write_close();
    }

    // =============================================
    // BUSCAR PRODUTO NO POSTGRESQL
    // =============================================

    $sql = '
        SELECT
            p.id_produto,
            p.nm_produto,
            p.preco,
            p.qtd_item,
            p.categoria,
            p.imagem,
            p.descricao,
            p.id_item_estoque,
            COALESCE(e.qtd_max_produto, 100) AS qtd_max_produto,
            f.id_fornecedor,
            f.nome AS fornecedor_nome,
            f.contato AS fornecedor_contato
        FROM produto p
        LEFT JOIN estoque e 
            ON e.id_item_estoque = p.id_item_estoque
        LEFT JOIN fornecedor f 
            ON f.id_item_estoque = e.id_item_estoque
        WHERE p.id_produto = :id_produto
        LIMIT 1
    ';

    $stmt = $conexao->prepare($sql);
    $stmt->execute([':id_produto' => $idProduto]);
    $produto = $stmt->fetch(PDO::FETCH_ASSOC);

    // =============================================
    // PRODUTO NÃO ENCONTRADO
    // =============================================

    if (!$produto) {
        http_response_code(404);
        echo json_encode([
            'sucesso' => false,
            'mensagem' => 'Produto não encontrado no banco de dados.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // =============================================
    // CÁLCULO DE ESTOQUE E REGRAS
    // =============================================

    $qtdAtual = (int) $produto['qtd_item'];
    $qtdMax = (int) $produto['qtd_max_produto'];
    $percentualRestante = $qtdMax > 0 ? round(($qtdAtual / $qtdMax) * 100, 1) : 0;

    $respostaProduto = [
        'id_produto'         => (int) $produto['id_produto'],
        'nome'               => $produto['nm_produto'],
        'preco'              => round((float) $produto['preco'], 2),
        'estoque'            => $qtdAtual,
        'qtd_item'           => $qtdAtual, // Compatibilidade legado
        'qtd_max_produto'    => $qtdMax,
        'percentual_estoque' => $percentualRestante,
        'estoque_baixo'      => ($percentualRestante <= 40),
        'esgotado'           => ($qtdAtual <= 0),
        'categoria'          => $produto['categoria'] ?? 'Geral',
        'imagem'             => $produto['imagem'] ?? 'default.jpg',
        'descricao'          => $produto['descricao'] ?? '',
        'id_item_estoque'    => $produto['id_item_estoque'] ? (int) $produto['id_item_estoque'] : null
    ];

    if ($isAdmin) {
        $respostaProduto['id_fornecedor'] = $produto['id_fornecedor'] ? (int) $produto['id_fornecedor'] : null;
        $respostaProduto['fornecedor']    = $produto['fornecedor_nome'] ?? 'Não cadastrado';
        $respostaProduto['contato']       = $produto['fornecedor_contato'] ?? '-';
    }

    http_response_code(200);
    echo json_encode([
        'sucesso' => true,
        'produto' => $respostaProduto
    ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);

} catch (Throwable $erro) {
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_write_close();
    }

    error_log('ZORA: erro ao carregar produto ID ' . ($idProduto ?? 0) . ': ' . $erro->getMessage());

    http_response_code(500);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Não foi possível carregar os detalhes do produto.'
    ], JSON_UNESCAPED_UNICODE);
}
