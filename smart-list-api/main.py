from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
import json

# 1. Configurar a Chave da API da IA (Pegue uma gratuita no Google AI Studio)
# Em produção, use variáveis de ambiente (os.environ.get("GEMINI_API_KEY"))
genai.configure(api_key="SUA_CHAVE_API_AQUI")

# Usando o modelo Flash: otimizado para velocidade e processamento multimodal (imagens)
model = genai.GenerativeModel('gemini-1.5-flash')

app = FastAPI(title="Smart List API")

# 2. Configurar CORS (Permite que o localhost:4200 do Angular faça requisições)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Modelos de Entrada e Saída (Pydantic)
class ImagePayload(BaseModel):
    image_base64: str

class ProductInfo(BaseModel):
    nome: str
    preco: float

# 4. Rota Principal
@app.post("/extrair-etiqueta", response_model=ProductInfo)
async def extrair_dados_etiqueta(payload: ImagePayload):
    try:
        # Prompt rigoroso para garantir que a IA retorne apenas o JSON parseável
        prompt = """
        Você é um sistema de automação lendo uma etiqueta de prateleira de supermercado.
        Sua única função é extrair o nome do produto e o preço unitário.
        Retorne EXATAMENTE um JSON válido neste formato e nada mais:
        {"nome": "Nome do Produto", "preco": 99.99}
        Se não conseguir identificar o preço com certeza, retorne 0.0 no campo preco.
        """
        
        # O Capacitor já entrega o Base64 limpo (sem o prefixo data:image/jpeg;base64,)
        image_parts = [
            {
                "mime_type": "image/jpeg",
                "data": payload.image_base64
            }
        ]
        
        # Chama a IA enviando o texto e a imagem
        response = model.generate_content([prompt, image_parts[0]])
        
        # Limpeza bruta caso a IA adicione blocos de marcação Markdown (```json)
        res_text = response.text.strip().replace('```json', '').replace('```', '')
        
        # Converte a string JSON para um dicionário Python
        data = json.loads(res_text)
        
        return ProductInfo(
            nome=data.get("nome", "Produto Desconhecido"),
            preco=float(data.get("preco", 0.0))
        )

    except Exception as e:
        print(f"Erro no processamento: {e}")
        raise HTTPException(status_code=500, detail="Falha ao processar a imagem da etiqueta.")