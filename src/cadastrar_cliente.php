<?php
header("Content-Type: application/json; charset=UTF-8");

/* =========================================================
   INCLUI A CONEXÃO (NA MESMA PASTA)
   ========================================================= */
require_once __DIR__ . '/conexao.php';

try {
    // 1. Verifica se a conexão com o banco está ativa
    if (!isset($conexao) || !($conexao instanceof PDO)) {
        throw new Exception("Falha na conexão com o banco de dados.");
    }

    // 2. Verificar Método HTTP
    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        http_response_code(405);
        echo json_encode([
            "sucesso" => false,
            "mensagem" => "Método não permitido. Utilize POST."
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // 3. Receber dados JSON
    $conteudo = file_get_contents("php://input");
    $dados = json_decode($conteudo, true);

    if (!$dados || !is_array($dados)) {
        throw new Exception("Dados de requisição inválidos.");
    }

    // 4. Extração dos Dados do Cliente
    $nome     = trim($dados["nome"] ?? "");
    $email    = strtolower(trim($dados["email"] ?? $dados["e_mail"] ?? ""));
    $telefone = trim($dados["telefone"] ?? "");
    $senha    = $dados["senha"] ?? "";

    // 5. Extração dos Dados do Endereço (suporta raiz ou aninhado)
    $endereco = $dados["endereco"] ?? [];

    $cep         = trim($endereco["cep"] ?? $dados["cep"] ?? "");
    $rua         = trim($endereco["rua"] ?? $endereco["endereco"] ?? $dados["rua"] ?? $dados["endereco"] ?? "");
    $numero      = trim($endereco["numero"] ?? $dados["numero"] ?? "");
    $complemento = trim($endereco["complemento"] ?? $dados["complemento"] ?? "");
    $bairro      = trim($endereco["bairro"] ?? $dados["bairro"] ?? "");
    $cidade      = trim($endereco["cidade"] ?? $dados["cidade"] ?? "");
    $estado      = strtoupper(trim($endereco["estado"] ?? $dados["estado"] ?? ""));

    // 6. Validações dos campos
    if ($nome === "") throw new Exception("O nome é obrigatório.");
    if ($email === "" || !filter_var($email, FILTER_VALIDATE_EMAIL)) throw new Exception("Forneça um e-mail válido.");
    if ($senha === "" || strlen($senha) < 6) throw new Exception("A senha deve ter no mínimo 6 caracteres.");
    if ($cep === "") throw new Exception("O CEP é obrigatório.");
    if ($rua === "") throw new Exception("O endereço/rua é obrigatório.");
    if ($numero === "") throw new Exception("O número do endereço é obrigatório.");
    if ($bairro === "") throw new Exception("O bairro é obrigatório.");
    if ($cidade === "") throw new Exception("A cidade é obrigatória.");
    if ($estado === "") throw new Exception("O estado (UF) é obrigatório.");

    // 7. Verificar E-mail Duplicado na coluna oficial 'e_mail'
    $sqlEmail = "SELECT id_cliente FROM cliente WHERE e_mail = :email LIMIT 1";
    $stmtEmail = $conexao->prepare($sqlEmail);
    $stmtEmail->execute([":email" => $email]);

    if ($stmtEmail->fetch()) {
        throw new Exception("Este e-mail já está cadastrado.");
    }

    // 8. Hash da Senha
    $senhaHash = password_hash($senha, PASSWORD_DEFAULT);

    // 9. Iniciar Transação
    $conexao->beginTransaction();

    // 10. Inserir Cliente
    $sqlCliente = "
        INSERT INTO cliente
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
        throw new Exception("Não foi possível gerar o ID do cliente.");
    }

    // 11. Inserir Endereço
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

    // 12. Confirmar Transação
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

    // Retorna mensagem formatada para o alerta do JavaScript
    echo json_encode([
        "sucesso"  => false,
        "mensagem" => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>
