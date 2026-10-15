try {
    const emailLimpo = typeof email === 'string' ? email.trim() : '';

    const resposta = await fetch('/login.php', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json' 
        },
        credentials: 'include',
        body: JSON.stringify({ email: emailLimpo, senha })
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

    if (resposta.ok && resultado.sucesso) {
        // Redireciona para a rota informada pelo PHP (/TelaAdmin/admin.html ou /TelaCliente/cliente.html)
        const destino = resultado.redirecionar || '/TelaCliente/cliente.html';
        window.location.replace(destino);
    } else {
        // Trata a mensagem enviada pelo backend (ex: "E-mail ou senha incorretos.")
        alert(resultado.mensagem || "E-mail ou senha incorretos.");
    }

} catch (erro) {
    console.error("Erro na comunicação com o login:", erro);
    alert("Falha na conexão com o servidor. Verifique sua rede e tente novamente.");
}
