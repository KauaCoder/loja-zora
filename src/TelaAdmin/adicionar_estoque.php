<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Vary: Origin');

$origem = $_SERVER['HTTP_ORIGIN'] ?? '*';
if ($origem !== '*') {
    header("Access-Control-Allow-Origin: $origem");
    header("Access-Control-Allow-Credentials: true");
} else {
    header("Access-Control-Allow-Origin: *");
}

header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
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

// Localiza conexao.php dinamicamente
$caminhos_conexao = [
    __DIR__ . '/conexao.php',
    __DIR__ . '/../conexao.php',
    __DIR__ . '/../../conexao.php',
    __DIR__ . '/src/conexao.php'
];

$caminhoConexao = null;
foreach ($caminhos_conexao as $caminho) {
    if (file_exists($caminho)) {
        $caminhoConexao = $caminho;
        break;
    }
}

if (!$caminhoConexao) {
    http_response_code(500);
    echo json_encode(['sucesso' => false, 'mensagem' => 'Erro ao localizar conexao.php'], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once $caminhoConexao;

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['sucesso' => false, 'mensagem' => 'Método não permitido.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $dados = json_decode(file_get_contents('php://input'), true);
    $idProduto = (int) ($dados['id_produto'] ?? 0);
    $quantidadeAdicionar = (int) ($dados['quantidade'] ?? 0);

    if ($idProduto <= 0 || $quantidadeAdicionar <= 0) {
        http_response_code(400);
        echo json_encode(['sucesso' => false, 'mensagem' => 'Dados inválidos para reposição.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Busca o limite máximo e a quantidade atual do produto
    $stmt = $conexao->prepare('SELECT p.qtd_item, e.qtd_max_produto FROM produto p LEFT JOIN estoque e ON e.id_item_estoque = p.id_item_estoque WHERE p.id_produto = :id LIMIT 1');
    $stmt->execute([':id' => $idProduto]);
    $prod = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$prod) {
        http_response_code(404);
        echo json_encode(['sucesso' => false, 'mensagem' => 'Produto não encontrado.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $novoEstoque = (int)$prod['qtd_item'] + $quantidadeAdicionar;
    $maximo = (int)($prod['qtd_max_produto'] ?? 100);

    if ($maximo > 0 && $novoEstoque > $maximo) {
        http_response_code(400);
        echo json_encode(['sucesso' => false, 'mensagem' => "A quantidade excede o limite máximo do estoque ($maximo)."], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Atualiza a quantidade diretamente na tabela PRODUTO
    $stmtUp = $conexao->prepare('UPDATE produto SET qtd_item = :qtd WHERE id_produto = :id');
    $stmtUp->execute([':qtd' => $novoEstoque, ':id' => $idProduto]);

    echo json_encode(['sucesso' => true, 'mensagem' => 'Estoque atualizado com sucesso!'], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['sucesso' => false, 'mensagem' => 'Erro interno: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
