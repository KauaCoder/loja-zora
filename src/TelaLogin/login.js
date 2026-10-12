/* =========================================================
   ZORA - LOGIN & CADASTRO (DIAGNÓSTICO & TRATAMENTO DE ERROS)
   PostgreSQL + Sessão PHP + ViaCEP + Prévia em Tempo Real
   ========================================================= */

/* =========================================================
   1. GERENCIAMENTO DE ABAS & PRÉVIA DO PERFIL
   ========================================================= */

/**
 * Alterna entre a aba de Login e Cadastro com verificação segura de DOM
 * @param {string} aba - 'login' ou 'cadastro'
 */
function mudarAba(aba) {
    try {
        // Remove a classe 'active' de todos os botões de abas
        document.querySelectorAll(".tab-button").forEach(btn => {
            if (btn) btn.classList.remove("active");
        });

        // Remove a classe 'active' de todas as seções de formulário
        document.querySelectorAll(".form-section").forEach(form => {
            if (form) form.classList.remove("active");
        });

        // Localiza os elementos da aba selecionada
        const botao = document.querySelector(`.tab-button[onclick="mudarAba('${aba}')"]`);
        const idForm = "form" + aba.charAt(0).toUpperCase() + aba.slice(1);
        const formulario = document.getElementById(idForm);

        if (botao) botao.classList.add("active");
        if (formulario) formulario.classList.add("active");

        // Gerencia a caixa de prévia do perfil em tempo real
        const previewBox = document.getElementById("previewPerfilBox");
        if (previewBox) {
            if (aba === "cadastro") {
                previewBox.style.display = "flex";
                atualizarPreviaEmTempoReal();
            } else {
                // Na aba login exibe mensagem padrão de boas-vindas
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
    } catch (erro) {
        console.error("Erro ao alternar abas:", erro);
    }
}

/* =========================================================
   2. NORMALIZAÇÃO E MÁSCARAS DE INPUT
   ========================================================= */

/**
 * Remove espaços e converte o e-mail para letras minúsculas
 */
function normalizarEmail(email) {
    if (!email) return "";
    return String(email).trim().toLowerCase();
}

// Inicialização segura das máscaras após o carregamento da árvore DOM
document.addEventListener("DOMContentLoaded", function () {

    // Máscara de Telefone: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
    const telefoneInput = document.getElementById("telefoneCadastro");
    if (telefoneInput) {
        telefoneInput.addEventListener("input", function () {
            let valor = this.value.replace(/\D/g, "").substring(0, 11);
            if (valor.length > 2) {
                valor = valor.replace(/^(\d{2})(\d)/, "($1) $2");
            }
            if (valor.length > 10) {
                valor = valor.replace(/^(\(\d{2}\) \d{5})(\d)/, "$1-$2");
            } else {
                valor = valor.replace(/^(\(\d{2}\) \d{4})(\d)/, "$1-$2");
            }
            this.value = valor;
            atualizarPreviaEmTempoReal();
        });
    }

    // Máscara de CEP: XXXXX-XXX e escutador para o evento Blur
    const cepInput = document.getElementById("cepCadastro");
    if (cepInput) {
        cepInput.addEventListener("input", function () {
            let valor = this.value.replace(/\D/g, "").substring(0, 8);
            if (valor.length > 5) {
                valor = valor.replace(/^(\d{5})(\d)/, "$1-$2");
            }
            this.value = valor;
        });

        cepInput.addEventListener("blur", buscarCEPCadastro);
    }

    // Associa eventos de escuta em tempo real para a prévia do perfil
    const camposMonitorados = [
        "nomeCadastro",
        "emailCadastro",
        "telefoneCadastro",
        "ruaCadastro",
        "numeroCadastro"
    ];

    camposMonitorados.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("input", atualizarPreviaEmTempoReal);
        }
    });
});

/* =========================================================
   3. PRÉVIA EM TEMPO REAL & CONSULTA VIACEP
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

    if (previewNome) {
        previewNome.textContent = (inputNome && inputNome.value.trim()) ? inputNome.value.trim() : "Seu Nome Aqui";
    }
    if (previewEmail) {
        previewEmail.textContent = (inputEmail && inputEmail.value.trim()) ? inputEmail.value.trim() : "seu.email@exemplo.com";
    }
    if (previewTelefone) {
        previewTelefone.textContent = (inputTelefone && inputTelefone.value.trim()) ? inputTelefone.value.trim() : "(21) 99999-9999";
    }
    if (previewEndereco) {
        const rua = inputRua ? inputRua.value.trim() : "";
        const num = inputNumero ? inputNumero.value.trim() : "";
        previewEndereco.textContent = rua ? `${rua}${num ? ', ' + num : ''}` : "Seu endereço aparecerá aqui após o CEP";
    }
}

/**
 * Consulta o endereço através da API externa ViaCEP
 */
