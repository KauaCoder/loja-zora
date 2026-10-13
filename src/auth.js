// =====================================================
// ZORA - AUTENTICAÇÃO CENTRAL
// PostgreSQL + Sessão PHP + LocalStorage Fallback
// =====================================================


// =====================================================
// VERIFICAR SESSÃO NO SERVIDOR
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
            if (resultado && resultado.sucesso === true && resultado.logado === true) {
                // Atualiza o localStorage com os dados mais recentes
                if (resultado.cliente) {
                    localStorage.setItem("usuarioLogado", JSON.stringify(resultado.cliente));
                }
                return resultado.cliente;
            }
        }
    } catch (erro) {
        console.error("Erro ao verificar sessão no servidor:", erro);
    }

    // FALLBACK: Tenta recuperar o usuário salvo no localStorage caso a requisição falhe/atrase
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


// =====================================================
// VERIFICAR SE ESTÁ LOGADO
// =====================================================

async function estaLogado() {
    const usuario = await obterUsuarioLogado();
    return usuario !== null;
}


// =====================================================
// PROTEGER PÁGINA
// =====================================================

async function protegerPagina() {
    const usuario = await obterUsuarioLogado();

    if (!usuario) {
        window.location.replace("/TelaLogin/login.html");
        return false;
    }

    return true;
}


// =====================================================
// LOGOUT
// =====================================================

async function logout(redirecionar = true) {
    try {
        await fetch("/logout.php", {
            method: "POST",
            credentials: "include"
        });
    } catch (erro) {
        console.error("Erro ao fazer logout:", erro);
    }

    // Remove todos os dados residuais do localStorage
    localStorage.removeItem("usuarioLogado");
    localStorage.removeItem("idCliente");
    localStorage.removeItem("emailUsuario");
    localStorage.removeItem("nomeUsuario");
    localStorage.removeItem("telefoneUsuario");
    localStorage.removeItem("enderecoUsuario");

    if (redirecionar) {
        window.location.replace("/Telainicial/index.html");
    }
}


// =====================================================
// ATUALIZAR MENU
// =====================================================

async function atualizarMenuUsuario() {
    const usuario = await obterUsuarioLogado();
    const logado = usuario !== null;

    ["menuUsuario", "menuUsuarioMobile"].forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) {
            if (logado) {
                const primeiroNome = usuario.nome ? usuario.nome.split(" ")[0] : "Perfil";
                elemento.textContent = `Olá, ${primeiroNome}`;
            } else {
                elemento.textContent = "Login";
            }
        }
    });
}


// =====================================================
// ABRIR PERFIL (CORRIGIDO PARA O CAMINHO REAL DO PROJETO)
// =====================================================

async function abrirPerfil() {
    const usuario = await obterUsuarioLogado();

    if (usuario) {
        if (usuario.is_admin) {
            window.location.href = "/src/TelaAdmin/admin.html";
        } else {
            // Direciona para o caminho correto dentro de src/TelaCliente
            window.location.href = "/src/TelaCliente/cliente.html";
        }
    } else {
        window.location.href = "/TelaLogin/login.html";
    }
}


// =====================================================
// DISPONIBILIZAR FUNÇÕES GLOBAIS
// =====================================================

window.estaLogado = estaLogado;
window.obterUsuarioLogado = obterUsuarioLogado;
window.protegerPagina = protegerPagina;
window.logout = logout;
window.abrirPerfil = abrirPerfil;
window.atualizarMenuUsuario = atualizarMenuUsuario;
