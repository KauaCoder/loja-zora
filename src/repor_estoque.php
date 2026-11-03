<?php
declare(strict_types=1);

/**
 * ZORA — Reposição de Estoque (Admin)
 * Localização: src/repor_estoque.php
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
        'sucesso'  => false,
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
header('Access-Control-Allow-Methods: POST, PUT, OPTIONS');
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

// VERIFICAÇÃO DE PERMISSÃO DE ADMINISTRADOR
$isAdmin = filter_var($_SESSION['is_admin'] ?? false, FILTER_VALIDATE_BOOLEAN);

if (!isset($_SESSION['id_cliente']) || !$isAdmin) {
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_write_close();
    }

    http_response_code(403);
    echo json_encode([
        'sucesso'  => false,
        'mensagem' => 'Acesso negado. Apenas administradores podem repor estoque.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

session_write_close();

// Carrega a conexão PDO
$caminhoConexao = __DIR__ . '/conexao.php';

if (!file_exists($caminhoConexao)) {
    http_response_code(500);
    echo json_encode([
        'sucesso'  => false,
        'mensagem' => 'Erro interno de configuração do banco de dados.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once $caminhoConexao;

try {
    if (!isset($conexao) || !($conexao instanceof PDO)) {
        throw new RuntimeException('A conexão PDO não foi inicializada corretamente.');
    }

    if (!in_array($_SERVER["REQUEST_METHOD"] ?? '', ["POST", "PUT"], true)) {
        header('Allow: POST, PUT, OPTIONS');
        http_response_code(405);
        echo json_encode([
            "sucesso"  => false,
            "mensagem" => "Método não permitido. Utilize POST ou PUT."
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $dados = json_decode((string) file_get_contents("php://input"), true);

    if (!is_array($dados)) {
        http_response_code(400);
        throw new Exception("Dados de requisição inválidos.");
    }

    $idProduto = (int) ($dados["id_produto"] ?? 0);
    $quantidadeAdicionar = (int) ($dados["quantidade"] ?? $dados["qtd_item"] ?? 0);

    if ($idProduto <= 0) {
        http_response_code(400);
        throw new Exception("ID de produto inválido.");
    }

    if ($quantidadeAdicionar <= 0) {
        http_response_code(400);
        throw new Exception("Informe uma quantidade maior que zero.");
    }

    // Busca produto com trava de linha (FOR UPDATE no PostgreSQL)
    $stmt = $conexao->prepare("SELECT id_produto, nm_produto, qtd_item, id_item_estoque FROM produto WHERE id_produto = :id FOR UPDATE");
    $stmt->execute([":id" => $idProduto]);
    $produto = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$produto) {
        http_response_code(404);
        throw new Exception("Produto não encontrado.");
    }

    $quantidadeAtual = (int) $produto["qtd_item"];
    $novaQuantidade = $quantidadeAtual + $quantidadeAdicionar;

    // Limite máximo padrão ou vindo da tabela estoque
    $quantidadeMaxima = 100;
    if (!empty($produto["id_item_estoque"])) {
        $stmtEstoque = $conexao->prepare("SELECT qtd_max_produto FROM estoque WHERE id_item_estoque = :id_est");
        $stmtEstoque->execute([":id_est" => $produto["id_item_estoque"]]);
        $est = $stmtEstoque->fetch(PDO::FETCH_ASSOC);
        if ($est && isset($est["qtd_max_produto"])) {
            $quantidadeMaxima = (int) $est["qtd_max_produto"];
        }
    }

    if ($quantidadeMaxima > 0 && $novaQuantidade > $quantidadeMaxima) {
        $disponivel = max(0, $quantidadeMaxima - $quantidadeAtual);
        http_response_code(400);
        throw new Exception("Limite excedido! Você pode adicionar no máximo {$disponivel} unidade(s).");
    }

    // Atualiza o estoque e retorna a quantidade final
    $stmtUpdate = $conexao->prepare("UPDATE produto SET qtd_item = qtd_item + :qtd WHERE id_produto = :id RETURNING qtd_item");
    $stmtUpdate->execute([
        ":qtd" => $quantidadeAdicionar,
        ":id"  => $idProduto
    ]);
    
    $quantidadeFinal = (int) $stmtUpdate->fetchColumn();

    http_response_code(200);
    echo json_encode([
        "sucesso"  => true,
        "mensagem" => "Estoque atualizado com sucesso!",
        "produto"  => [
            "id_produto"       => $idProduto,
            "nome"             => $produto["nm_produto"],
            "quantidade_atual" => $quantidadeFinal
        ]
    ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);

} catch (Throwable $erro) {
    if (http_response_code() === 200) {
        http_response_code(400);
    }

    echo json_encode([
        "sucesso"  => false,
        "mensagem" => $erro->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
