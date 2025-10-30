# backend_eval/models/evaluations.py
from sqlalchemy import Column, BigInteger, String, Enum, Numeric, Integer, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.sql import func
from app.db import Base
import enum

class EvalStatus(str, enum.Enum):
    approved = "approved"
    failed = "failed"
    in_progress = "in_progress"

class EvaluationAttempt(Base):
    __tablename__ = "evaluation_attempts"
    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(PGUUID(as_uuid=False), nullable=False, index=True)
    course_id = Column(PGUUID(as_uuid=False), nullable=False, index=True)
    item_id = Column(PGUUID(as_uuid=False), nullable=False, index=True)
    attempt_no = Column(Integer, nullable=False, default=1)
    status = Column(Enum(EvalStatus, name="eval_status"), nullable=False, default=EvalStatus.in_progress)
    score_percent = Column(Numeric(5,2))
    started_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(TIMESTAMP(timezone=True))
