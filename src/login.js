// loja-zora-main/src/login.js

/**
 * ZORA — Lógica da Tela de Login e Cadastro
 * Integração com login.php e cadastrar_cliente.php
 */

document.addEventListener("DOMContentLoaded", () => {
    const formLogin = document.getElementById("formLogin");
    const formCadastro = document.getElementById("formCadastro");

    if (formLogin) {
        formLogin.addEventListener("submit", processarLogin);
    }

    if (formCadastro) {
        formCadastro.addEventListener("submit", processarCadastro);
    }
});

/**
 * Processa a autenticação do utilizador via login.php
 */
async function processarLogin(event) {
    event.preventDefault();

    const email = document.getElementById("emailLogin")?.value.trim().toLowerCase();
    const senha = document.getElementById("senhaLogin")?.value || "";

    if (!email || !senha) {
        alert("Por favor, preencha o e-mail e a senha.");
        return;
    }

    try {
        // Tenta alcançar login.php (compatível com chamadas a partir da raiz ou subpasta TelaLogin)
        const urlEndpoint = window.location.pathname.includes('/TelaLogin/') 
            ? '../login.php' 
            : './login.php';

        const resposta = await fetch(urlEndpoint, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include', // Garante o envio e recepção dos cookies de sessão
            body: JSON.stringify({ email, senha })
        });

        const textoResposta = await resposta.text();
        let resultado;

        try {
            resultado = JSON.parse(textoResposta);
        } catch (e) {
            console.error("Resposta do servidor não é um JSON válido:", textoResposta);
            alert("Ocorreu um erro inesperado no servidor. Tente novamente.");
            return;
        }

        if (resultado.sucesso) {
            // Guarda dados locais para retrocompatibilidade com auth.js
            if (resultado.cliente) {
                localStorage.setItem("usuarioLogado", JSON.stringify(resultado.cliente));
                localStorage.setItem("emailUsuario", resultado.cliente.email);
                localStorage.setItem("nomeUsuario", resultado.cliente.nome);
            }

            // Redireciona para /TelaAdmin/admin.html (se for admin) ou para o catálogo/home
            const destino = resultado.redirecionar 
                ? resultado.redirecionar 
                : (resultado.is_admin ? '../TelaAdmin/admin.html' : '../Telainicial/index.html');

            window.location.replace(destino);
        } else {
            alert(resultado.mensagem || "E-mail ou senha incorretos.");
        }

    } catch (erro) {
        console.error("Erro na comunicação com o login:", erro);
        alert("Falha na conexão com o servidor. Verifique sua rede e tente novamente.");
    }
}

/**
 * Processa o registro de novos clientes via cadastrar_cliente.php
 */
async function processarCadastro(event) {
    event.preventDefault();

    const nome = document.getElementById("nomeCadastro")?.value.trim();
    const email = document.getElementById("emailCadastro")?.value.trim().toLowerCase();
    const telefone = document.getElementById("telefoneCadastro")?.value.trim() || "";
    const senha = document.getElementById("senhaCadastro")?.value || "";
    const confirmar = document.getElementById("confirmarSenhaCadastro")?.value || "";

    if (!nome || !email || !senha) {
        alert("Preencha todos os campos obrigatórios.");
        return;
    }

    if (senha.length < 6) {
        alert("A senha deve ter no mínimo 6 caracteres.");
        return;
    }

    if (senha !== confirmar) {
        alert("As senhas não conferem.");
        return;
    }

    const payload = {
        nome,
        email,
        telefone,
        senha,
        cep: document.getElementById("cepCadastro")?.value.replace(/\D/g, "") || "",
        rua: document.getElementById("ruaCadastro")?.value.trim() || "",
        numero: document.getElementById("numeroCadastro")?.value.trim() || "",
        complemento: document.getElementById("complementoCadastro")?.value.trim() || "",
        bairro: document.getElementById("bairroCadastro")?.value.trim() || "",
        cidade: document.getElementById("cidadeCadastro")?.value.trim() || "",
        estado: document.getElementById("estadoCadastro")?.value.trim() || "RJ"
    };

    try {
        const urlEndpoint = window.location.pathname.includes('/TelaLogin/') 
            ? '../cadastrar_cliente.php' 
            : './cadastrar_cliente.php';

        const resposta = await fetch(urlEndpoint, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(payload)
        });

        const resultado = await resposta.json();

        if (resultado.sucesso) {
            alert("Cadastro realizado com sucesso! Bem-vindo à ZORA.");
            window.location.replace('../Telainicial/index.html');
        } else {
            alert(resultado.mensagem || "Erro ao realizar o cadastro.");
        }
    } catch (erro) {
        console.error("Erro no cadastro:", erro);
        alert("Não foi possível conectar ao servidor para efetuar o cadastro.");
    }
}
