// =====================================================
// ZORA - AUTENTICAÇÃO CENTRAL
// PostgreSQL + Sessão PHP + LocalStorage Fallback
// =====================================================

async function obterUsuarioLogado() {
    try {
        const resposta = await fetch("/usuario_logado.php", {
            method: "GET",
            headers: {
                "Cache-Control": "no-cache, no-store"
            },
            credentials: "include"
        });

        if (resposta.ok) {
            const resultado = await resposta.json();
            if (resultado && resultado.sucesso === true && resultado.logado === true && resultado.cliente) {
                localStorage.setItem("usuarioLogado", JSON.stringify(resultado.cliente));
                return resultado.cliente;
            }
        }
    } catch (erro) {
        console.error("Erro ao verificar sessão no servidor:", erro);
    }

    const dadosLocais = localStorage.getItem("usuarioLogado");
    if (dadosLocais) {
        try {
            return JSON.parse(dadosLocais);
        } catch (e) {
            return null;
        }
    }

    return null;
}

async function estaLogado() {
    const usuario = await obterUsuarioLogado();
    return usuario !== null;
}

async function protegerPagina() {
    const usuario = await obterUsuarioLogado();

    if (!usuario) {
        window.location.replace("/TelaLogin/login.html");
        return false;
    }

    return true;
}

async function logout(redirecionar = true) {
    try {
        await fetch("/logout.php", {
            method: "POST",
            credentials: "include"
        });
    } catch (erro) {
        console.error("Erro ao fazer logout:", erro);
    }

    localStorage.removeItem("usuarioLogado");
    localStorage.removeItem("idCliente");
    localStorage.removeItem("emailUsuario");
    localStorage.removeItem("nomeUsuario");

    if (redirecionar) {
        window.location.replace("/Telainicial/index.html");
    }
}

async function atualizarMenuUsuario() {
    const usuario = await obterUsuarioLogado();
    const logado = usuario !== null;

    ["menuUsuario", "menuUsuarioMobile"].forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) {
            if (logado) {
                const ehAdmin = usuario.is_admin === true || usuario.is_admin === 1 || usuario.is_admin === "1" || usuario.nivel === "admin";
                if (ehAdmin) {
                    elemento.textContent = "📊 Dashboard Adm";
                } else {
                    const primeiroNome = usuario.nome ? usuario.nome.split(" ")[0] : "Perfil";
                    elemento.textContent = `Olá, ${primeiroNome}`;
                }
            } else {
                elemento.textContent = "Login";
            }
        }
    });
}

async function abrirPerfil() {
    const usuario = await obterUsuarioLogado();

    if (usuario) {
        const ehAdmin = usuario.is_admin === true || usuario.is_admin === 1 || usuario.is_admin === "1" || usuario.nivel === "admin";
        if (ehAdmin) {
            window.location.href = "/src/TelaAdmin/admin.html";
        } else {
            window.location.href = "/src/TelaCliente/cliente.html";
        }
    } else {
        window.location.href = "/TelaLogin/login.html";
    }
}

window.estaLogado = estaLogado;
window.obterUsuarioLogado = obterUsuarioLogado;
window.protegerPagina = protegerPagina;
window.logout = logout;
window.abrirPerfil = abrirPerfil;
window.atualizarMenuUsuario = atualizarMenuUsuario;
