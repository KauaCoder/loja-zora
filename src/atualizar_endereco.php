<?php
declare(strict_types=1);

/**
 * ZORA — Atualização / Criação de Endereço do Cliente
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

// Tenta localizar conexao.php no diretório atual, em /src ou na pasta pai
$caminhoConexao = file_exists(__DIR__ . '/src/conexao.php')
    ? __DIR__ . '/src/conexao.php'
    : (file_exists(__DIR__ . '/conexao.php') ? __DIR__ . '/conexao.php' : __DIR__ . '/../conexao.php');

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

    // =========================
    // VERIFICAR MÉTODO HTTP
    // =========================

    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        header('Allow: POST, OPTIONS');
        http_response_code(405);
        echo json_encode([
            'sucesso' => false,
            'mensagem' => 'Método não permitido. Utilize POST.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // =========================
    // VERIFICAR LOGIN
    // =========================

    $idSessao = $_SESSION['id_cliente'] ?? null;

    if (!is_scalar($idSessao) || (int) $idSessao <= 0) {
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_write_close();
        }

        http_response_code(401);
        echo json_encode([
            'sucesso' => false,
            'mensagem' => 'Usuário não está logado.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $idCliente = (int) $idSessao;
    session_write_close();

    // =========================
    // RECEBER DADOS
    // =========================

    $dados = json_decode((string) file_get_contents('php://input'), true);

    if (!is_array($dados)) {
        http_response_code(400);
        throw new Exception('Dados de requisição inválidos.');
    }

    // =========================
    // DADOS DO ENDEREÇO
    // =========================

    $cep         = trim((string) ($dados['cep'] ?? ''));
    $rua         = trim((string) ($dados['rua'] ?? $dados['endereco'] ?? ''));
    $numero      = trim((string) ($dados['numero'] ?? ''));
    $complemento = trim((string) ($dados['complemento'] ?? ''));
    $bairro      = trim((string) ($dados['bairro'] ?? ''));
    $cidade      = trim((string) ($dados['cidade'] ?? ''));
    $estado      = strtoupper(trim((string) ($dados['estado'] ?? '')));

    // =========================
    // VALIDAÇÃO
    // =========================

    if (!$cep || !$rua || !$numero || !$bairro || !$cidade || !$estado) {
        http_response_code(400);
        throw new Exception('Preencha todos os campos obrigatórios do endereço.');
    }

    // =========================
    // VERIFICAR ENDEREÇO EXISTENTE
    // =========================

    $sqlCheck = '
        SELECT id_endereco
        FROM endereco
        WHERE id_cliente = :id_cliente
        LIMIT 1
    ';

    $stmtCheck = $conexao->prepare($sqlCheck);
    $stmtCheck->execute([':id_cliente' => $idCliente]);
    $enderecoExistente = $stmtCheck->fetch(PDO::FETCH_ASSOC);

    // =========================
    // ATUALIZAR OU CRIAR
    // =========================

    if ($enderecoExistente) {
        // UPDATE
        $sql = '
            UPDATE endereco
            SET
                cep = :cep,
                endereco = :endereco,
                numero = :numero,
                complemento = :complemento,
                bairro = :bairro,
                cidade = :cidade,
                estado = :estado
            WHERE id_cliente = :id_cliente
        ';
    } else {
        // INSERT
        $sql = '
            INSERT INTO endereco
            (
                id_cliente,
                cep,
                endereco,
                numero,
                complemento,
                bairro,
                cidade,
                estado
            )
            VALUES
            (
                :id_cliente,
                :cep,
                :endereco,
                :numero,
                :complemento,
                :bairro,
                :cidade,
                :estado
            )
        ';
    }

    $stmt = $conexao->prepare($sql);
    $stmt->execute([
        ':id_cliente'  => $idCliente,
        ':cep'         => $cep,
        ':endereco'    => $rua,
        ':numero'      => $numero,
        ':complemento' => $complemento,
        ':bairro'      => $bairro,
        ':cidade'      => $cidade,
        ':estado'      => $estado
    ]);

    http_response_code(200);
    echo json_encode([
        'sucesso'  => true,
        'mensagem' => 'Endereço atualizado com sucesso!'
    ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);

} catch (Throwable $erro) {
    if (http_response_code() === 200) {
        http_response_code(500);
    }

    error_log('ZORA: erro ao salvar endereço: ' . $erro->getMessage());

    echo json_encode([
        'sucesso'  => false,
        'mensagem' => $erro->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
