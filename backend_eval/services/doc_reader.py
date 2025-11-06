# backend_eval/services/doc_reader.py
import os
from typing import Optional

from PyPDF2 import PdfReader  # asegúrate de tener PyPDF2 instalado en el venv


# Base del proyecto (carpeta "guidesphere")
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

# Carpeta donde están realmente tus PDFs subidos desde el backend Node:
#   .../guidesphere/backend/uploads/docs
DEFAULT_DOCS_DIR = os.path.join(BASE_DIR, "backend", "uploads", "docs")

# Permite sobreescribirla con una variable de entorno EVAL_DOCS_DIR si quieres
DOCS_DIR = os.getenv("EVAL_DOCS_DIR", DEFAULT_DOCS_DIR)


def _read_txt(path: str) -> str:
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()


def _read_pdf(path: str) -> str:
    reader = PdfReader(path)
    texts: list[str] = []
    for page in reader.pages:
        try:
            t = page.extract_text() or ""
        except Exception:
            t = ""
        texts.append(t)
    return "\n".join(texts)


async def get_text_from_document(doc_id: str) -> str:
    """
    Dado un doc_id (por ejemplo 1762199478782), intenta leer:
      - DOCS_DIR/<doc_id>.pdf
      - DOCS_DIR/<doc_id>.txt   (por si en algún momento hay texto plano)
    y devuelve el texto extraído.
    """
    # Construir rutas candidatas
    pdf_path = os.path.join(DOCS_DIR, f"{doc_id}.pdf")
    txt_path = os.path.join(DOCS_DIR, f"{doc_id}.txt")

    path: Optional[str] = None
    if os.path.exists(pdf_path):
        path = pdf_path
    elif os.path.exists(txt_path):
        path = txt_path

    if not path:
        raise FileNotFoundError(
            f"No se encontró archivo para doc_id={doc_id} en {DOCS_DIR}"
        )

    _, ext = os.path.splitext(path)
    ext = ext.lower()

    if ext == ".txt":
        return _read_txt(path)
    elif ext == ".pdf":
        return _read_pdf(path)
    else:
        raise RuntimeError(f"Extensión de documento no soportada: {ext}")
