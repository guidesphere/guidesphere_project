# backend_eval/services/doc_reader.py
import os
from typing import Optional

from PyPDF2 import PdfReader  # asegúrate de tener PyPDF2 instalado en el venv

# ============================================================
# Localización robusta de la carpeta de documentos dentro
# del contenedor Docker de backend_eval
#
# Prioridad:
#   1) EVAL_DOCS_DIR (variable de entorno, si existe)
#   2) /app/docs                 (montado en docker-compose)
#   3) /app/uploads/docs         (uploads del backend Node)
#   4) ruta antigua fuera de docker: ../backend/uploads/docs
# ============================================================

HERE = os.path.abspath(os.path.dirname(__file__))

CANDIDATE_DIRS = [
    os.getenv("EVAL_DOCS_DIR"),  # override explícito por entorno
    os.path.join(HERE, "..", "docs"),  # /app/docs
    os.path.join(HERE, "..", "uploads", "docs"),  # /app/uploads/docs
    os.path.abspath(
        os.path.join(HERE, "..", "..", "backend", "uploads", "docs")
    ),  # ruta antigua (modo no docker)
]

DOCS_DIR: str
for d in CANDIDATE_DIRS:
    if d and os.path.isdir(d):
        DOCS_DIR = d
        break
else:
    # Fallback defensivo: asumimos /app/uploads/docs
    DOCS_DIR = os.path.join(os.path.abspath(os.path.join(HERE, "..")), "uploads", "docs")


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
