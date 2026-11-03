// loja-zora-main/src/auth.js

/**
 * ZORA — Autenticação Central & Utilitários de Interface
 * Integrado com backend PHP (Supabase / Render)
 */

// =============================================
// HELPER PARA RESOLUÇÃO DE CAMINHO RELATIVO
// =============================================
function obterCaminhoBackend(arquivo) {
    const pathname = window.location.pathname;
    // Se a página já estiver em uma subpasta (ex: /TelaInicial/, /TelaCliente/, /TelaAdmin/)
    if (pathname.includes('/Tela') || pathname.split('/').length > 2) {
        return `../${arquivo}`;
    }
    return `./${arquivo}`;
}

// =============================================
// VERIFICAÇÃO DE SESSÃO COM BACKEND PHP
// =============================================

/**
 * Consulta o backend (usuario_logado.php) para verificar o estado da sessão.
 */
async function obterStatusSessao() {
    try {
        const url = obterCaminhoBackend('usuario_logado.php');
        const resposta = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
            credentials: 'include' // Envia os cookies de sessão HTTP-only
        });

        if (!resposta.ok) {
            throw new Error('Erro ao verificar sessão no servidor.');
        }

        return await resposta.json();
    } catch (erro) {
        console.warn('Servidor inacessível. Verificando estado local:', erro);
        const usuarioLocal = localStorage.getItem('usuarioLogado');
        const dadosLocal = usuarioLocal ? JSON.parse(usuarioLocal) : null;
        return { 
            sucesso: !!usuarioLocal, 
            logado: !!usuarioLocal, 
            is_admin: dadosLocal ? !!dadosLocal.is_admin : false,
            cliente: dadosLocal 
        };
    }
}

/**
 * Redireciona o utilizador caso não esteja autenticado no PHP.
 */
async function protegerPagina() {
    const sessao = await obterStatusSessao();
    if (!sessao.logado) {
        window.location.replace('../TelaLogin/login.html');
        return false;
    }
    return true;
}

/**
 * Redireciona o utilizador caso não seja administrador.
 */
async function verificarAdmin() {
    const sessao = await obterStatusSessao();
    if (!sessao.logado || !sessao.is_admin) {
        alert('Acesso restrito a administradores.');
        window.location.replace('../Telainicial/index.html');
        return false;
    }
    return true;
}

/**
 * Realiza o encerramento da sessão no PHP e limpa a cache local.
 */
async function logout(redirecionar = true) {
    try {
        const url = obterCaminhoBackend('logout.php');
        await fetch(url, {
            method: 'POST',
            credentials: 'include'
        });
    } catch (erro) {
        console.error('Erro ao encerrar sessão no servidor:', erro);
    } finally {
        localStorage.removeItem('usuarioLogado');
        localStorage.removeItem('sessaoZora');
        localStorage.removeItem('emailUsuario');
        localStorage.removeItem('nomeUsuario');

        if (redirecionar) {
            window.location.replace('../TelaLogin/login.html');
        }
    }
}

// =============================================
// MÁSCARAS E CONSULTA DE CEP
// =============================================

