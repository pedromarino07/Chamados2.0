<div align="center">
<img width="1200" height="475" alt="GHBanner" src="public/Banner.png" />

# 🏥 Helpdesk Santa Casa de Fortaleza
**Desenvolvido por: Pedro Marino Viana Lima** [📩 pedro-mvlima@hotmail.com]
</div>

---

## 📝 Sobre o Projeto
Este é um sistema de **Gestão de Chamados e Indicadores** personalizado para a Santa Casa de Fortaleza.

### 🎨 Identidade Visual
O sistema utiliza as cores oficiais da instituição e prefeitura:
* **Laranja:** `#f15a22` (Destaque e Botões)
* **Bege:** `#ffe6cb` (Fundo e Leveza)
* **Azul:** `#336699` (Barras e Estrutura)
* **Cinza Escuro:** `#414042` (Textos e Tabelas)

## 🚀 Funcionalidades Principais
* [cite_start]**Dashboard Administrativo:** Monitoramento em tempo real de chamados ativos e finalizados[cite: 6].
* [cite_start]**Indicadores de Desempenho:** Gráficos de performance por técnico e setores atendidos[cite: 7].
* [cite_start]**Exportação de PDF Timbrado:** Geração de relatórios oficiais com papel timbrado da Santa Casa de Fortaleza[cite: 8, 9].
* [cite_start]**Controle de Acesso:** Níveis de permissão para Admin, Técnico e Colaborador[cite: 2].
* [cite_start]**Paginação e Filtros:** Organização eficiente de usuários e históricos[cite: 4, 5].

## 💻 Execução Local

**Pré-requisitos:** Node.js (v18 ou superior)

1.  **Clone o repositório e instale as dependências:**
    ```bash
    npm install
    ```

2.  **Configuração de Ambiente:**
    Crie ou edite o arquivo `.env.local` e configure sua chave de API:
    ```env
    GEMINI_API_KEY=sua_chave_aqui
    DATABASE_URL=sua_url_postgres_render
    ```

3.  **Inicie o Servidor de Desenvolvimento:**
    ```bash
    npm run dev
    ```

## 🛠️ Tecnologias Utilizadas
* **Frontend:** React.js, Tailwind CSS, Recharts.
* **Backend:** Node.js, Express.
* **Banco de Dados:** PostgreSQL (Render).
* **Bibliotecas de PDF:** jsPDF, html2canvas.

---

<div align="center">
  <sub>Este projeto faz parte do portfólio de <b>Pedro Marino Viana Lima</b>. Para dúvidas ou colaborações, entre em contato via e-mail.</sub>
</div>