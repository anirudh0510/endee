# Personal Knowledge AI Assistant (RAG)



https://github.com/user-attachments/assets/72968eb9-46a8-4314-b7a2-6a70681d596f

A powerful personal knowledge 
assistant that uses Retrieval Augmented Generation (RAG) to answer questions based on your uploaded PDF documents. It leverages the high-performance **Endee-io** vector database and **Google Gemini** for embeddings and generative responses.

## Features

- **PDF Upload & Indexing**: Easily upload PDF files which are automatically chunked and indexed.
- **Semantic Search**: Uses state-of-the-art embeddings to find the most relevant context for your questions.
- **Intelligent Answers**: Generates accurate answers using Google Gemini, grounded in your own documents.
- **High Performance**: Powered by Endee-io, a C++ vector database optimized for speed and efficiency.
- **Modern UI**: A clean, responsive interface built with React and Vite.

## Tech Stack

- **Frontend**: React, Vite, Vanilla CSS
- **Backend**: FastAPI, Python 3.9+
- **Vector Database**: [Endee-io](https://github.com/endee-io/endee)
- **AI Models**: Google Gemini (`gemini-1.5-flash`, `gemini-embedding-001`)

## Getting Started

### Prerequisites

- Python 3.9+
- Node.js & npm
- C++ Compiler (Clang >= 17 recommended for Endee-io)
- Google AI API Key

### Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd personal-knowledge-assistant
   ```

2. **Configure Environment Variables**:
   Create a `.env` file in the `backend` directory:
   ```env
   GOOGLE_API_KEY=your_google_api_key_here
   ```

3. **Install Dependencies**:
   ```bash
   # Backend
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   cd ..

   # Frontend
   cd frontend
   npm install
   cd ..
   ```

4. **Build Endee-io**:
   ```bash
   cd vendor/endee
   mkdir build && cd build
   cmake .. -DUSE_NEON=ON # Use -DUSE_AVX2=ON for x86
   make -j4
   cd ../../..
   ```

### Running the Application

Use the provided startup script to run all services:
```bash
./start_services.sh
```

- **Frontend**: `http://localhost:3000`
- **Backend**: `http://localhost:8000`
- **Endee-io**: `http://localhost:8080`

## Project Structure

- `backend/`: FastAPI server and RAG logic.
- `frontend/`: React application.
- `vendor/endee/`: Endee-io vector database source code.
- `start_services.sh`: Script to start all components.

