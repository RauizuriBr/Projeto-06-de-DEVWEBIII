# Projeto-06-de-DEVWEBIII
Agendinha de Contatos usando o javascript

# Agenda de Contatos — CRUD com ViaCEP

**Atividade: Desenvolvimento Web III — FATEC**

Projeto criado com base no ZIP `261007_Recurso_Aula_1.zip` entregue em aula. A estrutura original utiliza servidor HTTP nativo do **Node.js**, páginas em **HTML/CSS** e **SQLite**. O recurso original continha páginas com exemplos e pontos marcados como "trecho que será implementado em aula"; esta versão implementa o CRUD completo.

## O que a aplicação faz

- **Create:** cadastrar contato com nome, e-mail, telefone, data de nascimento e endereço.
- **Read:** listar contatos e pesquisar por ID, nome, e-mail ou telefone.
- **Update:** buscar contato pelo ID e editar seus dados.
- **Delete:** buscar e excluir um contato, com uma confirmação antes da exclusão.
- **ViaCEP:** preencher rua, bairro, cidade e UF ao consultar CEP. Os campos podem ser alterados manualmente.
- **SQLite:** salvar dados localmente em `agenda.sqlite`, gerado automaticamente na primeira execução.

## Pré-requisitos

- Node.js 18 ou superior e NPM instalados.
- Conexão à internet **para a busca de CEP** pela API externa ViaCEP. O CRUD local funciona sem internet depois da instalação das dependências.

## Como executar no VS Code / Windows

1. Extraia o ZIP do projeto.
2. Abra a **pasta** `Agenda_Contatos_CRUD` no VS Code.
3. Abra **Terminal > Novo Terminal**.
4. Execute uma vez:

   ```bash
   npm install
   ```

5. Inicie o servidor:

   ```bash
   npm start
   ```

6. No navegador, acesse **http://localhost:5000/**.
7. Para parar o servidor: **Ctrl + C** no terminal.

> **Não abra os arquivos HTML diretamente** com `file:///`. A interface usa rotas da API, por isso precisa do servidor Node.js em execução.

## Organização das pastas

```text
Agenda_Contatos_CRUD/
├── app.js               # Servidor nativo Node.js e rotas REST
├── database.js          # Banco SQLite e criação da tabela contatos
├── package.json         # Dependência sqlite3 e scripts NPM
├── README.md            # Este tutorial
└── public/
    ├── index.html       # Página inicial e resumo
    ├── cadastrar.html   # Cadastro de contato
    ├── consultar.html   # Busca e listagem
    ├── atualizar.html   # Edição por ID
    ├── excluir.html     # Exclusão por ID
    ├── style.css        # Estilo responsivo
    └── js/app.js        # Formulários, API e ViaCEP
```

## API local

| Método | Endereço | Finalidade |
|---|---|---|
| `GET` | `/api/contatos` | Listar todos |
| `GET` | `/api/contatos?q=Maria` | Pesquisar |
| `GET` | `/api/contatos/1` | Obter contato por ID |
| `POST` | `/api/contatos` | Cadastrar |
| `PUT` | `/api/contatos/1` | Atualizar |
| `DELETE` | `/api/contatos/1` | Excluir |
| `GET` | `/api/estatisticas` | Total e cinco registros mais recentes |

### Exemplo de JSON de um contato

```json
{
  "nome": "Maria Oliveira",
  "email": "maria@example.com",
  "telefone": "(11) 99999-1111",
  "data_nascimento": "2001-04-12",
  "cep": "01001-000",
  "logradouro": "Praça da Sé",
  "numero": "100",
  "complemento": "Sala 2",
  "bairro": "Sé",
  "cidade": "São Paulo",
  "uf": "SP"
}
```

## Teste sugerido para a demonstração

1. Em **Cadastrar**, preencha nome, e-mail, telefone e nascimento.
2. Digite o CEP **01001-000** e clique **Buscar CEP**. ViaCEP deverá retornar os dados de Praça da Sé, São Paulo/SP (sujeito à disponibilidade externa).
3. Preencha número e complemento, depois clique **Salvar contato**.
4. Em **Consultar**, localize o contato cadastrado.
5. Clique **Editar**, altere o telefone e salve.
6. Volte à listagem e confira a alteração.
7. Clique **Excluir**, confira os dados e confirme.

## Cuidados e detalhes

- O endereço retornado pelo ViaCEP é obtido de `https://viacep.com.br/ws/<CEP>/json/` e um CEP não encontrado é tratado pela propriedade `erro`.
- CEPs genéricos podem vir sem rua ou bairro; nesses casos, complete os dados manualmente.
- O banco de dados local `agenda.sqlite` é **separado** do `database.sqlite` existente no projeto da aula, para não misturar cadastros.
- O projeto é didático e não tem autenticação. Use localmente para a atividade, não exponha na internet com contatos reais sem implementar controle de acesso e segurança adicional.
- Os dados da agenda ficam no arquivo `agenda.sqlite`, no próprio computador. Faça cópia do arquivo para backup, se desejar.

### Referências

- Projeto de aula enviado pelo professor: `261007_Recurso_Aula_1.zip`.
- ViaCEP: https://viacep.com.br/.
- SQLite Node: https://www.npmjs.com/package/sqlite3.

### Alternativa sem npm install (Node.js 22.13+)

Se você tiver **Node.js 22.13 ou mais recente**, pode iniciar direto com:

```bash
node app.js
```

Se a biblioteca `sqlite3` não estiver instalada, o projeto usa automaticamente o módulo `node:sqlite` nativo. Nessa versão do Node ele pode exibir um aviso de recurso experimental; o aviso não impede a atividade de funcionar. A opção `npm install` continua disponível, mantendo a biblioteca de aula.
