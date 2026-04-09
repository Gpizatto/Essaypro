from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import bcrypt
import jwt
import secrets
import time
import cloudinary
import cloudinary.utils
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url, tls=True, tlsAllowInvalidCertificates=True)
db = client[os.environ['DB_NAME']]

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

import anthropic
import uuid
import json as json_module

JWT_ALGORITHM = "HS256"

def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(minutes=15), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "student"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: str
    role: str
    is_active: bool = True
    created_at: datetime

class Criterion(BaseModel):
    id: str
    nome: str
    descricao: str
    peso_maximo: int = Field(..., ge=40, le=400)

class PromptCreate(BaseModel):
    title: str
    theme: str
    supporting_texts: str
    instructions: str
    criteria: Optional[List[Criterion]] = None

class PromptResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    theme: str
    supporting_texts: str
    instructions: str
    criteria: Optional[List[dict]] = []
    created_by: str
    created_at: datetime
    is_active: bool

class EssaySubmit(BaseModel):
    prompt_id: str
    content: Optional[str] = ""
    submission_method: str
    file_url: Optional[str] = None
    student_note: Optional[str] = None
    parent_essay_id: Optional[str] = None
    is_rewrite: bool = False

class EssayResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    student_id: str
    student_name: Optional[str] = None
    prompt_id: str
    prompt_title: Optional[str] = None
    content: str
    submission_method: str
    file_url: Optional[str] = None
    student_note: Optional[str] = None
    parent_essay_id: Optional[str] = None
    is_rewrite: bool = False
    status: str
    submitted_at: datetime

class CriteriaScore(BaseModel):
    criteria_id: str
    nome: str
    score: int
    max: int

class InlineComment(BaseModel):
    id: int
    selected_text: str
    comment: str
    color: str

class CorrectionSubmit(BaseModel):
    essay_id: str
    criteria_scores: List[CriteriaScore]
    total_score: int = Field(..., ge=0)
    general_feedback: str
    strengths: str
    improvements: str
    inline_comments: Optional[List[InlineComment]] = None
    canvas_annotations: Optional[dict] = None

class CorrectionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    essay_id: str
    teacher_id: str
    teacher_name: Optional[str] = None
    criteria_scores: List[dict]
    total_score: int
    general_feedback: str
    strengths: str
    improvements: str
    inline_comments: Optional[List[dict]] = None
    canvas_annotations: Optional[dict] = None
    corrected_at: datetime
    teacher_comment: Optional[str] = None
    suggest_rewrite: bool = False
    mark_important: bool = False
    extra_material: Optional[str] = None

app = FastAPI()
api_router = APIRouter(prefix="/api")

@api_router.post("/auth/register", response_model=UserResponse)
async def register(user_data: UserRegister, response: Response):
    email = user_data.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_pw = hash_password(user_data.password)
    user_doc = {
        "name": user_data.name,
        "email": email,
        "password_hash": hashed_pw,
        "role": user_data.role,
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=True, samesite="none", max_age=900, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=True, samesite="none", max_age=604800, path="/")
    
    return UserResponse(id=user_id, name=user_doc["name"], email=user_doc["email"], role=user_doc["role"], created_at=user_doc["created_at"])

@api_router.post("/auth/login", response_model=UserResponse)
async def login(login_data: UserLogin, response: Response):
    email = login_data.email.lower()
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(login_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=True, samesite="none", max_age=900, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=True, samesite="none", max_age=604800, path="/")
    
    return UserResponse(id=user_id, name=user["name"], email=user["email"], role=user["role"], created_at=user["created_at"])

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["_id"] if "_id" in current_user else current_user["id"],
        name=current_user["name"],
        email=current_user["email"],
        role=current_user["role"],
        created_at=current_user["created_at"]
    )

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"message": "Logged out successfully"}

@api_router.get("/prompts", response_model=List[PromptResponse])
async def get_prompts(current_user: dict = Depends(get_current_user)):
    prompts = await db.prompts.find({"is_active": True}, {"_id": 0}).to_list(1000)
    
    default_criteria = [
        {"id": "c1", "nome": "Competência 1 — Domínio da Norma Culta", "descricao": "Demonstrar domínio da modalidade escrita formal da língua portuguesa", "peso_maximo": 200},
        {"id": "c2", "nome": "Competência 2 — Compreensão do Tema", "descricao": "Compreender a proposta de redação e aplicar conceitos das várias áreas de conhecimento", "peso_maximo": 200},
        {"id": "c3", "nome": "Competência 3 — Argumentação", "descricao": "Selecionar, relacionar, organizar e interpretar informações, fatos, opiniões e argumentos", "peso_maximo": 200},
        {"id": "c4", "nome": "Competência 4 — Coesão e Coerência", "descricao": "Demonstrar conhecimento dos mecanismos linguísticos necessários para a construção da argumentação", "peso_maximo": 200},
        {"id": "c5", "nome": "Competência 5 — Proposta de Intervenção", "descricao": "Elaborar proposta de intervenção para o problema abordado, respeitando os direitos humanos", "peso_maximo": 200}
    ]
    
    for p in prompts:
        if "criteria" not in p or not p["criteria"]:
            p["criteria"] = default_criteria
    
    return [PromptResponse(**p) for p in prompts]

