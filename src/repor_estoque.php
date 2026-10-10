<?php

session_start();

header("Content-Type: application/json; charset=UTF-8");

// =============================================
// VERIFICAR MÉTODO HTTP
// =============================================

if (!in_array($_SERVER["REQUEST_METHOD"], ["POST", "PUT"])) {
    http_response_code(405);
    echo json_encode([
        "sucesso" => false,
        "mensagem" => "Método não permitido. Utilize POST ou PUT."
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// =============================================
// VERIFICAR PERMISSÃO DE ADMINISTRAÇÃO
// =============================================

if (!isset($_SESSION["id_cliente"]) || empty($_SESSION["is_admin"])) {
    http_response_code(403);
    echo json_encode([
        "sucesso" => false,
        "mensagem" => "Acesso negado. Apenas administradores podem atualizar o estoque."
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// =============================================
// CARREGAR CONEXÃO COM O BANCO DE DADOS
// =============================================

$caminho_conexao = __DIR__ . '/src/conexao.php';

if (!file_exists($caminho_conexao)) {
    $caminho_conexao = __DIR__ . '/conexao.php';
}

require_once $caminho_conexao;

try {

    // =============================================
    // RECEBER JSON
    // =============================================

    $dados = json_decode(file_get_contents("php://input"), true);

    if (!is_array($dados)) {
        throw new Exception("Dados de requisição inválidos.");
    }

    $idProduto = (int) ($dados["id_produto"] ?? 0);
    $quantidadeAdicionar = (int) ($dados["quantidade"] ?? $dados["qtd_item"] ?? 0);

    // =============================================
    // VALIDAÇÕES
    // =============================================

    if ($idProduto <= 0) {
        throw new Exception("ID de produto inválido.");
    }

    if ($quantidadeAdicionar <= 0) {
        throw new Exception("Informe uma quantidade maior que zero para adicionar.");
    }

    // =============================================
    // TRANSAÇÃO COM O POSTGRESQL
    // =============================================

    $conexao->beginTransaction();

    // Buscar produto e limite de estoque com bloqueio de linha (FOR UPDATE)
    $sql = "
        SELECT
            p.id_produto,
            p.nm_produto,
            p.qtd_item,
            p.id_item_estoque,
            COALESCE(e.qtd_max_produto, 0) AS qtd_max_produto
        FROM produto p
        LEFT JOIN estoque e
            ON e.id_item_estoque = p.id_item_estoque
        WHERE p.id_produto = :id_produto
        FOR UPDATE
    ";

    $stmt = $conexao->prepare($sql);
    $stmt->execute([
        ":id_produto" => $idProduto
    ]);

    $produto = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$produto) {
        throw new Exception("Produto não encontrado no sistema.");
    }

    // =============================================
    // VALIDAÇÃO DE LIMITES
    // =============================================

    $quantidadeAtual = (int) $produto["qtd_item"];
    $quantidadeMaxima = (int) $produto["qtd_max_produto"];
    $novaQuantidade = $quantidadeAtual + $quantidadeAdicionar;

    if ($quantidadeMaxima > 0 && $novaQuantidade > $quantidadeMaxima) {
        $disponivel = max(0, $quantidadeMaxima - $quantidadeAtual);

        throw new Exception(
            "Não é possível adicionar {$quantidadeAdicionar} unidade(s). " .
            "O limite deste estoque é {$quantidadeMaxima}. " .
            "Você pode adicionar no máximo {$disponivel} unidade(s)."
        );
    }

    // =============================================
    // ATUALIZAR ESTOQUE DO PRODUTO
    // =============================================

    $sqlUpdate = "
        UPDATE produto
        SET qtd_item = qtd_item + :quantidade
        WHERE id_produto = :id_produto
        RETURNING qtd_item
    ";

    $stmtUpdate = $conexao->prepare($sqlUpdate);
    $stmtUpdate->execute([
        ":quantidade" => $quantidadeAdicionar,
        ":id_produto" => $idProduto
    ]);

    $quantidadeFinal = (int) $stmtUpdate->fetchColumn();

    $conexao->commit();

    // =============================================
    // RESPOSTA SUCESSO
    // =============================================

    echo json_encode([
        "sucesso" => true,
        "mensagem" => "Estoque atualizado com sucesso!",
        "produto" => [
            "id_produto" => $idProduto,
            "nome" => $produto["nm_produto"],
            "quantidade_anterior" => $quantidadeAtual,
            "quantidade_adicionada" => $quantidadeAdicionar,
            "quantidade_atual" => $quantidadeFinal,
            "quantidade_maxima" => $quantidadeMaxima
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $erro) {

    if (isset($conexao) && $conexao->inTransaction()) {
        $conexao->rollBack();
    }

    http_response_code(400);

    echo json_encode([
        "sucesso" => false,
        "mensagem" => $erro->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
