<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");

// Inclui o conexao.php da raiz
require_once __DIR__ . '/../conexao.php';

// Mapeia qual variável de conexão foi criada dentro do conexao.php
if (!isset($pdo)) {
    if (isset($conn) && $conn instanceof PDO) {
        $pdo = $conn;
    } elseif (isset($conexao) && $conexao instanceof PDO) {
        $pdo = $conexao;
    } elseif (isset($db) && $db instanceof PDO) {
        $pdo = $db;
    }
}

if (!isset($pdo) || !($pdo instanceof PDO)) {
    http_response_code(500);
    echo json_encode(["sucesso" => false, "mensagem" => "A variável de conexão \$pdo não foi inicializada corretamente pelo conexao.php."]);
    exit;
}

$id_produto = isset($_GET['id_produto']) ? intval($_GET['id_produto']) : 0;

if ($id_produto <= 0) {
    echo json_encode(["sucesso" => false, "mensagem" => "ID do produto inválido."]);
    exit;
}

try {
    $sql = "SELECT id_avaliacao, id_cliente, nome_cliente, estrelas, comentario, data_avaliacao 
            FROM avalia 
            WHERE id_produto = :id_produto 
            ORDER BY data_avaliacao DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(':id_produto', $id_produto, PDO::PARAM_INT);
    $stmt->execute();
    $avaliacoes = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $sqlMedia = "SELECT AVG(estrelas) as media FROM avalia WHERE id_produto = :id_produto";
    $stmtMedia = $pdo->prepare($sqlMedia);
    $stmtMedia->bindValue(':id_produto', $id_produto, PDO::PARAM_INT);
    $stmtMedia->execute();
    $resMedia = $stmtMedia->fetch(PDO::FETCH_ASSOC);

    $media = $resMedia['media'] ? floatval($resMedia['media']) : 0;

    echo json_encode([
        "sucesso" => true,
        "avaliacoes" => $avaliacoes,
        "media" => $media
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["sucesso" => false, "mensagem" => "Erro no banco de dados: " . $e->getMessage()]);
}
?>
