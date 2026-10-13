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

// Localiza o conexao.php na raiz ou nas pastas superiores
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
    // Suporte flexível para id_cliente, cliente_id ou usuario_id
    $idCliente = $_SESSION["id_cliente"] ?? $_SESSION["cliente_id"] ?? $_SESSION["usuario_id"] ?? null;

    if (!$idCliente) {
        http_response_code(401);
        echo json_encode([
            "sucesso"  => false,
            "mensagem" => "Usuário não está logado."
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Consulta SQL com suporte resiliente para colunas 'rua' ou 'endereco'
    $sql = "
        SELECT 
            c.id_cliente,
            c.nome,
            c.e_mail,
            c.telefone,
            e.id_endereco,
            e.cep,
            e.numero,
            e.complemento,
            e.bairro,
            e.cidade,
            e.estado,
            COALESCE(e.rua, e.endereco) as rua
        FROM cliente c
        LEFT JOIN endereco e ON e.id_cliente = c.id_cliente
        WHERE c.id_cliente = :id_cliente
        LIMIT 1
    ";

    $stmt = $conexao->prepare($sql);
    $stmt->execute([":id_cliente" => (int) $idCliente]);
    $cliente = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$cliente) {
        $_SESSION = [];
        session_destroy();

        http_response_code(404);
        echo json_encode([
            "sucesso"  => false,
            "mensagem" => "Cliente não encontrado no sistema."
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    echo json_encode([
        "sucesso" => true,
        "cliente" => [
            "id_cliente" => (int) $cliente["id_cliente"],
            "nome"       => $cliente["nome"] ?? "Usuário",
            "email"      => $cliente["e_mail"] ?? "-",
            "telefone"   => $cliente["telefone"] ?? "-"
        ],
        "endereco" => [
            "id_endereco" => $cliente["id_endereco"] ? (int) $cliente["id_endereco"] : null,
            "cep"         => $cliente["cep"] ?? "-",
            "rua"         => $cliente["rua"] ?? "-",
            "numero"      => $cliente["numero"] ?? "-",
            "complemento" => $cliente["complemento"] ?? "-",
            "bairro"      => $cliente["bairro"] ?? "-",
            "cidade"      => $cliente["cidade"] ?? "-",
            "estado"      => $cliente["estado"] ?? "-"
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $erro) {
    http_response_code(500);
    echo json_encode([
        "sucesso"  => false,
        "mensagem" => "Erro de servidor: " . $erro->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
