// =====================================================
// ZORA - AUTENTICAÇÃO CENTRAL
// PostgreSQL + Sessão PHP
// =====================================================


// =====================================================
// VERIFICAR SESSÃO NO SERVIDOR
// =====================================================

async function obterUsuarioLogado() {

    try {

        const resposta = await fetch(
            "/usuario_logado.php",
            {
                method: "GET",
                credentials: "include"
            }
        );

        const resultado = await resposta.json();

        if (
            resultado.sucesso === true &&
            resultado.logado === true
        ) {

            return resultado.cliente;

        }

        return null;

    } catch (erro) {

        console.error(
            "Erro ao verificar sessão:",
            erro
        );

        return null;

    }

}


// =====================================================
// VERIFICAR SE ESTÁ LOGADO
// =====================================================

async function estaLogado() {

    const usuario =
        await obterUsuarioLogado();

    return usuario !== null;

}


// =====================================================
// PROTEGER PÁGINA
// =====================================================

async function protegerPagina() {

    const usuario =
        await obterUsuarioLogado();

    if (!usuario) {

        window.location.replace(
            "/TelaLogin/login.html"
        );

        return false;

    }

    return true;

}


// =====================================================
// LOGOUT
// =====================================================

async function logout(
    redirecionar = true
) {

    try {

        await fetch(
            "/logout.php",
            {
                method: "POST",
                credentials: "include"
            }
        );

    } catch (erro) {

        console.error(
            "Erro ao fazer logout:",
            erro
        );

    }


    // Remove dados antigos do localStorage.
    // A autenticação verdadeira agora é feita pela sessão PHP.

    localStorage.removeItem("usuarioLogado");
    localStorage.removeItem("idCliente");
    localStorage.removeItem("emailUsuario");
    localStorage.removeItem("nomeUsuario");
    localStorage.removeItem("telefoneUsuario");
    localStorage.removeItem("enderecoUsuario");


    if (redirecionar) {

        window.location.replace(
            "/Telainicial/index.html"
        );

    }

}


// =====================================================
// ATUALIZAR MENU
// =====================================================

async function atualizarMenuUsuario() {

    const usuario =
        await obterUsuarioLogado();

    const logado =
        usuario !== null;


    [
        "menuUsuario",
        "menuUsuarioMobile"
    ].forEach(id => {

        const elemento =
            document.getElementById(id);

        if (elemento) {

            elemento.textContent =
                logado
                    ? "Perfil"
                    : "Login";

        }

    });

}


// =====================================================
// ABRIR PERFIL
// =====================================================

async function abrirPerfil() {

    const usuario =
        await obterUsuarioLogado();

    if (usuario) {

        window.location.href =
            "/TelaCliente/cliente.html";

    } else {

        window.location.href =
            "/TelaLogin/login.html";

    }

}


// =====================================================
// DISPONIBILIZAR FUNÇÕES
// =====================================================

window.estaLogado =
    estaLogado;

window.obterUsuarioLogado =
    obterUsuarioLogado;

window.protegerPagina =
    protegerPagina;

window.logout =
    logout;

window.abrirPerfil =
    abrirPerfil;

window.atualizarMenuUsuario =
    atualizarMenuUsuario;
