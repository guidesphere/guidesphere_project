# backend_eval/routers/exams.py
import os, uuid, random
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import psycopg2
import psycopg2.extras as _ext

router = APIRouter(prefix="/exams", tags=["exams"])

def db():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "db"),
        port=os.getenv("DB_PORT", "5432"),
        dbname=os.getenv("DB_NAME", "guidesphere"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASS", "postgres"),
    )

class GenerateReq(BaseModel):
    material_id: str
    user_id: str

class SubmitReq(BaseModel):
    attempt_id: str
    answers: dict

PASS_MIN = 0.60

@router.post("/generate")
def generate(req: GenerateReq):
    rng_seed = random.getrandbits(63)
    exam_id = str(uuid.uuid4())

    with db() as conn, conn.cursor(cursor_factory=_ext.DictCursor) as cur:
        cur.execute(
            """
            SELECT id, question, option_a, option_b, option_c, option_d, correct
            FROM question_bank
            WHERE material_id = %s::uuid
            ORDER BY random() LIMIT 5
            """,
            (req.material_id,),
        )
        rows = cur.fetchall()
        if len(rows) < 5:
            raise HTTPException(400, "Banco insuficiente para este material (se requieren 5).")

        cur.execute(
            """
            INSERT INTO exam_instances (id, material_id, user_id, rng_seed, status)
            VALUES (%s::uuid, %s::uuid, %s::uuid, %s, 'generated')
            """,
            (exam_id, req.material_id, req.user_id, rng_seed),
        )

        rnd = random.Random(rng_seed)
        rnd.shuffle(rows)

        for idx, r in enumerate(rows, start=1):
            orig = {'A': r['option_a'], 'B': r['option_b'], 'C': r['option_c'], 'D': r['option_d']}
            correct_text = orig[r['correct']]
            opts = [('A', orig['A']), ('B', orig['B']), ('C', orig['C']), ('D', orig['D'])]
            random.Random(rng_seed + idx).shuffle(opts)
            A, B, C, D = [t for _, t in opts]
            new_correct = next(letter for letter, txt in opts if txt == correct_text)

            cur.execute(
                """
                INSERT INTO exam_instance_questions
                  (exam_id, question, option_a, option_b, option_c, option_d, correct, order_index)
                VALUES (%s::uuid, %s, %s, %s, %s, %s, %s, %s)
                """,
                (exam_id, r['question'], A, B, C, D, new_correct, idx),
            )

        conn.commit()

        cur.execute(
            """
            SELECT question, option_a, option_b, option_c, option_d, order_index
            FROM exam_instance_questions
            WHERE exam_id = %s::uuid
            ORDER BY order_index
            """,
            (exam_id,),
        )
        qs = cur.fetchall()

    return {
        "attempt_id": exam_id,
        "questions": [
            {"num": q["order_index"], "question": q["question"],
             "options": {"A": q["option_a"], "B": q["option_b"], "C": q["option_c"], "D": q["option_d"]}}
            for q in qs
        ],
    }

@router.post("/submit")
def submit(req: SubmitReq):
    with db() as conn, conn.cursor(cursor_factory=_ext.DictCursor) as cur:
        cur.execute("SELECT user_id FROM exam_instances WHERE id = %s::uuid", (req.attempt_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(404, "Intento no encontrado")
        user_id = str(row["user_id"])

        cur.execute(
            """
            SELECT order_index, correct
            FROM exam_instance_questions
            WHERE exam_id = %s::uuid
            ORDER BY order_index
            """,
            (req.attempt_id,),
        )
        keys = cur.fetchall()
        if not keys:
            raise HTTPException(400, "No hay preguntas para este intento")

        total = len(keys)
        corrects = sum(1 for k in keys if str(req.answers.get(str(k["order_index"]), "")).upper() == k["correct"])
        score = round((corrects / total) * 100.0, 2)
        passed = (corrects / total) >= PASS_MIN

        cur.execute(
            """
            INSERT INTO exam_attempts (id, exam_id, user_id, answers, score, passed)
            VALUES (%s::uuid, %s::uuid, %s::uuid, %s, %s, %s)
            """,
            (str(uuid.uuid4()), req.attempt_id, user_id, _ext.Json(req.answers), score, passed),
        )
        cur.execute("UPDATE exam_instances SET status = 'submitted' WHERE id = %s::uuid", (req.attempt_id,))
        conn.commit()

    return {"score": score, "passed": passed}
