<?php
declare(strict_types=1);

/* =========================================================
   ZORA - CADASTRO DE CLIENTE E ENDEREÇO (POSTGRESQL + SUPABASE)
   Localização: src/cadastrar_cliente.php
   ========================================================= */

header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-cache, no-store, must-revalidate");
header('Pragma: no-cache');
header('Vary: Origin');

// Lista de origens permitidas (CORS)
$origensPermitidas = [
    'https://loja-zora.onrender.com',
    'http://localhost:3000',
    'http://localhost:8080'
];

$origem = $_SERVER['HTTP_ORIGIN'] ?? null;
$origemPermitida = ($origem !== null && in_array($origem, $origensPermitidas, true)) || $origem === null;

if ($origem !== null && !$origemPermitida) {
    http_response_code(403);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Origem não autorizada.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($origem !== null && $origemPermitida) {
    header('Access-Control-Allow-Origin: ' . $origem);
} else {
    header('Access-Control-Allow-Origin: https://loja-zora.onrender.com');
}

header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Tratamento de Preflight CORS (OPTIONS)
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Suporte a HTTPS no Proxy Reverso do Render
$httpsDireto = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== '' &&
    strtolower((string) $_SERVER['HTTPS']) !== 'off';
$protoEncaminhado = strtolower(trim(explode(',', (string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ''))[0]));
$isHttps = $httpsDireto || $protoEncaminhado === 'https';

if ($isHttps) {
    $_SERVER['HTTPS'] = 'on';
}

// =============================================
// VERIFICAR MÉTODO HTTP
// =============================================
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
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
$caminho_conexao = __DIR__ . '/conexao.php';

if (!file_exists($caminho_conexao)) {
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
$nome     = trim((string) ($input["nome"] ?? ""));
$email    = strtolower(trim((string) ($input["email"] ?? "")));
$senha    = (string) ($input["senha"] ?? "");

// Limpeza e tratamento do CPF para aceitar vazio como NULL
$cpf_limpo = preg_replace('/[^0-9]/', '', (string) ($input["cpf"] ?? ""));
$cpf       = !empty($cpf_limpo) ? $cpf_limpo : null;

$telefone = preg_replace('/[^0-9]/', '', (string) ($input["telefone"] ?? ""));

// Dados do Endereço
$cep         = preg_replace('/[^0-9]/', '', (string) ($input["cep"] ?? ""));
$rua         = trim((string) ($input["rua"] ?? $input["logradouro"] ?? $input["endereco"] ?? ""));
$numero      = trim((string) ($input["numero"] ?? ""));
$complemento = trim((string) ($input["complemento"] ?? ""));
$bairro      = trim((string) ($input["bairro"] ?? ""));
$cidade      = trim((string) ($input["cidade"] ?? ""));
$uf          = strtoupper(trim((string) ($input["estado"] ?? $input["uf"] ?? "RJ")));

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
    $sql_check = "SELECT id_cliente FROM public.cliente WHERE LOWER(e_mail) = :email LIMIT 1";
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

    // INÍCIO DA TRANSAÇÃO
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

    // Confirma a transação
    $conexao->commit();

    // INICIAR A SESSÃO SEGURA PARA O NOVO USUÁRIO
    if (session_status() !== PHP_SESSION_ACTIVE) {
        ini_set('session.use_only_cookies', '1');
        ini_set('session.use_strict_mode', '1');
        ini_set('session.use_trans_sid', '0');

        session_set_cookie_params([
            'lifetime' => 86400,
            'path'     => '/',
            'secure'   => $isHttps,
            'httponly' => true,
            'samesite' => $isHttps ? 'None' : 'Lax',
        ]);

        session_start();
    }

    session_regenerate_id(true);
    $_SESSION['id_cliente'] = $id_cliente;
    $_SESSION['nome']       = $nome;
    $_SESSION['email']      = $email;
    $_SESSION['telefone']   = $telefone;
    $_SESSION['is_admin']   = false;
    session_write_close();

    http_response_code(201);
    echo json_encode([
        "sucesso"    => true,
        "mensagem"   => "Registo efetuado com sucesso!",
        "id_cliente" => $id_cliente,
        "cliente"    => [
            "id_cliente" => $id_cliente,
            "nome"       => $nome,
            "email"      => $email,
            "telefone"   => $telefone,
            "is_admin"   => false
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $erro) {
    if (isset($conexao) && $conexao->inTransaction()) {
        $conexao->rollBack();
    }

    http_response_code(500);
    echo json_encode([
        "sucesso"  => false,
        "mensagem" => "Erro ao realizar registo: " . $erro->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
