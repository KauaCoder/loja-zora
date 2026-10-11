<?php
header('Content-Type: application/json; charset=utf-8');

// Inclua aqui seu arquivo de conexão com o banco de dados (ex: conexao.php)
// require_once 'conexao.php';

try {
    // Exemplo de conexão PDO com PostgreSQL (ajuste conforme suas credenciais)
    $host = "localhost";
    $db   = "seu_banco";
    $user = "seu_usuario";
    $pass = "sua_senha";

    $pdo = new PDO("pgsql:host=$host;dbname=$db", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);

    $id_produto = isset($_GET['id']) ? intval($_GET['id']) : 0;

    if ($id_produto <= 0) {
        echo json_encode(['sucesso' => false, 'mensagem' => 'ID inválido']);
        exit;
    }

    $stmt = $pdo->prepare("SELECT estoque, nome FROM produtos WHERE id_produto = :id");
    $stmt->execute([':id' => $id_produto]);
    $produto = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($produto) {
        echo json_encode([
            'sucesso' => true,
            'estoque' => intval($produto['estoque']),
            'nome'    => $produto['nome']
        ]);
    } else {
        echo json_encode(['sucesso' => false, 'mensagem' => 'Produto não encontrado']);
    }

} catch (Exception $e) {
    echo json_encode(['sucesso' => false, 'mensagem' => 'Erro ao consultar banco de dados']);
}
?>
