from fastapi import APIRouter
from pydantic import BaseModel
from .examen_unico import build_fixed_exam, EXAM_QUESTIONS

router = APIRouter(prefix="/exams", tags=["exams"])

class SubmitReq(BaseModel):
    attempt_id: str
    answers: dict  # {"1":"A","2":"C","3":"D","4":"B","5":"A"}

@router.post("/generate-fixed")
def generate_fixed():
    """Devuelve siempre el mismo examen fijo de 5 preguntas"""
    return build_fixed_exam()

@router.post("/submit-fixed")
def submit_fixed(req: SubmitReq):
    """Evalúa las respuestas enviadas"""
    keys = {str(i + 1): q["correct"] for i, q in enumerate(EXAM_QUESTIONS)}
    total = len(keys)
    corrects = sum(
        1
        for k, right in keys.items()
        if str(req.answers.get(k, "")).upper() == right
    )
    score = round(100.0 * corrects / total, 2)
    passed = (corrects / total) >= 0.60
    return {
        "score": score,
        "passed": passed,
        "total": total,
        "corrects": corrects,
    }
