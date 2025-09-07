import os
import shutil
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from atlassian import Confluence
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.llms import Ollama
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.documents import Document
from bs4 import BeautifulSoup # Import BeautifulSoup

# --- FastAPI App Initialization ---
app = FastAPI()

# --- CORS Configuration ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Global Variables ---
rag_chain = None
DB_DIR = "chroma_db"

# --- Pydantic Models for Request Bodies ---
class ConfluenceCredentials(BaseModel):
    url: str
    email: str
    api_token: str
    space_key: str

class ChatRequest(BaseModel):
    query: str

# --- API Endpoints ---

@app.post("/ingest")
async def ingest_data(credentials: ConfluenceCredentials):
    global rag_chain

    print(f"Received request to ingest data from space: {credentials.space_key} at {credentials.url}")

    try:
        confluence = Confluence(
            url=credentials.url,
            username=credentials.email,
            password=credentials.api_token,
            cloud=True
        )

        # ROBUSTNESS FIX 1: Replace space_exists with a proper try/except block
        print(f"Verifying access to space '{credentials.space_key}'...")
        try:
            confluence.get_space(credentials.space_key)
            print(f"Successfully connected to space '{credentials.space_key}'.")
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 404:
                raise HTTPException(status_code=404, detail=f"Space '{credentials.space_key}' not found or you don't have permission to view it.")
            else:
                raise # Re-raise other HTTP errors

        print(f"Fetching pages from space '{credentials.space_key}'...")
        pages_generator = confluence.get_all_pages_from_space(credentials.space_key)
        pages = list(pages_generator)

        if not pages:
            raise HTTPException(status_code=404, detail=f"No pages found in space '{credentials.space_key}'.")

        print(f"Found {len(pages)} pages. Preparing documents...")

        documents = []
        for page in pages:
            page_data = confluence.get_page_by_id(page['id'], expand='body.view')
            html_content = page_data['body']['view']['value']
            
            # ROBUSTNESS FIX 2: Use BeautifulSoup for reliable HTML parsing
            soup = BeautifulSoup(html_content, 'html.parser')
            clean_content = soup.get_text(separator=' ', strip=True)

            base_url = credentials.url.split('/wiki')[0]
            page_url = base_url + page['_links']['webui']
            
            doc = Document(
                page_content=clean_content,
                metadata={'title': page['title'], 'source_url': page_url}
            )
            documents.append(doc)
        
        print("Documents prepared. Splitting text...")
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        splits = text_splitter.split_documents(documents)

        if os.path.exists(DB_DIR):
            print(f"Removing old database directory: {DB_DIR}")
            shutil.rmtree(DB_DIR)

        print("Creating embeddings and vector store with ChromaDB...")
        embeddings = OllamaEmbeddings(model="llama3:8b")
        vectorstore = Chroma.from_documents(documents=splits, embedding=embeddings, persist_directory=DB_DIR)

        print("Creating RAG chain...")
        llm = Ollama(model="llama3:8b")
        retriever = vectorstore.as_retriever()

        system_prompt = (
            "You are an expert assistant for answering questions about documents. "
            "Use the provided retrieved context to answer the question. "
            "If you don't know the answer, say that you don't know. "
            "Be concise and helpful. Provide the answer based ONLY on the context.\n\n"
            "{context}"
        )
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", "{input}"),
        ])
        
        question_answer_chain = create_stuff_documents_chain(llm, prompt)
        rag_chain = create_retrieval_chain(retriever, question_answer_chain)

        print("Ingestion successful. RAG chain is ready.")
        return {"message": f"Hello! I'm ready to answer questions about the Confluence space: **{credentials.space_key}**. How can I help you?"}

    except requests.exceptions.HTTPError as e:
        error_details = e.response.text
        print(f"Detailed Confluence API Error: {error_details}")
        if e.response.status_code == 401:
             raise HTTPException(status_code=401, detail=f"Authentication Failed. Please check your email and API token.")
        raise HTTPException(status_code=e.response.status_code, detail=f"An HTTP error occurred: {error_details}")
    
    except Exception as e:
        print(f"An unexpected error occurred during ingestion: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat")
async def chat(request: ChatRequest):
    global rag_chain
    if not rag_chain:
        raise HTTPException(status_code=400, detail="RAG chain not initialized. Please ingest data first.")
    
    try:
        print(f"Received chat query: {request.query}")
        result = rag_chain.invoke({"input": request.query})
        
        sources = []
        if 'context' in result and result['context']:
            for doc in result['context']:
                if doc.metadata:
                    title = doc.metadata.get('title', 'Unknown Title')
                    url = doc.metadata.get('source_url', '#')
                    if not any(s['url'] == url for s in sources):
                        sources.append({'title': title, 'url': url})

        return {"response": result['answer'], "sources": sources}
    except Exception as e:
        print(f"An error occurred during chat: {e}")
        raise HTTPException(status_code=500, detail="An error occurred while processing your request.")

