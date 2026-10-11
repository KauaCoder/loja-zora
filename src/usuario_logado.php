<?php

// =========================================================
// ZORA - VERIFICAÇÃO DE SESSÃO ATIVA
// Suporte a HTTPS + Proxy Reverso (Render & Local)
// =========================================================

// 1. Detecta HTTPS vindo do Proxy Reverso do Render
$isHttps = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ||
           (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');

if ($isHttps) {
    $_SERVER['HTTPS'] = 'on';
}

// 2. Configura os cookies da sessão dinamicamente
if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 86400,   // 24 horas
        'path'     => '/',
        'secure'   => $isHttps, // True no Render (HTTPS), False no Localhost
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    session_start();
}

header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-cache, no-store, must-revalidate");
header("Pragma: no-cache");

// Localiza o conexao.php na pasta /src ou na raiz
$caminho_conexao = __DIR__ . '/src/conexao.php';
if (!file_exists($caminho_conexao)) {
    $caminho_conexao = __DIR__ . '/conexao.php';
}

if (!file_exists($caminho_conexao)) {
    echo json_encode([
        "sucesso"  => false,
        "logado"   => false,
        "mensagem" => "Não foi possível encontrar conexao.php"
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once $caminho_conexao;

try {

    // =============================================
    // VERIFICAR SESSÃO ATIVA
    // =============================================

    if (!isset($_SESSION["id_cliente"]) || empty($_SESSION["id_cliente"])) {

        echo json_encode([
            "sucesso"  => true,
            "logado"   => false,
            "is_admin" => false,
            "cliente"  => null
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }

    $idCliente = (int) $_SESSION["id_cliente"];

    // =============================================
    // BUSCAR DADOS DO CLIENTE
    // Tabela: cliente | Coluna email: e_mail
    // =============================================

    $sql = "
        SELECT
            id_cliente,
            nome,
            e_mail,
            telefone
        FROM cliente
        WHERE id_cliente = :id_cliente
        LIMIT 1
    ";

    $stmt = $conexao->prepare($sql);
    $stmt->execute([":id_cliente" => $idCliente]);
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
            "sucesso"  => true,
            "logado"   => false,
            "is_admin" => false,
            "cliente"  => null
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }

    // =============================================
    // CHECAR IS_ADMIN DE FORMA SEGURA
    // =============================================

    $isAdmin = false;

    try {
        $stmtAdmin = $conexao->prepare("SELECT is_admin FROM cliente WHERE id_cliente = :id_cliente LIMIT 1");
        $stmtAdmin->execute([":id_cliente" => $idCliente]);
        $rowAdmin = $stmtAdmin->fetch(PDO::FETCH_ASSOC);
        $isAdmin = filter_var($rowAdmin["is_admin"] ?? false, FILTER_VALIDATE_BOOLEAN);
    } catch (Throwable $eAdmin) {
        // Se a coluna is_admin ainda não existir, assume false sem quebrar
        $isAdmin = false;
    }

    // Mantém atualizado na sessão
    $_SESSION["is_admin"] = $isAdmin;

    // =============================================
    // RESPOSTA COMPLETA DA SESSÃO
    // =============================================

    echo json_encode([
        "sucesso"  => true,
        "logado"   => true,
        "is_admin" => $isAdmin,
        "cliente"  => [
            "id_cliente" => (int) $cliente["id_cliente"],
            "nome"       => $cliente["nome"],
            "email"      => $cliente["e_mail"],
            "telefone"   => $cliente["telefone"] ?? "",
            "is_admin"   => $isAdmin
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $erro) {

    echo json_encode([
        "sucesso"  => false,
        "logado"   => false,
        "is_admin" => false,
        "mensagem" => "Erro de verificação: " . $erro->getMessage()
    ], JSON_UNESCAPED_UNICODE);

}
