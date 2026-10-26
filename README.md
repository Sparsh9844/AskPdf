# Insight — Document Intelligence Workspace

Insight reads your documents, briefs you on them, and answers questions with
**research you can verify**. It goes beyond "chat with a PDF":

- **Intelligence briefs.** Every document gets an AI-generated brief at ingest:
  document type, summary, key takeaways, key figures (with page numbers),
  people, organisations and places mentioned, and questions worth asking.
- **A research engine, not a single lookup.** Each question is rewritten
  using the conversation, optionally broken into sub-queries (*Deep research*),
  searched with hybrid retrieval, answered with inline citations, and then
  checked for grounding. Every step streams to the UI as a live **research trace**.
- **Verifiable answers.** Inline `[n]` citation chips show the source passage
  on hover and open the evidence panel on click. Page numbers are **real**
  (taken from per-page extraction, not estimated). Each answer carries a
  **grounding badge**: well grounded, partially, weakly, or not in the documents.
- **Multi-document research.** One conversation can span up to 10 documents,
  for comparisons and synthesis across a library.
- **Knowledge map.** The dashboard merges topics from every brief. Topics
  shared by several documents are highlighted, and clicking one starts a
  comparison across exactly those documents.
- **Follow-up suggestions** after every answer, generated from the retrieved
  passages.
- **Fact-check.** Paste any text: an email, essay, summary, or another AI's
  answer. Insight splits it into atomic claims and judges each one against
  your documents: *supported*, *partially supported*, *contradicted*, or *not in
  documents*. You get a cited explanation, a correction showing what the source
  actually says, and an overall accuracy score.
- **Study mode.** Generates multiple-choice quizzes from a document at three
  levels (recall, understand, analyse), for the whole document or a focus
  topic. Every question explains its answer and links to the page. Missed
  questions go to the research chat, and score history is tracked per document.
- **Notebook and reports.** Save any answer or fact-check, with its citations,
  to a notebook. Export the notebook, or any single conversation, as a
  Markdown report whose citations are renumbered into one reference list.

## Stack

| Layer        | Technology                                                    |
|--------------|---------------------------------------------------------------|
| Frontend     | React 19, Vite, Tailwind CSS v4, Lucide React                 |
| Backend      | Node.js, Express 4                                            |
| Database     | MongoDB (Mongoose): documents, briefs, conversations, messages |
| Vector store | Qdrant (Docker or Cloud) **or** MongoDB. `VECTOR_STORE=auto` picks whichever is reachable |
| Embeddings   | Local `Xenova/all-MiniLM-L6-v2` via transformers.js (384-dim) |
| LLM          | Groq (`GROQ_MODEL`, plus optional `GROQ_FAST_MODEL` for helper steps) |

## Project Structure

```
Insight/
├── askpdf/                 # React frontend (Vite)
│   └── src/
│       ├── components/
│       │   ├── chat/       # ChatWindow, ResearchTrace, Citation, GroundingBadge,
│       │   │               # ScopeBar, SourcePanel (evidence), ChatInput (modes)
│       │   ├── dashboard/  # DashboardStats, KnowledgeMap, ToolLauncher
│       │   ├── notebook/   # SaveNoteButton
│       │   └── …
│       ├── hooks/          # useChat (research stream), useDocument(s), …
│       ├── pages/          # Dashboard, Documents, DocumentDetail (brief), Chat,
│       │                   # FactCheck, Study, Notebook, Settings
│       ├── services/api.js # centralised HTTP + SSE client
│       └── utils/          # helpers, markdown.jsx (citation-aware renderer)
│
└── server/                 # Express backend
    └── src/
        ├── config/         # env, db, qdrant, redis (optional), constants
        ├── models/         # Document (+brief), Conversation (+scope), Message (+trace, grounding)
        ├── routes/         # documents, conversations, messages, stats
        ├── services/
        │   ├── pipeline.js        # ingestion: parse → chunk → embed → index → analyze
        │   ├── researchEngine.js  # understand → plan → retrieve → synthesize → verify
        │   ├── factChecker.js     # claims → retrieve → verdict per claim
        │   ├── quiz.js            # study questions (random pages or focus topic)
        │   ├── llm.js             # Groq prompts: answer, rewrite, plan, brief, follow-ups,
        │   │                      # claims, verdicts, quizzes
        │   ├── vectorStore.js     # Qdrant upsert / multi-document query / delete
        │   └── embedder.js, sseManager.js, storage.js
        └── utils/          # documentParser (per-page text), chunker (page-mapped), apiError
```

## Quick Start

### 1. Prerequisites

- Node.js ≥ 18
- MongoDB (local or Atlas)
- *(Optional)* Qdrant: `docker run -p 6333:6333 qdrant/qdrant`, or a free Qdrant Cloud cluster.
  Without it, vectors are stored in MongoDB automatically.
