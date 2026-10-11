/* =========================================================
   ZORA - LOGIN / CADASTRO
   PostgreSQL + Sessão PHP
   ========================================================= */

/* =========================================================
   ABAS
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
}

/* =========================================================
   NORMALIZAR E-MAIL
   ========================================================= */

function normalizarEmail(email) {
    return String(email || "").trim().toLowerCase();
}

/* =========================================================
   MÁSCARA TELEFONE
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
    });
}

/* =========================================================
   MÁSCARA CEP
   ========================================================= */

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

        const elRua = document.getElementById("ruaCadastro");
        if (elRua) elRua.value = dados.logradouro || "";

        const elBairro = document.getElementById("bairroCadastro");
        if (elBairro) elBairro.value = dados.bairro || "";

        const elCidade = document.getElementById("cidadeCadastro");
        if (elCidade) elCidade.value = dados.localidade || "";

        const elEstado = document.getElementById("estadoCadastro");
        if (elEstado) elEstado.value = dados.uf || "";

        const elComp = document.getElementById("complementoCadastro");
        if (elComp) elComp.value = dados.complemento || "";

        const elTexto = document.getElementById("enderecoTexto");
        if (elTexto) {
            elTexto.textContent = `✓ Endereço encontrado: ${dados.logradouro || ""}, ${dados.bairro || ""} - ${dados.localidade || ""}, ${dados.uf || ""}`;
        }

        const elInfo = document.getElementById("enderecoInfo");
        if (elInfo) elInfo.classList.add("show");

        const elNum = document.getElementById("numeroCadastro");
        if (elNum) elNum.focus();

    } catch (erro) {
        console.error("Erro no ViaCEP:", erro);
        alert("Não foi possível consultar o CEP. Verifique sua conexão.");
        limparEnderecos();
    }
}

/* =========================================================
   LIMPAR ENDEREÇO
   ========================================================= */

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
}

/* =========================================================
   CADASTRO (COM LEITURA DE TEXTO BRUTO)
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

            const resposta = await fetch("../cadastro.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ nome, email, telefone, senha, endereco })
            });

            // Lê a resposta do PHP como texto
            const textoBruto = await resposta.text();
            let resultado;

            try {
                resultado = JSON.parse(textoBruto);
            } catch (e) {
                console.error("Resposta do servidor não é JSON:", textoBruto);
                alert("Resposta do servidor PHP:\n" + textoBruto.substring(0, 200));
                return;
            }

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
            alert("Não foi possível conectar ao servidor: " + erro.message);
        }
    });
}

/* =========================================================
   LOGIN
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
            const resposta = await fetch("../login.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ email, senha })
            });

            const textoBruto = await resposta.text();
            let resultado;

            try {
                resultado = JSON.parse(textoBruto);
            } catch (e) {
                console.error("Resposta do servidor não é JSON:", textoBruto);
                alert("Erro ao processar login.");
                return;
            }

            if (!resultado.sucesso) {
                alert(resultado.mensagem || "E-mail ou senha incorretos.");
                return;
            }

            alert("Login realizado com sucesso!");
            window.location.replace(resultado.redirecionar || "../TelaInicial/index.html");

        } catch (erro) {
            console.error("Erro no login:", erro);
            alert("Não foi possível conectar ao servidor.");
        }
    });
}
