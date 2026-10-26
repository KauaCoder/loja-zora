<?php
// Garante que qualquer erro ou aviso do PHP não corrompa o JSON de resposta
ini_set('display_errors', 0);
error_reporting(E_ALL);

// =============================================
// CABEÇALHOS DE CORS E JSON (OBRIGATÓRIO PARA O JS)
// =============================================
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: https://loja-zora.onrender.com"); // Permite a comunicação com o frontend
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Responde imediatamente à requisição de pré-verificação (Preflight) do navegador
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// =============================================
// CONEXÃO COM O BANCO DE DADOS
// =============================================
$caminhos_conexao = [
    __DIR__ . "/conexao.php",
    __DIR__ . "/src/conexao.php",
    __DIR__ . "/../conexao.php"
];

$caminho_conexao = null;
foreach ($caminhos_conexao as $caminho) {
    if (file_exists($caminho)) {
        $caminho_conexao = $caminho;
        break;
    }
}

if (!$caminho_conexao) {
    http_response_code(500);
    echo json_encode([
        "sucesso" => false,
        "mensagem" => "Erro crítico: Arquivo de conexão não encontrado."
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once $caminho_conexao;

try {
    // =============================================
    // VERIFICAR MÉTODO HTTP
    // =============================================
    if (!in_array($_SERVER["REQUEST_METHOD"], ["POST", "PUT"])) {
        http_response_code(405);
        throw new Exception("Método não permitido. Utilize POST ou PUT.");
    }

    // =============================================
    // RECEBER JSON DO JAVASCRIPT
    // =============================================
    $dados = json_decode(file_get_contents("php://input"), true);

    if (!is_array($dados)) {
        throw new Exception("Dados inválidos enviados na requisição.");
    }

    $idProduto = (int)($dados["id_produto"] ?? 0);
    // Aceita tanto "nome" quanto "nm_produto"
    $nome = trim($dados["nome"] ?? $dados["nm_produto"] ?? "");
    $preco = $dados["preco"] ?? null;
    $descricao = trim($dados["descricao"] ?? "");

    // =============================================
    // VALIDAÇÕES
    // =============================================
    if ($idProduto <= 0) {
        throw new Exception("ID do produto é inválido.");
    }

    if ($nome === "") {
        throw new Exception("O nome do produto é obrigatório.");
    }

    if (mb_strlen($nome) > 150) {
        throw new Exception("O nome do produto pode ter no máximo 150 caracteres.");
    }

    if (!is_numeric($preco) || (float)$preco < 0) {
        throw new Exception("Informe um preço válido maior ou igual a zero.");
    }

    $preco = round((float)$preco, 2);

    // =============================================
    // VERIFICAR SE O PRODUTO EXISTE
    // =============================================
    $sqlProduto = "SELECT id_produto FROM produto WHERE id_produto = :id_produto LIMIT 1";
    $stmtProduto = $conexao->prepare($sqlProduto);
    $stmtProduto->execute([":id_produto" => $idProduto]);

    if (!$stmtProduto->fetch(PDO::FETCH_ASSOC)) {
        http_response_code(404);
        throw new Exception("Produto não encontrado no banco de dados.");
    }

    // =============================================
    // ATUALIZAR REGISTRO (POSTGRESQL)
    // =============================================
    $sql = "
        UPDATE produto
        SET
            nm_produto = :nome,
            preco = :preco,
            descricao = :descricao
        WHERE id_produto = :id_produto
        RETURNING
            id_produto,
            nm_produto,
            preco,
            descricao
    ";

    $stmt = $conexao->prepare($sql);
    $stmt->execute([
        ":nome" => $nome,
        ":preco" => $preco,
        ":descricao" => $descricao,
        ":id_produto" => $idProduto
    ]);

    $produto = $stmt->fetch(PDO::FETCH_ASSOC);

    // =============================================
    // RESPOSTA DE SUCESSO
    // =============================================
    echo json_encode([
        "sucesso" => true,
        "mensagem" => "Produto atualizado com sucesso!",
        "produto" => [
            "id_produto" => (int)$produto["id_produto"],
            "nome" => $produto["nm_produto"],
            "preco" => (float)$produto["preco"],
            "descricao" => $produto["descricao"]
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $erro) {
    // Se o HTTP response code ainda for 200, muda para 400 (Bad Request)
    if (http_response_code() === 200) {
        http_response_code(400);
    }
    
    echo json_encode([
        "sucesso" => false,
        "mensagem" => $erro->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
