# RAG System with MCP Server

A powerful Retrieval-Augmented Generation (RAG) system built with a **Next.js Web Client** and a **Python MCP (Model Context Protocol) Server**. This project enables users to upload PDF documents, manage chatbots, and perform intelligent queries using vector search and LLMs.

## 🚀 Features

-   **Intelligent Chatbots**: Create and manage multiple bots with distinct knowledge bases.
-   **PDF Ingestion**: Upload PDF documents which are automatically parsed (LlamaParse), chunked, and embedded.
-   **Vector Search**: Uses Pinecone for efficient semantic search of uploaded chunks.
-   **Hybrid Application**:
    -   **Web Client**: Modern Next.js UI for chatting, file uploads, and bot management.
    -   **MCP Server**: Robust Python backend implementing the Model Context Protocol to serve context and tools.
-   **Supabase Integration**: Stores document metadata and chunks for reliable data persistence.

## 🛠 Tech Stack

-   **Frontend**: Next.js 14, TypeScript, Tailwind CSS
-   **Backend (MCP Server)**: Python 3.12, Starlette, MCP SDK
-   **Database**: Supabase (PostgreSQL), Pinecone (Vector DB)
-   **AI Services**: Google Gemini (Embeddings), LlamaParse (PDF Parsing)

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
-   **Node.js**: v18+ (Recommended v20+)
-   **Python**: 3.12+
-   **Git**

You will also need API Keys for:
-   **Google Gemini** (Embeddings)
-   **Llama Cloud** (Parsing)
-   **Pinecone** (Vector DB)
-   **Supabase** (Database)
-   **OpenRouter / Other LLM Provider** (for Chat)

---

## ⚙️ Environment Setup

### 1. Python MCP Server (`/mcp-server-python`)
Create a `.env` file in `mcp-server-python/`:

```bash
GOOGLE_API_KEY="<your_google_api_key>"
LLAMA_CLOUD_API_KEY="<your_llama_cloud_key>"
PINECONE_API_KEY="<your_pinecone_key>"
PINECONE_INDEX_NAME="<your_index_name>"

# Supabase Configuration
SUPABASE_URL="<your_supabase_url>"
SUPABASE_SERVICE_ROLE_KEY="<your_supabase_service_role_key>"
```

### 2. Web Client (`/web-client`)
Create a `.env` file in `web-client/`:

```bash
GOOGLE_API_KEY="<your_google_api_key>"
OPENROUTER_API_KEY="<your_openrouter_key>"

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL="<your_supabase_url>"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<your_supabase_anon_key>"
SUPABASE_SERVICE_ROLE_KEY="<your_supabase_service_role_key>"

# App Config
MCP_SERVER_URL="http://localhost:8000/sse"

# Authentication (NextAuth)
AUTH_SECRET="<generated_secret_string>"
GOOGLE_CLIENT_ID="<your_google_client_id>"
GOOGLE_CLIENT_SECRET="<your_google_client_secret>"
```

---

## 🚀 Installation & Running

### Step 1: Start the MCP Server (Python)

```bash
cd mcp-server-python

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server
python server.py
```
*Server will start on `http://localhost:8000`*

### Step 2: Start the Web Client (Next.js)

Open a new terminal:

```bash
cd web-client

# Install dependencies
npm install

# Run development server
npm run dev
```
*Client will start on `http://localhost:3000`*

---

## 📂 Project Structure

```bash
├── 📂 mcp-server-python/        # Python Backend & MCP Server
│   ├── 📂 documents/            # Temporary storage for uploaded PDFs
│   ├── 📂 venv/                 # Virtual Environment
│   ├── .env                     # Environment variables
│   ├── requirements.txt         # Python dependencies
│   └── server.py                # Main MCP server entry point
│
└── 📂 web-client/               # Next.js Frontend
    ├── 📂 app/                  # App Router
    │   ├── 📂 (auth)/           # Authentication routes
    │   ├── 📂 api/              # API Routes
    │   │   ├── 📂 admin/        # Admin management
    │   │   ├── 📂 auth/         # Auth endpoints
    │   │   ├── 📂 bots/         # Bot management
    │   │   ├── 📂 chat/         # Chat endpoints
    │   │   ├── 📂 documents/    # Document management
    │   │   ├── 📂 status/       # Processing status
    │   │   └── 📂 upload/       # File upload
    │   ├── 📂 dashboard/        # Dashboard pages
    │   ├── 📂 docs/             # Documentation pages
    │   ├── 📂 lib/              # Core Utilities
    │   │   ├── auth.ts          # Auth logic
    │   │   ├── mcp-client.ts    # MCP Client wrapper
    │   │   ├── supabase.ts      # Supabase client
    │   │   └── token-service.ts # Token counting
    │   ├── 📂 main/             # Main application views
    │   ├── globals.css          # Global styles
    │   ├── layout.tsx           # Root layout
    │   └── page.tsx             # Landing page
    │
    ├── 📂 components/           # React UI Components
    │   ├── 📂 mdx/              # MDX Components
    │   ├── ChatPage.tsx         # Main Chat Interface
    │   ├── Sidebar.tsx          # App Sidebar
    │   ├── Upload.tsx           # Upload Component
    │   └── ... (other UI components)
    │
    ├── 📂 content/              # MDX Content Files
    │   ├── getting-started.mdx
    │   ├── interface.mdx
    │   └── introduction.mdx
    │
    ├── 📂 public/               # Static Assets
    ├── actions.ts               # Server Actions
    ├── auth.config.ts           # NextAuth Configuration
    ├── proxy.ts                 # Proxy configuration
    └── .env.local               # Environment variables
```
