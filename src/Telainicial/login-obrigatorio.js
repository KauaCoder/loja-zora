// =====================================================
// ZORA - LOGIN OBRIGATÓRIO PARA COMPRAR
// Arquivo compartilhado: salve na raiz do site, ao lado do auth.js,
// e carregue DEPOIS do script da página:
//     <script src="/login-obrigatorio.js"></script>
//
// Bloqueia:
//   - adicionar peça ao carrinho (home: adicionarPedidos / produto: adicionarAoCarrinho)
//   - finalizar a compra (pagarPedido)
// Quando a pessoa não está logada, abre um aviso com o botão "Entrar".
// =====================================================

(function () {
    "use strict";

    const URL_LOGIN = "/TelaLogin/login.html";


    // -------------------------------------------------
    // 1. VERIFICAR SE A PESSOA ESTÁ LOGADA
    // (mesma regra do abrirPerfil das páginas)
    // -------------------------------------------------

    async function obterUsuario() {
        let usuario = null;

        if (typeof obterUsuarioLogado === "function") {
            try {
                usuario = await obterUsuarioLogado();
            } catch (erro) {
                console.error("ZORA: erro ao obter o usuário logado.", erro);
            }
        } else {
            try {
                usuario = JSON.parse(localStorage.getItem("usuarioLogado") || "null");
            } catch (erro) {
                usuario = null;
            }
        }

        return usuario;
    }

    async function estaLogado() {
        const usuario = await obterUsuario();
        return Boolean(usuario && (usuario.nome || usuario.email || usuario.id_cliente));
    }


    // -------------------------------------------------
    // 2. AVISO "ENTRE PARA COMPRAR"
    // -------------------------------------------------

    let modal = null;

    function injetarEstilos() {
        if (document.getElementById("zoraLoginEstilos")) return;

        const estilo = document.createElement("style");
        estilo.id = "zoraLoginEstilos";
        estilo.textContent = `
            .zlogin-fundo {
                position: fixed;
                inset: 0;
                z-index: 5000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 16px;
                background: rgba(20, 17, 14, 0.55);
                opacity: 0;
                visibility: hidden;
                transition: opacity 260ms ease, visibility 260ms ease;
            }
            .zlogin-fundo.ativo { opacity: 1; visibility: visible; }
            .zlogin-caixa {
                width: min(400px, 100%);
                padding: 28px 24px 22px;
                border-radius: 14px;
                background: #ffffff;
                color: #1a1a1a;
                font-family: Arial, Helvetica, sans-serif;
                text-align: center;
                transform: translateY(14px);
                transition: transform 260ms cubic-bezier(.2, .8, .2, 1);
            }
            .zlogin-fundo.ativo .zlogin-caixa { transform: translateY(0); }
            .zlogin-caixa h3 { font-size: 21px; font-weight: 600; margin-bottom: 10px; }
            .zlogin-caixa p { font-size: 15px; line-height: 1.55; color: #555; margin-bottom: 22px; }
            .zlogin-entrar {
                display: block;
                width: 100%;
                min-height: 48px;
                border: none;
                border-radius: 6px;
                background: #1a1a1a;
                color: #fff;
                font-size: 15px;
                font-weight: 600;
                cursor: pointer;
                transition: background 260ms ease;
            }
            .zlogin-entrar:hover { background: #a94460; }
            .zlogin-fechar {
                margin-top: 14px;
                padding: 0;
                border: none;
                border-bottom: 1px solid #1a1a1a;
                background: none;
                color: #1a1a1a;
                font-size: 13px;
                cursor: pointer;
            }
            .zlogin-caixa button:focus-visible { outline: 2px solid #1a1a1a; outline-offset: 2px; }
        `;
        document.head.appendChild(estilo);
    }

    function criarModal() {
        injetarEstilos();

        const fundo = document.createElement("div");
        fundo.className = "zlogin-fundo";
        fundo.setAttribute("aria-hidden", "true");

        const caixa = document.createElement("div");
        caixa.className = "zlogin-caixa";
        caixa.setAttribute("role", "dialog");
        caixa.setAttribute("aria-modal", "true");
        caixa.setAttribute("aria-labelledby", "zloginTitulo");

        const titulo = document.createElement("h3");
        titulo.id = "zloginTitulo";
        titulo.textContent = "Entre para comprar";

        const texto = document.createElement("p");
        texto.textContent = "Para adicionar peças à sacola e finalizar a compra, você precisa entrar na sua conta.";

        const entrar = document.createElement("button");
        entrar.type = "button";
        entrar.className = "zlogin-entrar";
        entrar.textContent = "Entrar";
        entrar.addEventListener("click", irParaLogin);

        const agoraNao = document.createElement("button");
        agoraNao.type = "button";
        agoraNao.className = "zlogin-fechar";
        agoraNao.textContent = "Agora não";
        agoraNao.addEventListener("click", fecharAviso);

        caixa.append(titulo, texto, entrar, agoraNao);
        fundo.appendChild(caixa);

        // clicar fora da caixa fecha
        fundo.addEventListener("click", function (e) {
            if (e.target === fundo) fecharAviso();
        });

        document.body.appendChild(fundo);
        return fundo;
    }

    function abrirAviso() {
        if (!modal) modal = criarModal();

        modal.classList.add("ativo");
        modal.setAttribute("aria-hidden", "false");

        const botao = modal.querySelector(".zlogin-entrar");
        if (botao) botao.focus();
    }

    function fecharAviso() {
        if (!modal) return;

        modal.classList.remove("ativo");
        modal.setAttribute("aria-hidden", "true");
    }

    function irParaLogin() {
        // Guarda a página atual: a tela de login pode ler sessionStorage.zoraRetorno
        // e mandar a pessoa de volta depois de entrar.
        try {
            sessionStorage.setItem("zoraRetorno", window.location.href);
        } catch (erro) {
            // sem sessionStorage, segue direto para o login
        }

        window.location.href = URL_LOGIN;
    }

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") fecharAviso();
    });


    // -------------------------------------------------
    // 3. FUNÇÃO PÚBLICA: exigirLogin()
    // Devolve true se pode continuar; se não, abre o aviso e devolve false.
    // -------------------------------------------------

    window.exigirLogin = async function () {
        if (await estaLogado()) return true;

        abrirAviso();
        return false;
    };


    // -------------------------------------------------
    // 4. PROTEGER AS FUNÇÕES DE COMPRA JÁ EXISTENTES
    // Funciona sem editar o script da página, porque o botão "Comprar"
    // e o botão "Finalizar Compra" chamam essas funções pelo nome.
    // -------------------------------------------------

    function proteger(nome) {
        const original = window[nome];

        if (typeof original !== "function" || original.__protegida) return;

        const protegida = async function () {
            if (!(await window.exigirLogin())) return;
            return original.apply(this, arguments);
        };

        protegida.__protegida = true;
        window[nome] = protegida;
    }

    function protegerCompra() {
        proteger("adicionarPedidos");   // home (cards)
        proteger("pagarPedido");        // home e produto (Finalizar Compra / Pagar)
    }

    // Os scripts das páginas já foram carregados antes deste arquivo
    protegerCompra();
    document.addEventListener("DOMContentLoaded", protegerCompra);

})();
