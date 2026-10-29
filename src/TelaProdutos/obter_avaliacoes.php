<?php
header("Content-Type: application/json; charset=UTF-8");

$id_produto = isset($_GET['id_produto']) ? intval($_GET['id_produto']) : 0;

if ($id_produto <= 0) {
    echo json_encode(["sucesso" => false, "mensagem" => "ID inválido."]);
    exit;
}

$host = "localhost";
$dbname = "seu_banco";
$user = "seu_usuario";
$pass = "sua_senha";

try {
    $pdo = new PDO("pgsql:host=$host;dbname=$dbname", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);

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
    echo json_encode(["sucesso" => false, "mensagem" => "Erro no BD: " . $e->getMessage()]);
}
?>
