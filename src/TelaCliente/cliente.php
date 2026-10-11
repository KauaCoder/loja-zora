<?php

// Configura cookies de sessão para persistência e segurança via HTTPS no Render
session_set_cookie_params([
    'lifetime' => 86400, // 24 horas
    'path'     => '/',
    'secure'   => true,   // Exigido para HTTPS no Render
    'httponly' => true,
    'samesite' => 'Lax'
]);

session_start();

header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-cache, no-store, must-revalidate");

// Localiza o conexao.php na subpasta /src ou na raiz
$caminho_conexao = __DIR__ . '/src/conexao.php';

if (!file_exists($caminho_conexao)) {
    $caminho_conexao = __DIR__ . '/conexao.php';
}

require_once $caminho_conexao;

try {

    // =========================================
    // VERIFICAR SE O USUÁRIO ESTÁ LOGADO
    // =========================================

    if (!isset($_SESSION["id_cliente"])) {

        http_response_code(401);

        echo json_encode([
            "sucesso" => false,
            "mensagem" => "Usuário não está logado."
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }

    // =========================================
    // PEGAR ID DO CLIENTE PELA SESSÃO
    // =========================================

    $idCliente = (int) $_SESSION["id_cliente"];

    // =========================================
    // BUSCAR CLIENTE + ENDEREÇO
    // =========================================

    $sql = "
        SELECT
            c.id_cliente,
            c.nome,
            c.e_mail,
            c.telefone,

            e.id_endereco,
            e.cep,
            e.endereco,
            e.numero,
            e.complemento,
            e.bairro,
            e.cidade,
            e.estado

        FROM cliente c

        LEFT JOIN endereco e
            ON e.id_cliente = c.id_cliente

        WHERE c.id_cliente = :id_cliente

        LIMIT 1
    ";

    $stmt = $conexao->prepare($sql);

    $stmt->execute([
        ":id_cliente" => $idCliente
    ]);

    $cliente = $stmt->fetch(PDO::FETCH_ASSOC);

    // =========================================
    // CLIENTE NÃO ENCONTRADO
    // =========================================

    if (!$cliente) {

        $_SESSION = [];

        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(
                session_name(),
                '',
                time() - 42000,
                $params["path"],
                $params["domain"],
                $params["secure"],
                $params["httponly"]
            );
        }

        session_destroy();

        http_response_code(404);

        echo json_encode([
            "sucesso" => false,
            "mensagem" => "Cliente não encontrado no sistema."
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }

    // =========================================
    // RETORNAR DADOS ESTRUTURADOS
    // =========================================

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

            "rua"         => $cliente["endereco"] ?? "-",

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
