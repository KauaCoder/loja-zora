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

            if (!nome || !email) {
                alert("Preencha seu nome e e-mail.");
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

            const textoResposta = await resposta.text();
            let resultado;

            try {
                resultado = JSON.parse(textoResposta);
            } catch (e) {
                console.error("Resposta do servidor não é JSON:", textoResposta);
                alert("Erro interno no servidor PHP. Detalhes salvos no console.");
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
