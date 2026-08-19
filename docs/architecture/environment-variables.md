# Environment Variables

See the root `.env.example` for the full annotated list. Summary:

## server/.env

| Variable      | Purpose                                   |
|---------------|--------------------------------------------|
| `MONGODB_URI` | MongoDB connection string (Atlas or local)|
| `JWT_SECRET`  | Signing secret for auth tokens (Phase 8)  |
| `PORT`        | Port the Express app listens on           |
| `FASTAPI_URL` | Base URL of the NLP microservice          |
| `CLIENT_URL`  | Frontend origin, used for CORS            |
| `NODE_ENV`    | `development` \| `production`             |

## client/.env

| Variable       | Purpose                          |
|----------------|-----------------------------------|
| `VITE_API_URL` | Base URL the frontend calls (Node backend) |

## nlp_service/.env

| Variable       | Purpose                                       |
|----------------|-------------------------------------------------|
| `MODEL_NAME`   | Sentence-transformers embedding model to load  |
| `SPACY_MODEL`  | spaCy model to load                            |
| `ENVIRONMENT`  | `development` \| `production`                  |

No secrets are committed to the repo — only `.env.example` files are tracked.
Each service's real `.env` is git-ignored.