@api_router.post("/prompts", response_model=PromptResponse)
async def create_prompt(prompt_data: PromptCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Only teachers can create prompts")
    
    default_criteria = [
        {"id": "c1", "nome": "Competência 1 — Domínio da Norma Culta", "descricao": "Demonstrar domínio da modalidade escrita formal da língua portuguesa", "peso_maximo": 200},
        {"id": "c2", "nome": "Competência 2 — Compreensão do Tema", "descricao": "Compreender a proposta de redação e aplicar conceitos das várias áreas de conhecimento", "peso_maximo": 200},
        {"id": "c3", "nome": "Competência 3 — Argumentação", "descricao": "Selecionar, relacionar, organizar e interpretar informações, fatos, opiniões e argumentos", "peso_maximo": 200},
        {"id": "c4", "nome": "Competência 4 — Coesão e Coerência", "descricao": "Demonstrar conhecimento dos mecanismos linguísticos necessários para a construção da argumentação", "peso_maximo": 200},
        {"id": "c5", "nome": "Competência 5 — Proposta de Intervenção", "descricao": "Elaborar proposta de intervenção para o problema abordado, respeitando os direitos humanos", "peso_maximo": 200}
    ]
    
    criteria = prompt_data.criteria if prompt_data.criteria else [Criterion(**c) for c in default_criteria]
    
    prompt_doc = {
        "id": str(ObjectId()),
        "title": prompt_data.title,
        "theme": prompt_data.theme,
        "supporting_texts": prompt_data.supporting_texts,
        "instructions": prompt_data.instructions,
        "criteria": [c.model_dump() for c in criteria],
        "created_by": current_user["_id"],
        "created_at": datetime.now(timezone.utc),
        "is_active": True
    }
    await db.prompts.insert_one(prompt_doc)
    return PromptResponse(**prompt_doc)

@api_router.put("/prompts/{prompt_id}", response_model=PromptResponse)
async def update_prompt(prompt_id: str, prompt_data: PromptCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Only teachers can edit prompts")
    prompt = await db.prompts.find_one({"id": prompt_id}, {"_id": 0})
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    update_data = {
        "title": prompt_data.title,
        "theme": prompt_data.theme,
        "supporting_texts": prompt_data.supporting_texts,
        "instructions": prompt_data.instructions,
    }
    if prompt_data.criteria:
        update_data["criteria"] = [c.model_dump() for c in prompt_data.criteria]
    await db.prompts.update_one({"id": prompt_id}, {"$set": update_data})
    updated = await db.prompts.find_one({"id": prompt_id}, {"_id": 0})
    return PromptResponse(**updated)

@api_router.patch("/prompts/{prompt_id}/archive")
async def archive_prompt(prompt_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Only teachers can archive prompts")
    prompt = await db.prompts.find_one({"id": prompt_id})
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    new_status = not prompt.get("is_active", True)
    await db.prompts.update_one({"id": prompt_id}, {"$set": {"is_active": new_status}})
    return {"is_active": new_status}

@api_router.post("/prompts/{prompt_id}/duplicate", response_model=PromptResponse)
async def duplicate_prompt(prompt_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Only teachers can duplicate prompts")
    prompt = await db.prompts.find_one({"id": prompt_id}, {"_id": 0})
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    new_prompt = {**prompt}
    new_prompt["id"] = str(ObjectId())
    new_prompt["title"] = f"Cópia de {prompt['title']}"
    new_prompt["created_at"] = datetime.now(timezone.utc)
    new_prompt["created_by"] = current_user["_id"]
    new_prompt["is_active"] = False
    await db.prompts.insert_one(new_prompt)
    return PromptResponse(**new_prompt)

@api_router.get("/prompts/all", response_model=List[PromptResponse])
async def get_all_prompts(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    prompts = await db.prompts.find({}, {"_id": 0}).to_list(1000)
    default_criteria = [
        {"id": "c1", "nome": "Competência 1", "descricao": "", "peso_maximo": 200},
    ]
    for p in prompts:
        if "criteria" not in p or not p["criteria"]:
            p["criteria"] = default_criteria
    return [PromptResponse(**p) for p in prompts]

@api_router.post("/essays", response_model=EssayResponse)
async def submit_essay(essay_data: EssaySubmit, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Only students can submit essays")

    # Verificar créditos
    config = await db.settings.find_one({"key": "credit_config"})
    mode = config.get("mode", "unlimited") if config else "unlimited"
    limit = config.get("limit", 4) if config else 4

    if mode != "unlimited":
        now = datetime.now(timezone.utc)
        if mode == "monthly":
            period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            days_since_monday = now.weekday()
            period_start = (now - timedelta(days=days_since_monday)).replace(hour=0, minute=0, second=0, microsecond=0)

        used = await db.essays.count_documents({
            "student_id": current_user["_id"],
            "submitted_at": {"$gte": period_start}
        })
        if used >= limit:
            raise HTTPException(status_code=429, detail=f"Limite de {limit} redaç{'ão' if limit == 1 else 'ões'} por {'mês' if mode == 'monthly' else 'semana'} atingido.")
    
    essay_doc = {
        "id": str(ObjectId()),
        "student_id": current_user["_id"],
        "prompt_id": essay_data.prompt_id,
        "content": essay_data.content,
        "submission_method": essay_data.submission_method,
        "file_url": essay_data.file_url,
        "student_note": essay_data.student_note,
        "parent_essay_id": essay_data.parent_essay_id,
        "is_rewrite": essay_data.is_rewrite,
        "status": "pending",
        "submitted_at": datetime.now(timezone.utc)
    }
    await db.essays.insert_one(essay_doc)
    return EssayResponse(**essay_doc)

@api_router.get("/essays/my", response_model=List[EssayResponse])
async def get_my_essays(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Access denied")
    
    essays = await db.essays.find({"student_id": current_user["_id"]}, {"_id": 0}).to_list(1000)
    
    for essay in essays:
        prompt = await db.prompts.find_one({"id": essay["prompt_id"]}, {"_id": 0})
        if prompt:
            essay["prompt_title"] = prompt["title"]
    
    return [EssayResponse(**e) for e in essays]

@api_router.get("/essays/queue", response_model=List[EssayResponse])
async def get_correction_queue(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    essays = await db.essays.find({"status": "pending"}, {"_id": 0}).to_list(1000)
    
    for essay in essays:
        student = await db.users.find_one({"_id": ObjectId(essay["student_id"])}, {"_id": 0})
        prompt = await db.prompts.find_one({"id": essay["prompt_id"]}, {"_id": 0})
        if student:
            essay["student_name"] = student["name"]
        if prompt:
            essay["prompt_title"] = prompt["title"]
    
    return [EssayResponse(**e) for e in essays]

@api_router.get("/essays/all-teacher")
async def get_all_teacher_essays(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    essays = await db.essays.find({}, {"_id": 0}).to_list(5000)
    for essay in essays:
        student = await db.users.find_one({"_id": ObjectId(essay["student_id"])}, {"_id": 0, "name": 1})
        prompt = await db.prompts.find_one({"id": essay["prompt_id"]}, {"_id": 0, "title": 1})
        if student: essay["student_name"] = student["name"]
        if prompt: essay["prompt_title"] = prompt["title"]
    return [EssayResponse(**e) for e in essays]

@api_router.get("/essays/{essay_id}", response_model=EssayResponse)
async def get_essay(essay_id: str, current_user: dict = Depends(get_current_user)):
    essay = await db.essays.find_one({"id": essay_id}, {"_id": 0})
    if not essay:
        raise HTTPException(status_code=404, detail="Essay not found")
    
    if current_user["role"] == "student" and essay["student_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    student = await db.users.find_one({"_id": ObjectId(essay["student_id"])}, {"_id": 0})
    prompt = await db.prompts.find_one({"id": essay["prompt_id"]}, {"_id": 0})
    if student:
        essay["student_name"] = student["name"]
    if prompt:
        essay["prompt_title"] = prompt["title"]
    
    return EssayResponse(**essay)

@api_router.post("/corrections", response_model=CorrectionResponse)
async def submit_correction(correction_data: CorrectionSubmit, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Only teachers can submit corrections")
    
    essay = await db.essays.find_one({"id": correction_data.essay_id})
    if not essay:
        raise HTTPException(status_code=404, detail="Essay not found")
    
    correction_doc = {
        "id": str(ObjectId()),
        "essay_id": correction_data.essay_id,
        "teacher_id": current_user["_id"],
        "criteria_scores": [cs.model_dump() for cs in correction_data.criteria_scores],
        "total_score": correction_data.total_score,
        "general_feedback": correction_data.general_feedback,
        "strengths": correction_data.strengths,
        "improvements": correction_data.improvements,
        "inline_comments": [ic.model_dump() for ic in correction_data.inline_comments] if correction_data.inline_comments else [],
        "canvas_annotations": correction_data.canvas_annotations,
        "corrected_at": datetime.now(timezone.utc)
    }
    await db.corrections.insert_one(correction_doc)
    await db.essays.update_one({"id": correction_data.essay_id}, {"$set": {"status": "corrected"}})
    
    return CorrectionResponse(**correction_doc)

@api_router.get("/corrections/{essay_id}", response_model=CorrectionResponse)
async def get_correction(essay_id: str, current_user: dict = Depends(get_current_user)):
    correction = await db.corrections.find_one({"essay_id": essay_id}, {"_id": 0})
    if not correction:
        raise HTTPException(status_code=404, detail="Correction not found")
    
    essay = await db.essays.find_one({"id": essay_id})
    if current_user["role"] == "student" and essay["student_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    teacher = await db.users.find_one({"_id": ObjectId(correction["teacher_id"])}, {"_id": 0})
    if teacher:
        correction["teacher_name"] = teacher["name"]
    
    return CorrectionResponse(**correction)

@api_router.get("/stats/student")
async def get_student_stats(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Access denied")
    
    essays = await db.essays.find({"student_id": current_user["_id"]}, {"_id": 0}).to_list(1000)
    corrected_essays = [e for e in essays if e["status"] == "corrected"]
    
    scores = []
    for essay in corrected_essays:
        correction = await db.corrections.find_one({"essay_id": essay["id"]}, {"_id": 0})
        if correction:
            scores.append(correction["total_score"])
    
    return {
        "total_essays": len(essays),
        "pending_corrections": len([e for e in essays if e["status"] == "pending"]),
        "average_score": sum(scores) / len(scores) if scores else 0,
        "best_score": max(scores) if scores else 0
    }

@api_router.get("/admin/users", response_model=List[UserResponse])
async def get_all_users(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    users = await db.users.find({}, {"_id": 1, "name": 1, "email": 1, "role": 1, "created_at": 1, "is_active": 1}).to_list(1000)
    return [UserResponse(id=str(u["_id"]), name=u["name"], email=u["email"], role=u["role"], is_active=u.get("is_active", True), created_at=u["created_at"]) for u in users]

@api_router.patch("/admin/users/{user_id}/role")
async def update_user_role(user_id: str, body: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    new_role = body.get("role")
    if new_role not in ["student", "teacher", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    if user_id == current_user["_id"]:
        raise HTTPException(status_code=400, detail="Cannot change your own role")
    result = await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"role": new_role}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"role": new_role}

@api_router.patch("/admin/users/{user_id}/toggle-active")
async def toggle_user_active(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    if user_id == current_user["_id"]:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    new_status = not user.get("is_active", True)
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"is_active": new_status}})
    return {"is_active": new_status}

# ============================================================
# RELATÓRIO PESSOAL DO CORRETOR
# ============================================================

@api_router.get("/teacher/my-stats")
async def get_teacher_stats(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")

    tid = current_user["_id"]
    corrections = await db.corrections.find({"teacher_id": tid}, {"_id": 0}).to_list(10000)
    total = len(corrections)

    # Tempo médio (entre submitted_at do essay e corrected_at)
    durations = []
    for c in corrections:
        essay = await db.essays.find_one({"id": c["essay_id"]}, {"_id": 0, "submitted_at": 1})
        if essay and c.get("corrected_at") and essay.get("submitted_at"):
            diff = (c["corrected_at"] - essay["submitted_at"]).total_seconds() / 3600
            if 0 < diff < 720:  # ignorar outliers > 30 dias
                durations.append(diff)

    avg_hours = sum(durations) / len(durations) if durations else 0

    # Por mês — últimos 6 meses
    from collections import defaultdict
    monthly = defaultdict(int)
    for c in corrections:
        if c.get("corrected_at"):
            key = c["corrected_at"].strftime("%Y-%m")
            monthly[key] += 1

    sorted_months = sorted(monthly.keys())[-6:]
    monthly_data = [{"month": m, "count": monthly[m]} for m in sorted_months]

    # Por semana — últimas 4 semanas
    now = datetime.now(timezone.utc)
    weekly = []
    for i in range(3, -1, -1):
        week_start = now - timedelta(days=now.weekday() + 7 * i)
        week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
        week_end = week_start + timedelta(days=7)
        count = sum(1 for c in corrections if c.get("corrected_at") and week_start <= c["corrected_at"] <= week_end)
        weekly.append({"week": week_start.strftime("%d/%m"), "count": count})

    # Hoje e esta semana
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start_curr = now - timedelta(days=now.weekday())
    week_start_curr = week_start_curr.replace(hour=0, minute=0, second=0, microsecond=0)

    today_count = sum(1 for c in corrections if c.get("corrected_at") and c["corrected_at"] >= today_start)
    week_count = sum(1 for c in corrections if c.get("corrected_at") and c["corrected_at"] >= week_start_curr)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_count = sum(1 for c in corrections if c.get("corrected_at") and c["corrected_at"] >= month_start)

    return {
        "total_corrections": total,
        "today": today_count,
        "this_week": week_count,
        "this_month": month_count,
        "avg_hours": round(avg_hours, 1),
        "monthly_data": monthly_data,
        "weekly_data": weekly,
    }

# ============================================================
# SISTEMA DE RASCUNHO E ORGANIZAÇÃO DO CORRETOR
# ============================================================

@api_router.post("/corrections/draft")
async def save_draft(body: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    essay_id = body.get("essay_id")
    if not essay_id:
        raise HTTPException(status_code=400, detail="essay_id required")
    draft_data = {k: v for k, v in body.items() if k != "essay_id"}
    draft_data["teacher_id"] = current_user["_id"]
    draft_data["saved_at"] = datetime.now(timezone.utc)
    await db.drafts.update_one(
        {"essay_id": essay_id, "teacher_id": current_user["_id"]},
        {"$set": {"essay_id": essay_id, **draft_data}},
        upsert=True
    )
    await db.essays.update_one({"id": essay_id}, {"$set": {"status": "in_progress"}})
    return {"message": "Rascunho salvo"}

@api_router.get("/corrections/draft/{essay_id}")
async def get_draft(essay_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    draft = await db.drafts.find_one(
        {"essay_id": essay_id, "teacher_id": current_user["_id"]},
        {"_id": 0}
    )
    if not draft:
        raise HTTPException(status_code=404, detail="No draft found")
    return draft

# ============================================================
# INTERVENÇÃO PEDAGÓGICA DO PROFESSOR
# ============================================================

@api_router.post("/corrections/{essay_id}/intervention")
async def save_teacher_intervention(essay_id: str, body: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")

    allowed = {"teacher_comment", "suggest_rewrite", "mark_important", "extra_material"}
    update = {k: v for k, v in body.items() if k in allowed}
    update["intervention_by"] = current_user["_id"]
    update["intervention_at"] = datetime.now(timezone.utc)

    await db.corrections.update_one(
        {"essay_id": essay_id},
        {"$set": update}
    )
    return {"message": "Intervenção salva", **update}

@api_router.get("/corrections/{essay_id}/intervention")
async def get_teacher_intervention(essay_id: str, current_user: dict = Depends(get_current_user)):
    correction = await db.corrections.find_one({"essay_id": essay_id}, {"_id": 0})
    if not correction:
        raise HTTPException(status_code=404, detail="Correction not found")
    return {
        "teacher_comment": correction.get("teacher_comment", ""),
        "suggest_rewrite": correction.get("suggest_rewrite", False),
        "mark_important": correction.get("mark_important", False),
        "extra_material": correction.get("extra_material", ""),
        "intervention_at": correction.get("intervention_at"),
    }

@api_router.get("/teacher/students")
async def get_teacher_students(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")

    students = await db.users.find({"role": "student"}, {"_id": 1, "name": 1, "email": 1, "created_at": 1}).to_list(1000)
    result = []

    for student in students:
        sid = str(student["_id"])
        essays = await db.essays.find({"student_id": sid}, {"_id": 0}).to_list(1000)

        scores = []
        rewrite_count = sum(1 for e in essays if e.get("is_rewrite"))
        pending_count = sum(1 for e in essays if e.get("status") == "pending")
        corrected_count = sum(1 for e in essays if e.get("status") == "corrected")

        # Buscar notas das correções
        for essay in essays:
            if essay.get("status") == "corrected":
                correction = await db.corrections.find_one({"essay_id": essay["id"]}, {"_id": 0, "total_score": 1, "corrected_at": 1})
                if correction:
                    scores.append({
                        "score": correction["total_score"],
                        "date": correction.get("corrected_at"),
                        "prompt_title": essay.get("prompt_title", essay.get("prompt_id", ""))
                    })

        scores.sort(key=lambda x: x["date"] if x["date"] else "")

        result.append({
            "id": sid,
            "name": student["name"],
            "email": student["email"],
            "total_essays": len(essays),
            "pending_count": pending_count,
            "corrected_count": corrected_count,
            "rewrite_count": rewrite_count,
            "average_score": sum(s["score"] for s in scores) / len(scores) if scores else 0,
            "best_score": max((s["score"] for s in scores), default=0),
            "scores_history": scores[-5:],  # últimas 5 notas
        })

    result.sort(key=lambda x: -x["total_essays"])
    return result

@api_router.get("/teacher/student/{student_id}")
async def get_student_detail(student_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        student = await db.users.find_one({"_id": ObjectId(student_id)}, {"_id": 0, "name": 1, "email": 1})
    except:
        raise HTTPException(status_code=404, detail="Student not found")

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    essays = await db.essays.find({"student_id": student_id}, {"_id": 0}).to_list(1000)
    prompts = await db.prompts.find({}, {"_id": 0, "id": 1, "title": 1}).to_list(1000)

    essay_prompt_ids = {e.get("prompt_id") for e in essays}
    prompts_done = [p for p in prompts if p["id"] in essay_prompt_ids]
    prompts_not_done = [p for p in prompts if p["id"] not in essay_prompt_ids and p.get("is_active")]

    detailed_essays = []
    for essay in sorted(essays, key=lambda x: x.get("submitted_at", ""), reverse=True):
        correction = None
        if essay.get("status") == "corrected":
            correction = await db.corrections.find_one({"essay_id": essay["id"]}, {"_id": 0, "total_score": 1, "corrected_at": 1, "general_feedback": 1})
        prompt = await db.prompts.find_one({"id": essay.get("prompt_id")}, {"_id": 0, "title": 1})
        detailed_essays.append({
            "id": essay["id"],
            "prompt_title": prompt["title"] if prompt else "Sem proposta",
            "status": essay.get("status"),
            "is_rewrite": essay.get("is_rewrite", False),
            "submitted_at": essay.get("submitted_at"),
            "score": correction["total_score"] if correction else None,
            "corrected_at": correction.get("corrected_at") if correction else None,
        })

    return {
        "student": {"id": student_id, **student},
        "essays": detailed_essays,
        "prompts_done": prompts_done,
        "prompts_not_done": prompts_not_done,
        "stats": {
            "total": len(essays),
            "pending": sum(1 for e in essays if e.get("status") == "pending"),
            "corrected": sum(1 for e in essays if e.get("status") == "corrected"),
            "rewrites": sum(1 for e in essays if e.get("is_rewrite")),
        }
    }

@api_router.get("/admin/stats")
async def get_admin_stats(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    total_users = await db.users.count_documents({})
    total_students = await db.users.count_documents({"role": "student"})
    total_teachers = await db.users.count_documents({"role": "teacher"})
    total_essays = await db.essays.count_documents({})
    total_pending = await db.essays.count_documents({"status": "pending"})
    total_corrections = await db.corrections.count_documents({})
    total_rewrites = await db.essays.count_documents({"is_rewrite": True})

    corrections = await db.corrections.find({}, {"_id": 0, "total_score": 1}).to_list(10000)
    scores = [c["total_score"] for c in corrections]

    # Propostas mais enviadas
    essays_all = await db.essays.find({}, {"_id": 0, "prompt_id": 1}).to_list(10000)
    prompt_counts = {}
    for e in essays_all:
        pid = e.get("prompt_id")
        if pid:
            prompt_counts[pid] = prompt_counts.get(pid, 0) + 1
    top_prompt_ids = sorted(prompt_counts, key=lambda x: -prompt_counts[x])[:5]
    top_prompts = []
    for pid in top_prompt_ids:
        p = await db.prompts.find_one({"id": pid}, {"_id": 0, "title": 1, "id": 1})
        if p:
            top_prompts.append({"title": p["title"], "count": prompt_counts[pid]})

    # Alunos mais ativos
    student_counts = {}
    for e in essays_all:
        sid = e.get("student_id") if "student_id" in e else None
    essays_with_student = await db.essays.find({}, {"_id": 0, "student_id": 1}).to_list(10000)
    for e in essays_with_student:
        sid = e.get("student_id")
        if sid:
            student_counts[sid] = student_counts.get(sid, 0) + 1
    top_student_ids = sorted(student_counts, key=lambda x: -student_counts[x])[:5]
    top_students = []
    for sid in top_student_ids:
        try:
            u = await db.users.find_one({"_id": ObjectId(sid)}, {"_id": 0, "name": 1})
            if u:
                top_students.append({"name": u["name"], "count": student_counts[sid]})
        except:
            pass

    return {
        "total_users": total_users,
        "total_students": total_students,
        "total_teachers": total_teachers,
        "total_essays": total_essays,
        "total_pending": total_pending,
        "total_corrections": total_corrections,
        "total_rewrites": total_rewrites,
        "average_score": sum(scores) / len(scores) if scores else 0,
        "top_prompts": top_prompts,
        "top_students": top_students,
    }

@api_router.get("/cloudinary/signature")
def generate_cloudinary_signature(
    resource_type: str = Query("image", enum=["image", "auto"]),
    folder: str = "essaypro/uploads",
    current_user: dict = Depends(get_current_user)
):
    timestamp = int(time.time())
    params = {
        "timestamp": timestamp,
        "folder": folder,
        "resource_type": resource_type
    }
    
    signature = cloudinary.utils.api_sign_request(params, os.getenv("CLOUDINARY_API_SECRET"))
    
    return {
        "signature": signature,
        "timestamp": timestamp,
        "cloud_name": os.getenv("CLOUDINARY_CLOUD_NAME"),
        "api_key": os.getenv("CLOUDINARY_API_KEY"),
        "folder": folder,
        "resource_type": resource_type
    }

@api_router.get("/users/quick-comments")
async def get_quick_comments(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Only teachers can access quick comments")

    user = await db.users.find_one({"_id": ObjectId(current_user["_id"])}, {"_id": 0, "quick_comments": 1})
    comments = user.get("quick_comments", [])

    migrated_comments = []
    for comment in comments:
        if isinstance(comment, str):
            migrated_comments.append({
                "id": str(uuid.uuid4()),
                "text": comment,
                "category": "geral",
                "use_count": 0,
                "last_used_at": None,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        else:
            if "category" not in comment:
                comment["category"] = "geral"
            migrated_comments.append(comment)

    migrated_comments.sort(key=lambda x: x.get("use_count", 0), reverse=True)
    return {"quick_comments": migrated_comments}

@api_router.get("/admin/quick-comments")
async def get_shared_quick_comments(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    config = await db.settings.find_one({"key": "shared_quick_comments"})
    return {"quick_comments": config.get("comments", []) if config else []}

@api_router.put("/admin/quick-comments")
async def update_shared_quick_comments(body: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    await db.settings.update_one(
        {"key": "shared_quick_comments"},
        {"$set": {"key": "shared_quick_comments", "comments": body.get("quick_comments", [])}},
        upsert=True
    )
    return {"message": "Comentários compartilhados atualizados"}

@api_router.put("/users/quick-comments")
async def update_quick_comments(quick_comments: List[dict], current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Only teachers can update quick comments")
    
    await db.users.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": {"quick_comments": quick_comments}}
    )
    return {"message": "Quick comments updated successfully", "quick_comments": quick_comments}

@api_router.put("/users/quick-comments/use/{comment_id}")
async def use_quick_comment(comment_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Only teachers can use quick comments")
    
    user = await db.users.find_one({"_id": ObjectId(current_user["_id"])})
    comments = user.get("quick_comments", [])
    
    for comment in comments:
        if isinstance(comment, dict) and comment.get("id") == comment_id:
            comment["use_count"] = comment.get("use_count", 0) + 1
            comment["last_used_at"] = datetime.now(timezone.utc).isoformat()
            break
    
    await db.users.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": {"quick_comments": comments}}
    )
    
    return {"message": "Quick comment usage recorded"}

class AIAnalysisRequest(BaseModel):
    essay_id: str
    content: str

@api_router.post("/ai/analyze-essay")
async def analyze_essay_with_ai(request: AIAnalysisRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Only teachers can analyze essays")
    
    llm_key = os.getenv("ANTHROPIC_API_KEY")
    if not llm_key:
        raise HTTPException(status_code=503, detail="AI service not configured")
    
    try:
        system_prompt = (
            "Voce e um professor especialista em redacao do ENEM e lingua portuguesa. "
            "Analise a redacao abaixo e retorne APENAS um JSON valido, sem texto adicional, sem markdown, sem explicacoes fora do JSON. "
            "Retorne no formato: "
            '{"erros": [{"id": "uuid_gerado", "trecho": "trecho exato do texto com erro", '
            '"tipo": "gramatical | coesao | argumentacao | tematico | estilo", '
            '"descricao": "explicacao clara do erro", "sugestao": "como corrigir"}], '
            '"resumo": "breve analise geral da redacao em 2-3 frases"} '
            "Retorne entre 3 e 15 erros. Seja preciso e util. Use portugues brasileiro."
        )

        ai_client = anthropic.AsyncAnthropic(api_key=llm_key)
        message = await ai_client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2048,
            system=system_prompt,
            messages=[
                {"role": "user", "content": f"Redacao para analise:\n\n{request.content}"}
            ]
        )
        response_text = message.content[0].text

        response_text = response_text.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        analysis = json_module.loads(response_text)
        
        for erro in analysis.get("erros", []):
            if "id" not in erro or not erro["id"]:
                erro["id"] = str(uuid.uuid4())
        
        return analysis
        
    except json_module.JSONDecodeError:
        logger.error(f"Failed to parse AI response: {response_text}")
        raise HTTPException(status_code=500, detail="Failed to parse AI response")
    except Exception as e:
        logger.error(f"AI analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

# ============================================================
# CONFIGURAÇÕES PEDAGÓGICAS DO CURSO
# ============================================================

DEFAULT_COURSE_SETTINGS = {
    "show_teacher_name": True,
    "allow_post_correction_doubt": True,
    "allow_download": True,
    "allow_rewrite": True,
    "require_rewrite": False,
    "allow_ai_analysis": True,
}

@api_router.get("/settings/course")
async def get_course_settings(current_user: dict = Depends(get_current_user)):
    config = await db.settings.find_one({"key": "course_settings"})
    if not config:
        return DEFAULT_COURSE_SETTINGS
    result = {**DEFAULT_COURSE_SETTINGS}
    result.update({k: v for k, v in config.items() if k in DEFAULT_COURSE_SETTINGS})
    return result

@api_router.put("/settings/course")
async def update_course_settings(body: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    allowed_keys = set(DEFAULT_COURSE_SETTINGS.keys())
    clean = {k: bool(v) for k, v in body.items() if k in allowed_keys}
    await db.settings.update_one(
        {"key": "course_settings"},
        {"$set": {"key": "course_settings", **clean}},
        upsert=True
    )
    return {"message": "Configurações salvas", **clean}

# ============================================================
# SISTEMA DE CRÉDITOS
# ============================================================

class CreditConfig(BaseModel):
    mode: str = "unlimited"  # "unlimited" | "monthly" | "weekly"
    limit: int = 4

class CreditConfigResponse(BaseModel):
    mode: str
    limit: int

@api_router.get("/credits/config", response_model=CreditConfigResponse)
async def get_credit_config(current_user: dict = Depends(get_current_user)):
    config = await db.settings.find_one({"key": "credit_config"})
    if not config:
        return CreditConfigResponse(mode="unlimited", limit=4)
    return CreditConfigResponse(mode=config.get("mode", "unlimited"), limit=config.get("limit", 4))

@api_router.put("/credits/config")
async def update_credit_config(config: CreditConfig, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    await db.settings.update_one(
        {"key": "credit_config"},
        {"$set": {"key": "credit_config", "mode": config.mode, "limit": config.limit}},
        upsert=True
    )
    return {"message": "Configuração atualizada"}

@api_router.get("/credits/me")
async def get_my_credits(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Students only")

    config = await db.settings.find_one({"key": "credit_config"})
    mode = config.get("mode", "unlimited") if config else "unlimited"
    limit = config.get("limit", 4) if config else 4

    if mode == "unlimited":
        return {"mode": "unlimited", "limit": None, "used": 0, "remaining": None, "renews_at": None}

    now = datetime.now(timezone.utc)
    if mode == "monthly":
        period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        next_month = (period_start.replace(day=28) + timedelta(days=4)).replace(day=1)
        renews_at = next_month.strftime("%d/%m/%Y")
    else:  # weekly
        days_since_monday = now.weekday()
        period_start = (now - timedelta(days=days_since_monday)).replace(hour=0, minute=0, second=0, microsecond=0)
        renews_at = (period_start + timedelta(days=7)).strftime("%d/%m/%Y")

    used = await db.essays.count_documents({
        "student_id": current_user["_id"],
        "submitted_at": {"$gte": period_start}
    })
    remaining = max(0, limit - used)

    return {
        "mode": mode,
        "limit": limit,
        "used": used,
        "remaining": remaining,
        "renews_at": renews_at
    }

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.environ.get("FRONTEND_URL", "http://localhost:3000"),
        "https://essaypro-frontend.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    await db.users.create_index("email", unique=True)
    
    admin_email = os.getenv("ADMIN_EMAIL", "admin@essaypro.com")
    admin_password = os.getenv("ADMIN_PASSWORD", "admin123")
    
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        hashed = hash_password(admin_password)
        await db.users.insert_one({
            "name": "Admin",
            "email": admin_email,
            "password_hash": hashed,
            "role": "admin",
            "created_at": datetime.now(timezone.utc)
        })
        logger.info(f"Admin user created: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
        logger.info(f"Admin password updated")
    
    student = await db.users.find_one({"email": "student@test.com"})
    if not student:
        await db.users.insert_one({
            "name": "Student Test",
            "email": "student@test.com",
            "password_hash": hash_password("test123"),
            "role": "student",
            "created_at": datetime.now(timezone.utc)
        })
        logger.info("Test student created")
    
    teacher = await db.users.find_one({"email": "prof@test.com"})
    if not teacher:
        default_quick_comments = [
            {"id": "qc1", "text": "Erro de concordancia verbal", "use_count": 15, "last_used_at": "2024-01-15T10:30:00Z", "created_at": "2024-01-01T00:00:00Z"},
            {"id": "qc2", "text": "Erro de concordancia nominal", "use_count": 12, "last_used_at": "2024-01-14T15:20:00Z", "created_at": "2024-01-01T00:00:00Z"},
            {"id": "qc3", "text": "Crase ausente ou incorreta", "use_count": 10, "last_used_at": "2024-01-13T09:10:00Z", "created_at": "2024-01-01T00:00:00Z"},
            {"id": "qc4", "text": "Argumento sem embasamento", "use_count": 8, "last_used_at": "2024-01-12T14:30:00Z", "created_at": "2024-01-01T00:00:00Z"},
            {"id": "qc5", "text": "Falta de coesao entre os paragrafos", "use_count": 7, "last_used_at": "2024-01-11T11:20:00Z", "created_at": "2024-01-01T00:00:00Z"},
            {"id": "qc6", "text": "Bom uso de repertorio sociocultural", "use_count": 20, "last_used_at": "2024-01-16T16:45:00Z", "created_at": "2024-01-01T00:00:00Z"},
            {"id": "qc7", "text": "Proposta de intervencao incompleta", "use_count": 9, "last_used_at": "2024-01-10T13:15:00Z", "created_at": "2024-01-01T00:00:00Z"},
            {"id": "qc8", "text": "Otima progressao tematica", "use_count": 18, "last_used_at": "2024-01-17T10:00:00Z", "created_at": "2024-01-01T00:00:00Z"},
            {"id": "qc9", "text": "Uso inadequado de conectivos", "use_count": 6, "last_used_at": "2024-01-09T08:30:00Z", "created_at": "2024-01-01T00:00:00Z"},
            {"id": "qc10", "text": "Excelente dominio da norma culta", "use_count": 14, "last_used_at": "2024-01-15T17:20:00Z", "created_at": "2024-01-01T00:00:00Z"}
        ]
        
        await db.users.insert_one({
            "name": "Professor Test",
            "email": "prof@test.com",
            "password_hash": hash_password("test123"),
            "role": "teacher",
            "quick_comments": default_quick_comments,
            "created_at": datetime.now(timezone.utc)
        })
        logger.info("Test teacher created")
    
    teacher_user = await db.users.find_one({"email": "prof@test.com"})
    teacher_id = str(teacher_user["_id"])
    
    default_criteria = [
        {"id": "c1", "nome": "Competencia 1 - Dominio da Norma Culta", "descricao": "Demonstrar dominio da modalidade escrita formal da lingua portuguesa", "peso_maximo": 200},
        {"id": "c2", "nome": "Competencia 2 - Compreensao do Tema", "descricao": "Compreender a proposta de redacao e aplicar conceitos das varias areas de conhecimento", "peso_maximo": 200},
        {"id": "c3", "nome": "Competencia 3 - Argumentacao", "descricao": "Selecionar, relacionar, organizar e interpretar informacoes, fatos, opinioes e argumentos", "peso_maximo": 200},
        {"id": "c4", "nome": "Competencia 4 - Coesao e Coerencia", "descricao": "Demonstrar conhecimento dos mecanismos linguisticos necessarios para a construcao da argumentacao", "peso_maximo": 200},
        {"id": "c5", "nome": "Competencia 5 - Proposta de Intervencao", "descricao": "Elaborar proposta de intervencao para o problema abordado, respeitando os direitos humanos", "peso_maximo": 200}
    ]
    
    prompt_count = await db.prompts.count_documents({})
    if prompt_count == 0:
        prompts = [
            {
                "id": str(ObjectId()),
                "title": "Desafios da educacao digital no Brasil",
                "theme": "A democratizacao do acesso a educacao digital e seus desafios no contexto brasileiro contemporaneo",
                "supporting_texts": "Texto I: Segundo dados do IBGE, apenas 50% dos domicilios brasileiros possuem acesso a internet de qualidade.\n\nTexto II: A pandemia evidenciou as desigualdades no acesso a educacao remota, afetando principalmente estudantes de baixa renda.",
                "instructions": "Com base nos textos motivadores e em seus conhecimentos, redija um texto dissertativo-argumentativo sobre os desafios da educacao digital no Brasil. Apresente proposta de intervencao que respeite os direitos humanos.",
                "criteria": default_criteria,
                "created_by": teacher_id,
                "created_at": datetime.now(timezone.utc),
                "is_active": True
            },
            {
                "id": str(ObjectId()),
                "title": "Saude mental na era digital",
                "theme": "Os impactos das redes sociais na saude mental dos jovens brasileiros",
                "supporting_texts": "Texto I: Estudos mostram aumento de 40% nos casos de ansiedade e depressao entre jovens usuarios frequentes de redes sociais.\n\nTexto II: O uso excessivo de smartphones esta associado a problemas de sono e concentracao em adolescentes.",
                "instructions": "Redija um texto dissertativo-argumentativo sobre os impactos das redes sociais na saude mental dos jovens. Apresente proposta de intervencao social.",
                "criteria": default_criteria,
                "created_by": teacher_id,
                "created_at": datetime.now(timezone.utc),
                "is_active": True
            }
        ]
        await db.prompts.insert_many(prompts)
        logger.info("Sample prompts created")
    
    sample_pending = await db.essays.count_documents({"status": "pending", "content": {"$regex": "^A educacao digital"}})
    if sample_pending == 0:
        student_user = await db.users.find_one({"email": "student@test.com"})
        if student_user:
            student_id = str(student_user["_id"])
            prompt_list = await db.prompts.find({"is_active": True}, {"_id": 0}).to_list(2)
            
            if len(prompt_list) >= 2:
                sample_essays = [
                    {
                        "id": str(ObjectId()),
                        "student_id": student_id,
                        "prompt_id": prompt_list[0]["id"],
                        "content": "A educacao digital no Brasil enfrenta diversos desafios que precisam ser superados para garantir o acesso igualitario ao conhecimento.",
                        "submission_method": "editor",
                        "file_url": None,
                        "status": "pending",
                        "submitted_at": datetime.now(timezone.utc) - timedelta(hours=2)
                    },
                    {
                        "id": str(ObjectId()),
                        "student_id": student_id,
                        "prompt_id": prompt_list[1]["id"],
                        "content": "As redes sociais transformaram profundamente a forma como nos comunicamos e nos relacionamos.",
                        "submission_method": "paste",
                        "file_url": None,
                        "status": "pending",
                        "submitted_at": datetime.now(timezone.utc) - timedelta(hours=5)
                    }
                ]
                
                await db.essays.insert_many(sample_essays)
                logger.info("Sample essays created for testing")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