async function buscarCEPCadastro() {
    const cepInput = document.getElementById("cepCadastro");
    if (!cepInput) return;

    const valorCep = cepInput.value.replace(/\D/g, "");

    if (valorCep.length !== 8) {
        limparCamposEndereco();
        return;
    }

    try {
        const resposta = await fetch(`https://viacep.com.br/ws/${valorCep}/json/`);
        if (!resposta.ok) {
            throw new Error(`Erro na requisição ViaCEP (Status ${resposta.status})`);
        }

        const dados = await resposta.json();
        if (dados.erro) {
            alert("CEP não encontrado no ViaCEP.");
            limparCamposEndereco();
            return;
        }

        // Atribui os dados retornados aos inputs caso existam
        setValorElemento("ruaCadastro", dados.logradouro || "");
        setValorElemento("bairroCadastro", dados.bairro || "");
        setValorElemento("cidadeCadastro", dados.localidade || "");
        setValorElemento("estadoCadastro", dados.uf || "");
        setValorElemento("complementoCadastro", dados.complemento || "");

        const enderecoTexto = document.getElementById("enderecoTexto");
        const enderecoInfo = document.getElementById("enderecoInfo");

        if (enderecoTexto) {
            enderecoTexto.textContent = `✓ Endereço encontrado: ${dados.logradouro || ""}, ${dados.bairro || ""} - ${dados.localidade || ""}, ${dados.uf || ""}`;
        }
        if (enderecoInfo) {
            enderecoInfo.classList.add("show");
        }

        const numInput = document.getElementById("numeroCadastro");
        if (numInput) numInput.focus();

        atualizarPreviaEmTempoReal();

    } catch (erro) {
        console.error("Erro ao buscar CEP:", erro);
        alert("Não foi possível consultar o CEP. Verifique sua conexão.");
        limparCamposEndereco();
    }
}

function limparCamposEndereco() {
    ["ruaCadastro", "bairroCadastro", "cidadeCadastro", "estadoCadastro", "complementoCadastro"].forEach(id => {
        setValorElemento(id, "");
    });

    const enderecoInfo = document.getElementById("enderecoInfo");
    if (enderecoInfo) enderecoInfo.classList.remove("show");

    atualizarPreviaEmTempoReal();
}

function setValorElemento(id, valor) {
    const el = document.getElementById(id);
    if (el) el.value = valor;
}

/* =========================================================
   4. FUNÇÃO AUXILIAR PARA CONSUMIR ENDPOINTS PHP (RESILIENTE)
   ========================================================= */

/**
 * Tenta realizar a requisição em rotas alternativas para prevenir 404
 * @param {Array<string>} rotas - Lista de rotas para tentar
 * @param {Object} dados - Objeto JSON enviado no body
 */
async function enviarRequisicaoPHP(rotas, dados) {
    let ultimoErro = "";

    for (let i = 0; i < rotas.length; i++) {
        const rotaAtual = rotas[i];
        try {
            const resposta = await fetch(rotaAtual, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(dados)
            });

            // Captura a resposta bruta como texto para diagnóstico
            const textoResposta = await resposta.text();

            if (resposta.status === 404) {
                console.warn(`Rota não encontrada (404): ${rotaAtual}`);
                ultimoErro = `404 Not Found em ${rotaAtual}`;
                continue; // Tenta a próxima rota da lista
            }

            let jsonResultado;
            try {
                jsonResultado = JSON.parse(textoResposta);
            } catch (e) {
                throw new Error(`O servidor retornou resposta inválida (Status ${resposta.status}):\n${textoResposta.substring(0, 150)}`);
            }

            return { ok: true, dados: jsonResultado, rotaSucesso: rotaAtual };

        } catch (erro) {
            console.error(`Falha ao conectar na rota ${rotaAtual}:`, erro);
            ultimoErro = erro.message;
        }
    }

    return { ok: false, mensagem: ultimoErro || "Nenhuma rota do servidor respondeu corretamente." };
}

/* =========================================================
   5. SUBMIT DO FORMULÁRIO DE CADASTRO
   ========================================================= */

