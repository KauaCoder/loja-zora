/* =========================================================
   ZORA - LOGIN & CADASTRO
   ========================================================= */

function mudarAba(aba) {
    try {
        document.querySelectorAll(".tab-button").forEach(btn => {
            if (btn) btn.classList.remove("active");
        });

        document.querySelectorAll(".form-section").forEach(form => {
            if (form) form.classList.remove("active");
        });

        const botao = document.querySelector(`.tab-button[onclick*="${aba}"]`);
        const idForm = "form" + aba.charAt(0).toUpperCase() + aba.slice(1);
        const formulario = document.getElementById(idForm);

        if (botao) botao.classList.add("active");
        if (formulario) formulario.classList.add("active");

        const previewBox = document.getElementById("previewPerfilBox");
        if (previewBox) {
            if (aba === "cadastro") {
                previewBox.style.display = "flex";
                atualizarPreviaEmTempoReal();
            } else {
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

function normalizarEmail(email) {
    if (!email) return "";
    return String(email).trim().toLowerCase();
}

document.addEventListener("DOMContentLoaded", function () {
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

    const camposMonitorados = ["nomeCadastro", "emailCadastro", "telefoneCadastro", "ruaCadastro", "numeroCadastro"];
    camposMonitorados.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("input", atualizarPreviaEmTempoReal);
        }
    });
});

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
        if (!resposta.ok) throw new Error(`Status ${resposta.status}`);

        const dados = await resposta.json();
        if (dados.erro) {
            alert("CEP não encontrado.");
            limparCamposEndereco();
            return;
        }

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
        if (enderecoInfo) enderecoInfo.classList.add("show");

        const numInput = document.getElementById("numeroCadastro");
        if (numInput) numInput.focus();

        atualizarPreviaEmTempoReal();

    } catch (erro) {
        console.error("Erro ao buscar CEP:", erro);
        alert("Não foi possível consultar o CEP.");
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

            const textoResposta = await resposta.text();

            if (resposta.status === 404) {
                ultimoErro = `404 Not Found em ${rotaAtual}`;
                continue;
            }

            let jsonResultado;
            try {
                jsonResultado = JSON.parse(textoResposta);
            } catch (e) {
                throw new Error(`Resposta inválida: ${textoResposta.substring(0, 150)}`);
            }

            return { ok: true, dados: jsonResultado, rotaSucesso: rotaAtual };

        } catch (erro) {
            ultimoErro = erro.message;
        }
    }

    return { ok: false, mensagem: ultimoErro || "Nenhuma rota respondeu." };
}

const formCadastro = document.getElementById("formCadastro");
if (formCadastro) {
    formCadastro.addEventListener("submit", async function (event) {
        event.preventDefault();

        try {
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

            if (!nome || !email) {
                alert("Preencha nome e e-mail.");
                return;
            }

            if (senha.length < 6 || senha !== confirmarSenha) {
                alert("Verifique a senha informada.");
                return;
            }

            const endereco = {
                cep: getValorOuVazio("cepCadastro"),
                rua: getValorOuVazio("ruaCadastro"),
                numero: getValorOuVazio("numeroCadastro"),
                complemento: getValorOuVazio("complementoCadastro"),
                bairro: getValorOuVazio("bairroCadastro"),
                cidade: getValorOuVazio("cidadeCadastro"),
                estado: getValorOuVazio("estadoCadastro")
            };

            const rotasCadastro = ["/cadastro.php", "/cadastrar_cliente.php", "../cadastro.php", "../cadastrar_cliente.php"];
            const resultadoReq = await enviarRequisicaoPHP(rotasCadastro, { nome, email, telefone, senha, endereco });

            if (!resultadoReq.ok || !resultadoReq.dados.sucesso) {
                alert(resultadoReq.dados?.mensagem || resultadoReq.mensagem || "Erro ao cadastrar.");
                return;
            }

            alert("Cadastro realizado com sucesso! Faça login para continuar.");
            mudarAba("login");

            formCadastro.reset();
            limparCamposEndereco();

        } catch (erroFatal) {
            alert("Erro: " + erroFatal.message);
        }
    });
}

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
                alert("Digite e-mail e senha.");
                return;
            }

            const rotasLogin = ["/login.php", "../login.php"];
            const resultadoReq = await enviarRequisicaoPHP(rotasLogin, { email, senha });

            if (!resultadoReq.ok || !resultadoReq.dados.sucesso) {
                alert(resultadoReq.dados?.mensagem || resultadoReq.mensagem || "E-mail ou senha incorretos.");
                return;
            }

            const respostaServidor = resultadoReq.dados;
            const dadosUsuario = respostaServidor.cliente || respostaServidor.usuario || respostaServidor;

            const ehAdmin = dadosUsuario.is_admin === true || dadosUsuario.is_admin === 1 || dadosUsuario.is_admin === "1" || dadosUsuario.nivel === "admin";

            localStorage.setItem("usuarioLogado", JSON.stringify({
                id_cliente: dadosUsuario.id_cliente || dadosUsuario.id,
                nome: dadosUsuario.nome || "Usuário",
                email: dadosUsuario.email || email,
                is_admin: ehAdmin
            }));

            alert("Login realizado com sucesso!");

            let destino = respostaServidor.redirecionar;
            if (!destino) {
                destino = ehAdmin ? "/src/TelaAdmin/admin.html" : "/src/TelaCliente/cliente.html";
            }

            window.location.replace(destino);

        } catch (erroFatal) {
            alert("Erro no login: " + erroFatal.message);
        }
    });
}

function getValorOuVazio(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
}
