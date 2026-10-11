/* =========================================================
   ZORA - LOGIN / CADASTRO
   PostgreSQL + Sessão PHP + Prévia em Tempo Real
   ========================================================= */

/* =========================================================
   ABAS & GERENCIAMENTO DA PRÉVIA
   ========================================================= */

function mudarAba(aba) {
    document.querySelectorAll(".tab-button").forEach(btn => {
        btn.classList.remove("active");
    });

    document.querySelectorAll(".form-section").forEach(form => {
        form.classList.remove("active");
    });

    const botao = document.querySelector(`.tab-button[onclick="mudarAba('${aba}')"]`);
    const formulario = document.getElementById("form" + aba.charAt(0).toUpperCase() + aba.slice(1));

    if (botao) {
        botao.classList.add("active");
    }

    if (formulario) {
        formulario.classList.add("active");
    }

    // Alterna a visualização da caixa de prévia do perfil
    const previewBox = document.getElementById("previewPerfilBox");
    if (previewBox) {
        if (aba === "cadastro") {
            previewBox.style.display = "flex";
            atualizarPreviaEmTempoReal();
        } else {
            // Na aba login exibe mensagem de boas-vindas na prévia
            const previewNome = document.getElementById("previewNome");
            const previewEmail = document.getElementById("previewEmail");
            const previewTelefone = document.getElementById("previewTelefone");
            const previewEndereco = document.getElementById("previewEndereco");

            if (previewNome) previewNome.textContent = "Bem-vindo de volta!";
            if (previewEmail) previewEmail.textContent = "Faça login para acessar suas compras.";
            if (previewTelefone) previewTelefone.textContent = "-";
            if (previewEndereco) previewEndereco.textContent = "Seus dados estarão disponíveis no perfil.";
        }
    }
}

/* =========================================================
   NORMALIZAR E-MAIL
   ========================================================= */

function normalizarEmail(email) {
    return String(email || "").trim().toLowerCase();
}

/* =========================================================
   PRÉVIA DO PERFIL EM TEMPO REAL
   ========================================================= */

function atualizarPreviaEmTempoReal() {
    const inputNome = document.getElementById("nomeCadastro");
    const inputEmail = document.getElementById("emailCadastro");
    const inputTelefone = document.getElementById("telefoneCadastro");
    const inputRua = document.getElementById("ruaCadastro");
    const inputNumero = document.getElementById("numeroCadastro");

    const previewNome = document.getElementById("previewNome");
    const previewEmail = document.getElementById("previewEmail");
    const previewTelefone = document.getElementById("previewTelefone");
    const previewEndereco = document.getElementById("previewEndereco");

    if (previewNome) previewNome.textContent = inputNome && inputNome.value.trim() ? inputNome.value.trim() : "Seu Nome Aqui";
    if (previewEmail) previewEmail.textContent = inputEmail && inputEmail.value.trim() ? inputEmail.value.trim() : "seu.email@exemplo.com";
    if (previewTelefone) previewTelefone.textContent = inputTelefone && inputTelefone.value.trim() ? inputTelefone.value.trim() : "(21) 99999-9999";

    if (previewEndereco) {
        const rua = inputRua ? inputRua.value.trim() : "";
        const num = inputNumero ? inputNumero.value.trim() : "";
        previewEndereco.textContent = rua ? `${rua}${num ? ', ' + num : ''}` : "Seu endereço aparecerá aqui após o CEP";
    }
}

// Associa os escutadores nos inputs do formulário de cadastro
document.addEventListener("DOMContentLoaded", function () {
    const camposCadastro = [
        "nomeCadastro",
        "emailCadastro",
        "telefoneCadastro",
        "ruaCadastro",
        "numeroCadastro"
    ];

    camposCadastro.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener("input", atualizarPreviaEmTempoReal);
        }
    });
});

/* =========================================================
   MÁSCARAS (TELEFONE & CEP)
   ========================================================= */

const telefoneCadastro = document.getElementById("telefoneCadastro");
if (telefoneCadastro) {
    telefoneCadastro.addEventListener("input", () => {
        let valor = telefoneCadastro.value.replace(/\D/g, "").substring(0, 11);

        if (valor.length > 2) {
            valor = valor.replace(/^(\d{2})(\d)/, "($1) $2");
        }

        if (valor.length > 10) {
            valor = valor.replace(/^(\(\d{2}\) \d{5})(\d)/, "$1-$2");
        } else {
            valor = valor.replace(/^(\(\d{2}\) \d{4})(\d)/, "$1-$2");
        }

        telefoneCadastro.value = valor;
        atualizarPreviaEmTempoReal();
    });
}

const cepCadastro = document.getElementById("cepCadastro");
if (cepCadastro) {
    cepCadastro.addEventListener("input", () => {
        let valor = cepCadastro.value.replace(/\D/g, "").substring(0, 8);

        if (valor.length > 5) {
            valor = valor.replace(/^(\d{5})(\d)/, "$1-$2");
        }

        cepCadastro.value = valor;
    });

    cepCadastro.addEventListener("blur", buscarCEPCadastro);
}

/* =========================================================
   VIA CEP
   ========================================================= */