function configurarMascaras() {
    const telefone = document.getElementById('telefoneCadastro');
    const cepCadastro = document.getElementById('cepCadastro');
    const cepEdicao = document.getElementById('cepEdicao');

    if (telefone) {
        telefone.addEventListener('input', () => {
            let v = telefone.value.replace(/\D/g, '').slice(0, 11);
            if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
            if (v.replace(/\D/g, '').length > 7) {
                const n = v.replace(/\D/g, '');
                v = `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
            }
            telefone.value = v;
        });
    }

    [cepCadastro, cepEdicao].forEach(input => {
        if (!input) return;
        input.addEventListener('input', () => {
            const n = input.value.replace(/\D/g, '').slice(0, 8);
            input.value = n.length > 5 ? `${n.slice(0, 5)}-${n.slice(5)}` : n;
        });
    });
}

function configurarCEP() {
    const cepCadastro = document.getElementById('cepCadastro');
    if (cepCadastro) {
        cepCadastro.addEventListener('blur', () => consultarCEP(cepCadastro, 'cadastro'));
    }

    const cepEdicao = document.getElementById('cepEdicao');
    if (cepEdicao) {
        cepEdicao.addEventListener('blur', () => consultarCEP(cepEdicao, 'edicao'));
    }
}

async function consultarCEP(input, tipo) {
    const valor = input.value.replace(/\D/g, '');
    if (valor.length !== 8) return;

    try {
        const resposta = await fetch(`https://viacep.com.br/ws/${valor}/json/`);
        if (!resposta.ok) throw new Error('Falha na consulta do CEP');

        const dados = await resposta.json();
        if (dados.erro) {
            alert('CEP não encontrado.');
            return;
        }

        const prefixo = tipo === 'cadastro' ? 'Cadastro' : 'Edicao';
        
        const elRua = document.getElementById(`rua${prefixo}`);
        const elBairro = document.getElementById(`bairro${prefixo}`);
        const elCidade = document.getElementById(`cidade${prefixo}`);
        const elEstado = document.getElementById(`estado${prefixo}`);
        const elComplemento = document.getElementById(`complemento${prefixo}`);

        if (elRua) elRua.value = dados.logradouro || '';
        if (elBairro) elBairro.value = dados.bairro || '';
        if (elCidade) elCidade.value = dados.localidade || '';
        if (elEstado) elEstado.value = dados.uf || '';
        if (elComplemento && !elComplemento.value) elComplemento.value = dados.complemento || '';

        if (tipo === 'cadastro') {
            const info = document.getElementById('enderecoInfo');
            const texto = document.getElementById('enderecoTexto');
            if (info && texto) {
                texto.textContent = `✓ Endereço encontrado: ${dados.logradouro}, ${dados.bairro} - ${dados.localidade}, ${dados.uf}`;
                info.classList.add('show');
            }
            document.getElementById('numeroCadastro')?.focus();
        } else {
            document.getElementById('numeroEdicao')?.focus();
        }
    } catch (error) {
        console.error(error);
        alert('Não foi possível consultar o CEP.');
    }
}

// =============================================
// NAVEGAÇÃO E INTERFACE DE UTILIZADOR
// =============================================

async function atualizarMenuUsuario() {
    try {
        const sessao = await obterStatusSessao();
        ['menuUsuario', 'menuUsuarioMobile'].forEach(id => {
            const elemento = document.getElementById(id);
            if (!elemento) return;

            if (!sessao.logado) {
                elemento.textContent = 'Login';
                elemento.href = '../TelaLogin/login.html';
            } else if (sessao.is_admin) {
                elemento.textContent = 'Painel Adm';
                elemento.href = '../TelaAdmin/admin.html';
            } else {
                elemento.textContent = 'Perfil';
                elemento.href = '../TelaCliente/cliente.html';
            }
        });
    } catch (erro) {
        console.error('Erro ao atualizar menu:', erro);
    }
}

async function abrirPerfil() {
    try {
        const sessao = await obterStatusSessao();
        if (!sessao.logado) {
            window.location.href = '../TelaLogin/login.html';
        } else if (sessao.is_admin) {
            window.location.href = '../TelaAdmin/admin.html';
        } else {
            window.location.href = '../TelaCliente/cliente.html';
        }
    } catch (erro) {
        window.location.href = '../TelaLogin/login.html';
    }
}

// Inicialização automática
document.addEventListener('DOMContentLoaded', () => {
    configurarMascaras();
    configurarCEP();
    atualizarMenuUsuario();
});

// Exposição global das funções para botões (onclick)
window.obterStatusSessao = obterStatusSessao;
window.protegerPagina = protegerPagina;
window.verificarAdmin = verificarAdmin;
window.logout = logout;
window.abrirPerfil = abrirPerfil;
window.atualizarMenuUsuario = atualizarMenuUsuario;
