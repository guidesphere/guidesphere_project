# backend_eval/services/quiz_generator.py

"""
Servicio de generación de preguntas de examen.

- Si existe la variable de entorno OPENAI_API_KEY y la librería `openai` está
  instalada, usa un modelo de OpenAI para generar preguntas coherentes.
- Si no, utiliza un generador heurístico local (cloze + verdadero/falso),
  basado en el texto proporcionado.

El formato de salida SIEMPRE es:
{
    "fingerprint": str,
    "questions": [
        {
            "prompt": str,
            "options": [
                {"text": str, "is_correct": bool},
                ...
            ]
        },
        ...
    ]
}
"""

from __future__ import annotations

import asyncio
import hashlib
import os
import random
import re
import time
from typing import Any, Dict, List, Optional

# =============================================================================
#  Config / OpenAI (opcional)
# =============================================================================

try:
    from openai import OpenAI  # type: ignore
except ImportError:
    OpenAI = None  # tipo: ignore

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("QUIZ_MODEL", "gpt-4.1-mini")

# Longitud mínima de frase para considerarla en el generador local
MIN_SENT_LEN = 60


# =============================================================================
#  Utilidades comunes
# =============================================================================

def _make_fingerprint(text: str) -> str:
    """
    Genera una huella simple a partir del texto y del minuto actual.
    Sirve para identificar aproximadamente una generación.
    """
    base = hashlib.md5(text.encode("utf-8")).hexdigest()
    bucket = int(time.time()) // 60  # se agrupa por minuto
    return f"{base}:{bucket}"


# =============================================================================
#  Implementación con OpenAI (si está disponible)
# =============================================================================

_OPENAI_SYSTEM_PROMPT = """
Eres un generador de exámenes para cursos online en ESPAÑOL.

Reglas IMPORTANTES:
- No inventes información que NO esté en el texto.
- Haz preguntas claras, concretas y sin ambigüedades.
- Cada pregunta debe poder responderse únicamente leyendo el texto dado.
- Escribe TODO en español neutro.
- Mezcla tipos de preguntas:
    - Elección múltiple con UNA sola respuesta correcta.
    - Verdadero/Falso sobre afirmaciones del texto.
    - Completar espacio en blanco (cloze) usando frases del texto.
- Evita preguntas triviales o redundantes.
- Evita repetir la misma frase en varias preguntas.
"""

def _build_openai_user_prompt(text: str, count: int) -> str:
    # (Opcional) recortar texto si fuera demasiado grande
    max_chars = 8000
    if len(text) > max_chars:
        text = text[:max_chars]

    return f"""
Texto base del curso (en español):

\"\"\"{text}\"\"\"

A partir de este texto, genera EXACTAMENTE {count} preguntas de examen.

Formato JSON ESTRICTO:

{{
  "fingerprint": "cadena que identifique esta generación",
  "questions": [
    {{
      "prompt": "enunciado de la pregunta, sin número",
      "type": "multiple_choice" | "true_false" | "cloze",
      "options": [
        {{
          "text": "texto de la opción que ve el alumno",
          "is_correct": true o false
        }}
      ]
    }}
  ]
}}

Restricciones:
- Devuelve SOLO un objeto JSON válido, sin comentarios ni explicación.
- Para preguntas de tipo "multiple_choice":
    - Debe haber entre 3 y 5 opciones.
    - EXACTAMENTE una opción con "is_correct": true.
- Para preguntas de tipo "true_false":
    - Debe haber SOLO dos opciones: "Verdadero" y "Falso".
    - Usa "is_correct" correctamente.
- Para preguntas de tipo "cloze":
    - El enunciado debe tener un espacio en blanco representado por "____".
    - Las opciones deben ser palabras o frases cortas que encajen en el hueco.
"""


