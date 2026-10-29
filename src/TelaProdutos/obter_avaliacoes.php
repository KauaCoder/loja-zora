<?php
header("Content-Type: application/json; charset=UTF-8");

// Permite chamadas via fetch
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");

$id_produto = isset($_GET['id_produto']) ? intval($_GET['id_produto']) : 0;

if ($id_produto <= 0) {
    echo json_encode(["sucesso" => false, "mensagem" => "ID do produto inválido."]);
    exit;
}

// Configurações de Conexão com o Banco (Supabase / PostgreSQL)
$host = getenv('DB_HOST') ?: "localhost";
$dbname = getenv('DB_NAME') ?: "postgres";
$user = getenv('DB_USER') ?: "postgres";
$pass = getenv('DB_PASSWORD') ?: "";
$port = getenv('DB_PORT') ?: "5432";

try {
    $pdo = new PDO("pgsql:host=$host;port=$port;dbname=$dbname", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);

    // Busca as avaliações registradas na tabela "avalia"
    $sql = "SELECT id_avaliacao, id_cliente, nome_cliente, estrelas, comentario, data_avaliacao 
            FROM avalia 
            WHERE id_produto = :id_produto 
            ORDER BY data_avaliacao DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(':id_produto', $id_produto, PDO::PARAM_INT);
    $stmt->execute();
    $avaliacoes = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Calcula a média das estrelas para o topo da página
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
