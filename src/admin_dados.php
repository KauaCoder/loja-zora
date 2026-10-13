<?php

// =========================================================
// ZORA - PAINEL ADMIN (DADOS DO INVENTÁRIO + DASHBOARD)
// Suporte a HTTPS + Proxy Reverso (Render) + CORS + PostgreSQL
// =========================================================

// 1. TRATAMENTO COMPLETO DE CORS E PREFLIGHT (OPTIONS)
$origem = $_SERVER['HTTP_ORIGIN'] ?? 'https://loja-zora.onrender.com';
header("Access-Control-Allow-Origin: $origem");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 2. RECONHECE HTTPS NO PROXY REVERSO DO RENDER
$isHttps = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ||
           (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');

if ($isHttps) {
    $_SERVER['HTTPS'] = 'on';
}

// 3. DIRETÓRIO SEGURO DE SESSÃO NO LINUX/RENDER
$sessionPath = sys_get_temp_dir();
if (is_writable($sessionPath)) {
    session_save_path($sessionPath);
}

// 4. CONFIGURAÇÃO DE COOKIES DA SESSÃO
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.use_only_cookies', 1);
    ini_set('session.use_strict_mode', 1);

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
header("Pragma: no-cache");

// 5. LOCALIZAÇÃO SEGURA DO conexao.php (na raiz ou em /src)
$caminho_conexao = file_exists(__DIR__ . '/src/conexao.php') ? __DIR__ . '/src/conexao.php' : __DIR__ . '/conexao.php';

if (!file_exists($caminho_conexao)) {
    echo json_encode([
        "sucesso"  => false,
        "mensagem" => "Não foi possível localizar o arquivo conexao.php"
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once $caminho_conexao;

try {

    // 6. VERIFICAÇÃO DE AUTENTICAÇÃO DO ADMINISTRADOR
    if (!isset($_SESSION["id_cliente"]) || empty($_SESSION["id_cliente"])) {
        echo json_encode([
            "sucesso"  => false,
            "logado"   => false,
            "mensagem" => "Sessão expirada. Faça login novamente."
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $idCliente = (int) $_SESSION["id_cliente"];

    // Checa se o usuário logado tem permissão de administrador
    $stmtAdmin = $conexao->prepare("SELECT COALESCE(is_admin, FALSE) AS is_admin FROM cliente WHERE id_cliente = :id LIMIT 1");
    $stmtAdmin->execute([":id" => $idCliente]);
    $rowAdmin = $stmtAdmin->fetch(PDO::FETCH_ASSOC);

    $isAdmin = filter_var($rowAdmin["is_admin"] ?? false, FILTER_VALIDATE_BOOLEAN);

    if (!$isAdmin) {
        echo json_encode([
            "sucesso"  => false,
            "is_admin" => false,
            "mensagem" => "Acesso restrito para administradores."
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // 7. CONSULTA DOS PRODUTOS E ESTOQUE NO POSTGRESQL
    $sql = "
        SELECT
            p.id_produto,
            p.nm_produto,
            p.preco,
            p.qtd_item,
            p.categoria,
            p.imagem,
            p.descricao,

            e.id_item_estoque,
            e.qtd_max_produto,

            f.id_fornecedor,
            f.nome AS fornecedor,
            f.contato

        FROM produto p

        LEFT JOIN estoque e
            ON e.id_item_estoque = p.id_item_estoque

        LEFT JOIN fornecedor f
            ON f.id_item_estoque = e.id_item_estoque

        ORDER BY p.id_produto DESC
    ";

    $stmt = $conexao->prepare($sql);
    $stmt->execute();

    $dados = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $produtos = [];
    $totalEstoque = 0;
    $esgotadosCount = 0;

    foreach ($dados as $produto) {
        $qtd = (int) ($produto["qtd_item"] ?? 0);
        $totalEstoque += $qtd;

        if ($qtd <= 0) {
            $esgotadosCount++;
        }

        $produtos[] = [
            "id_produto"      => (int) $produto["id_produto"],
            "nome"            => $produto["nm_produto"],
            "preco"           => (float) $produto["preco"],
            "qtd_item"        => $qtd,
            "estoque"         => $qtd, // Compatibilidade com script.js / admin.js
            "categoria"       => $produto["categoria"],
            "imagem"          => $produto["imagem"],
            "descricao"       => $produto["descricao"],
            "id_item_estoque" => $produto["id_item_estoque"] !== null ? (int) $produto["id_item_estoque"] : null,
            "qtd_max_produto" => $produto["qtd_max_produto"] !== null ? (int) $produto["qtd_max_produto"] : 0,
            "id_fornecedor"   => $produto["id_fornecedor"] !== null ? (int) $produto["id_fornecedor"] : null,
            "fornecedor"      => $produto["fornecedor"],
            "contato"         => $produto["contato"]
        ];
    }

    // Grava a sessão no disco e encerra o arquivo de sessão antes do envio do JSON
    session_write_close();

    // 8. RESPOSTA UNIFICADA (DASHBOARD + LISTA DE PRODUTOS)
    echo json_encode([
        "sucesso"   => true,
        "logado"    => true,
        "is_admin"  => true,
        "dashboard" => [
            "total_produtos" => count($produtos),
            "total_estoque"  => $totalEstoque,
            "esgotados"      => $esgotadosCount
        ],
        "produtos"  => $produtos
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $erro) {

    echo json_encode([
        "sucesso"  => false,
        "mensagem" => "Erro de servidor: " . $erro->getMessage()
    ], JSON_UNESCAPED_UNICODE);

}
