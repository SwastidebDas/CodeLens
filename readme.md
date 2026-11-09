# 🔍 CodeLens

**Explore GitHub repositories and understand code using AI.**

CodeLens is an open-source project that lets you ask questions about GitHub repositories using natural language.

It uses **Retrieval-Augmented Generation (RAG)** to retrieve relevant source code and generate context-aware answers using locally running AI models.

## 💡 Why I Built This

I started CodeLens to **understand RAG in depth by building something practical**, rather than just learning the theory.

I wanted to explore how embeddings work, how vector databases store and retrieve information, and how Large Language Models (LLMs) use retrieved context to answer questions.

CodeLens is my playground for learning, experimenting, and improving these concepts.

**This project is still in its early stages. If you're interested in taking CodeLens to the galaxy 🚀, you're more than welcome to join me, contribute ideas, and help make it better!**

## ✨ Features

- **GitHub Repository Ingestion** — Clone and process public GitHub repositories.
- **AI-Powered Code Understanding** — Ask questions about functions, files, and project architecture.
- **Semantic Search** — Retrieve relevant code using vector embeddings.
- **Incremental Indexing** — Skip unchanged files and re-index modified ones.
- **Multi-Repository Support** — Store and query multiple repositories independently.
- **Repository Cleanup** — Remove a repository's indexed data from Qdrant.
- **Local AI Processing** — Run models locally using Ollama without paid AI APIs.

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| Node.js + Express | Backend REST API |
| Ollama | Running AI models locally |
| LangChain | LLM and embedding integration |
| Qdrant | Vector database |
| Docker | Running Qdrant |
| Git | Repository cloning and updates |

**AI Models:**
- `nomic-embed-text` — Generates vector embeddings.
- `llama3.2` — Classifies questions and generates answers.

## ⚙️ How It Works

```text
GitHub Repository
       |
       v
Clone / Pull Repository
       |
       v
Read & Chunk Files
       |
       v
Generate Embeddings (Ollama)
       |
       v
Store in Qdrant
       |
       |
User Question
       |
       v
Classify Question
       |
       v
Retrieve Relevant Code
       |
       v
Pass Context to LLM
       |
       v
AI-Generated Answer
```

For specific questions, CodeLens uses vector similarity search to retrieve relevant chunks. For broader architecture or overview questions, it retrieves repository-wide context.

## 🚀 Getting Started

### Prerequisites

Install the following:

- [Node.js](https://nodejs.org/)
- [Git](https://git-scm.com/)
- [Docker](https://www.docker.com/)
- [Ollama](https://ollama.com/)

### 1. Clone the Repository

```bash
git clone https://github.com/SwastidebDas/CodeLens.git
cd CodeLens
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Qdrant

Run Qdrant using Docker:

```bash
docker run -d --name qdrant -p 6333:6333 -v qdrant_storage:/qdrant/storage qdrant/qdrant
```

Access the Qdrant dashboard at:

http://localhost:6333/dashboard

If the container already exists, start it using:

```bash
docker start qdrant
```

### 4. Set Up Ollama

Download the required models:

```bash
ollama pull nomic-embed-text
ollama pull llama3.2
```

Ensure Ollama is running before starting the application.

### 5. Configure Environment Variables

Create a `.env` file in the project root:

```env
PORT=3000
QDRANT_URL=http://localhost:6333
COLLECTION_NAME=codelens
```

The repository URL is provided dynamically through the ingestion API, so no `REPO_URL` environment variable is required.

### 6. Start the Server

```bash
npm run dev
```

The server should start at:

http://localhost:3000

## 📡 API Usage

All endpoints use the base URL:

`http://localhost:3000`

Send requests with `Content-Type: application/json`.

### 1. Ingest a Repository

**POST** `/api/ingest`

**Request:**

```json
{
  "repoUrl": "https://github.com/nextcloud/whiteboard.git"
}
```

**Response:**

```json
{
  "message": "Repository ingested successfully.",
  "repoId": "nextcloud/whiteboard"
}
```

This clones the repository, generates embeddings, and stores the indexed code in Qdrant.

### 2. Ask a Question

**POST** `/api/ask`

**Request:**

```json
{
  "repoId": "nextcloud/whiteboard",
  "question": "How does this project handle Mermaid diagrams?"
}
```

**Response:**

```json
{
  "answer": "AI-generated explanation based on the retrieved code."
}
```

You can ask questions about specific functions, implementation details, or the overall architecture.

### 3. Delete Repository Data

**POST** `/api/cleanup`

**Request:**

```json
{
  "repoId": "nextcloud/whiteboard"
}
```

**Response:**

```json
{
  "message": "Repository Deleted successfully."
}
```

This removes the specified repository's indexed records from Qdrant without affecting other repositories in the same collection.

**Note:** Cleanup removes vector database records, not the locally cloned repository files.

## 📁 Project Structure

```text
CodeLens/
│
├── index.js
├── package.json
├── nodemon.json
├── .env
│
├── src/
│   ├── controllers/
│   │   ├── ingestionController.js
│   │   ├── askController.js
│   │   └── quadrantCleanupController.js
│   │
│   ├── routes/
│   │   ├── ingestionRoute.js
│   │   ├── askRoute.js
│   │   └── cleanupRoutes.js
│   │
│   └── services/
│       ├── ingest.js
│       ├── ask.js
│       └── dbcleanup.js
│
└── repodump/
    └── <owner>/
        └── <repository>/
```

The `repodump` directory is created during ingestion and is ignored by Git and Nodemon.

## 🌱 What's Next?

CodeLens is still a learning project, and there are plenty of opportunities to improve it.

Some ideas I'd like to explore:

- Smarter, language-aware code chunking
- Better retrieval accuracy
- Faster and more reliable repository ingestion
- Background ingestion jobs
- A web-based chat interface
- Source code citations in AI responses
- Support for private repositories
- Better handling of large codebases
- Automated testing

And probably a lot more things I haven't thought of yet!

## 🤝 Let's Build Together!

I built CodeLens because I was curious about how RAG actually works under the hood.

It's not meant to be a finished product. It's a place to **learn, experiment, break things, fix them, and improve together.**

If you're learning RAG, interested in AI-powered developer tools, or simply looking for an open-source project to contribute to, I'd love to have you onboard.

**Got an idea? Open an issue. Found a bug? Raise a PR. Want to take CodeLens to the galaxy? 🚀 Let's build it together!**

Every contribution, big or small, is welcome.

## 👨‍💻 Author

**Swastideb Das**

GitHub: [@SwastidebDas](https://github.com/SwastidebDas)

---

*Built out of curiosity, powered by RAG, and open to wherever the community takes it. 🚀*