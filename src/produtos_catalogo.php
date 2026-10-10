<?php
header("Content-Type: application/json; charset=UTF-8");

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

$caminho_conexao = __DIR__ . '/src/conexao.php';

if (!file_exists($caminho_conexao)) {
    $caminho_conexao = __DIR__ . '/conexao.php';
}

require_once $caminho_conexao;

try {

    if (!isset($conexao)) {
        throw new Exception("Variável \$conexao não foi definida no arquivo conexao.php.");
    }

    // =============================================
    // CONSULTA AO POSTGRESQL
    // =============================================

    $sql = "
        SELECT
            id_produto,
            nm_produto,
            preco,
            qtd_item,
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
            "nome"       => $produto["nm_produto"],
            "preco"      => round((float) $produto["preco"], 2),
            "estoque"    => (int) $produto["qtd_item"],
            "qtd_item"   => (int) $produto["qtd_item"], // Mantido para compatibilidade legado
            "categoria"  => $produto["categoria"] ?? "Geral",
            "imagem"     => $produto["imagem"] ?? "default.jpg",
            "descricao"  => $produto["descricao"] ?? ""
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
