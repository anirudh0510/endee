import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

print("Available models:")
for m in genai.list_models():
    if 'embedContent' in m.supported_generation_methods:
        print(f"Embedding Model: {m.name}")
    if 'generateContent' in m.supported_generation_methods:
        print(f"Generative Model: {m.name}")
