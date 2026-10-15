// =====================================================
// ZORA - AUTENTICAÇÃO CENTRAL
// PostgreSQL + Sessão PHP + LocalStorage Fallback
// =====================================================

// Função genérica para tentar rotas da API em múltiplos caminhos
async function requisitarAPI(rotas, opcoes = {}) {
    for (const rota of rotas) {
        try {
            const resposta = await fetch(rota, {
                ...opcoes,
                headers: {
                    "Cache-Control": "no-cache, no-store",
                    ...(opcoes.headers || {})
                },
                credentials: "include"
            });

            if (resposta.ok) {
                const dados = await resposta.json();
                return { ok: true, dados };
            }
        } catch (e) {
            // Se falhar a rota atual, tenta a próxima do array
            continue;
        }
    }
    return { ok: false };
}

async function obterUsuarioLogado() {
    // Tenta primeiro no servidor em rotas absolutas e relativas
    const rotasSessao = [
        "/usuario_logado.php",
        "../usuario_logado.php",
        "./usuario_logado.php"
    ];

    const resultado = await requisitarAPI(rotasSessao, { method: "GET" });

    if (resultado.ok && resultado.dados) {
        const resposta = resultado.dados;
        if (resposta.sucesso === true && resposta.logado === true && resposta.cliente) {
            localStorage.setItem("usuarioLogado", JSON.stringify(resposta.cliente));
            return resposta.cliente;
        } else if (resposta.logado === false) {
            // Se o servidor disse expressamente que NÃO está logado, limpa o cache local
            localStorage.removeItem("usuarioLogado");
            return null;
        }
    }

    // Fallback: Se o servidor estiver off-line ou em caso de erro na rede, usa o LocalStorage
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
    const rotasLogout = [
        "/logout.php",
        "../logout.php",
        "./logout.php"
    ];

    await requisitarAPI(rotasLogout, { method: "POST" });

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
            window.location.href = "/TelaAdmin/admin.html";
        } else {
            window.location.href = "/TelaCliente/cliente.html";
        }
    } else {
        window.location.href = "/TelaLogin/login.html";
    }
}

// Expõe as funções globalmente para o escopo window
window.estaLogado = estaLogado;
window.obterUsuarioLogado = obterUsuarioLogado;
window.protegerPagina = protegerPagina;
window.logout = logout;
window.abrirPerfil = abrirPerfil;
window.atualizarMenuUsuario = atualizarMenuUsuario;
