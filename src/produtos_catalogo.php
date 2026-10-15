<?php
declare(strict_types=1);

/**
 * ZORA — Listagem de Produtos
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

// =============================================
// VERIFICAR MÉTODO HTTP
// =============================================

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    header('Allow: GET, OPTIONS');
    http_response_code(405);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Método não permitido. Utilize GET.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// =============================================
// LOCALIZAR E CARREGAR CONEXÃO
// =============================================

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

    // =============================================
    // CONSULTA AO POSTGRESQL
    // =============================================

    $sql = '
        SELECT
            id_produto,
            nm_produto,
            preco,
            qtd_item,
            categoria,
            imagem,
            descricao
        FROM public.produto
        ORDER BY id_produto ASC
    ';

    $stmt = $conexao->prepare($sql);
    $stmt->execute();

    $produtos = [];

    while ($produto = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $produtos[] = [
            'id_produto' => (int) $produto['id_produto'],
            'nome'       => $produto['nm_produto'],
            'preco'      => round((float) $produto['preco'], 2),
            'estoque'    => (int) $produto['qtd_item'],
            'qtd_item'   => (int) $produto['qtd_item'], // Mantido para compatibilidade legado
            'categoria'  => $produto['categoria'] ?? 'Geral',
            'imagem'     => $produto['imagem'] ?? 'default.jpg',
            'descricao'  => $produto['descricao'] ?? ''
        ];
    }

    http_response_code(200);
    echo json_encode([
        'sucesso'  => true,
        'produtos' => $produtos
    ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);

} catch (Throwable $erro) {
    error_log('ZORA: erro ao listar produtos: ' . $erro->getMessage());

    http_response_code(500);
    echo json_encode([
        'sucesso'  => false,
        'mensagem' => 'Não foi possível carregar a lista de produtos.'
    ], JSON_UNESCAPED_UNICODE);
}
