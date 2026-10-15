try {
    const resposta = await fetch('/login.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, senha })
    });

    const textoResposta = await resposta.text();
    let resultado;

    try {
        resultado = JSON.parse(textoResposta);
    } catch (e) {
        console.error("Resposta do servidor não é JSON:", textoResposta);
        alert("Ocorreu um erro inesperado no servidor. Tente novamente.");
        return;
    }

    if (resultado.sucesso) {
        // Redireciona para /TelaAdmin/admin.html (se is_admin = true) ou /Telainicial/index.html (se cliente)
        window.location.replace(resultado.redirecionar || '/Telainicial/index.html');
    } else {
        alert(resultado.mensagem || "E-mail ou senha incorretos.");
    }

} catch (erro) {
    console.error("Erro na comunicação com o login:", erro);
    alert("Falha na conexão com o servidor. Verifique sua rede e tente novamente.");
}
