<?php
header('Content-Type: application/json; charset=utf-8');

/* =========================================================
   INCLUI A CONEXÃO (FORA DA PASTA ATUAL)
   ========================================================= */
// Se o arquivo de conexão se chamar 'conexao.php' e estiver uma pasta acima:
require_once __DIR__ . '/../conexao.php';

// Observação: Caso o seu arquivo de conexão tenha outro nome (por exemplo, 'db.php'),
// basta alterar o nome acima para: require_once __DIR__ . '/../db.php';

try {
    // Garante que a variável $conexao criada no seu script de conexão existe
    if (!isset($conexao) || !($conexao instanceof PDO)) {
        throw new Exception("Erro de conexão com o banco de dados.");
    }

    // Recebe o ID do produto enviado via URL (GET)
    $id_produto = isset($_GET['id']) ? intval($_GET['id']) : 0;

    if ($id_produto <= 0) {
        echo json_encode([
            'sucesso' => false,
            'mensagem' => 'ID do produto inválido.'
        ]);
        exit;
    }

    // Consulta o produto. Usa SELECT * porque o catálogo do site trabalha com
    // nm_produto / qtd_item, enquanto este arquivo usava nome / estoque.
    // Assim funciona com qualquer um dos dois nomes de coluna.
    $sql = "SELECT * FROM produtos WHERE id_produto = :id";
    $stmt = $conexao->prepare($sql);
    $stmt->execute([':id' => $id_produto]);
    
    $produto = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($produto) {
        echo json_encode([
            'sucesso' => true,
            'id_produto' => intval($produto['id_produto']),
            'nome' => $produto['nm_produto'] ?? $produto['nome'] ?? 'Produto ZORA',
            'estoque' => intval($produto['qtd_item'] ?? $produto['estoque'] ?? 0)
        ]);
    } else {
        echo json_encode([
            'sucesso' => false,
            'mensagem' => 'Produto não encontrado.'
        ]);
    }

} catch (Exception $e) {
    error_log("Erro ao consultar estoque: " . $e->getMessage());

    http_response_code(500);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Erro interno ao consultar o estoque.'
    ]);
}
?>
