# ScrollWise — Academic Micro-Learning & Hybrid Recommender

> Transform passive scrolling into high-yield micro-learning with 30-second mental model cards, spaced retrieval practice, and collaborative ML book recommendations.

---

## 📂 Project Architecture

This repository contains two integrated components:

### 1. React + Vite Web Application & ML Hybrid Recommender
- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Framer Motion.
- **Backend Recommender**: Python Flask server (`server.py`) serving collaborative filtering + content-based recommendations over `books.json`.
- **Run Frontend**:
  ```bash
  npm run dev
  ```
- **Run Recommender Backend**:
  ```bash
  python3 server.py
  ```

### 2. Capstone Interactive Prototype (`prototype/`)
A standalone high-fidelity browser prototype designed for HCI / Senior Capstone evaluation:
- Full-screen vertical snap feed with keyboard navigation (`J`/`K` or Arrow keys).
- Academic mental model flashcards with course references.
- Spaced retrieval practice quiz with cognitive feedback.
- Study deck save & Markdown export.
- Integrated course seminar reading with PDF reader (`48-laws-of-power.pdf`).
- Three theme modes (Campus Dark, Campus Light, Late Night Study).
- **Run Prototype**:
  Open `prototype/index.html` directly in any web browser, or serve via any static server.
