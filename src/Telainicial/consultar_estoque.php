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

    // Consulta no Supabase / PostgreSQL o estoque e nome do produto
    $sql = "SELECT id_produto, nome, estoque FROM produtos WHERE id_produto = :id";
    $stmt = $conexao->prepare($sql);
    $stmt->execute([':id' => $id_produto]);
    
    $produto = $stmt->fetch();

    if ($produto) {
        echo json_encode([
            'sucesso' => true,
            'id_produto' => intval($produto['id_produto']),
            'nome' => $produto['nome'],
            'estoque' => intval($produto['estoque'])
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
