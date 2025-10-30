# backend_eval/routers/evaluations.py
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Literal, Optional

router = APIRouter(prefix="/courses", tags=["evaluations"])

class ClientItemProgress(BaseModel):
    item_id: str
    item_type: Literal["video","document"]
    title: str
    progress_percent: float

class LastAttempt(BaseModel):
    status: Optional[Literal["approved","failed","in_progress"]] = None
    score_percent: Optional[float] = None

class EvalOption(BaseModel):
    item_id: str
    item_type: Literal["video","document"]
    title: str
    progress_percent: float
    eligible: bool
    last_attempt: LastAttempt

class EvalAggregate(BaseModel):
    total_items_completed: int
    total_items_eligible: int
    items_approved: int
    items_failed: int
    items_in_progress: int
    overall_status: Literal["approved","failed","in_progress"]
    overall_score_percent: Optional[float] = None

class EvalOptionsResponse(BaseModel):
    course_id: str
    options: List[EvalOption]
    aggregate: EvalAggregate

@router.post("/{course_id}/evaluation-options", response_model=EvalOptionsResponse)
def build_evaluation_options(course_id: str, items_progress: List[ClientItemProgress]):
    options: List[EvalOption] = []
    completed = 0

    for it in items_progress:
        pct = float(it.progress_percent or 0)
        eligible = pct >= 100.0
        if eligible:
            completed += 1
        options.append(EvalOption(
            item_id=it.item_id,
            item_type=it.item_type,
            title=it.title,
            progress_percent=pct,
            eligible=eligible,
            last_attempt=LastAttempt()  # sin historial por ahora
        ))

    overall_status = "approved" if (len(items_progress) > 0 and completed == len(items_progress)) else "in_progress"

    aggregate = EvalAggregate(
        total_items_completed=completed,
        total_items_eligible=completed,
        items_approved=0,
        items_failed=0,
        items_in_progress=len(items_progress) - completed,
        overall_status=overall_status,
        overall_score_percent=None
    )
    return EvalOptionsResponse(course_id=course_id, options=options, aggregate=aggregate)
