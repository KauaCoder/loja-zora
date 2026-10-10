<?php

// Configura os parâmetros do cookie de sessão ANTES de iniciar a sessão
// Necessário para funcionar no HTTPS do Render e manter o login ativo
session_set_cookie_params([
    'lifetime' => 86400, // 24 horas
    'path'     => '/',
    'secure'   => true,   // Obriga transmissão apenas via HTTPS
    'httponly' => true,   // Protege contra scripts maliciosos no front
    'samesite' => 'Lax'   // Permite que o cookie seja enviado nas requisições do site
]);

session_start();

header("Content-Type: application/json; charset=UTF-8");

// Inclui o arquivo de conexão presente na mesma pasta
require_once __DIR__ . "/conexao.php";

try {

    // =========================
    // VERIFICAR MÉTODO HTTP
    // =========================

    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        http_response_code(405);
        echo json_encode([
            "sucesso" => false,
            "mensagem" => "Método não permitido. Utilize POST."
        ]);
        exit;
    }

    $dados = json_decode(
        file_get_contents("php://input"),
        true
    );

    if (!$dados || !is_array($dados)) {
        throw new Exception("Dados de requisição inválidos.");
    }

    $email = strtolower(trim($dados["email"] ?? ""));
    $senha = $dados["senha"] ?? "";

    if ($email === "" || $senha === "") {
        throw new Exception("E-mail e senha são obrigatórios.");
    }

    // =========================
    // PROCURAR CLIENTE
    // inclui a coluna is_admin
    // =========================

    $sql = "
        SELECT
            id_cliente,
            nome,
            e_mail,
            senha,
            telefone,
            COALESCE(is_admin, FALSE) AS is_admin
        FROM cliente
        WHERE e_mail = :email
        LIMIT 1
    ";

    $stmt = $conexao->prepare($sql);

    $stmt->execute([
        ":email" => $email
    ]);

    $cliente = $stmt->fetch(PDO::FETCH_ASSOC);

    // =========================
    // VERIFICAR CLIENTE E SENHA
    // =========================

    if (!$cliente || !password_verify($senha, $cliente["senha"])) {
        throw new Exception("E-mail ou senha incorretos.");
    }

    // =========================
    // CRIAR SESSÃO NO SERVIDOR
    // =========================

    $_SESSION["id_cliente"] = (int) $cliente["id_cliente"];
    $_SESSION["nome"]       = $cliente["nome"];
    $_SESSION["email"]      = $cliente["e_mail"];
    $_SESSION["telefone"]   = $cliente["telefone"];
    $_SESSION["is_admin"]   = (bool) $cliente["is_admin"]; // Salva permissão na sessão

    // =========================
    // DEFINIR ROTA SEGREDA / REDIRECIONAMENTO
    // =========================

    $isAdmin = (bool) $cliente["is_admin"];
    $redirecionar = $isAdmin ? "/TelaAdmin/admin.html" : "/Telainicial/index.html";

    // =========================
    // RESPOSTA COMPLETA
    // =========================

    echo json_encode([

        "sucesso" => true,

        "mensagem" => "Login realizado com sucesso!",

        "is_admin" => $isAdmin,

        "redirecionar" => $redirecionar,

        "cliente" => [

            "id_cliente" => (int) $cliente["id_cliente"],
            "nome"       => $cliente["nome"],
            "email"      => $cliente["e_mail"],
            "telefone"   => $cliente["telefone"],
            "is_admin"   => $isAdmin

        ]

    ]);

} catch (Exception $e) {

    http_response_code(400);

    echo json_encode([

        "sucesso" => false,

        "mensagem" => $e.getMessage()

    ]);

}
