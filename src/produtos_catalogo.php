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
    // CONSULTA RESILIENTE AO POSTGRESQL (SUPABASE)
    // Usa aspas duplas em "Produto" para evitar erro de Case-Sensitivity
    // =============================================

    $sql = 'SELECT * FROM public."Produto" ORDER BY id_produto ASC';

    $stmt = $conexao->prepare($sql);
    $stmt->execute();

    $dados = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $produtos = [];

    foreach ($dados as $produto) {
        // Mapeamento alinhado exatamente com o Supabase:
        // Colunas reais: id_produto, nm_produto, preco, qtd_item, categoria, imagem
        $id        = $produto["id_produto"] ?? $produto["id"] ?? 0;
        $nome      = $produto["nm_produto"] ?? $produto["nome"] ?? $produto["nome_produto"] ?? "Produto ZORA";
        $preco     = $produto["preco"] ?? $produto["valor"] ?? 0;
        
        // Dá prioridade a qtd_item para não pegar NULL caso a coluna estoque exista
        $estoque   = $produto["qtd_item"] ?? $produto["estoque"] ?? $produto["quantidade"] ?? $produto["qtd"] ?? 99;
        
        $categoria = $produto["categoria"] ?? "Geral";
        $imagem    = $produto["imagem"] ?? $produto["foto"] ?? "Logo 1.png";
        $descricao = $produto["descricao"] ?? "Peça exclusiva ZORA com caimento e modelagem impecáveis.";

        $produtos[] = [
            "id_produto" => (int) $id,
            "nome"        => (string) $nome,
            "nm_produto"  => (string) $nome,
            "preco"       => round((float) $preco, 2),
            "estoque"     => (int) $estoque,
            "qtd_item"    => (int) $estoque,
            "categoria"   => (string) $categoria,
            "imagem"      => (string) $imagem,
            "descricao"   => (string) $descricao
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
