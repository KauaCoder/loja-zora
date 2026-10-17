<?php
/* =========================================================
   ZORA - ATUALIZAR NOME DO CLIENTE (Supabase / PostgreSQL)
   ========================================================= */

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

// Localiza dinamicamente o conexao.php
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
    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        http_response_code(405);
        echo json_encode([
            "sucesso"  => false,
            "mensagem" => "Método não permitido. Utilize POST."
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $conteudo = file_get_contents("php://input");
    $dados = json_decode($conteudo, true);

    // Resgata o id_cliente da Sessão, GET ou Body JSON
    $idCliente = $_SESSION["id_cliente"] ?? $_SESSION["cliente_id"] ?? $_SESSION["usuario_id"] ?? null;
    if (!$idCliente && isset($_GET['id_cliente'])) {
        $idCliente = $_GET['id_cliente'];
    }
    if (!$idCliente && isset($dados['id_cliente'])) {
        $idCliente = $dados['id_cliente'];
    }

    if (!$idCliente || (int)$idCliente <= 0) {
        http_response_code(401);
        echo json_encode([
            "sucesso"  => false,
            "mensagem" => "Usuário não está logado."
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $novoNome = trim($dados["nome"] ?? "");

    if (empty($novoNome)) {
        http_response_code(400);
        echo json_encode([
            "sucesso"  => false,
            "mensagem" => "Informe um nome válido."
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $idInt = (int) $idCliente;

    // Atualiza o nome na tabela public.cliente
    $sql = "UPDATE public.cliente SET nome = :nome WHERE id_cliente = :id_cliente";
    $stmt = $conexao->prepare($sql);
    $stmt->execute([
        ":nome"       => $novoNome,
        ":id_cliente" => $idInt
    ]);

    echo json_encode([
        "sucesso"  => true,
        "mensagem" => "Nome atualizado com sucesso!",
        "nome"     => $novoNome
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $erro) {
    http_response_code(500);
    echo json_encode([
        "sucesso"  => false,
        "mensagem" => "Erro no servidor: " . $erro->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
