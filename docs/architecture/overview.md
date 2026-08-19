# Evalix — Architecture Overview

## Services

| Service      | Tech                       | Hosting (target) | Responsibility                                   |
|--------------|-----------------------------|-------------------|---------------------------------------------------|
| `client`     | React + Vite + Tailwind     | Vercel            | UI, dashboards, exam interface                     |
| `server`     | Node.js + Express + Mongoose| Render            | Auth, business logic, DB access, orchestration     |
| `nlp_service`| Python + FastAPI            | Render (or similar)| Text extraction, embeddings, scoring, feedback     |
| Database     | MongoDB                     | MongoDB Atlas     | Persistent storage                                 |

## Communication rules

- The **client never talks to MongoDB or FastAPI directly** — everything goes through `server`.
- `server` calls `nlp_service` over HTTP for anything NLP-related (topic extraction,
  blueprint math, question generation, evaluation).
- `nlp_service` has **no** authentication or database logic — it is a stateless
  computation service. It receives everything it needs in the request body and
  returns everything it computed in the response body.

```
React (Vercel) --HTTPS--> Express (Render) --HTTP--> FastAPI (Render)
                              |
                              v
                        MongoDB Atlas
```

## Why this split?

- Keeps NLP dependencies (spaCy, sentence-transformers, scikit-learn) isolated from
  the Node/Express dependency tree.
- Lets each service scale, redeploy, and cold-start independently.
- Matches the spec's non-negotiable rule: NLP logic never lives in Express, and
  business/database logic never lives in FastAPI.

## Phase 0 status

Only health endpoints exist right now (`GET /api/health` on the Node server,
`GET /api/nlp/health` on FastAPI). No auth, no database models beyond the
connection wiring, no NLP engines. See `README.md` for how to run everything
locally and what's coming in Phase 1.
