from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import shutil
from utils.rag_engine import RAGEngine
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize RAG Engine
API_KEY = os.getenv("GOOGLE_API_KEY")
if not API_KEY:
    print("WARNING: GOOGLE_API_KEY not found in environment variables.")

rag = RAGEngine(api_key=API_KEY)

class ChatRequest(BaseModel):
    message: str

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    temp_path = f"temp_{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try:
        text = rag.extract_text_from_pdf(temp_path)
        chunks = rag.chunk_text(text)
        embeddings = rag.get_embeddings(chunks)
        rag.index_chunks(chunks, embeddings)
        return {"message": "File uploaded and indexed successfully."}
    except Exception as e:
        import traceback
        traceback.print_exc()
        if "429" in str(e):
            raise HTTPException(status_code=429, detail="Gemini API Quota Exceeded. Please wait a moment and try again.")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        answer = rag.query(request.message)
        return {"answer": answer}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
