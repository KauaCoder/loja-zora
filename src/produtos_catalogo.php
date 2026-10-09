<?php
header("Content-Type: application/json; charset=UTF-8");

// Inclui o conexao.php buscando dentro da pasta src/
$caminho_conexao = __DIR__ . '/src/conexao.php';

if (!file_exists($caminho_conexao)) {
    // Tenta incluir se o conexao.php estiver no mesmo diretório
    $caminho_conexao = __DIR__ . '/conexao.php';
}

require_once $caminho_conexao;

try {
    // Garante que $conexao exista
    if (!isset($conexao)) {
        throw new Exception("Variável \$conexao não foi definida no arquivo conexao.php.");
    }

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
            "preco"      => (float) $produto["preco"],
            "estoque"    => (int) $produto["qtd_item"],
            "categoria"  => $produto["categoria"],
            "imagem"     => $produto["imagem"],
            "descricao"  => $produto["descricao"]
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
?>
