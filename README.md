# Evalix

AI-Powered Question Paper Generation and Explainable Semantic Answer
Evaluation using NLP — an academic assessment platform for teachers and
students, built on free/open-source NLP tooling (spaCy, Sentence
Transformers, scikit-learn).

> **Status: Phase 0 — repository & architecture scaffold.**
> Auth, syllabus processing, blueprint generation, question generation,
> rubric editing, and the semantic evaluation engine are **not yet
> implemented**. This phase only proves the three services boot and can
> reach each other.

## Architecture

```
React + Tailwind (client) → Express (server) → MongoDB Atlas
                                   ↓
                            FastAPI (nlp_service)
```

Full details: [`docs/architecture/overview.md`](docs/architecture/overview.md)

## Project structure

```
evalix/
├── client/        React + Vite + Tailwind frontend
├── server/        Node.js + Express backend API
├── nlp_service/   FastAPI NLP microservice
├── docs/          Architecture, API, database, and NLP documentation
└── docker-compose.yml
```

## Prerequisites

- Node.js 20+
- Python 3.11+
- MongoDB (local install, or a MongoDB Atlas connection string)
- Docker + Docker Compose (optional, for the containerized workflow)

## Local development — running each service directly

Each service has its own `.env` (already populated with local-dev
defaults; see `.env.example` at the root for what every variable means).

### 1. NLP service (FastAPI)

```bash
cd nlp_service
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Health check: http://localhost:8000/api/nlp/health

### 2. Backend (Express)

```bash
cd server
npm install
npm run dev
```

Health check: http://localhost:5000/api/health
(this also reports whether it can reach MongoDB and the NLP service)

### 3. Frontend (React)

```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173 — you should see a status badge showing
"Backend API: online" once the server above is running.

## Local development — Docker Compose

```bash
docker compose up --build
```

This starts a local MongoDB container, the NLP service, the backend, and
the frontend together. Production still uses MongoDB Atlas, not this
container — see `docs/architecture/overview.md`.

## Design system

Evalix uses a fixed palette (navy `#0C2C47`, green `#2D5652`, yellow
`#E2A54D`, aqua `#97D3CD`, pink `#EFEAE6`, mint `#E4F2EA`), already wired
into `client/tailwind.config.js` as `navy`, `green`, `yellow`, `aqua`,
`pink`, `mint`.

## What's next

**Phase 1: NLP evaluation core** — text preprocessing, sentence
segmentation, semantic embeddings, concept-level rubric matching, and
the explainable scoring pipeline described in the spec. Everything else
(syllabus upload, blueprint generation, question generation, dashboards,
exam UI) follows in the phases after that — see the spec's Section 57
for the full phase list.
