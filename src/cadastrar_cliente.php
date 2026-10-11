<?php

header("Content-Type: application/json; charset=UTF-8");

// Tenta carregar conexao.php na raiz ou na subpasta /src
$caminho_conexao = __DIR__ . '/src/conexao.php';
if (!file_exists($caminho_conexao)) {
    $caminho_conexao = __DIR__ . '/conexao.php';
}

if (!file_exists($caminho_conexao)) {
    echo json_encode([
        "sucesso" => false,
        "mensagem" => "Não foi possível encontrar o arquivo conexao.php."
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once $caminho_conexao;

try {

    if (!isset($conexao) || !($conexao instanceof PDO)) {
        throw new Exception("Conexão com o banco de dados não inicializada.");
    }

    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        echo json_encode([
            "sucesso" => false,
            "mensagem" => "Método não permitido. Utilize POST."
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $conteudo = file_get_contents("php://input");
    $dados = json_decode($conteudo, true);

    if (!$dados || !is_array($dados)) {
        throw new Exception("Dados de requisição inválidos.");
    }

    // Extração dos dados do cliente
    $nome     = trim($dados["nome"] ?? "");
    $email    = strtolower(trim($dados["email"] ?? $dados["e_mail"] ?? ""));
    $telefone = trim($dados["telefone"] ?? "");
    $senha    = $dados["senha"] ?? "";

    // Extração dos dados do endereço
    $endereco = $dados["endereco"] ?? [];

    $cep         = trim($endereco["cep"] ?? $dados["cep"] ?? "");
    $rua         = trim($endereco["rua"] ?? $endereco["endereco"] ?? $dados["rua"] ?? $dados["endereco"] ?? "");
    $numero      = trim($endereco["numero"] ?? $dados["numero"] ?? "");
    $complemento = trim($endereco["complemento"] ?? $dados["complemento"] ?? "");
    $bairro      = trim($endereco["bairro"] ?? $dados["bairro"] ?? "");
    $cidade      = trim($endereco["cidade"] ?? $dados["cidade"] ?? "");
    $estado      = strtoupper(trim($endereco["estado"] ?? $dados["estado"] ?? ""));

    // Validações
    if ($nome === "") throw new Exception("O nome é obrigatório.");
    if ($email === "" || !filter_var($email, FILTER_VALIDATE_EMAIL)) throw new Exception("Forneça um e-mail válido.");
    if ($senha === "" || strlen($senha) < 6) throw new Exception("A senha deve ter no mínimo 6 caracteres.");
    if ($cep === "") throw new Exception("O CEP é obrigatório.");
    if ($rua === "") throw new Exception("A rua/endereço é obrigatória.");
    if ($numero === "") throw new Exception("O número é obrigatório.");
    if ($bairro === "") throw new Exception("O bairro é obrigatório.");
    if ($cidade === "") throw new Exception("A cidade é obrigatória.");
    if ($estado === "") throw new Exception("O estado (UF) é obrigatório.");

    // Checar e-mail duplicado
    $sqlEmail = "SELECT id_cliente FROM cliente WHERE e_mail = :email LIMIT 1";
    $stmtEmail = $conexao->prepare($sqlEmail);
    $stmtEmail->execute([":email" => $email]);

    if ($stmtEmail->fetch(PDO::FETCH_ASSOC)) {
        throw new Exception("Este e-mail já está cadastrado.");
    }

    $senhaHash = password_hash($senha, PASSWORD_DEFAULT);

    $conexao->beginTransaction();

    // Tenta inserir na tabela cliente (com fallback se is_admin não existir)
    try {
        $sqlCliente = "
            INSERT INTO cliente (nome, e_mail, senha, telefone, is_admin)
            VALUES (:nome, :email, :senha, :telefone, FALSE)
            RETURNING id_cliente
        ";
        $stmtCliente = $conexao->prepare($sqlCliente);
        $stmtCliente->execute([
            ":nome"     => $nome,
            ":email"    => $email,
            ":senha"    => $senhaHash,
            ":telefone" => $telefone
        ]);
    } catch (Throwable $eAdmin) {
        // Fallback caso a coluna is_admin ainda não tenha sido criada no Supabase
        $sqlCliente = "
            INSERT INTO cliente (nome, e_mail, senha, telefone)
            VALUES (:nome, :email, :senha, :telefone)
            RETURNING id_cliente
        ";
        $stmtCliente = $conexao->prepare($sqlCliente);
        $stmtCliente->execute([
            ":nome"     => $nome,
            ":email"    => $email,
            ":senha"    => $senhaHash,
            ":telefone" => $telefone
        ]);
    }

    $idCliente = (int) $stmtCliente->fetchColumn();

    if (!$idCliente) {
        throw new Exception("Erro ao gerar ID do cliente no banco.");
    }

    // Inserir Endereço
    $sqlEndereco = "
        INSERT INTO endereco (id_cliente, cep, endereco, numero, complemento, bairro, cidade, estado)
        VALUES (:id_cliente, :cep, :endereco, :numero, :complemento, :bairro, :cidade, :estado)
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

    $msg = $e->getMessage();
    if (strpos($msg, "cliente_e_mail_key") !== false || strpos($msg, "23505") !== false) {
        $msg = "Este e-mail já está cadastrado no sistema.";
    }

    echo json_encode([
        "sucesso"  => false,
        "mensagem" => $msg
    ], JSON_UNESCAPED_UNICODE);
}
