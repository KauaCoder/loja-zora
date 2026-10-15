<?php
declare(strict_types=1);

/**
 * ZORA — Redirecionador Principal / Roteador de Entrada
 */

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

// Roteamento inteligente baseado na sessão ativa
$idCliente = $_SESSION['id_cliente'] ?? null;
$isAdmin   = filter_var($_SESSION['is_admin'] ?? false, FILTER_VALIDATE_BOOLEAN);

session_write_close();

if (is_scalar($idCliente) && (int) $idCliente > 0) {
    // Usuário logado: direciona de acordo com o nível de acesso
    $destino = $isAdmin ? '/TelaAdmin/admin.html' : '/TelaCliente/cliente.html';
} else {
    // Usuário visitante: direciona para a página inicial pública
    $destino = '/Telainicial/index.html';
}

header('Location: ' . $destino, true, 302);
exit;