async function buscarCEPCadastro() {
    if (!cepCadastro) return;

    const valor = cepCadastro.value.replace(/\D/g, "");

    if (valor.length !== 8) {
        const info = document.getElementById("enderecoInfo");
        if (info) info.classList.remove("show");
        limparEnderecos();
        return;
    }

    try {
        const resposta = await fetch(`https://viacep.com.br/ws/${valor}/json/`);

        if (!resposta.ok) {
            throw new Error("Falha na consulta do CEP.");
        }

        const dados = await resposta.json();

        if (dados.erro) {
            alert("CEP não encontrado.");
            limparEnderecos();
            return;
        }

        document.getElementById("ruaCadastro").value = dados.logradouro || "";
        document.getElementById("bairroCadastro").value = dados.bairro || "";
        document.getElementById("cidadeCadastro").value = dados.localidade || "";
        document.getElementById("estadoCadastro").value = dados.uf || "";
        document.getElementById("complementoCadastro").value = dados.complemento || "";

        const enderecoTexto = document.getElementById("enderecoTexto");
        const enderecoInfo = document.getElementById("enderecoInfo");

        if (enderecoTexto) {
            enderecoTexto.textContent = `✓ Endereço encontrado: ${dados.logradouro || ""}, ${dados.bairro || ""} - ${dados.localidade || ""}, ${dados.uf || ""}`;
        }

        if (enderecoInfo) {
            enderecoInfo.classList.add("show");
        }

        const numeroCadastro = document.getElementById("numeroCadastro");
        if (numeroCadastro) numeroCadastro.focus();

        atualizarPreviaEmTempoReal();

    } catch (erro) {
        console.error("Erro no ViaCEP:", erro);
        alert("Não foi possível consultar o CEP. Verifique sua conexão.");
        limparEnderecos();
    }
}

function limparEnderecos() {
    const campos = [
        "ruaCadastro",
        "bairroCadastro",
        "cidadeCadastro",
        "estadoCadastro",
        "complementoCadastro"
    ];

    campos.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });

    const info = document.getElementById("enderecoInfo");
    if (info) info.classList.remove("show");

    atualizarPreviaEmTempoReal();
}

/* =========================================================
   SUBMIT: CADASTRO
   ========================================================= */

const formCadastro = document.getElementById("formCadastro");
if (formCadastro) {
    formCadastro.addEventListener("submit", async function (event) {
        event.preventDefault();

        try {
            const nome = document.getElementById("nomeCadastro").value.trim();
            const email = normalizarEmail(document.getElementById("emailCadastro").value);
            const telefone = document.getElementById("telefoneCadastro").value.trim();
            const senha = document.getElementById("senhaCadastro").value;
            const confirmarSenha = document.getElementById("confirmarSenhaCadastro").value;

            if (!nome) {
                alert("Digite seu nome.");
                return;
            }

            if (!email) {
                alert("Digite um e-mail válido.");
                return;
            }

            if (senha.length < 6) {
                alert("A senha deve ter no mínimo 6 caracteres!");
                return;
            }

            if (senha !== confirmarSenha) {
                alert("As senhas não conferem!");
                return;
            }

            const endereco = {
                cep: document.getElementById("cepCadastro").value.trim(),
                rua: document.getElementById("ruaCadastro").value.trim(),
                numero: document.getElementById("numeroCadastro").value.trim(),
                complemento: document.getElementById("complementoCadastro").value.trim(),
                bairro: document.getElementById("bairroCadastro").value.trim(),
                cidade: document.getElementById("cidadeCadastro").value.trim(),
                estado: document.getElementById("estadoCadastro").value.trim()
            };

            const resposta = await fetch("/cadastro.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ nome, email, telefone, senha, endereco })
            });

            const resultado = await resposta.json();

            // Lê a resposta do backend
            if (!resultado.sucesso) {
                alert(resultado.mensagem || "Não foi possível realizar o cadastro.");
                return;
            }

            alert("Cadastro realizado com sucesso! Agora faça login.");
            mudarAba("login");

            formCadastro.reset();
            limparEnderecos();

        } catch (erro) {
            console.error("Erro no cadastro:", erro);
            alert("Não foi possível conectar ao servidor. Tente novamente.");
        }
    });
}

/* =========================================================
   SUBMIT: LOGIN
   ========================================================= */

const formLogin = document.getElementById("formLogin");
if (formLogin) {
    formLogin.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = normalizarEmail(document.getElementById("emailLogin").value);
        const senha = document.getElementById("senhaLogin").value;

        if (!email || !senha) {
            alert("Digite seu e-mail e sua senha.");
            return;
        }

        try {
            const resposta = await fetch("/login.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ email, senha })
            });

            const resultado = await resposta.json();

            if (!resultado.sucesso) {
                alert(resultado.mensagem || "E-mail ou senha incorretos.");
                return;
            }

            alert("Login realizado com sucesso!");
            window.location.href = resultado.redirecionar || "/Telainicial/index.html";

        } catch (erro) {
            console.error("Erro no login:", erro);
            alert("Não foi possível conectar ao servidor.");
        }
    });
}