async def _generate_questions_openai(text: str, count: int) -> Dict[str, Any]:
    """
    Genera preguntas usando un modelo de OpenAI.
    Requiere:
        - librería `openai` instalada
        - variable de entorno OPENAI_API_KEY configurada
    """
    assert OpenAI is not None  # solo debería llamarse si está disponible
    client = OpenAI(api_key=OPENAI_API_KEY)

    user_prompt = _build_openai_user_prompt(text, count)

    def _call_openai() -> str:
        resp = client.responses.create(
            model=OPENAI_MODEL,
            input=[
                {"role": "system", "content": _OPENAI_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.3,  # más bajo = más preciso / menos invento
        )

        # El SDK nuevo devuelve algo como resp.output[0].content[0].text
        return resp.output[0].content[0].text  # type: ignore[attr-defined]

    raw_json = await asyncio.to_thread(_call_openai)
    import json  # import local para evitarlo si no se usa

    data = json.loads(raw_json)

    questions = data.get("questions") or []
    for q in questions:
        # Normalizaciones de seguridad
        if "prompt" not in q:
            q["prompt"] = ""
        if "options" not in q or not isinstance(q["options"], list):
            q["options"] = []

        # Aseguramos que cada opción tenga "text" y "is_correct"
        normalized_options = []
        for opt in q["options"]:
            text_opt = opt.get("text") or opt.get("label") or ""
            is_correct = bool(opt.get("is_correct"))
            normalized_options.append(
                {"text": text_opt, "is_correct": is_correct}
            )
        q["options"] = normalized_options

    return {
        "fingerprint": data.get("fingerprint") or _make_fingerprint(text),
        "questions": questions,
    }


# =============================================================================
#  Implementación local / heurística (fallback)
# =============================================================================

def _split_sentences(text: str) -> List[str]:
    """
    Separa el texto en frases simples usando puntuación básica
    y descarta las demasiado cortas.
    """
    parts = re.split(r"(?<=[\.\?\!])\s+", text.strip())
    return [p.strip() for p in parts if len(p.strip()) >= MIN_SENT_LEN]


def _extract_keywords(sentence: str) -> List[str]:
    """
    Extrae "palabras clave" muy simples: tokens alfanuméricos (>3 chars)
    y elimina un conjunto pequeño de stopwords en español.
    """
    tokens = re.findall(r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9\-]{4,}", sentence)
    stopwords = {
        "para", "como", "donde", "cuando", "entre", "sobre", "desde",
        "estos", "estas", "estar", "haber", "tener", "solo", "pero",
        "porque", "tambien", "luego", "este", "esta", "todo", "cada",
        "puede", "pueden", "muy", "más", "menos", "aqui", "allí", "con",
        "sin", "unos", "unas", "ellos", "ellas", "ser", "fue", "son",
        "han", "del", "los", "las", "que", "por", "una", "ante", "bajo",
    }
    result = [t for t in tokens if t.lower() not in stopwords]
    return result[:8]


def _build_cloze_question(sentence: str, rnd: random.Random) -> Optional[Dict[str, Any]]:
    """
    Construye una pregunta tipo cloze (rellenar hueco) a partir de una frase.
    """
    keywords = _extract_keywords(sentence)
    if not keywords:
        return None

    target = rnd.choice(keywords)
    prompt = sentence.replace(target, "____", 1)

    # Distractores: otras palabras clave + variaciones simples
    pool = [k for k in keywords if k != target]
    while len(pool) < 3:
        pool.append(target[::-1])          # palabra invertida
        if len(pool) < 3:
            pool.append(target.lower())    # minúsculas
        if len(pool) < 3:
            pool.append(target.upper())    # MAYÚSCULAS

    options = [target] + pool[:3]
    rnd.shuffle(options)

    return {
        "prompt": prompt,
        "options": [
            {"text": opt, "is_correct": (opt == target)} for opt in options
        ],
    }


def _build_true_false_question(sentence: str, rnd: random.Random) -> Dict[str, Any]:
    """
    Construye una pregunta de Verdadero/Falso a partir de una frase del texto.
    """
    stmt = re.sub(r"\s+", " ", sentence).strip()
    stmt = stmt[:140]  # evitamos enunciados larguísimos

    true_is_correct = rnd.choice([True, False])
    correct_label = "Verdadero" if true_is_correct else "Falso"

    options = ["Verdadero", "Falso"]
    return {
        "prompt": f'Según el documento, es correcto que: "{stmt}"',
        "options": [
            {"text": o, "is_correct": (o == correct_label)} for o in options
        ],
    }


def _generate_questions_local(text: str, count: int) -> Dict[str, Any]:
    """
    Generador local de preguntas (sin IA externa).
    Usa cloze cuando puede y rellena con Verdadero/Falso si faltan preguntas.
    """
    fingerprint = _make_fingerprint(text)
    rnd = random.Random(fingerprint)

    sentences = _split_sentences(text)
    rnd.shuffle(sentences)

    questions: List[Dict[str, Any]] = []

    # Primero intentamos cloze
    for s in sentences:
        q = _build_cloze_question(s, rnd)
        if q:
            questions.append(q)
        if len(questions) >= count:
            break

    # Si faltan preguntas, rellenamos con verdadero/falso
    if len(questions) < count and sentences:
        for s in sentences:
            q = _build_true_false_question(s, rnd)
            questions.append(q)
            if len(questions) >= count:
                break

    return {
        "fingerprint": fingerprint,
        "questions": questions,
    }


# =============================================================================
#  API pública
# =============================================================================

async def generate_questions(text: str, count: int = 5) -> Dict[str, Any]:
    """
    Genera preguntas de examen a partir de un texto.

    - Si hay OPENAI_API_KEY y la librería `openai` está instalada, usa
      un modelo de OpenAI para obtener preguntas más coherentes.
    - En caso contrario, utiliza el generador local.
    """
    use_openai = bool(OPENAI_API_KEY and OpenAI is not None)

    if use_openai:
        try:
            return await _generate_questions_openai(text, count)
        except Exception as exc:
            # Si algo falla con OpenAI, hacemos fallback silencioso al local
            # (pero registramos el error en logs si hace falta).
            # Aquí no imprimimos para no ensuciar la salida de tests.
            # Podrías usar logging.error(...) si tienes logging configurado.
            pass

    # Fallback local
    return _generate_questions_local(text, count)
