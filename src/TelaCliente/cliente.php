<?php
/* =========================================================
   ZORA - PERFIL DO CLIENTE (BUSCA DE DADOS + ENDEREÇO)
   ========================================================= */

$origem = $_SERVER['HTTP_ORIGIN'] ?? '*';
if ($origem !== '*') {
    header("Access-Control-Allow-Origin: $origem");
    header("Access-Control-Allow-Credentials: true");
} else {
    header("Access-Control-Allow-Origin: *");
}

header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
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

// Localiza o conexao.php
$caminhos_conexao = [
    __DIR__ . '/../../conexao.php',
    __DIR__ . '/../conexao.php',
    __DIR__ . '/conexao.php',
    __DIR__ . '/src/conexao.php'
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
    // Resgata o ID pela Sessão ou via parâmetro GET na URL
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

    $idInt = (int) $idCliente;

    // 1. Consulta dados do cliente utilizando os nomes reais de colunas (nome, e_mail, telefone)
    $stmtCliente = $conexao->prepare("SELECT id_cliente, nome, e_mail, telefone FROM public.cliente WHERE id_cliente = :id_cliente LIMIT 1");
    $stmtCliente->execute([":id_cliente" => $idInt]);
    $cliente = $stmtCliente->fetch(PDO::FETCH_ASSOC);

    if (!$cliente) {
        http_response_code(404);
        echo json_encode([
            "sucesso"  => false,
            "mensagem" => "Cliente não encontrado no sistema."
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // 2. Consulta o endereço vinculado ao id_cliente
    $stmtEnd = $conexao->prepare("SELECT id_endereco, cep, endereco, numero, complemento, bairro, cidade, estado FROM public.endereco WHERE id_cliente = :id_cliente ORDER BY id_endereco DESC LIMIT 1");
    $stmtEnd->execute([":id_cliente" => $idInt]);
    $endereco = $stmtEnd->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        "sucesso" => true,
        "cliente" => [
            "id_cliente" => (int) $cliente["id_cliente"],
            "nome"       => $cliente["nome"] ?? "Usuário",
            "email"      => $cliente["e_mail"] ?? "-",
            "telefone"   => $cliente["telefone"] ?? "-"
        ],
        "endereco" => [
            "id_endereco" => $endereco ? (int) $endereco["id_endereco"] : null,
            "cep"         => $endereco["cep"] ?? "-",
            "rua"         => $endereco["endereco"] ?? "-",
            "numero"      => $endereco["numero"] ?? "-",
            "complemento" => $endereco["complemento"] ?? "-",
            "bairro"      => $endereco["bairro"] ?? "-",
            "cidade"      => $endereco["cidade"] ?? "-",
            "estado"      => $endereco["estado"] ?? "-"
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $erro) {
    http_response_code(500);
    echo json_encode([
        "sucesso"  => false,
        "mensagem" => "Erro no servidor: " . $erro->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
