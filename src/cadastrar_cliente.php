<?php
header("Content-Type: application/json; charset=UTF-8");

// =========================================================
// LOCALIZAR E INCLUIR A CONEXÃO (INCLUI A PASTA PAI /..)
// =========================================================
$caminho_conexao = __DIR__ . '/../conexao.php'; // Busca na pasta pai

if (!file_exists($caminho_conexao)) {
    $caminho_conexao = __DIR__ . '/conexao.php'; // Busca na mesma pasta
}

if (!file_exists($caminho_conexao)) {
    $caminho_conexao = __DIR__ . '/src/conexao.php'; // Busca na pasta src
}

if (!file_exists($caminho_conexao)) {
    http_response_code(500);
    echo json_encode([
        "sucesso" => false,
        "mensagem" => "Arquivo de conexão com o banco de dados não foi encontrado."
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once $caminho_conexao;

try {
    // Verifica se a conexão com PDO foi estabelecida com sucesso
    if (!isset($conexao) || !($conexao instanceof PDO)) {
        throw new Exception("Falha na conexão com o banco de dados.");
    }

    // =========================
    // VERIFICAR MÉTODO HTTP
    // =========================
    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        http_response_code(405);
        echo json_encode([
            "sucesso" => false,
            "mensagem" => "Método não permitido. Utilize POST."
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // =========================
    // RECEBER JSON
    // =========================
    $conteudo = file_get_contents("php://input");
    $dados = json_decode($conteudo, true);

    if (!$dados || !is_array($dados)) {
        throw new Exception("Dados de requisição inválidos.");
    }

    // =========================
    // DADOS DO CLIENTE
    // =========================
    $nome     = trim($dados["nome"] ?? "");
    $email    = strtolower(trim($dados["email"] ?? $dados["e_mail"] ?? ""));
    $telefone = trim($dados["telefone"] ?? "");
    $senha    = $dados["senha"] ?? "";

    // =========================
    // DADOS DO ENDEREÇO
    // =========================
    $endereco = $dados["endereco"] ?? [];

    $cep         = trim($endereco["cep"] ?? $dados["cep"] ?? "");
    $rua         = trim($endereco["rua"] ?? $endereco["endereco"] ?? $dados["rua"] ?? $dados["endereco"] ?? "");
    $numero      = trim($endereco["numero"] ?? $dados["numero"] ?? "");
    $complemento = trim($endereco["complemento"] ?? $dados["complemento"] ?? "");
    $bairro      = trim($endereco["bairro"] ?? $dados["bairro"] ?? "");
    $cidade      = trim($endereco["cidade"] ?? $dados["cidade"] ?? "");
    $estado      = strtoupper(trim($endereco["estado"] ?? $dados["estado"] ?? ""));

    // =========================
    // VALIDAÇÕES DOS DADOS
    // =========================
    if ($nome === "") throw new Exception("O nome é obrigatório.");
    if ($email === "" || !filter_var($email, FILTER_VALIDATE_EMAIL)) throw new Exception("Forneça um e-mail válido.");
    if ($senha === "" || strlen($senha) < 6) throw new Exception("A senha deve ter no mínimo 6 caracteres.");
    if ($cep === "") throw new Exception("O CEP é obrigatório.");
    if ($rua === "") throw new Exception("O endereço/rua é obrigatório.");
    if ($numero === "") throw new Exception("O número do endereço é obrigatório.");
    if ($bairro === "") throw new Exception("O bairro é obrigatório.");
    if ($cidade === "") throw new Exception("A cidade é obrigatória.");
    if ($estado === "") throw new Exception("O estado (UF) é obrigatório.");

    // =========================
    // DESCOBRIR NOME DA TABELA (cliente OU clientes)
    // =========================
    $tabelaCliente = "cliente";
    try {
        $teste = $conexao->query("SELECT 1 FROM clientes LIMIT 1");
        if ($teste !== false) $tabelaCliente = "clientes";
    } catch (Exception $e) {
        // Mantém 'cliente' caso 'clientes' não exista
    }

    // =========================
    // VERIFICAR E-MAIL DUPLICADO
    // =========================
    $sqlEmail = "SELECT id_cliente FROM {$tabelaCliente} WHERE e_mail = :email OR email = :email LIMIT 1";
    $stmtEmail = $conexao->prepare($sqlEmail);
    $stmtEmail->execute([":email" => $email]);

    if ($stmtEmail->fetch()) {
        throw new Exception("Este e-mail já está cadastrado.");
    }

    // =========================
    // HASH DA SENHA
    // =========================
    $senhaHash = password_hash($senha, PASSWORD_DEFAULT);

    // =========================
    // INICIAR TRANSAÇÃO
    // =========================
    $conexao->beginTransaction();

    // =========================
    // CADASTRAR CLIENTE
    // =========================
    $sqlCliente = "
        INSERT INTO {$tabelaCliente}
        (nome, e_mail, senha, telefone, is_admin)
        VALUES
        (:nome, :email, :senha, :telefone, FALSE)
        RETURNING id_cliente
    ";

    $stmtCliente = $conexao->prepare($sqlCliente);
    $stmtCliente->execute([
        ":nome"     => $nome,
        ":email"    => $email,
        ":senha"    => $senhaHash,
        ":telefone" => $telefone
    ]);

    $idCliente = (int) $stmtCliente->fetchColumn();

    if (!$idCliente) {
        throw new Exception("Erro ao registrar o cliente no banco de dados.");
    }

    // =========================
    // CADASTRAR ENDEREÇO
    // =========================
    $sqlEndereco = "
        INSERT INTO endereco
        (id_cliente, cep, endereco, numero, complemento, bairro, cidade, estado)
        VALUES
        (:id_cliente, :cep, :endereco, :numero, :complemento, :bairro, :cidade, :estado)
    ";

    $stmtEndereco = $conexao->prepare($sqlEndereco);
    $stmtEndereco->execute([
        ":id_cliente"  => $idCliente,
        ":cep"         => $cep,
        ":endereco"    => $rua,
        ":numero"      => $numero,
        ":complemento" => $complemento,
        ":bairro"      => $bairro,
        ":cidade"      => $cidade,
        ":estado"      => $estado
    ]);

    // =========================
    // CONFIRMAR TRANSAÇÃO
    // =========================
    $conexao->commit();

    echo json_encode([
        "sucesso"    => true,
        "mensagem"   => "Cadastro realizado com sucesso!",
        "id_cliente" => $idCliente
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    if (isset($conexao) && $conexao->inTransaction()) {
        $conexao->rollBack();
    }

    http_response_code(400);

    $mensagem = $e->getMessage();

    if (strpos($mensagem, "cliente_e_mail_key") !== false || strpos($mensagem, "23505") !== false) {
        $mensagem = "Este e-mail já está cadastrado no sistema.";
    }

    echo json_encode([
        "sucesso"  => false,
        "mensagem" => $mensagem
    ], JSON_UNESCAPED_UNICODE);
}
