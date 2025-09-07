Confluence RAG Chatbot
This project is a powerful, self-hosted Retrieval-Augmented Generation (RAG) chatbot that connects to your personal or company's Confluence space. It allows users to ask questions in a natural, conversational way and receive answers based exclusively on the content of their documentation, complete with source links back to the original pages.

The entire system runs locally, using Ollama for the Language Model, ensuring your data and queries remain completely private.

Key Features
Connect to Your Confluence: Securely connect to any Confluence space you have access to using an API token.

Private & Local: Powered by Ollama and local vector storage (ChromaDB), meaning your documents and chats never leave your machine.

Source-Cited Answers: Every answer is accompanied by direct links to the Confluence pages used to generate it, ensuring trust and verifiability.

Modern UI: A clean, User interface built with React and Tailwind CSS, featuring a dark mode toggle.

Robust Backend: A resilient FastAPI backend handles data ingestion, document parsing, and the entire RAG pipeline.

Architecture & Data Flow
The application follows a standard RAG pattern. The ingestion process is a one-time setup per Confluence space, after which the chat is ready for use.

graph TD
    subgraph Frontend (React)
        A[User Enters Credentials & Space Key] --> B{Connect & Ingest Button};
        B --> C[POST /ingest];
        F[User Asks Question] --> G[POST /chat];
        H[Render Formatted Answer & Sources] <--> I{API Response};
    end

    subgraph Backend (FastAPI)
        C --> D[Fetch & Parse Pages from Confluence];
        D --> E[Chunk, Embed & Store in ChromaDB];
        G --> J[Retrieve Relevant Chunks from ChromaDB];
        J --> K[Pass Chunks + Query to Ollama LLM];
        K --> L[Generate Answer];
        L --> I;
    end

    subgraph External Services
        Confluence[Confluence Cloud API] <--> D;
        Ollama[Ollama (llama3:8b)] <--> E;
        Ollama <--> K;
    end

Technology Stack
Backend: Python, FastAPI, LangChain, Ollama, ChromaDB, atlassian-python-api, beautifulsoup4

Frontend: React (Vite), Tailwind CSS, lucide-react, react-markdown

LLM: Ollama (specifically tested with llama3:8b)

Setup & Installation
Follow these steps to get the project running on your local machine.

Prerequisites
Ollama: Make sure you have Ollama installed and running.

Pull the LLM: Open your terminal and pull the model this project uses:

ollama pull llama3:8b

Python & Node.js: Ensure you have Python (3.9+) and Node.js (18+) installed.

Backend Setup
Navigate to the backend directory:

cd backend

Create and activate a virtual environment:

# For Windows
python -m venv venv
.\venv\Scripts\activate

# For macOS/Linux
python3 -m venv venv
source venv/bin/activate

Install the required Python packages:

pip install "fastapi[all]" atlassian-python-api langchain langchain-community chromadb ollama beautifulsoup4 sentence-transformers

Run the backend server:

uvicorn main:app --reload

The backend will be running at http://127.0.0.1:8000.

Frontend Setup
Open a new terminal and navigate to the frontend directory:

cd frontend

Install the required npm packages:

npm install

Run the frontend development server:

npm run dev

The frontend will be accessible in your browser, usually at http://localhost:5173.

How to Use
Open the App: Once both servers are running, open your browser to the frontend URL.

Connect to Confluence: You will be greeted by a connection modal.

Confluence URL: Your base URL (e.g., your-company.atlassian.net).

Your Atlassian Email: The email associated with your Confluence account.

API Token: A Confluence API token for your account.

Space Key: The short identifier for the Confluence space you want to chat with (e.g., TPD).

Ingest Data: Click "Connect & Ingest". The backend will fetch, process, and index the documents from your specified space. You will see a success message in the chat when it's ready.

Start Chatting: Ask any question related to the documentation in your Confluence space!
