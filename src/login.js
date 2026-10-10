const resposta = await fetch('/login.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, senha })
});

const resultado = await resposta.json();

if (resultado.sucesso) {
    // Redireciona para /TelaAdmin/admin.html se for admin ou /Telainicial/index.html se for cliente comum
    window.location.replace(resultado.redirecionar);
} else {
    alert(resultado.mensagem);
}
