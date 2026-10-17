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

    // 1. Consulta dados do cliente com SELECT * para evitar erro de nomes de colunas
    $stmtCliente = $conexao->prepare("SELECT * FROM public.cliente WHERE id_cliente = :id_cliente LIMIT 1");
    $stmtCliente->execute([":id_cliente" => $idInt]);
    $clienteRaw = $stmtCliente->fetch(PDO::FETCH_ASSOC);

    if (!$clienteRaw) {
        http_response_code(404);
        echo json_encode([
            "sucesso"  => false,
            "mensagem" => "Cliente não encontrado no sistema."
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Trata dinamicamente os campos de Nome, E-mail e Telefone
    $nomeFinal = !empty($clienteRaw["nome"]) ? $clienteRaw["nome"] : (!empty($clienteRaw["nm_cliente"]) ? $clienteRaw["nm_cliente"] : "Usuário");
    $emailFinal = !empty($clienteRaw["e_mail"]) ? $clienteRaw["e_mail"] : (!empty($clienteRaw["email"]) ? $clienteRaw["email"] : "-");
    $telefoneFinal = !empty($clienteRaw["telefone"]) ? $clienteRaw["telefone"] : (!empty($clienteRaw["tel"]) ? $clienteRaw["tel"] : "-");

    // 2. Consulta o endereço do cliente na tabela public.endereco
    $stmtEnd = $conexao->prepare("SELECT * FROM public.endereco WHERE id_cliente = :id_cliente ORDER BY id_endereco DESC LIMIT 1");
    $stmtEnd->execute([":id_cliente" => $idInt]);
    $enderecoRaw = $stmtEnd->fetch(PDO::FETCH_ASSOC);

    $ruaFinal = !empty($enderecoRaw["endereco"]) ? $enderecoRaw["endereco"] : (!empty($enderecoRaw["rua"]) ? $enderecoRaw["rua"] : (!empty($enderecoRaw["logradouro"]) ? $enderecoRaw["logradouro"] : "-"));

    echo json_encode([
        "sucesso" => true,
        "cliente" => [
            "id_cliente" => $idInt,
            "nome"       => $nomeFinal,
            "email"      => $emailFinal,
            "telefone"   => $telefoneFinal
        ],
        "endereco" => [
            "id_endereco" => $enderecoRaw ? (int) $enderecoRaw["id_endereco"] : null,
            "cep"         => $enderecoRaw["cep"] ?? "-",
            "rua"         => $ruaFinal,
            "numero"      => $enderecoRaw["numero"] ?? "-",
            "complemento" => $enderecoRaw["complemento"] ?? "-",
            "bairro"      => $enderecoRaw["bairro"] ?? "-",
            "cidade"      => $enderecoRaw["cidade"] ?? "-",
            "estado"      => $enderecoRaw["estado"] ?? "-"
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $erro) {
    http_response_code(500);
    echo json_encode([
        "sucesso"  => false,
        "mensagem" => "Erro no servidor: " . $erro->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
