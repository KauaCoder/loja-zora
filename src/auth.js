// loja-zora-main/auth.js

/**
 * ZORA — Autenticação Central & Utilitários de Interface
 * Integrado com backend PHP (Supabase / Render)
 *
 * REGRA ÚNICA: a sessão do servidor (usuario_logado.php) é a única
 * fonte de verdade. O localStorage é só um espelho e NUNCA prova login.
 */

// =============================================
// VERIFICAÇÃO DE SESSÃO COM BACKEND PHP
// =============================================

/**
 * Consulta o backend para verificar o estado da sessão.
 * Falha fechada: se não for possível confirmar, NÃO está logado.
 */
async function obterStatusSessao() {
    try {
        const resposta = await fetch('/usuario_logado.php?_=' + Date.now(), {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            credentials: 'include', // Envia os cookies de sessão HTTP-only
            cache: 'no-store'
        });

        if (!resposta.ok) {
            throw new Error('Erro ao verificar sessão no servidor.');
        }

        const dados = await resposta.json();

        // Mantém o localStorage apenas como espelho da sessão do servidor
        try {
            if (dados && dados.logado && dados.cliente) {
                localStorage.setItem('usuarioLogado', JSON.stringify(dados.cliente));
            } else {
                localStorage.removeItem('usuarioLogado');
            }
        } catch (e) {
            // localStorage indisponível: ignora
        }

        return dados;
    } catch (erro) {
        console.warn('ZORA: não foi possível verificar a sessão.', erro);
        return { sucesso: false, logado: false, is_admin: false, cliente: null };
    }
}

/**
 * Devolve o usuário logado (dados do servidor) ou null.
 * Usada por script.js e login-obrigatorio.js.
 */
async function obterUsuarioLogado() {
    const sessao = await obterStatusSessao();
    if (!sessao.logado || !sessao.cliente) return null;
    return { ...sessao.cliente, is_admin: !!sessao.is_admin };
}

/**
 * Redireciona o utilizador caso não esteja autenticado no PHP.
 */
async function protegerPagina() {
    const sessao = await obterStatusSessao();
    if (!sessao.logado) {
        window.location.replace('/TelaLogin/login.html');
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
        window.location.replace('/Telainicial/index.html');
        return false;
    }
    return true;
}

/**
 * Realiza o encerramento da sessão no PHP e limpa a cache local.
 */
async function logout(redirecionar = true) {
    try {
        await fetch('/logout.php', {
            method: 'POST',
            credentials: 'include'
        });
    } catch (erro) {
        console.error('Erro ao encerrar sessão no servidor:', erro);
    } finally {
        try {
            localStorage.removeItem('usuarioLogado');
            localStorage.removeItem('sessaoZora');
            localStorage.removeItem('emailUsuario');
            localStorage.removeItem('nomeUsuario');
        } catch (e) {
            // ignora
        }

        if (redirecionar) {
            window.location.replace('/TelaLogin/login.html');
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
                elemento.setAttribute('href', '/TelaLogin/login.html');
            } else if (sessao.is_admin) {
                elemento.textContent = 'Painel Adm';
                elemento.setAttribute('href', '/TelaAdmin/admin.html');
            } else {
                elemento.textContent = 'Perfil';
                elemento.setAttribute('href', '/TelaCliente/cliente.html');
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
            window.location.href = '/TelaLogin/login.html';
        } else if (sessao.is_admin) {
            window.location.href = '/TelaAdmin/admin.html';
        } else {
            window.location.href = '/TelaCliente/cliente.html';
        }
    } catch (erro) {
        window.location.href = '/TelaLogin/login.html';
    }
}

// Inicialização automática
document.addEventListener('DOMContentLoaded', () => {
    configurarMascaras();
    configurarCEP();
    atualizarMenuUsuario();
});

// Exposição global das funções para botões (onclick) e outros scripts
window.obterStatusSessao = obterStatusSessao;
window.obterUsuarioLogado = obterUsuarioLogado;
window.protegerPagina = protegerPagina;
window.verificarAdmin = verificarAdmin;
window.logout = logout;
window.abrirPerfil = abrirPerfil;
window.atualizarMenuUsuario = atualizarMenuUsuario;
