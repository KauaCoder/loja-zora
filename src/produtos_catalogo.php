<?php
declare(strict_types=1);

/**
 * ZORA — API de Catálogo de Produtos
 * Localização: src/produtos_catalogo.php
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

// 2. VALIDAÇÃO DO MÉTODO HTTP
if (($_SERVER["REQUEST_METHOD"] ?? 'GET') !== "GET") {
    header('Allow: GET, OPTIONS');
    http_response_code(405);
    echo json_encode([
        "sucesso"     => false,
        "erro_codigo" => "METODO_NAO_PERMITIDO",
        "mensagem"    => "Método não permitido. Esta rota aceita apenas requisições GET."
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// 3. BUSCA E CARREGAMENTO DO ARQUIVO DE CONEXÃO
$caminhoConexao = __DIR__ . '/conexao.php';

if (!file_exists($caminhoConexao)) {
    http_response_code(500);
    echo json_encode([
        "sucesso"     => false,
        "erro_codigo" => "CONEXAO_NAO_ENCONTRADA",
        "mensagem"    => "Não foi possível localizar o arquivo conexao.php no servidor."
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once $caminhoConexao;

// 4. EXECUÇÃO DA CONSULTA SQL E TRATAMENTO DE ERROS
try {
    if (!isset($conexao) || !($conexao instanceof PDO)) {
        throw new Exception("A variável \$conexao não foi definida ou não é uma instância válida do PDO.");
    }

    $sql = 'SELECT * FROM public.produto ORDER BY id_produto ASC';

    $stmt = $conexao->prepare($sql);
    
    if (!$stmt->execute()) {
        $erroInfo = $stmt->errorInfo();
        throw new Exception("Falha ao executar a consulta SQL: " . ($erroInfo[2] ?? "Erro desconhecido"));
    }

    $dados_brutos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $produtos_formatados = [];

    foreach ($dados_brutos as $produto) {
        $id        = $produto["id_produto"] ?? $produto["id"] ?? 0;
        $nome      = $produto["nm_produto"] ?? $produto["nome"] ?? $produto["nome_produto"] ?? "Produto ZORA";
        $preco     = $produto["preco"] ?? $produto["valor"] ?? 0;
        $estoque   = $produto["qtd_item"] ?? $produto["estoque"] ?? $produto["quantidade"] ?? $produto["qtd"] ?? 0;
        $categoria = $produto["categoria"] ?? "Geral";
        $imagem    = $produto["imagem"] ?? $produto["foto"] ?? "Logo 1.png";
        $descricao = $produto["descricao"] ?? "Peça exclusiva ZORA com caimento e modelagem impecáveis.";

        $produtos_formatados[] = [
            "id_produto"  => (int) $id,
            "nome"        => (string) $nome,
            "nm_produto"  => (string) $nome,
            "preco"       => round((float) $preco, 2),
            "estoque"     => (int) $estoque,
            "qtd_item"    => (int) $estoque,
            "categoria"   => (string) $categoria,
            "imagem"      => (string) $imagem,
            "descricao"   => (string) $descricao
        ];
    }

    http_response_code(200);
    echo json_encode([
        "sucesso"  => true,
        "total"    => count($produtos_formatados),
        "produtos" => $produtos_formatados
    ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "sucesso"     => false,
        "erro_codigo" => "ERRO_BANCO_DADOS",
        "mensagem"    => "Erro de banco de dados: " . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        "sucesso"     => false,
        "erro_codigo" => "ERRO_SERVIDOR",
        "mensagem"    => "Erro no servidor: " . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
