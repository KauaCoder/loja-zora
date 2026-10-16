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
        "mensagem" => "Não foi possível localizar o arquivo conexao.php."
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
$cep      = preg_replace('/[^0-9]/', '', $input["cep"] ?? "");
$rua      = trim($input["rua"] ?? $input["logradouro"] ?? "");
$numero   = trim($input["numero"] ?? "");
$bairro   = trim($input["bairro"] ?? "");
$cidade   = trim($input["cidade"] ?? "");
$uf       = strtoupper(trim($input["uf"] ?? "RJ"));

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
        throw new Exception("Conexão com o banco de dados inválida.");
    }

    // Verificar se o e-mail já existe na tabela cliente
    $sql_check = "SELECT id_cliente FROM public.cliente WHERE email = :email LIMIT 1";
    $stmt_check = $conexao->prepare($sql_check);
    $stmt_check->bindValue(":email", $email);
    $stmt_check->execute();

    if ($stmt_check->fetch()) {
        http_response_code(400);
        echo json_encode([
            "sucesso" => false,
            "mensagem" => "Este e-mail já está cadastrado."
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Hash seguro da senha
    $senha_hash = password_hash($senha, PASSWORD_DEFAULT);

    // Inserir novo cliente no PostgreSQL
    $sql_insert = "
        INSERT INTO public.cliente (
            nm_cliente,
            email,
            senha,
            cpf,
            telefone,
            cep,
            rua,
            numero,
            bairro,
            cidade,
            uf
        ) VALUES (
            :nome,
            :email,
            :senha,
            :cpf,
            :telefone,
            :cep,
            :rua,
            :numero,
            :bairro,
            :cidade,
            :uf
        )
        RETURNING id_cliente;
    ";

    $stmt_insert = $conexao->prepare($sql_insert);
    $stmt_insert->bindValue(":nome", $nome);
    $stmt_insert->bindValue(":email", $email);
    $stmt_insert->bindValue(":senha", $senha_hash);
    $stmt_insert->bindValue(":cpf", $cpf);
    $stmt_insert->bindValue(":telefone", $telefone);
    $stmt_insert->bindValue(":cep", $cep);
    $stmt_insert->bindValue(":rua", $rua);
    $stmt_insert->bindValue(":numero", $numero);
    $stmt_insert->bindValue(":bairro", $bairro);
    $stmt_insert->bindValue(":cidade", $cidade);
    $stmt_insert->bindValue(":uf", $uf);

    $stmt_insert->execute();
    $novo_cliente = $stmt_insert->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        "sucesso" => true,
        "mensagem" => "Cadastro realizado com sucesso!",
        "id_cliente" => $novo_cliente["id_cliente"] ?? null
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $erro) {
    http_response_code(500);
    echo json_encode([
        "sucesso" => false,
        "mensagem" => "Erro ao realizar cadastro: " . $erro->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
