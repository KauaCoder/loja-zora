<?php

// Configura os parâmetros do cookie de sessão ANTES de iniciar a sessão
// Necessário para funcionar no HTTPS do Render e manter a persistência
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
header("Pragma: no-cache");

// Localiza o conexao.php na pasta /src ou na raiz
$caminho_conexao = __DIR__ . '/src/conexao.php';

if (!file_exists($caminho_conexao)) {
    $caminho_conexao = __DIR__ . '/conexao.php';
}

require_once $caminho_conexao;

try {

    // =============================================
    // VERIFICAR SESSÃO ATIVA
    // =============================================

    if (!isset($_SESSION["id_cliente"])) {

        echo json_encode([
            "sucesso" => true,
            "logado"  => false,
            "is_admin"=> false
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }

    $idCliente = (int) $_SESSION["id_cliente"];

    // =============================================
    // BUSCAR DADOS ATUALIZADOS DO CLIENTE
    // =============================================

    $sql = "
        SELECT
            id_cliente,
            nome,
            e_mail,
            telefone,
            COALESCE(is_admin, FALSE) AS is_admin
        FROM cliente
        WHERE id_cliente = :id_cliente
        LIMIT 1
    ";

    $stmt = $conexao->prepare($sql);

    $stmt->execute([
        ":id_cliente" => $idCliente
    ]);

    $cliente = $stmt->fetch(PDO::FETCH_ASSOC);

    // Se o cliente foi removido do banco, destrói a sessão
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

        echo json_encode([
            "sucesso" => true,
            "logado"  => false,
            "is_admin"=> false
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }

    // Mantém a flag atualizada na sessão
    $_SESSION["is_admin"] = (bool) $cliente["is_admin"];

    // =============================================
    // RESPOSTA COMPLETA DA SESSÃO
    // =============================================

    echo json_encode([

        "sucesso"  => true,

        "logado"   => true,

        "is_admin" => (bool) $cliente["is_admin"],

        "cliente"  => [

            "id_cliente" => (int) $cliente["id_cliente"],

            "nome"       => $cliente["nome"],

            "email"      => $cliente["e_mail"],

            "telefone"   => $cliente["telefone"],

            "is_admin"   => (bool) $cliente["is_admin"]

        ]

    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $erro) {

    http_response_code(500);

    echo json_encode([

        "sucesso"  => false,

        "logado"   => false,

        "is_admin" => false,

        "mensagem" => "Erro de verificação: " . $erro->getMessage()

    ], JSON_UNESCAPED_UNICODE);

}
