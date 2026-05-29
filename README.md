<div align="center">

# ⚽ Pelada

**Transforme o futebol de fim de semana em uma experiência profissional.**

Um aplicativo web completo para gerenciamento de partidas de futebol amador — com rankings automáticos, estatísticas individuais detalhadas e premiações por partida.

[![Deploy](https://img.shields.io/badge/demo-ao_vivo-1D9E75?style=for-the-badge&logo=vercel&logoColor=white)](https://app-selva.vercel.app/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)

</div>

---

## ✨ Funcionalidades

| | Funcionalidade | Descrição |
|---|---|---|
| 🏆 | **Gestão de Peladas** | Criação de sessões, escalação de times e registro de resultados |
| 📊 | **Estatísticas Individuais** | Rastreamento de gols, assistências, vitórias, derrotas e defesas difíceis (goleiros) |
| ⭐ | **Notas Dinâmicas** | Algoritmo exclusivo que gera uma nota de **4.0 a 10.0** por desempenho, normalizada entre os jogadores da sessão |
| 🏅 | **Premiações por Partida** | MVP, artilheiro e garçom escolhidos automaticamente; Prêmio Puskás por seleção manual |
| 📈 | **Rankings Global e Mensal** | Pódios interativos com os melhores da temporada geral e de meses específicos |
| 👤 | **Perfis de Jogador** | Avatares customizáveis, histórico de partidas e nota geral histórica |
| ⚔️ | **Comparação de Jogadores** | Módulo frente a frente com as estatísticas de quaisquer dois jogadores |
| 🔐 | **Autenticação e Cargos** | Login de usuários, vínculo com jogador e níveis de acesso (Admin) |

---

## 🛠️ Stack Tecnológica

- **[React](https://reactjs.org/) + [Vite](https://vitejs.dev/)** — front-end rápido e reativo
- **[Firebase Realtime Database](https://firebase.google.com/)** — sincronização instantânea de pontuações e avatares
- **Vanilla CSS** — interface responsiva com glassmorphism e dark mode nativo
- **[Lucide React](https://lucide.dev/)** — ícones modernos e escaláveis

---

## 🚀 Como rodar localmente

**Pré-requisitos:** Node.js e npm (ou Yarn) instalados.

```bash
# 1. Clone o repositório
git clone https://github.com/PedroDhalia/administracao-de-pelada.git

# 2. Acesse a pasta do projeto
cd administracao-de-pelada

# 3. Instale as dependências
npm install

# 4. Rode o servidor de desenvolvimento
npm run dev
```

Abra [http://localhost:5173](http://localhost:5173) no seu navegador.

---

## 🌐 Deploy

O projeto está configurado para deploy automatizado na **[Vercel](https://vercel.com/)**.

🟢 **Produção:** [https://app-selva.vercel.app/](https://app-selva.vercel.app/)

---

## 🧠 Como funciona a Nota Geral

O algoritmo exclusivo do Pelada Selva calcula um **Raw Score** cruzando os números do jogador:

```
Raw Score = (Gols × 5) + (Assistências × 4) + (Vitórias × 1.5)
          + (Artilheiro × 1) + (Garçom × 1) + (MVP × 2)
```

Esse valor é então comparado com todos os jogadores do sistema, gerando uma **curva normalizada e justa**:

```
4.0 ──────────────────────────────── 10.0
 ↑                                    ↑
menor desempenho            maior desempenho
```

- O menor Raw Score do ranking → nota **4.0**
- O maior Raw Score do ranking → nota cobiçada **10.0**

---

<div align="center">

Feito com 💚 para elevar o nível da pelada

</div>
