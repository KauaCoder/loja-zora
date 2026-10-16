<?php
header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-cache, no-store, must-revalidate");

// =============================================
// VERIFICAR MÉTODO HTTP
// =============================================

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    http_response_code(405);
    echo json_encode([
        "sucesso" => false,
        "mensagem" => "Método não permitido. Utilize GET."
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// =============================================
// LOCALIZAR E CARREGAR CONEXÃO
// =============================================

$caminhos_conexao = [
    __DIR__ . '/src/conexao.php',
    __DIR__ . '/conexao.php',
    __DIR__ . '/../conexao.php'
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
        "sucesso" => false,
        "mensagem" => "Não foi possível localizar o arquivo conexao.php."
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once $caminho_conexao;

try {
    if (!isset($conexao) || !($conexao instanceof PDO)) {
        throw new Exception("Variável \$conexao não foi definida corretamente.");
    }

    // =============================================
    // CONSULTA AO POSTGRESQL (SUPABASE - ESTRUTURA REAL)
    // =============================================

    $sql = "
        SELECT
            id_produto,
            nm_produto,
            preco,
            item_qtd,
            categoria,
            imagem,
            descricao
        FROM public.produto
        ORDER BY id_produto ASC
    ";

    $stmt = $conexao->prepare($sql);
    $stmt->execute();

    $dados = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $produtos = [];

    foreach ($dados as $produto) {
        $produtos[] = [
            "id_produto" => (int) $produto["id_produto"],
            "nome"        => $produto["nm_produto"] ?? "Produto ZORA",
            "preco"       => round((float) ($produto["preco"] ?? 0), 2),
            "estoque"     => (int) ($produto["item_qtd"] ?? 0),
            "qtd_item"    => (int) ($produto["item_qtd"] ?? 0),
            "categoria"   => $produto["categoria"] ?? "Geral",
            "imagem"      => $produto["imagem"] ?? "Logo 1.png",
            "descricao"   => $produto["descricao"] ?? ""
        ];
    }

    echo json_encode([
        "sucesso"  => true,
        "produtos" => $produtos
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $erro) {
    http_response_code(500);

    echo json_encode([
        "sucesso"  => false,
        "mensagem" => "Erro no servidor: " . $erro->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
