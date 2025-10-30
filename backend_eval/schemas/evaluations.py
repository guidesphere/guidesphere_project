# backend_eval/schemas/evaluations.py
from pydantic import BaseModel
from typing import List, Optional, Literal

class ClientItemProgress(BaseModel):
    item_id: str
    progress_percent: float  # 0..100
    item_type: Literal['video','document']
    title: str

class LastAttempt(BaseModel):
    status: Optional[Literal['approved','failed','in_progress']] = None
    score_percent: Optional[float] = None

class EvalOption(BaseModel):
    item_id: str
    item_type: Literal['video','document']
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
    overall_status: Literal['approved','failed','in_progress']
    overall_score_percent: Optional[float]  # promedio del mejor intento aprobado o del último intento

class EvalOptionsResponse(BaseModel):
    course_id: str
    options: List[EvalOption]
    aggregate: EvalAggregate
