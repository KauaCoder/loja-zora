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

    const botao = document.querySelector(
        `.tab-button[onclick="mudarAba('${aba}')"]`
    );

    const formulario = document.getElementById(
        "form" + aba.charAt(0).toUpperCase() + aba.slice(1)
    );

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

    return String(email || "")
        .trim()
        .toLowerCase();
}


/* =========================================================
   MÁSCARA TELEFONE
   ========================================================= */

const telefoneCadastro =
    document.getElementById("telefoneCadastro");

if (telefoneCadastro) {

    telefoneCadastro.addEventListener("input", () => {

        let valor = telefoneCadastro.value
            .replace(/\D/g, "")
            .substring(0, 11);

        if (valor.length > 2) {

            valor = valor.replace(
                /^(\d{2})(\d)/,
                "($1) $2"
            );
        }

        if (valor.length > 10) {

            valor = valor.replace(
                /^(\(\d{2}\) \d{5})(\d)/,
                "$1-$2"
            );

        } else {

            valor = valor.replace(
                /^(\(\d{2}\) \d{4})(\d)/,
                "$1-$2"
            );
        }

        telefoneCadastro.value = valor;
    });
}


/* =========================================================
   MÁSCARA CEP
   ========================================================= */

const cepCadastro =
    document.getElementById("cepCadastro");

if (cepCadastro) {

    cepCadastro.addEventListener("input", () => {

        let valor = cepCadastro.value
            .replace(/\D/g, "")
            .substring(0, 8);

        if (valor.length > 5) {

            valor = valor.replace(
                /^(\d{5})(\d)/,
                "$1-$2"
            );
        }

        cepCadastro.value = valor;
    });

    cepCadastro.addEventListener(
        "blur",
        buscarCEPCadastro
    );
}


/* =========================================================
   VIA CEP
   ========================================================= */

async function buscarCEPCadastro() {

    if (!cepCadastro) {
        return;
    }

    const valor =
        cepCadastro.value.replace(/\D/g, "");

    if (valor.length !== 8) {

        const info =
            document.getElementById("enderecoInfo");

        if (info) {
            info.classList.remove("show");
        }

        limparEnderecos();

        return;
    }

    try {

        const resposta = await fetch(
            `https://viacep.com.br/ws/${valor}/json/`
        );

        if (!resposta.ok) {

            throw new Error(
                "Falha na consulta do CEP."
            );
        }

        const dados = await resposta.json();

        if (dados.erro) {

            alert("CEP não encontrado.");

            limparEnderecos();

            return;
        }

        document.getElementById(
            "ruaCadastro"
        ).value = dados.logradouro || "";

        document.getElementById(
            "bairroCadastro"
        ).value = dados.bairro || "";

        document.getElementById(
            "cidadeCadastro"
        ).value = dados.localidade || "";

        document.getElementById(
            "estadoCadastro"
        ).value = dados.uf || "";

        document.getElementById(
            "complementoCadastro"
        ).value = dados.complemento || "";

        document.getElementById(
            "enderecoTexto"
        ).textContent =
            `✓ Endereço encontrado: ${dados.logradouro || ""}, ${dados.bairro || ""} - ${dados.localidade || ""}, ${dados.uf || ""}`;

        document.getElementById(
            "enderecoInfo"
        ).classList.add("show");

        document.getElementById(
            "numeroCadastro"
        ).focus();

    } catch (erro) {

        console.error(
            "Erro no ViaCEP:",
            erro
        );

        alert(
            "Não foi possível consultar o CEP. Verifique sua conexão."
        );

        limparEnderecos();
    }
}


/* =========================================================
   LIMPAR ENDEREÇO
   ========================================================= */

function limparEnderecos() {

    document.getElementById(
        "ruaCadastro"
    ).value = "";

    document.getElementById(
        "bairroCadastro"
    ).value = "";

    document.getElementById(
        "cidadeCadastro"
    ).value = "";

    document.getElementById(
        "estadoCadastro"
    ).value = "";

    document.getElementById(
        "complementoCadastro"
    ).value = "";
}


/* =========================================================
   CADASTRO
   ========================================================= */

const formCadastro =
    document.getElementById("formCadastro");

