"""
SAATHI RAG Service
Lightweight vector store service using ChromaDB to retrieve relevant few-shot response
examples dynamically per incoming user message.
"""

import logging
import os
import re
import chromadb
from chromadb.api.types import EmbeddingFunction, Documents, Embeddings
from few_shot_examples import FEW_SHOT_EXAMPLES

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Persistent ChromaDB storage path inside backend directory
CHROMA_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "chroma_db")
COLLECTION_NAME = "sara_response_examples"


class FastHinglishEmbeddingFunction(EmbeddingFunction):
    """
    Lightweight, instant embedding function for ChromaDB.
    Hashes word tokens & n-grams into a normalized 64-dim feature vector.
    Executes in <1ms without requiring heavy ONNX/PyTorch model downloads.
    """
    def __call__(self, input: Documents) -> Embeddings:
        embeddings = []
        for text in input:
            tokens = re.findall(r'\w+', text.lower())
            vec = [0.0] * 64
            for token in tokens:
                idx = hash(token) % 64
                vec[idx] += 1.0
            norm = (sum(x * x for x in vec) ** 0.5) or 1.0
            embeddings.append([x / norm for x in vec])
        return embeddings


_collection = None
_embedding_fn = FastHinglishEmbeddingFunction()


def init_rag_service():
    """Initializes persistent ChromaDB collection with FastHinglishEmbeddingFunction and seeds it."""
    global _collection
    try:
        os.makedirs(CHROMA_DATA_DIR, exist_ok=True)
        client = chromadb.PersistentClient(path=CHROMA_DATA_DIR)
        
        try:
            _collection = client.get_or_create_collection(
                name=COLLECTION_NAME,
                embedding_function=_embedding_fn
            )
        except Exception as err:
            logger.info("Re-initializing collection schema due to: %s", err)
            try:
                client.delete_collection(name=COLLECTION_NAME)
            except Exception:
                pass
            _collection = client.create_collection(
                name=COLLECTION_NAME,
                embedding_function=_embedding_fn
            )

        # Seed collection if empty
        if _collection.count() == 0:
            logger.info("Seeding ChromaDB collection '%s' with %d examples...", COLLECTION_NAME, len(FEW_SHOT_EXAMPLES))
            ids = [f"ex_{i}" for i in range(len(FEW_SHOT_EXAMPLES))]
            documents = [ex["user"] for ex in FEW_SHOT_EXAMPLES]
            metadatas = [{"sara": ex["sara"], "category": ex.get("category", "general")} for ex in FEW_SHOT_EXAMPLES]

            _collection.add(
                ids=ids,
                documents=documents,
                metadatas=metadatas
            )
            logger.info("ChromaDB collection '%s' successfully seeded!", COLLECTION_NAME)
        else:
            logger.info("ChromaDB collection '%s' loaded (%d examples)", COLLECTION_NAME, _collection.count())
    except Exception as e:
        logger.warning("Failed to initialize ChromaDB RAG service: %s. Using static fallback.", e)
        _collection = None


def get_relevant_examples(user_message: str, top_k: int = 3) -> list[dict]:
    """
    Embeds incoming user message using FastHinglishEmbeddingFunction and retrieves top_k
    most similar stored examples from ChromaDB.
    Returns list of dicts: [{"user": "...", "sara": "..."}, ...]
    """
    if not user_message or not user_message.strip():
        return FEW_SHOT_EXAMPLES[:top_k]

    global _collection
    if _collection is None:
        init_rag_service()

    if _collection is not None:
        try:
            results = _collection.query(
                query_texts=[user_message],
                n_results=min(top_k, len(FEW_SHOT_EXAMPLES))
            )
            
            retrieved = []
            if results and results.get("documents") and results["documents"][0]:
                docs = results["documents"][0]
                metas = results["metadatas"][0] if results.get("metadatas") else []
                for doc, meta in zip(docs, metas):
                    retrieved.append({
                        "user": doc,
                        "sara": meta.get("sara", "")
                    })
                if retrieved:
                    return retrieved
        except Exception as e:
            logger.warning("ChromaDB query failed: %s", e)

    # Static fallback if ChromaDB query fails or is unavailable
    return FEW_SHOT_EXAMPLES[:top_k]


# Initialize RAG on module load
init_rag_service()