- A [Groq API key](https://console.groq.com/keys)

### 2. Backend

```bash
cd server
cp .env.example .env      # set MONGO_URI, GROQ_API_KEY (QDRANT_URL optional)
npm install
npm run dev               # http://localhost:5000
```

### 3. Frontend

```bash
cd askpdf
cp .env.example .env      # VITE_API_URL=http://localhost:5000
npm install
npm run dev               # http://localhost:5174
```

### Run everything with one command

```bash
npm run install:all   # first time only
npm run dev           # server + client together (from the project root)
```

### Vector store and troubleshooting

`VECTOR_STORE=auto` (default) uses Qdrant when it is reachable at startup and
otherwise falls back to MongoDB, printing a warning. `GET /health` reports which
backend is active. If a document's vectors are missing from the active backend,
it is re-indexed from its uploaded file automatically, at startup and before
it is searched.

**`ECONNRESET` / "fetch failed" from Qdrant Cloud:** some networks, ISPs and
antivirus web filters block `*.cloud.qdrant.io` during the TLS handshake. The
app keeps working on MongoDB. To use Qdrant, try another network or VPN, run
Qdrant locally in Docker, or set `VECTOR_STORE=mongodb` to skip the check.

### Upgrading existing documents

Documents indexed before this version have estimated page numbers and no brief.
Use **Reprocess** on a document for exact page citations plus a brief, or open
it and click **Generate brief** for the brief only.

## How a question is answered

```
question ──► 1. Understand   rewrite follow-ups into a standalone query (uses chat history)
         ──► 2. Plan         deep mode only: 2–4 focused sub-queries
         ──► 3. Retrieve     dense search per query across all documents in scope,
                             fused with Reciprocal Rank Fusion + lexical-overlap boost,
                             balanced so each document is represented
         ──► 4. Synthesize   streamed answer; every claim cites a numbered passage [n]
         ──► 5. Verify       grounding = citation coverage × strength of cited passages;
                             follow-up questions suggested
```

Every step is streamed as an SSE `step` event and stored on the message (`trace`),
so the reasoning stays inspectable after the fact.

## Ingestion pipeline

```
upload ─► parsing (per-page text) ─► chunking (each chunk mapped to its real page)
       ─► embedding (local) ─► indexing (Qdrant) ─► analyzing (brief) ─► completed
```

The analyzing stage is non-fatal: if brief generation fails, the document is
still searchable and the brief can be regenerated later.

## API Reference

### Documents

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/documents/upload` | Upload (multipart, field `file`): PDF, DOCX, XLSX, CSV, TXT, MD |
| `GET`  | `/api/documents` | List documents (`?status=` filter) |
| `GET`  | `/api/documents/:id` | Get a document, including its `brief` |
| `DELETE` | `/api/documents/:id` | Delete the document and its vectors; removes it from conversation scopes |
| `POST` | `/api/documents/:id/reprocess` | Re-run the full pipeline |
| `POST` | `/api/documents/:id/brief` | (Re)generate the intelligence brief |
| `GET`  | `/api/documents/:id/stream` | **SSE**: pipeline progress |

### Conversations

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/conversations` | List (`?documentId=` matches any conversation including it) |
| `POST` | `/api/conversations` | Create `{ documentIds: [...] }` (or legacy `{ documentId }`) |
| `PATCH`| `/api/conversations/:id` | Update `{ title }` and/or research scope `{ documentIds }` |
| `DELETE`| `/api/conversations/:id` | Delete the conversation and its messages |

### Messages

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/conversations/:id/messages` | Message history (with sources, trace, grounding, follow-ups) |
| `POST` | `/api/conversations/:id/messages` | `{ content, mode: 'quick'\|'deep' }` → answer (sync) |
| `POST` | `/api/conversations/:id/messages/stream` | Same, as **SSE**: `step`, `sources`, `token`, `done`, `error` |

### Fact-check

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/verify/stream` | `{ documentIds, text }` → **SSE**: `claims`, one `verdict` per claim, `done` (with summary) |

### Study

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/documents/:id/quiz` | `{ count: 3–10, difficulty: easy\|medium\|hard, focus? }` → `{ questions }` |

### Notebook and export

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/notes` | List saved findings |
| `POST` | `/api/notes` | Save `{ kind, title, question, content, sources, documentIds, documentNames, conversationId }` |
| `PATCH`| `/api/notes/:id` | Update `{ title }` / `{ content }` |
| `DELETE`| `/api/notes/:id` | Delete a note |
| `GET`  | `/api/notes/export` | Download notes as a referenced Markdown report (`?ids=` for a subset) |
| `GET`  | `/api/conversations/:id/export` | Download a conversation as a referenced Markdown report |

### Stats

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/stats` | Totals, questions answered, grounded-answer rate, average research time |

## Environment Variables

See [`server/.env.example`](server/.env.example) and
[`askpdf/.env.example`](askpdf/.env.example). Notable ones:

- `EMBED_DIM=384` must match the local embedder and the Qdrant collection.
  The server refuses to start if they differ.
- `GROQ_FAST_MODEL` is optional: a faster model for rewrite, plan, follow-up
  and title steps.
- `ANSWER_MAX_TOKENS` / `DEEP_ANSWER_MAX_TOKENS` control answer length. Groq's
  free tier caps output tokens per minute. The engine waits out 429s
  automatically and shows the wait in the trace; lower these values if you hit
  the limit often.
