<?php

session_start();

header("Content-Type: application/json; charset=UTF-8");

// Desativa a exibição direta de erros em HTML para não corromper o JSON
ini_set('display_errors', 0);
error_reporting(E_ALL);

if (!in_array($_SERVER["REQUEST_METHOD"], ["POST", "PUT"])) {
    http_response_code(405);
    echo json_encode([
        "sucesso" => false,
        "mensagem" => "Método não permitido."
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$caminho_conexao = __DIR__ . '/src/conexao.php';
if (!file_exists($caminho_conexao)) {
    $caminho_conexao = __DIR__ . '/conexao.php';
}

require_once $caminho_conexao;

try {
    $dados = json_decode(file_get_contents("php://input"), true);

    if (!is_array($dados)) {
        throw new Exception("Dados de requisição inválidos.");
    }

    $idProduto = (int) ($dados["id_produto"] ?? 0);
    $quantidadeAdicionar = (int) ($dados["quantidade"] ?? $dados["qtd_item"] ?? 0);

    if ($idProduto <= 0) {
        throw new Exception("ID de produto inválido.");
    }

    if ($quantidadeAdicionar <= 0) {
        throw new Exception("Informe uma quantidade maior que zero.");
    }

    // Busca o produto diretamente
    $stmt = $conexao->prepare("SELECT id_produto, nm_produto, qtd_item, id_item_estoque FROM produto WHERE id_produto = :id");
    $stmt->execute([":id" => $idProduto]);
    $produto = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$produto) {
        throw new Exception("Produto não encontrado.");
    }

    $quantidadeAtual = (int) $produto["qtd_item"];
    $novaQuantidade = $quantidadeAtual + $quantidadeAdicionar;

    // Busca limite máximo na tabela estoque de forma segura se houver vínculo
    $quantidadeMaxima = 100; // Padrão
    if (!empty($produto["id_item_estoque"])) {
        $stmtEstoque = $conexao->prepare("SELECT qtd_max_produto FROM estoque WHERE id_item_estoque = :id_est");
        $stmtEstoque->execute([":id_est" => $produto["id_item_estoque"]]);
        $est = $stmtEstoque->fetch(PDO::FETCH_ASSOC);
        if ($est && isset($est["qtd_max_produto"])) {
            $quantidadeMaxima = (int) $est["qtd_max_produto"];
        }
    }

    if ($quantidadeMaxima > 0 && $novaQuantidade > $quantidadeMaxima) {
        $disponivel = max(0, $quantidadeMaxima - $quantidadeAtual);
        throw new Exception("Limite excedido! Você pode adicionar no máximo {$disponivel} unidade(s).");
    }

    // Atualiza o estoque
    $stmtUpdate = $conexao->prepare("UPDATE produto SET qtd_item = qtd_item + :qtd WHERE id_produto = :id RETURNING qtd_item");
    $stmtUpdate->execute([
        ":qtd" => $quantidadeAdicionar,
        ":id" => $idProduto
    ]);
    
    $quantidadeFinal = (int) $stmtUpdate->fetchColumn();

    echo json_encode([
        "sucesso" => true,
        "mensagem" => "Estoque atualizado com sucesso!",
        "produto" => [
            "id_produto" => $idProduto,
            "nome" => $produto["nm_produto"],
            "quantidade_atual" => $quantidadeFinal
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $erro) {
    http_response_code(400);
    echo json_encode([
        "sucesso" => false,
        "mensagem" => $erro->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