if (formCadastro) {

    formCadastro.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();

            try {

                /* =========================
                   PEGAR DADOS
                   ========================= */

                const nome =
                    document
                        .getElementById("nomeCadastro")
                        .value
                        .trim();

                const email =
                    normalizarEmail(
                        document
                            .getElementById("emailCadastro")
                            .value
                    );

                const telefone =
                    document
                        .getElementById("telefoneCadastro")
                        .value
                        .trim();

                const senha =
                    document
                        .getElementById("senhaCadastro")
                        .value;

                const confirmarSenha =
                    document
                        .getElementById(
                            "confirmarSenhaCadastro"
                        )
                        .value;


                /* =========================
                   VALIDAÇÕES
                   ========================= */

                if (!nome) {

                    alert("Digite seu nome.");

                    return;
                }

                if (!email) {

                    alert("Digite um e-mail válido.");

                    return;
                }

                if (senha.length < 6) {

                    alert(
                        "A senha deve ter no mínimo 6 caracteres!"
                    );

                    return;
                }

                if (senha !== confirmarSenha) {

                    alert(
                        "As senhas não conferem!"
                    );

                    return;
                }


                /* =========================
                   ENDEREÇO
                   ========================= */

                const endereco = {

                    cep:
                        document
                            .getElementById("cepCadastro")
                            .value
                            .trim(),

                    rua:
                        document
                            .getElementById("ruaCadastro")
                            .value
                            .trim(),

                    numero:
                        document
                            .getElementById("numeroCadastro")
                            .value
                            .trim(),

                    complemento:
                        document
                            .getElementById(
                                "complementoCadastro"
                            )
                            .value
                            .trim(),

                    bairro:
                        document
                            .getElementById(
                                "bairroCadastro"
                            )
                            .value
                            .trim(),

                    cidade:
                        document
                            .getElementById(
                                "cidadeCadastro"
                            )
                            .value
                            .trim(),

                    estado:
                        document
                            .getElementById(
                                "estadoCadastro"
                            )
                            .value
                            .trim()
                };


                /* =========================
                   ENVIAR PARA PHP (ROTA ABSOLUTA)
                   ========================= */

                const resposta = await fetch(
                    "/cadastro.php",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        credentials: "include",

                        body: JSON.stringify({

                            nome,
                            email,
                            telefone,
                            senha,
                            endereco

                        })
                    }
                );


                /* =========================
                   LER RESPOSTA
                   ========================= */

                const resultado =
                    await resposta.json();


                /* =========================
                   ERRO
                   ========================= */

                if (
                    !resposta.ok ||
                    !resultado.sucesso
                ) {

                    alert(
                        resultado.mensagem ||
                        "Não foi possível realizar o cadastro."
                    );

                    return;
                }


                /* =========================
                   CADASTRO OK
                   ========================= */

                console.log(
                    "Cliente cadastrado:",
                    resultado.id_cliente
                );

                alert(
                    "Cadastro realizado com sucesso! Agora faça login."
                );

                mudarAba("login");

                /* Limpar formulário */

                formCadastro.reset();

                limparEnderecos();

            } catch (erro) {

                console.error(
                    "Erro no cadastro:",
                    erro
                );

                alert(
                    "Não foi possível conectar ao servidor."
                );
            }
        }
    );
}


/* =========================================================
   LOGIN
   ========================================================= */

const formLogin =
    document.getElementById("formLogin");

if (formLogin) {

    formLogin.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();

            const email =
                normalizarEmail(
                    document
                        .getElementById("emailLogin")
                        .value
                );

            const senha =
                document
                    .getElementById("senhaLogin")
                    .value;


            /* =========================
               VALIDAÇÃO
               ========================= */

            if (!email || !senha) {

                alert(
                    "Digite seu e-mail e sua senha."
                );

                return;
            }


            try {

                /* =========================
                   ENVIAR PARA PHP (ROTA ABSOLUTA)
                   ========================= */

                const resposta = await fetch(
                    "/login.php",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        credentials: "include",

                        body: JSON.stringify({

                            email: email,
                            senha: senha

                        })
                    }
                );


                /* =========================
                   RESPOSTA DO PHP
                   ========================= */

                const resultado =
                    await resposta.json();


                /* =========================
                   LOGIN NEGADO
                   ========================= */

                if (
                    !resposta.ok ||
                    !resultado.sucesso
                ) {

                    alert(
                        resultado.mensagem ||
                        "E-mail ou senha incorretos."
                    );

                    return;
                }


                /* =========================
                   LOGIN REALIZADO
                   ========================= */

                console.log(
                    "Login realizado:",
                    resultado.cliente
                );

                alert(
                    "Login realizado com sucesso!"
                );

                // Redireciona para a pasta exata da Tela Inicial
                window.location.href =
                    "/Telainicial/index.html";


            } catch (erro) {

                console.error(
                    "Erro no login:",
                    erro
                );

                alert(
                    "Não foi possível conectar ao servidor."
                );
            }
        }
    );
}
