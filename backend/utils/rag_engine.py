import os
import fitz  # PyMuPDF
import google.generativeai as genai
import requests
import json
import uuid
import msgpack
from typing import List, Dict, Optional

class RAGEngine:
    def __init__(self, api_key: str, endee_url: str = "http://localhost:8080"):
        self.api_key = api_key
        self.mock_mode = not api_key
        if not self.mock_mode:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-flash-latest')
        else:
            print("WARNING: RAGEngine running in MOCK MODE because GOOGLE_API_KEY is missing.")
            self.model = None
        
        self.endee_url = endee_url
        self.index_name = "personal_knowledge"
        self.username = "default"  # Endee-io open source default
        self.full_index_id = f"{self.username}/{self.index_name}"

    def extract_text_from_pdf(self, pdf_path: str) -> str:
        doc = fitz.open(pdf_path)
        text = ""
        for page in doc:
            text += page.get_text()
        return text

    def chunk_text(self, text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
        # Improved chunking: split by paragraphs first, then by size
        paragraphs = text.split('\n\n')
        chunks = []
        current_chunk = ""
        
        for para in paragraphs:
            if len(current_chunk) + len(para) <= chunk_size:
                current_chunk += para + "\n\n"
            else:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                
                # If a single paragraph is larger than chunk_size, split it
                if len(para) > chunk_size:
                    for i in range(0, len(para), chunk_size - overlap):
                        chunks.append(para[i:i + chunk_size])
                    current_chunk = ""
                else:
                    current_chunk = para + "\n\n"
        
        if current_chunk:
            chunks.append(current_chunk.strip())
            
        return chunks

    def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        if self.mock_mode:
            # Return dummy embeddings (768 dimensions for text-embedding-004)
            return [[0.1] * 768 for _ in texts]
            
        import time
        max_retries = 3
        for attempt in range(max_retries):
            try:
                result = genai.embed_content(
                    model="models/gemini-embedding-001",
                    content=texts,
                    task_type="retrieval_document"
                )
                return result['embedding']
            except Exception as e:
                if "429" in str(e) and attempt < max_retries - 1:
                    wait_time = (attempt + 1) * 5
                    print(f"Quota exceeded for embeddings. Retrying in {wait_time}s... (Attempt {attempt + 1}/{max_retries})")
                    time.sleep(wait_time)
                else:
                    raise e

    def _ensure_index_exists(self, dim: int):
        # Check if index exists
        response = requests.get(f"{self.endee_url}/api/v1/index/list")
        if response.status_code == 200:
            data = response.json()
            indices = data.get("indexes", [])
            # indices is a list of objects like {"name": "personal_knowledge", ...}
            for idx in indices:
                    return
        

        create_payload = {
            "index_name": self.index_name,
            "dim": dim,
            "space_type": "cosine"
        }
        response = requests.post(f"{self.endee_url}/api/v1/index/create", json=create_payload)
        if response.status_code != 200:
            print(f"Error creating index: {response.status_code} - {response.text}")

    def index_chunks(self, chunks: List[str], embeddings: List[List[float]]):
        if not embeddings:
            return
        
        # Ensure index exists with the correct dimension
        dim = len(embeddings[0])
        self._ensure_index_exists(dim)
        

        items = []
        for i, chunk in enumerate(chunks):
            items.append({
                "id": str(uuid.uuid4()),
                "vector": embeddings[i],
                "meta": json.dumps({"text": chunk})
            })
        
        # Insert in batches
        batch_size = 100
        for i in range(0, len(items), batch_size):
            batch = items[i:i+batch_size]
            response = requests.post(f"{self.endee_url}/api/v1/index/{self.index_name}/vector/insert", json=batch)
            if response.status_code != 200:
                error_msg = f"Error indexing batch: {response.status_code} - {response.text}"
                print(error_msg)
                raise Exception(error_msg)
                pass
    def query(self, question: str) -> str:
        # 1. Get embedding for the question
        if self.mock_mode:
            query_embedding = [0.1] * 768
        else:
            import time
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    query_embedding = genai.embed_content(
                        model="models/gemini-embedding-001",
                        content=question,
                        task_type="retrieval_query"
                    )['embedding']
                    break
                except Exception as e:
                    if "429" in str(e) and attempt < max_retries - 1:
                        wait_time = (attempt + 1) * 5
                        print(f"Quota exceeded for query embedding. Retrying in {wait_time}s... (Attempt {attempt + 1}/{max_retries})")
                        time.sleep(wait_time)
                    else:
                        raise e

        # 2. Search endee-io
        search_payload = {
            "vector": query_embedding,
            "k": 5
        }
        response = requests.post(
            f"{self.endee_url}/api/v1/index/{self.index_name}/search", 
            json=search_payload
        )
        
        context = ""
        if response.status_code == 200:
            # Endee-io returns MessagePack for search results
            try:
                # ResultSet is a struct with a 'results' field which is a list of VectorResult
                # VectorResult is packed as an array: [similarity, id, meta, filter, norm, vector]
                data = msgpack.unpackb(response.content)
                
                # Endee-io ResultSet is struct { vector<VectorResult> results; }
                # Packed as array: [ [res1, res2, ...] ]
                # So data[0] is the list of results.
                if isinstance(data, list) and len(data) == 1 and isinstance(data[0], list):
                    # Check if the first element of the inner list is a list of length 6 (VectorResult)
                    # or if the inner list is empty.
                    if len(data[0]) == 0 or (isinstance(data[0][0], list) and len(data[0][0]) == 6):
                        results_list = data[0]
                    else:
                        results_list = data
                else:
                    results_list = data


                context_parts = []
                for i, r in enumerate(results_list):
                    # VectorResult: [similarity, id, meta, filter, norm, vector]
                    if isinstance(r, list) and len(r) >= 3:
                        meta_content = r[2] # meta field
                        if meta_content:
                            try:
                                # meta is bytes in Python
                                if isinstance(meta_content, bytes):
                                    meta_str = meta_content.decode('utf-8')
                                    meta = json.loads(meta_str)
                                    text = meta.get("text", "")
                                elif isinstance(meta_content, str):
                                    meta = json.loads(meta_content)
                                    text = meta.get("text", "")
                                else:
                                    text = ""
                                
                                if text:
                                    context_parts.append(text)
                            except Exception as json_err:
                                print(f"Error parsing meta for result {i}: {json_err}")
                
                context = "\n".join(context_parts)
            except Exception as e:
                print(f"Error decoding search results: {e}")
                import traceback
                traceback.print_exc()
        else:
            print(f"Search failed: {response.status_code} - {response.text}")

        # 3. Generate answer with Gemini
        if self.mock_mode:
            return f"MOCK ANSWER: I found some context about '{question}' in your documents, but since the GOOGLE_API_KEY is missing, I'm giving you this placeholder response. Please add your API key to see the real power of Gemini!"

        if not context:
            return "I'm sorry, I couldn't find any relevant information in the uploaded documents to answer your question."

        prompt = f"""
        You are a highly capable Personal Knowledge Assistant. Your goal is to provide accurate, helpful, and concise answers based ONLY on the provided context.

        Context from uploaded documents:
        ---
        {context}
        ---

        User Question: {question}

        Instructions:
        1. Use the provided context to answer the question as accurately as possible.
        2. If the answer is not contained within the context, politely state that you don't have enough information from the uploaded documents to answer.
        3. Do not use outside knowledge or make up information.
        4. Maintain a professional and helpful tone.

        Answer:
        """
        
        import time
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = self.model.generate_content(prompt)
                return response.text
            except Exception as e:
                if "429" in str(e) and attempt < max_retries - 1:
                    wait_time = (attempt + 1) * 5
                    print(f"Quota exceeded. Retrying in {wait_time}s... (Attempt {attempt + 1}/{max_retries})")
                    time.sleep(wait_time)
                else:
                    raise e
