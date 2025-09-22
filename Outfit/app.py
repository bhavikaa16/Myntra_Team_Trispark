from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
import requests
import pandas as pd
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_core.messages import HumanMessage
import re
import os
from dotenv import load_dotenv
from io import BytesIO
import numpy as np
from fastapi.middleware.cors import CORSMiddleware
import base64

# -------------------- Load ENV --------------------
load_dotenv()
IMGBB_API_KEY = os.getenv("IMGBB_API_KEY")

# -------------------- FastAPI App --------------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ya specific domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------------------- Data + Embedding --------------------
df = pd.read_csv("myntra_top500.csv")
df_small = df.head(50).copy()
df_small["text"] = df_small["name"]

embeddings = OpenAIEmbeddings()
docs = [Document(page_content=row["text"], metadata={"row": idx}) for idx, row in df_small.iterrows()]
vectorstore = FAISS.from_documents(docs, embeddings)

top_keywords = ["top", "shirt", "t-shirt", "kurta", "blouse"]
bottom_keywords = ["jeans", "trouser", "pant", "skirt", "shorts"]
accessory_keywords = ["watch", "belt", "cap", "bag", "scarf", "beanie", "necklace"]

def fetch_matching_products(query, top_k=1, filter_type=None):
    docs_and_scores = vectorstore.similarity_search_with_score(query, k=top_k*2)
    results = []
    for doc, score in docs_and_scores:
        idx = doc.metadata["row"]
        row = df_small.iloc[idx]
        name = row["name"].lower()
        if filter_type == "top" and any(w in name for w in top_keywords):
            results.append(row)
        elif filter_type == "bottom" and any(w in name for w in bottom_keywords):
            results.append(row)
        elif filter_type == "accessory" and any(w in name for w in accessory_keywords):
            results.append(row)
        elif filter_type is None:
            results.append(row)
        if len(results) >= top_k:
            break
    return results

# -------------------- Helper: Convert numpy/pandas to Python native --------------------
def convert_numpy(obj):
    if isinstance(obj, (np.integer,)):
        return int(obj)
    elif isinstance(obj, (np.floating,)):
        return float(obj)
    elif isinstance(obj, (np.ndarray,)):
        return obj.tolist()
    elif isinstance(obj, (pd.Series,)):
        return obj.to_dict()
    elif isinstance(obj, (pd.DataFrame,)):
        return obj.to_dict(orient="records")
    elif isinstance(obj, dict):
        return {k: convert_numpy(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy(v) for v in obj]
    return obj

# -------------------- API Route --------------------
@app.post("/recommend")
async def recommend(file: UploadFile = File(...)):
    # Step 1: Read file bytes
    img_bytes = await file.read()
    # Convert to base64
    img_b64 = base64.b64encode(img_bytes).decode("utf-8")
    image_url = f"data:{file.content_type};base64,{img_b64}"

    # Step 2: LLM call
    llm = ChatOpenAI(model="gpt-4o")

    prompt_text = (
        "Given the image of a clothing item, identify if it is a top, bottom wear, or accessory. "
        "Then, suggest the other two categories with real product names (not invented) that would match well. "
        "Format:\n"
        "Given: [top/bottom wear/accessory]\n"
        "Bottom Wear: [suggestion]\n"
        "Top: [suggestion]\n"
        "Accessory: [suggestion]\n"
    )

    message = [
        {"type": "text", "text": prompt_text},
        {"type": "image_url", "image_url": {"url": image_url}},
    ]

    result = llm.invoke([HumanMessage(content=message)])

    # Step 3: Parse output
    given_match = re.search(r"Given:\s*(\w+)", result.content, re.IGNORECASE)
    bottom_match = re.search(r"Bottom Wear:\s*(.*)", result.content, re.IGNORECASE)
    top_match = re.search(r"Top:\s*(.*)", result.content, re.IGNORECASE)
    accessory_match = re.search(r"Accessory:\s*(.*)", result.content, re.IGNORECASE)

    given = given_match.group(1).strip().lower() if given_match else ""
    bottom_query = bottom_match.group(1).strip() if bottom_match else ""
    top_query = top_match.group(1).strip() if top_match else ""
    accessory_query = accessory_match.group(1).strip() if accessory_match else ""

    # Step 4: Prepare JSON
    suggestions = {
        "uploaded_image": image_url,
        "given_category": given,
        "recommendations": {
            "top": [],
            "bottom": [],
            "accessory": []
        }
    }

    if given == "top":
        if bottom_query:
            for r in fetch_matching_products(bottom_query, top_k=2, filter_type="bottom"):
                suggestions["recommendations"]["bottom"].append({
                    "name": r["name"],
                    "price": convert_numpy(r["price"]),
                    "discount": convert_numpy(r["discount"]),
                    "url": r["purl"],
                    "image": r["img"]
                })
        if accessory_query:
            for r in fetch_matching_products(accessory_query, top_k=2, filter_type="accessory"):
                suggestions["recommendations"]["accessory"].append({
                    "name": r["name"],
                    "price": convert_numpy(r["price"]),
                    "discount": convert_numpy(r["discount"]),
                    "url": r["purl"],
                    "image": r["img"]
                })

    elif given == "bottom":
        if top_query:
            for r in fetch_matching_products(top_query, top_k=2, filter_type="top"):
                suggestions["recommendations"]["top"].append({
                    "name": r["name"],
                    "price": convert_numpy(r["price"]),
                    "discount": convert_numpy(r["discount"]),
                    "url": r["purl"],
                    "image": r["img"]
                })
        if accessory_query:
            for r in fetch_matching_products(accessory_query, top_k=2, filter_type="accessory"):
                suggestions["recommendations"]["accessory"].append({
                    "name": r["name"],
                    "price": convert_numpy(r["price"]),
                    "discount": convert_numpy(r["discount"]),
                    "url": r["purl"],
                    "image": r["img"]
                })

    elif given == "accessory":
        if top_query:
            for r in fetch_matching_products(top_query, top_k=2, filter_type="top"):
                suggestions["recommendations"]["top"].append({
                    "name": r["name"],
                    "price": convert_numpy(r["price"]),
                    "discount": convert_numpy(r["discount"]),
                    "url": r["purl"],
                    "image": r["img"]
                })
        if bottom_query:
            for r in fetch_matching_products(bottom_query, top_k=2, filter_type="bottom"):
                suggestions["recommendations"]["bottom"].append({
                    "name": r["name"],
                    "price": convert_numpy(r["price"]),
                    "discount": convert_numpy(r["discount"]),
                    "url": r["purl"],
                    "image": r["img"]
                })

    # ✅ Ensure JSON safe
    return JSONResponse(content=convert_numpy(suggestions))