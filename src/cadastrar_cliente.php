<?php
declare(strict_types=1);

/**
 * ZORA — Cadastro de Novo Cliente e Endereço
 */

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Vary: Origin');

// Lista de origens permitidas
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

if (session_status() !== PHP_SESSION_ACTIVE) {
    ini_set('session.use_only_cookies', '1');
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_trans_sid', '0');

    session_set_cookie_params([
        'lifetime' => 86400,
        'path' => '/',
        'secure' => $isHttps,
        'httponly' => true,
        'samesite' => $isHttps ? 'None' : 'Lax',
    ]);

    session_start();
}

// Localiza o arquivo de conexão na mesma pasta ou na pasta /src
$caminhoConexao = file_exists(__DIR__ . '/src/conexao.php')
    ? __DIR__ . '/src/conexao.php'
    : __DIR__ . '/conexao.php';

if (!is_file($caminhoConexao)) {
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_write_close();
    }
    http_response_code(500);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Erro interno de configuração do banco de dados.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once $caminhoConexao;

try {
    if (!isset($conexao) || !($conexao instanceof PDO)) {
        throw new RuntimeException('A conexão PDO não foi inicializada corretamente.');
    }

    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        header('Allow: POST, OPTIONS');
        http_response_code(405);
        echo json_encode([
            'sucesso' => false,
            'mensagem' => 'Método não permitido. Utilize POST.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Recebe os dados enviados pelo JavaScript
    $dados = json_decode((string) file_get_contents('php://input'), true);

    if (!is_array($dados)) {
        http_response_code(400);
        throw new Exception('Dados inválidos enviados na requisição.');
    }

    // =========================
    // DADOS DO CLIENTE
    // =========================

    $nome     = trim((string) ($dados['nome'] ?? ''));
    $email    = strtolower(trim((string) ($dados['email'] ?? $dados['e_mail'] ?? '')));
    $telefone = trim((string) ($dados['telefone'] ?? ''));
    $senha    = (string) ($dados['senha'] ?? '');

    // =========================
    // DADOS DO ENDEREÇO
    // =========================

    $endereco = is_array($dados['endereco'] ?? null) ? $dados['endereco'] : [];

    $cep         = trim((string) ($endereco['cep'] ?? ''));
    $rua         = trim((string) ($endereco['rua'] ?? $endereco['endereco'] ?? ''));
    $numero      = trim((string) ($endereco['numero'] ?? ''));
    $complemento = trim((string) ($endereco['complemento'] ?? ''));
    $bairro      = trim((string) ($endereco['bairro'] ?? ''));
    $cidade      = trim((string) ($endereco['cidade'] ?? ''));
    $estado      = strtoupper(trim((string) ($endereco['estado'] ?? '')));

    // =========================
    // VALIDAÇÕES
    // =========================

    if ($nome === '')                        throw new Exception('Nome é obrigatório.');
    if ($email === '')                       throw new Exception('E-mail é obrigatório.');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) throw new Exception('Formato de e-mail inválido.');
    if ($senha === '' || strlen($senha) < 6) throw new Exception('A senha deve ter no mínimo 6 caracteres.');
    if ($cep === '')                         throw new Exception('CEP é obrigatório.');
    if ($rua === '')                         throw new Exception('Rua/Endereço é obrigatório.');
    if ($numero === '')                      throw new Exception('Número é obrigatório.');
    if ($bairro === '')                      throw new Exception('Bairro é obrigatório.');
    if ($cidade === '')                      throw new Exception('Cidade é obrigatória.');
    if ($estado === '')                      throw new Exception('Estado é obrigatório.');

    // =========================
    // VERIFICAR E-MAIL DUPLICADO
    // =========================

    $sqlEmail = '
        SELECT id_cliente
        FROM cliente
        WHERE e_mail = :email
        LIMIT 1
    ';

    $stmtEmail = $conexao->prepare($sqlEmail);
    $stmtEmail->execute([':email' => $email]);

    if ($stmtEmail->fetch()) {
        http_response_code(400);
        throw new Exception('Este e-mail já está cadastrado.');
    }

    // Hash seguro da senha
    $senhaHash = password_hash($senha, PASSWORD_DEFAULT);

    // =========================
    // INICIAR TRANSAÇÃO
    // =========================

    $conexao->beginTransaction();

    // =========================
    // CADASTRAR CLIENTE
    // =========================

    $sqlCliente = '
        INSERT INTO cliente (nome, e_mail, senha, telefone, is_admin)
        VALUES (:nome, :email, :senha, :telefone, FALSE)
        RETURNING id_cliente
    ';

    $stmtCliente = $conexao->prepare($sqlCliente);
    $stmtCliente->execute([
        ':nome'     => $nome,
        ':email'    => $email,
        ':senha'    => $senhaHash,
        ':telefone' => $telefone
    ]);

    $idCliente = (int) $stmtCliente->fetchColumn();

    if (!$idCliente) {
        throw new Exception('Não foi possível gerar o ID do cliente.');
    }

    // =========================
    // CADASTRAR ENDEREÇO
    // =========================

    $sqlEndereco = '
        INSERT INTO endereco (id_cliente, cep, endereco, numero, complemento, bairro, cidade, estado)
        VALUES (:id_cliente, :cep, :endereco, :numero, :complemento, :bairro, :cidade, :estado)
    ';

    $stmtEndereco = $conexao->prepare($sqlEndereco);
    $stmtEndereco->execute([
        ':id_cliente'  => $idCliente,
        ':cep'          => $cep,
        ':endereco'     => $rua,
        ':numero'       => $numero,
        ':complemento'  => $complemento,
        ':bairro'       => $bairro,
        ':cidade'       => $cidade,
        ':estado'       => $estado
    ]);

    // =========================
    // CONFIRMAR TRANSAÇÃO
    // =========================

    $conexao->commit();

    // Inicia a sessão automática pós-cadastro
    session_regenerate_id(true);
    $_SESSION['id_cliente'] = $idCliente;
    $_SESSION['nome']       = $nome;
    $_SESSION['email']      = $email;
    $_SESSION['telefone']   = $telefone;
    $_SESSION['is_admin']   = false;

    session_write_close();

    http_response_code(201);
    echo json_encode([
        'sucesso'      => true,
        'mensagem'     => 'Cadastro realizado com sucesso!',
        'id_cliente'   => $idCliente,
        'redirecionar' => '/TelaCliente/cliente.html'
    ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);

} catch (Throwable $e) {
    if (isset($conexao) && $conexao instanceof PDO && $conexao->inTransaction()) {
        $conexao->rollBack();
    }

    if (session_status() === PHP_SESSION_ACTIVE) {
        session_write_close();
    }

    $msg = $e->getMessage();
    if (strpos($msg, '23505') !== false || strpos($msg, 'e_mail') !== false) {
        $msg = 'Este e-mail já está cadastrado.';
    }

    if (http_response_code() === 200) {
        http_response_code(400);
    }

    echo json_encode([
        'sucesso'  => false,
        'mensagem' => $msg
    ], JSON_UNESCAPED_UNICODE);
}
