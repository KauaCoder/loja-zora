<?php
declare(strict_types=1);

/* =========================================================
   ZORA - CADASTRO DE CLIENTE E ENDEREÇO (POSTGRESQL + SUPABASE)
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

// Dados do Cliente
$nome     = trim($input["nome"] ?? "");
$email    = strtolower(trim($input["email"] ?? ""));
$senha    = $input["senha"] ?? "";

// Limpeza e tratamento do CPF para aceitar vazio como NULL
$cpf_limpo = preg_replace('/[^0-9]/', '', $input["cpf"] ?? "");
$cpf      = !empty($cpf_limpo) ? $cpf_limpo : null;

$telefone = preg_replace('/[^0-9]/', '', $input["telefone"] ?? "");

// Dados do Endereço (com suporte a variações de chaves vindas do front-end)
$cep         = preg_replace('/[^0-9]/', '', $input["cep"] ?? "");
$rua         = trim($input["rua"] ?? $input["logradouro"] ?? $input["endereco"] ?? "");
$numero      = trim($input["numero"] ?? "");
$complemento = trim($input["complemento"] ?? "");
$bairro      = trim($input["bairro"] ?? "");
$cidade      = trim($input["cidade"] ?? "");
$uf          = strtoupper(trim($input["estado"] ?? $input["uf"] ?? "RJ"));

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

    // Verificar se o e-mail já existe na tabela cliente
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

    // ========================================================
    // INÍCIO DA TRANSAÇÃO (Garante que cliente e endereço são salvos juntos)
    // ========================================================
    $conexao->beginTransaction();

    // 1. Inserir Cliente
    $sql_insert_cliente = "
        INSERT INTO public.cliente (nome, e_mail, senha, cpf, telefone) 
        VALUES (:nome, :email, :senha, :cpf, :telefone)
        RETURNING id_cliente;
    ";

    $stmt_cliente = $conexao->prepare($sql_insert_cliente);
    $stmt_cliente->bindValue(":nome", $nome);
    $stmt_cliente->bindValue(":email", $email);
    $stmt_cliente->bindValue(":senha", $senha_hash);
    // Vincula o CPF garantindo o tratamento correto para nulo se estiver vazio
    $stmt_cliente->bindValue(":cpf", $cpf, $cpf === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
    $stmt_cliente->bindValue(":telefone", $telefone);
    $stmt_cliente->execute();
    
    $novo_cliente = $stmt_cliente->fetch(PDO::FETCH_ASSOC);
    $id_cliente = (int) $novo_cliente["id_cliente"];

    // 2. Inserir Endereço (Associado ao id_cliente)
    $sql_insert_endereco = "
        INSERT INTO public.endereco (
            id_cliente, cep, endereco, numero, complemento, bairro, cidade, estado
        ) VALUES (
            :id_cliente, :cep, :endereco, :numero, :complemento, :bairro, :cidade, :estado
        )
    ";

    $stmt_endereco = $conexao->prepare($sql_insert_endereco);
    $stmt_endereco->bindValue(":id_cliente", $id_cliente);
    $stmt_endereco->bindValue(":cep", $cep);
    $stmt_endereco->bindValue(":endereco", $rua); 
    $stmt_endereco->bindValue(":numero", $numero);
    $stmt_endereco->bindValue(":complemento", $complemento);
    $stmt_endereco->bindValue(":bairro", $bairro);
    $stmt_endereco->bindValue(":cidade", $cidade);
    $stmt_endereco->bindValue(":estado", $uf); 
    $stmt_endereco->execute();

    // Confirma a transação (salva tudo na base de dados)
    $conexao->commit();

    // ========================================================
    // INICIAR A SESSÃO NO SERVIDOR PARA O NOVO UTILIZADOR
    // ========================================================
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_start();
    }
    $_SESSION['id_cliente'] = $id_cliente;
    $_SESSION['nome']       = $nome;
    $_SESSION['email']      = $email;
    $_SESSION['telefone']   = $telefone;
    $_SESSION['is_admin']   = false;
    session_write_close();

    echo json_encode([
        "sucesso" => true,
        "mensagem" => "Registo efetuado com sucesso!",
        "id_cliente" => $id_cliente,
        "cliente" => [
            "id_cliente" => $id_cliente,
            "nome" => $nome,
            "email" => $email,
            "telefone" => $telefone,
            "is_admin" => false
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $erro) {
    // Se der erro em qualquer parte, desfaz a transação para não salvar dados pela metade
    if (isset($conexao) && $conexao->inTransaction()) {
        $conexao->rollBack();
    }

    http_response_code(500);
    echo json_encode([
        "sucesso" => false,
        "mensagem" => "Erro ao realizar registo: " . $erro->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
