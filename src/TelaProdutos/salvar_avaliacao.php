<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Inclui o arquivo conexao.php que está na raiz do projeto
require_once __DIR__ . '/../conexao.php';

$dados = json_decode(file_get_contents("php://input"), true);

if (!$dados || !isset($dados['id_produto']) || !isset($dados['estrelas'])) {
    echo json_encode(["sucesso" => false, "mensagem" => "Dados inválidos ou incompletos."]);
    exit;
}

$id_produto = intval($dados['id_produto']);
$id_cliente = isset($dados['id_cliente']) && !empty($dados['id_cliente']) ? intval($dados['id_cliente']) : null;
$nome_cliente = isset($dados['nome_cliente']) && !empty($dados['nome_cliente']) ? trim($dados['nome_cliente']) : "Cliente Anônimo";
$estrelas = intval($dados['estrelas']);
$comentario = isset($dados['comentario']) ? trim($dados['comentario']) : "";

if ($estrelas < 1 || $estrelas > 5) {
    echo json_encode(["sucesso" => false, "mensagem" => "A classificação deve ser entre 1 e 5 estrelas."]);
    exit;
}

try {
    // Utiliza a variável $pdo criada dentro do conexao.php da raiz
    $sql = "INSERT INTO avalia (id_produto, id_cliente, nome_cliente, estrelas, comentario, data_avaliacao) 
            VALUES (:id_produto, :id_cliente, :nome_cliente, :estrelas, :comentario, NOW())";
    
    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(':id_produto', $id_produto, PDO::PARAM_INT);
    $stmt->bindValue(':id_cliente', $id_cliente, $id_cliente ? PDO::PARAM_INT : PDO::PARAM_NULL);
    $stmt->bindValue(':nome_cliente', $nome_cliente, PDO::PARAM_STR);
    $stmt->bindValue(':estrelas', $estrelas, PDO::PARAM_INT);
    $stmt->bindValue(':comentario', $comentario, PDO::PARAM_STR);

    $stmt->execute();

    echo json_encode(["sucesso" => true, "mensagem" => "Avaliação enviada com sucesso!"]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["sucesso" => false, "mensagem" => "Erro no banco de dados: " . $e->getMessage()]);
}
?>
