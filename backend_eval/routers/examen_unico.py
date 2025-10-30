from uuid import uuid4

# --- Examen fijo único basado en el guion de Docker ---
EXAM_QUESTIONS = [
    {
        "question": "¿Qué es una imagen en Docker?",
        "options": {
            "A": "Un contenedor",
            "B": "Una red",
            "C": "Plantilla inmutable",
            "D": "Un volumen",
        },
        "correct": "C",
    },
    {
        "question": "¿Qué hace -p 8080:80?",
        "options": {
            "A": "Nada",
            "B": "Cierra 8080",
            "C": "8080->80 (host→contenedor)",
            "D": "80->8080 (host→contenedor)",
        },
        "correct": "C",
    },
    {
        "question": "Archivo típico de orquestación local por servicios:",
        "options": {
            "A": "compose.json",
            "B": "docker.yaml",
            "C": "compose.yml",
            "D": "docker-compose.yml",
        },
        "correct": "D",
    },
    {
        "question": "¿Para qué sirven los volúmenes?",
        "options": {
            "A": "Acelerar CPU",
            "B": "Persistir datos",
            "C": "Ver logs del sistema",
            "D": "Aumentar RAM",
        },
        "correct": "B",
    },
    {
        "question": "Instrucción que define el comando por defecto:",
        "options": {"A": "COPY", "B": "RUN", "C": "ARG", "D": "CMD"},
        "correct": "D",
    },
]

def build_fixed_exam():
    """Devuelve el examen con ID único y las 5 preguntas"""
    return {
        "attempt_id": str(uuid4()),
        "questions": [
            {
                "num": i + 1,
                "question": q["question"],
                "options": q["options"],
            }
            for i, q in enumerate(EXAM_QUESTIONS)
        ],
    }
