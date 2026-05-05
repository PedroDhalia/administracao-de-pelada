# ⚽ Pelada Selva - Administração de Pelada

Um aplicativo web completo para gerenciamento de partidas de futebol amador (peladas), rastreamento de estatísticas individuais, premiações e geração de rankings automáticos. Desenvolvido para transformar o futebol do fim de semana em uma experiência profissional.

## ✨ Principais Funcionalidades

*   **🏆 Gestão de Peladas (Sessões):** Criação de sessões, escalação de times e registro de resultados.
*   **📊 Estatísticas Individuais Detalhadas:** Rastreamento de Gols, Assistências, Vitórias, Derrotas e Defesas Difíceis (para goleiros).
*   **⭐ Sistema de Notas Dinâmicas (Média):** Algoritmo inteligente que gera uma nota de 4.0 a 10.0 para cada jogador com base no desempenho na partida (Gols, Assistências, Clean Sheets para zagueiros, etc.), normalizada em relação aos outros jogadores da sessão.
*   **🏅 Premiações por Partida:** Escolha automática do MVP (Melhor Jogador), Artilheiro, Garçom e seleção manual do Prêmio Puskas (Gol mais bonito).
*   **📈 Ranking Global e Mensal:** Pódios interativos que mostram os melhores da temporada geral e dos meses específicos.
*   **👤 Perfis de Jogador:** Avatares customizáveis, histórico de partidas e "Nota Geral" histórica do jogador.
*   **⚔️ Comparação de Jogadores:** Módulo interativo para colocar frente a frente as estatísticas de quaisquer dois jogadores cadastrados.
*   **🔐 Sistema de Autenticação e Cargos:** Login de usuários, vínculo com jogador e níveis de acesso (Admin) para edição de resultados.

## 🛠️ Tecnologias Utilizadas

*   **[React](https://reactjs.org/) + [Vite](https://vitejs.dev/):** Front-end super rápido e reativo.
*   **[Firebase (Realtime Database)](https://firebase.google.com/):** Banco de dados em tempo real para sincronização instantânea das pontuações e avatares.
*   **Vanilla CSS:** Estilização responsiva, interface limpa ("glassmorphism") e dark mode nativo.
*   **[Lucide React](https://lucide.dev/):** Ícones modernos e escaláveis.

## 🚀 Como rodar o projeto localmente

### Pré-requisitos
* Node.js instalado no seu computador.
* Gerenciador de pacotes NPM ou Yarn.

### Passos

1. **Clone este repositório:**
   ```bash
   git clone https://github.com/PedroDhalia/administracao-de-pelada.git
   ```
2. **Acesse a pasta do projeto:**
   ```bash
   cd administracao-de-pelada
   ```
3. **Instale as dependências:**
   ```bash
   npm install
   ```
4. **Rode o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
5. Abra `http://localhost:5173` no seu navegador.

## 🌐 Deploy (Produção)
O projeto está preparado para deploy automatizado na [Vercel](https://vercel.com/).
Link de produção atual: https://app-selva.vercel.app/

## 🧠 Como funciona a "Nota Geral"
A fórmula exclusiva do *Pelada Selva* cruza os números do jogador para criar um "Raw Score":
`(Gols * 5) + (Assistências * 4) + (Vitórias * 1.5) + (Artilheiro * 1) + (Garçom * 1) + (MVP * 2)`.
O algoritmo então compara essa pontuação base com todos os jogadores do sistema, gerando uma curva justa onde o menor desempenho fica com a nota **4.0** e o maior desempenho do ranking geral garante o cobiçado **10.0**.

---
Feito com 💚 para elevar o nível da pelada!
