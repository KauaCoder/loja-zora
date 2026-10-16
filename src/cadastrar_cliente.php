<?php
/* =========================================================
   ZORA - CADASTRO DE CLIENTE (POSTGRESQL + SUPABASE)
   ========================================================= */

header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-cache, no-store, must-revalidate");

// =============================================
// VERIFICAR MÉTODO HTTP
// =============================================
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode([
        "sucesso" => false,
        "mensagem" => "Método não permitido. Utilize POST."
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// =============================================
// LOCALIZAR E CARREGAR CONEXÃO
// =============================================
$caminhos_conexao = [
    __DIR__ . '/conexao.php',
    __DIR__ . '/src/conexao.php',
    __DIR__ . '/../conexao.php'
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
        "mensagem" => "Não foi possível localizar o ficheiro conexao.php."
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once $caminho_conexao;

// =============================================
// LER DADOS ENVIADOS (JSON OU FORM)
// =============================================
$input = json_decode(file_get_contents("php://input"), true) ?? $_POST;

$nome     = trim($input["nome"] ?? "");
$email    = trim($input["email"] ?? "");
$senha    = $input["senha"] ?? "";
$cpf      = preg_replace('/[^0-9]/', '', $input["cpf"] ?? "");
$telefone = preg_replace('/[^0-9]/', '', $input["telefone"] ?? "");

// NOTA: Os dados de morada (CEP, rua, etc.) foram lidos do frontend, 
// mas não devem ser inseridos na tabela "cliente", pois não existem lá. 
// Devem ser inseridos na tabela "endereco" após a criação do cliente.

if (empty($nome) || empty($email) || empty($senha)) {
    http_response_code(400);
    echo json_encode([
        "sucesso" => false,
        "mensagem" => "Preencha todos os campos obrigatórios (Nome, E-mail e Senha)."
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    if (!isset($conexao) || !($conexao instanceof PDO)) {
        throw new Exception("Conexão com a base de dados inválida.");
    }

    // Verificar se o e-mail já existe na tabela cliente usando a coluna "e_mail" exata
    $sql_check = "SELECT id_cliente FROM public.cliente WHERE e_mail = :email LIMIT 1";
    $stmt_check = $conexao->prepare($sql_check);
    $stmt_check->bindValue(":email", $email);
    $stmt_check->execute();

    if ($stmt_check->fetch()) {
        http_response_code(400);
        echo json_encode([
            "sucesso" => false,
            "mensagem" => "Este e-mail já está registado."
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Hash seguro da senha
    $senha_hash = password_hash($senha, PASSWORD_DEFAULT);

    // Inserir novo cliente no PostgreSQL apenas com as colunas que existem na tabela
    $sql_insert = "
        INSERT INTO public.cliente (
            nome,
            e_mail,
            senha,
            cpf,
            telefone
        ) VALUES (
            :nome,
            :email,
            :senha,
            :cpf,
            :telefone
        )
        RETURNING id_cliente;
    ";

    $stmt_insert = $conexao->prepare($sql_insert);
    $stmt_insert->bindValue(":nome", $nome);
    $stmt_insert->bindValue(":email", $email);
    $stmt_insert->bindValue(":senha", $senha_hash);
    $stmt_insert->bindValue(":cpf", $cpf);
    $stmt_insert->bindValue(":telefone", $telefone);

    $stmt_insert->execute();
    $novo_cliente = $stmt_insert->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        "sucesso" => true,
        "mensagem" => "Registo efetuado com sucesso!",
        "id_cliente" => $novo_cliente["id_cliente"] ?? null
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $erro) {
    http_response_code(500);
    echo json_encode([
        "sucesso" => false,
        "mensagem" => "Erro ao realizar registo: " . $erro->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