const formCadastro = document.getElementById("formCadastro");
if (formCadastro) {
    formCadastro.addEventListener("submit", async function (event) {
        event.preventDefault();

        try {
            // Obtenção e verificação defensiva dos dados digitados
            const elNome = document.getElementById("nomeCadastro");
            const elEmail = document.getElementById("emailCadastro");
            const elTelefone = document.getElementById("telefoneCadastro");
            const elSenha = document.getElementById("senhaCadastro");
            const elConfirmarSenha = document.getElementById("confirmarSenhaCadastro");

            const nome = elNome ? elNome.value.trim() : "";
            const email = elEmail ? normalizarEmail(elEmail.value) : "";
            const telefone = elTelefone ? elTelefone.value.trim() : "";
            const senha = elSenha ? elSenha.value : "";
            const confirmarSenha = elConfirmarSenha ? elConfirmarSenha.value : "";

            // Validações no cliente
            if (!nome) {
                alert("Por favor, digite seu nome completo.");
                if (elNome) elNome.focus();
                return;
            }

            if (!email) {
                alert("Por favor, digite um e-mail válido.");
                if (elEmail) elEmail.focus();
                return;
            }

            if (senha.length < 6) {
                alert("A senha deve conter no mínimo 6 caracteres!");
                if (elSenha) elSenha.focus();
                return;
            }

            if (senha !== confirmarSenha) {
                alert("A confirmação de senha não confere!");
                if (elConfirmarSenha) elConfirmarSenha.focus();
                return;
            }

            // Mapeamento dos dados do endereço
            const endereco = {
                cep: getValorOuVazio("cepCadastro"),
                rua: getValorOuVazio("ruaCadastro"),
                numero: getValorOuVazio("numeroCadastro"),
                complemento: getValorOuVazio("complementoCadastro"),
                bairro: getValorOuVazio("bairroCadastro"),
                cidade: getValorOuVazio("cidadeCadastro"),
                estado: getValorOuVazio("estadoCadastro")
            };

            // Lista de rotas possíveis para evitar erros de local/Render (404 Not Found)
            const rotasCadastro = [
                "/cadastro.php",
                "/cadastrar_cliente.php",
                "../cadastro.php",
                "../cadastrar_cliente.php"
            ];

            const resultadoReq = await enviarRequisicaoPHP(rotasCadastro, {
                nome,
                email,
                telefone,
                senha,
                endereco
            });

            if (!resultadoReq.ok) {
                alert("Erro de Conexão com o Servidor:\n" + resultadoReq.mensagem);
                return;
            }

            const respostaServidor = resultadoReq.dados;

            if (!respostaServidor.sucesso) {
                alert(respostaServidor.mensagem || "Não foi possível concluir o cadastro.");
                return;
            }

            alert("Cadastro realizado com sucesso! Faça login para continuar.");
            mudarAba("login");

            formCadastro.reset();
            limparCamposEndereco();

        } catch (erroFatal) {
            console.error("Erro interno ao submeter cadastro:", erroFatal);
            alert("Ocorreu um erro no aplicativo: " + erroFatal.message);
        }
    });
}

/* =========================================================
   6. SUBMIT DO FORMULÁRIO DE LOGIN
   ========================================================= */

const formLogin = document.getElementById("formLogin");
if (formLogin) {
    formLogin.addEventListener("submit", async function (event) {
        event.preventDefault();

        try {
            const elEmail = document.getElementById("emailLogin");
            const elSenha = document.getElementById("senhaLogin");

            const email = elEmail ? normalizarEmail(elEmail.value) : "";
            const senha = elSenha ? elSenha.value : "";

            if (!email || !senha) {
                alert("Digite seu e-mail e sua senha para entrar.");
                return;
            }

            // Rotas possíveis para o login
            const rotasLogin = [
                "/login.php",
                "../login.php"
            ];

            const resultadoReq = await enviarRequisicaoPHP(rotasLogin, { email, senha });

            if (!resultadoReq.ok) {
                alert("Erro de Conexão com o Servidor:\n" + resultadoReq.mensagem);
                return;
            }

            const respostaServidor = resultadoReq.dados;

            if (!respostaServidor.sucesso) {
                alert(respostaServidor.mensagem || "E-mail ou senha incorretos.");
                return;
            }

            // SALVA OS DADOS DO CLIENTE NO LOCALSTORAGE COMO GARANTIA PARA NAVEGADORES MOBILE
            if (respostaServidor.cliente) {
                localStorage.setItem("usuarioLogado", JSON.stringify(respostaServidor.cliente));
            }

            alert("Login realizado com sucesso!");

            // Redireciona de acordo com o retorno do backend ou vai para a Tela Inicial
            const destino = respostaServidor.redirecionar || "/Telainicial/index.html";
            window.location.replace(destino);

        } catch (erroFatal) {
            console.error("Erro interno ao submeter login:", erroFatal);
            alert("Ocorreu um erro no aplicativo: " + erroFatal.message);
        }
    });
}

function getValorOuVazio(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
}
