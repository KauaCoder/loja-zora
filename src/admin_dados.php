<?php
declare(strict_types=1);

/**
 * ZORA — Painel Admin (Dados do Inventário + Dashboard)
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
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
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

// Localização segura do conexao.php
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
        'mensagem' => 'Não foi possível localizar o arquivo conexao.php'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once $caminhoConexao;

try {
    if (!isset($conexao) || !($conexao instanceof PDO)) {
        throw new RuntimeException('A conexão PDO não foi inicializada corretamente.');
    }

    // VERIFICAÇÃO DE AUTENTICAÇÃO
    $idSessao = $_SESSION['id_cliente'] ?? null;

    if (!is_scalar($idSessao) || (int) $idSessao <= 0) {
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_write_close();
        }

        http_response_code(401);
        echo json_encode([
            'sucesso'  => false,
            'logado'   => false,
            'mensagem' => 'Sessão expirada. Faça login novamente.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $idCliente = (int) $idSessao;

    // Checa permissão de administrador
    $stmtAdmin = $conexao->prepare('SELECT COALESCE(is_admin, FALSE) AS is_admin FROM cliente WHERE id_cliente = :id LIMIT 1');
    $stmtAdmin->execute([':id' => $idCliente]);
    $rowAdmin = $stmtAdmin->fetch(PDO::FETCH_ASSOC);

    $isAdmin = filter_var($rowAdmin['is_admin'] ?? false, FILTER_VALIDATE_BOOLEAN);

    if (!$isAdmin) {
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_write_close();
        }

        http_response_code(403);
        echo json_encode([
            'sucesso'  => false,
            'is_admin' => false,
            'mensagem' => 'Acesso restrito para administradores.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // CONSULTA DOS PRODUTOS E ESTOQUE NO POSTGRESQL
    $sql = '
        SELECT
            p.id_produto,
            p.nm_produto,
            p.preco,
            p.qtd_item,
            p.categoria,
            p.imagem,
            p.descricao,
            e.id_item_estoque,
            e.qtd_max_produto,
            f.id_fornecedor,
            f.nome AS fornecedor,
            f.contato
        FROM produto p
        LEFT JOIN estoque e
            ON e.id_item_estoque = p.id_item_estoque
        LEFT JOIN fornecedor f
            ON f.id_item_estoque = e.id_item_estoque
        ORDER BY p.id_produto DESC
    ';

    $stmt = $conexao->prepare($sql);
    $stmt->execute();

    $dados = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $produtos = [];
    $totalEstoque = 0;
    $esgotadosCount = 0;

    foreach ($dados as $produto) {
        $qtd = (int) ($produto['qtd_item'] ?? 0);
        $totalEstoque += $qtd;

        if ($qtd <= 0) {
            $esgotadosCount++;
        }

        $produtos[] = [
            'id_produto'      => (int) $produto['id_produto'],
            'nome'            => $produto['nm_produto'],
            'preco'           => round((float) $produto['preco'], 2),
            'qtd_item'        => $qtd,
            'estoque'         => $qtd, // Compatibilidade com frontend
            'categoria'       => $produto['categoria'] ?? 'Geral',
            'imagem'          => $produto['imagem'] ?? 'default.jpg',
            'descricao'       => $produto['descricao'] ?? '',
            'id_item_estoque' => $produto['id_item_estoque'] !== null ? (int) $produto['id_item_estoque'] : null,
            'qtd_max_produto' => $produto['qtd_max_produto'] !== null ? (int) $produto['qtd_max_produto'] : 0,
            'id_fornecedor'   => $produto['id_fornecedor'] !== null ? (int) $produto['id_fornecedor'] : null,
            'fornecedor'      => $produto['fornecedor'] ?? 'Não cadastrado',
            'contato'         => $produto['contato'] ?? '-'
        ];
    }

    session_write_close();

    http_response_code(200);
    echo json_encode([
        'sucesso'   => true,
        'logado'    => true,
        'is_admin'  => true,
        'dashboard' => [
            'total_produtos' => count($produtos),
            'total_estoque'  => $totalEstoque,
            'esgotados'      => $esgotadosCount
        ],
        'produtos'  => $produtos
    ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);

} catch (Throwable $erro) {
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_write_close();
    }

    error_log('ZORA: erro ao carregar dados do painel admin: ' . $erro->getMessage());

    http_response_code(500);
    echo json_encode([
        'sucesso'  => false,
        'mensagem' => 'Não foi possível carregar as informações do painel administrativo.'
    ], JSON_UNESCAPED_UNICODE);
}
