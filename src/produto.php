<?php
declare(strict_types=1);

/**
 * ZORA — Consulta de Produto Específico por ID (Supabase / PostgreSQL)
 * Localização: src/produto.php
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

// Localizar e carregar conexão
$caminhoConexao = __DIR__ . '/conexao.php';

if (!file_exists($caminhoConexao)) {
    http_response_code(500);
    echo json_encode([
        "sucesso" => false,
        "mensagem" => "Não foi possível localizar o arquivo conexao.php no servidor."
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once $caminhoConexao;

try {
    if (!isset($conexao) || !($conexao instanceof PDO)) {
        throw new Exception("A conexão PDO não foi inicializada corretamente em conexao.php.");
    }

    if (($_SERVER["REQUEST_METHOD"] ?? 'GET') !== "GET") {
        header('Allow: GET, OPTIONS');
        http_response_code(405);
        echo json_encode([
            "sucesso" => false,
            "mensagem" => "Método não permitido. Utilize GET."
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // PEGAR E VALIDAR ID DO PRODUTO
    $idProduto = $_GET["id"] ?? null;

    if (!$idProduto || !is_numeric($idProduto) || (int) $idProduto <= 0) {
        http_response_code(400);
        echo json_encode([
            "sucesso" => false,
            "mensagem" => "ID do produto é inválido ou não foi fornecido."
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $idProduto = (int) $idProduto;

    // BUSCAR PRODUTO NO POSTGRESQL (SUPABASE)
    $sql = "
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
        FROM public.produto p
        LEFT JOIN public.estoque e 
            ON e.id_item_estoque = p.id_item_estoque
        LEFT JOIN public.fornecedor f 
            ON f.id_item_estoque = e.id_item_estoque
        WHERE p.id_produto = :id_produto
        LIMIT 1
    ";

    $stmt = $conexao->prepare($sql);
    $stmt->execute([":id_produto" => $idProduto]);

    $produto = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$produto) {
        http_response_code(404);
        echo json_encode([
            "sucesso" => false,
            "mensagem" => "Produto ID {$idProduto} não foi encontrado no banco de dados."
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // CÁLCULO DE ESTOQUE E REGRA DOS 40%
    $qtdAtual = (int) ($produto["qtd_item"] ?? 0);
    $qtdMax = (int) ($produto["qtd_max_produto"] ?? 100);
    $percentualRestante = $qtdMax > 0 ? round(($qtdAtual / $qtdMax) * 100, 1) : 0;

    http_response_code(200);
    echo json_encode([
        "sucesso" => true,
        "produto" => [
            "id_produto"         => (int) $produto["id_produto"],
            "nome"               => (string) ($produto["nm_produto"] ?? "Produto ZORA"),
            "nm_produto"         => (string) ($produto["nm_produto"] ?? "Produto ZORA"),
            "preco"              => round((float) ($produto["preco"] ?? 0), 2),
            "estoque"            => $qtdAtual,
            "qtd_item"           => $qtdAtual,
            "qtd_max_produto"    => $qtdMax,
            "percentual_estoque" => $percentualRestante,
            "estoque_baixo"      => ($percentualRestante <= 40),
            "esgotado"           => ($qtdAtual <= 0),
            "categoria"          => (string) ($produto["categoria"] ?? "Geral"),
            "imagem"             => (string) ($produto["imagem"] ?? "Logo 1.png"),
            "descricao"          => (string) ($produto["descricao"] ?? "Peça exclusiva ZORA com caimento e modelagem impecáveis."),
            "id_item_estoque"    => $produto["id_item_estoque"] ? (int) $produto["id_item_estoque"] : null,
            "id_fornecedor"      => $produto["id_fornecedor"] ? (int) $produto["id_fornecedor"] : null,
            "fornecedor"         => $produto["fornecedor_nome"] ?? "Não cadastrado",
            "contato"            => $produto["fornecedor_contato"] ?? "-"
        ]
    ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);

} catch (PDOException $erro) {
    http_response_code(500);
    echo json_encode([
        "sucesso"     => false,
        "erro_codigo" => "ERRO_BANCO_DADOS",
        "mensagem"    => "Erro de Banco de Dados: " . $erro->getMessage()
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $erro) {
    http_response_code(500);
    echo json_encode([
        "sucesso"     => false,
        "erro_codigo" => "ERRO_SERVIDOR",
        "mensagem"    => "Erro Interno: " . $erro->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
