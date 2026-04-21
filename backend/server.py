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
from functools import lru_cache
import time

# Simple in-memory cache for frequently read, rarely changed settings
_settings_cache = {}
_cache_ttl = 300  # 5 minutes

async def get_cached_setting(key: str, default: dict):
    """Cache settings to avoid repeated DB reads for every request"""
    now = time.time()
    if key in _settings_cache:
        value, expires = _settings_cache[key]
        if now < expires:
            return value
    config = await db.settings.find_one({"key": key}, {"_id": 0})
    result = {**default, **(config or {})}
    _settings_cache[key] = (result, now + _cache_ttl)
    return result

def invalidate_cache(key: str = None):
    """Call after any settings update"""
    if key:
        _settings_cache.pop(key, None)
    else:
        _settings_cache.clear()
import time
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url, tls=True, tlsAllowInvalidCertificates=True)
db = client[os.environ['DB_NAME']]


# AI via Groq (gratuito) — usa httpx direto, sem SDK
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
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(hours=8), "type": "access"}
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
    course_ids: Optional[List[str]] = []
    phone: Optional[str] = None
    created_at: datetime

class LevelDescription(BaseModel):
    pontuacao: float  # float para suportar 0.5, 5, 40 etc.
    proficiencia: Optional[str] = ""
    descricao: Optional[str] = ""

class Criterion(BaseModel):
    id: str
    nome: str
    descricao: Optional[str] = ""
    peso_maximo: float = Field(..., gt=0)  # qualquer valor positivo
    level_descriptions: Optional[List[LevelDescription]] = []

class PromptCreate(BaseModel):
    title: str
    theme: str
    supporting_texts: Optional[str] = ""
    instructions: str
    criteria: Optional[List[Criterion]] = None
    course_ids: Optional[List[str]] = []
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    supporting_files: Optional[List[dict]] = []
    supporting_files: Optional[List[dict]] = []  # [{name, url, type}]

class PromptResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    theme: str
    supporting_texts: Optional[str] = ""
    instructions: str
    criteria: Optional[List[dict]] = []
    created_by: str
    created_at: datetime
    is_active: bool
    course_ids: Optional[List[str]] = []
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    supporting_files: Optional[List[dict]] = []

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
    score: float
    max: float

class InlineComment(BaseModel):
    id: int
    selected_text: str
    comment: str
    color: str

class CorrectionSubmit(BaseModel):
    essay_id: str
    criteria_scores: List[CriteriaScore]
    total_score: float = Field(..., ge=0)
    general_feedback: str
    strengths: str
    improvements: str
    inline_comments: Optional[List[InlineComment]] = None
    canvas_annotations: Optional[dict] = None
    pdf_annotations: Optional[dict] = None  # {page_num: dataUrl}
    correction_time_minutes: Optional[int] = 0

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
    pdf_annotations: Optional[dict] = None
    correction_time_minutes: Optional[int] = None
    corrected_at: datetime
    teacher_comment: Optional[str] = None
    suggest_rewrite: bool = False
    mark_important: bool = False
    extra_material: Optional[str] = None

app = FastAPI()
api_router = APIRouter(prefix="/api")

@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    email = user_data.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    hashed_pw = hash_password(user_data.password)
    user_doc = {
        "name": user_data.name,
        "email": email,
        "password_hash": hashed_pw,
        "role": "student",
        "is_active": True,
        "is_approved": False,
        "phone": getattr(user_data, 'phone', None) or "",
        "created_at": datetime.now(timezone.utc)
    }
    await db.users.insert_one(user_doc)
    return {"message": "Cadastro realizado! Aguarde a aprovação do administrador para acessar a plataforma."}

@api_router.post("/auth/login", response_model=UserResponse)
async def login(login_data: UserLogin, response: Response):
    email = login_data.email.lower()
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=401, detail="Email ou senha inválidos")
    
    if not verify_password(login_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email ou senha inválidos")
    
    is_approved = user.get("is_approved", True)
    is_active = user.get("is_active", True)
    logger.info(f"Login attempt: {email}, is_approved={is_approved}, is_active={is_active}, role={user.get('role')}")
    if not is_approved:
        raise HTTPException(status_code=403, detail="Sua conta ainda não foi aprovada pelo administrador. Aguarde.")
    # is_active=False só bloqueia se explicitamente desativado pelo admin (não para novos cadastros)
    if is_active == False and is_approved:
        raise HTTPException(status_code=403, detail="Sua conta foi desativada. Entre em contato com o administrador.")
    
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
    user_course_ids = current_user.get("course_ids", [])
    # Mostrar propostas: sem restrição de turma OU que pertencem às turmas do usuário
    if user_course_ids:
        prompt_query = {"is_active": True, "$or": [
            {"course_ids": {"$exists": False}},
            {"course_ids": []},
            {"course_ids": {"$in": user_course_ids}},
        ]}
    else:
        prompt_query = {"is_active": True}
    prompts = await db.prompts.find(prompt_query, {"_id": 0}).to_list(1000)
    
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
        "is_active": True,
        "course_ids": prompt_data.course_ids or [],
        "start_date": prompt_data.start_date,
        "end_date": prompt_data.end_date,
        "supporting_files": prompt_data.supporting_files or [],
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
        "course_ids": prompt_data.course_ids or [],
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

@api_router.delete("/prompts/{prompt_id}")
async def delete_prompt(prompt_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Only teachers can delete prompts")
    prompt = await db.prompts.find_one({"id": prompt_id})
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    # Verificar se há redações vinculadas
    essay_count = await db.essays.count_documents({"prompt_id": prompt_id})
    if essay_count > 0:
        raise HTTPException(status_code=400, detail=f"Não é possível apagar: há {essay_count} redação(ões) vinculada(s) a esta proposta. Arquive-a em vez de apagar.")
    await db.prompts.delete_one({"id": prompt_id})
    return {"ok": True}

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

    # Notificar professores/admins sobre nova redação
    try:
        teachers = await db.users.find({"role": {"$in": ["teacher", "admin"]}}, {"_id": 1}).to_list(100)
        prompt_doc2 = await db.prompts.find_one({"id": essay_doc["prompt_id"]}, {"_id": 0, "title": 1})
        prompt_title2 = prompt_doc2["title"] if prompt_doc2 else "proposta"
        student_doc = await db.users.find_one({"_id": ObjectId(current_user["_id"])}, {"_id": 0, "name": 1})
        student_name = student_doc["name"] if student_doc else "Um aluno"
        for t in teachers:
            await create_notification(
                user_id=str(t["_id"]),
                title="Nova redação para corrigir 📝",
                message=f"{student_name} enviou uma redação sobre '{prompt_title2}'.",
                type="essay",
                link="/correction-queue"
            )
    except Exception: pass

    return EssayResponse(**essay_doc)

@api_router.get("/essays/my", response_model=List[EssayResponse])
async def get_my_essays(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Access denied")

    essays = await db.essays.find({"student_id": current_user["_id"]}, {"_id": 0}).to_list(1000)

    # Batch load prompts — 1 query instead of N
    prompt_ids = list({e["prompt_id"] for e in essays if e.get("prompt_id")})
    prompts_map = {}
    if prompt_ids:
        prompts = await db.prompts.find({"id": {"$in": prompt_ids}}, {"_id": 0, "id": 1, "title": 1}).to_list(len(prompt_ids))
        prompts_map = {p["id"]: p["title"] for p in prompts}

    for essay in essays:
        if essay.get("prompt_id") in prompts_map:
            essay["prompt_title"] = prompts_map[essay["prompt_id"]]

    return [EssayResponse(**e) for e in essays]

@api_router.get("/essays/queue", response_model=List[EssayResponse])
async def get_correction_queue(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")

    # Se professor pertence a turmas, filtra só alunos dessas turmas
    essay_query = {"status": "pending"}
    teacher_course_ids = current_user.get("course_ids", [])
    if current_user["role"] == "teacher" and teacher_course_ids:
        # Buscar IDs dos alunos nas mesmas turmas do professor
        students_in_courses = await db.users.find(
            {"role": "student", "course_ids": {"$in": teacher_course_ids}},
            {"_id": 1}
        ).to_list(10000)
        student_ids = [str(s["_id"]) for s in students_in_courses]
        if student_ids:
            essay_query["student_id"] = {"$in": student_ids}

    essays = await db.essays.find(essay_query, {"_id": 0}).to_list(1000)

    # Batch load students and prompts — 2 queries instead of 2N
    student_ids_set = {e["student_id"] for e in essays if e.get("student_id")}
    prompt_ids_set = {e["prompt_id"] for e in essays if e.get("prompt_id")}

    students_list = []
    if student_ids_set:
        students_list = await db.users.find(
            {"_id": {"$in": [ObjectId(sid) for sid in student_ids_set]}},
            {"_id": 1, "name": 1}
        ).to_list(len(student_ids_set))
    students_map = {str(s["_id"]): s["name"] for s in students_list}

    prompts_list = []
    if prompt_ids_set:
        prompts_list = await db.prompts.find(
            {"id": {"$in": list(prompt_ids_set)}},
            {"_id": 0, "id": 1, "title": 1}
        ).to_list(len(prompt_ids_set))
    prompts_map = {p["id"]: p["title"] for p in prompts_list}

    for essay in essays:
        essay["student_name"] = students_map.get(essay.get("student_id", ""), "")
        if essay.get("prompt_id") in prompts_map:
            essay["prompt_title"] = prompts_map[essay["prompt_id"]]

    return [EssayResponse(**e) for e in essays]

@api_router.patch("/essays/{essay_id}/status")
async def update_essay_status(essay_id: str, body: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    new_status = body.get("status")
    valid = ["pending", "in_progress", "corrected", "returned"]
    if new_status not in valid:
        raise HTTPException(status_code=400, detail=f"Status must be one of {valid}")
    result = await db.essays.update_one({"id": essay_id}, {"$set": {"status": new_status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Essay not found")
    return {"status": new_status}

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
        "pdf_annotations": correction_data.pdf_annotations,
        "corrected_at": datetime.now(timezone.utc),
        "correction_time_minutes": correction_data.correction_time_minutes or 0,
    }
    await db.corrections.insert_one(correction_doc)
    await db.essays.update_one({"id": correction_data.essay_id}, {"$set": {"status": "corrected"}})

    # Notificar aluno que a correção ficou pronta
    essay_data = await db.essays.find_one({"id": correction_data.essay_id}, {"_id": 0})
    if essay_data:
        await db.notifications.insert_one({
            "user_id": essay_data.get("student_id"),
            "type": "correction_ready",
            "title": "Sua redação foi corrigida! ✅",
            "message": f"A correção de '{essay_data.get('prompt_title', 'sua redação')}' já está disponível.",
            "link": f"/my-essays",
            "read": False,
            "created_at": datetime.now(timezone.utc)
        })


    # Salvar no histórico de versões
    history_doc = {**correction_doc, "saved_at": datetime.now(timezone.utc), "version": 1}
    await db.correction_history.insert_one(history_doc)

    # Log de atividade
    await create_activity_log(
        user_id=current_user["_id"],
        user_name=current_user.get("name", "?"),
        action="published_correction",
        entity_type="correction",
        entity_id=correction_data.essay_id,
        detail=f"Nota: {correction_data.total_score} pts"
    )

    # Notificar aluno que a correção ficou pronta
    essay_doc = await db.essays.find_one({"id": correction_data.essay_id})
    if essay_doc:
        prompt_doc = await db.prompts.find_one({"id": essay_doc.get("prompt_id")}, {"_id": 0, "title": 1})
        prompt_title = prompt_doc["title"] if prompt_doc else "sua redação"
        await create_notification(
            user_id=essay_doc["student_id"],
            title="Correção disponível! ✅",
            message=f"Sua redação sobre '{prompt_title}' foi corrigida.",
            type="success",
            link=f"/essay/{correction_data.essay_id}/correction"
        )

    return CorrectionResponse(**correction_doc)

@api_router.get("/corrections/{essay_id}", response_model=CorrectionResponse)
async def get_correction(essay_id: str, current_user: dict = Depends(get_current_user)):
    correction = await db.corrections.find_one({"essay_id": essay_id}, {"_id": 0})
    if not correction:
        raise HTTPException(status_code=404, detail="Correction not found")
    
    essay = await db.essays.find_one({"id": essay_id})
    if not essay:
        raise HTTPException(status_code=404, detail="Essay not found")
    if current_user["role"] == "student" and str(essay["student_id"]) != str(current_user["_id"]):
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

@api_router.get("/admin/pending-users")
async def get_pending_users(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    users = await db.users.find(
        {"$or": [{"is_approved": False}, {"is_active": False}]},
        {"_id": 1, "name": 1, "email": 1, "role": 1, "created_at": 1, "is_approved": 1, "is_active": 1}
    ).sort("created_at", -1).to_list(100)
    return [{
        "id": str(u["_id"]), "name": u["name"], "email": u["email"],
        "role": u.get("role", "student"), "created_at": u["created_at"],
        "is_approved": u.get("is_approved", False), "is_active": u.get("is_active", False),
    } for u in users]

@api_router.post("/admin/approve-user/{user_id}")
async def approve_user(user_id: str, body: dict = None, current_user: dict = Depends(get_current_user)):
    if body is None:
        body = {}
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    role = body.get("role", "student")
    course_id = body.get("course_id")
    update = {"is_approved": True, "is_active": True, "role": role}
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    logger.info(f"User {user_id} approved as {role}, matched={result.matched_count}, modified={result.modified_count}")
    # Adicionar à turma se informado
    if course_id:
        await db.users.update_one({"_id": ObjectId(user_id)}, {"$addToSet": {"course_ids": course_id}})
    await create_activity_log(
        user_id=current_user["_id"],
        user_name=current_user.get("name", "?"),
        action="approved_user",
        entity_type="user",
        entity_id=user_id,
        detail=f"Aprovado como {role}" + (f" na turma {course_id}" if course_id else "")
    )
    # Retornar estado atual do usuário para confirmação no frontend
    updated = await db.users.find_one({"_id": ObjectId(user_id)}, {"_id": 0, "name": 1, "email": 1, "is_approved": 1, "is_active": 1, "role": 1})
    return {"ok": True, "user": updated, "matched": result.matched_count, "modified": result.modified_count}

@api_router.post("/admin/force-approve")
async def force_approve_by_email(body: dict, current_user: dict = Depends(get_current_user)):
    """Aprovar usuário por email — útil quando o ID não aparece na lista"""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    email = body.get("email", "").lower().strip()
    if not email:
        raise HTTPException(status_code=400, detail="Email obrigatório")
    result = await db.users.update_one(
        {"email": email},
        {"$set": {"is_approved": True, "is_active": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail=f"Usuário {email} não encontrado")
    user = await db.users.find_one({"email": email}, {"_id": 0, "name": 1, "email": 1, "is_approved": 1, "is_active": 1})
    logger.info(f"Force approved: {email}")
    return {"ok": True, "user": user}

@api_router.post("/admin/reject-user/{user_id}")
async def reject_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    await db.users.delete_one({"_id": ObjectId(user_id)})
    return {"ok": True}

@api_router.get("/admin/users", response_model=List[UserResponse])
async def get_all_users(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    users = await db.users.find({}, {"_id": 1, "name": 1, "email": 1, "role": 1, "created_at": 1, "is_active": 1, "course_ids": 1}).to_list(1000)
    return [UserResponse(id=str(u["_id"]), name=u["name"], email=u["email"], role=u["role"],
            is_active=u.get("is_active", True), course_ids=u.get("course_ids", []),
            created_at=u["created_at"]) for u in users]

@api_router.patch("/admin/users/{user_id}/email")
async def update_user_email(user_id: str, body: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    new_email = body.get("email", "").lower().strip()
    if not new_email or "@" not in new_email:
        raise HTTPException(status_code=400, detail="Email inválido")
    existing = await db.users.find_one({"email": new_email, "_id": {"$ne": ObjectId(user_id)}})
    if existing:
        raise HTTPException(status_code=400, detail="Email já em uso por outro usuário")
    result = await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"email": new_email}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return {"ok": True, "email": new_email}

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
    await create_activity_log(
        user_id=current_user["_id"],
        user_name=current_user.get("name", "?"),
        action="changed_user_role",
        entity_type="user",
        entity_id=user_id,
        detail=f"Novo papel: {new_role}"
    )
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
    update_fields = {"is_active": new_status}
    # Se reativando, garantir que is_approved também está True
    if new_status:
        update_fields["is_approved"] = True
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update_fields})
    return {"is_active": new_status}

@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Deletar usuário permanentemente (admin only)."""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    if user_id == current_user["_id"]:
        raise HTTPException(status_code=400, detail="Não é possível deletar sua própria conta")
    result = await db.users.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    # Deletar redações do usuário também
    await db.essays.delete_many({"student_id": user_id})
    return {"ok": True}

@api_router.delete("/admin/essays/{essay_id}")
async def admin_delete_essay(essay_id: str, current_user: dict = Depends(get_current_user)):
    """Deletar redação permanentemente (admin only)."""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    result = await db.essays.delete_one({"id": essay_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Redação não encontrada")
    # Deletar correção vinculada
    await db.corrections.delete_one({"essay_id": essay_id})
    return {"ok": True}

@api_router.delete("/admin/prompts/{prompt_id}")
async def admin_delete_prompt(prompt_id: str, current_user: dict = Depends(get_current_user)):
    """Deletar proposta permanentemente (admin only) — ignora redações vinculadas."""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    result = await db.prompts.delete_one({"id": prompt_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    return {"ok": True}

# ============================================================
# SISTEMA DE NOTIFICAÇÕES
# ============================================================

async def create_notification(user_id: str, title: str, message: str, type: str = "info", link: str = None):
    """Cria uma notificação para um usuário. Tipos: info, success, warning, essay"""
    notif = {
        "id": str(ObjectId()),
        "user_id": user_id,
        "title": title,
        "message": message,
        "type": type,
        "link": link,
        "read": False,
        "created_at": datetime.now(timezone.utc)
    }
    await db.notifications.insert_one(notif)
    return notif

@api_router.get("/notifications")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    notifs = await db.notifications.find(
        {"user_id": current_user["_id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(30).to_list(30)
    unread = sum(1 for n in notifs if not n.get("read"))
    return {"notifications": notifs, "unread": unread}

@api_router.patch("/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: str, current_user: dict = Depends(get_current_user)):
    await db.notifications.update_one(
        {"id": notif_id, "user_id": current_user["_id"]},
        {"$set": {"read": True}}
    )
    return {"ok": True}

@api_router.patch("/notifications/read-all")
async def mark_all_read(current_user: dict = Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": current_user["_id"], "read": False},
        {"$set": {"read": True}}
    )
    return {"ok": True}

# ============================================================
# RELATÓRIO PESSOAL DO CORRETOR
# ============================================================

@api_router.get("/teacher/my-stats")
async def get_teacher_stats(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")

    tid = current_user["_id"]
    # Busca tanto string quanto ObjectId (compatibilidade com correções antigas)
    try:
        corrections = await db.corrections.find(
            {"$or": [{"teacher_id": tid}, {"teacher_id": ObjectId(tid)}]},
            {"_id": 0}
        ).to_list(10000)
    except Exception:
        corrections = await db.corrections.find({"teacher_id": tid}, {"_id": 0}).to_list(10000)
    total = len(corrections)

    # Helper: converter qualquer formato de data para datetime aware
    def parse_dt(val):
        if val is None:
            return None
        if isinstance(val, datetime):
            return val.replace(tzinfo=timezone.utc) if val.tzinfo is None else val
        try:
            from dateutil import parser as dtparser
            return dtparser.parse(str(val)).replace(tzinfo=timezone.utc)
        except Exception:
            return None

    # Normalizar corrected_at em todas as correções
    for c in corrections:
        c["_corrected_dt"] = parse_dt(c.get("corrected_at"))

    # Tempo médio — batch load essays
    durations = []
    if corrections:
        essay_ids = list({c["essay_id"] for c in corrections if c.get("essay_id")})
        if essay_ids:
            essays_batch = await db.essays.find(
                {"id": {"$in": essay_ids}}, {"_id": 0, "id": 1, "submitted_at": 1}
            ).to_list(len(essay_ids))
            essays_map = {e["id"]: e for e in essays_batch}
            for c in corrections:
                essay = essays_map.get(c.get("essay_id", ""))
                cdt = c["_corrected_dt"]
                sdt = parse_dt(essay.get("submitted_at")) if essay else None
                if cdt and sdt:
                    try:
                        diff = (cdt - sdt).total_seconds() / 3600
                        if 0 < diff < 720:
                            durations.append(diff)
                    except Exception:
                        pass

    avg_hours = round(sum(durations) / len(durations), 1) if durations else 0

    # Por mês — últimos 6 meses
    from collections import defaultdict
    monthly = defaultdict(int)
    for c in corrections:
        cdt = c["_corrected_dt"]
        if cdt:
            try:
                key = cdt.strftime("%Y-%m")
                monthly[key] += 1
            except Exception:
                pass

    sorted_months = sorted(monthly.keys())[-6:]
    monthly_data = [{"month": m, "count": monthly[m]} for m in sorted_months]

    # Por semana — últimas 4 semanas
    now = datetime.now(timezone.utc)
    weekly = []
    for i in range(3, -1, -1):
        week_start = (now - timedelta(days=now.weekday() + 7 * i)).replace(hour=0, minute=0, second=0, microsecond=0)
        week_end = week_start + timedelta(days=7)
        count = 0
        for c in corrections:
            cdt = c["_corrected_dt"]
            if cdt:
                try:
                    if week_start <= cdt <= week_end:
                        count += 1
                except Exception:
                    pass
        weekly.append({"week": week_start.strftime("%d/%m"), "count": count})

    # Hoje e esta semana
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start_curr = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    def safe_count(dt_field, since):
        count = 0
        for c in corrections:
            cdt = c.get("_corrected_dt")
            if cdt:
                try:
                    if cdt >= since:
                        count += 1
                except Exception:
                    pass
        return count

    today_count = safe_count("_corrected_dt", today_start)
    week_count = safe_count("_corrected_dt", week_start_curr)
    month_count = safe_count("_corrected_dt", month_start)

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
    # Salvar todos os campos incluindo canvasDataUrl e textAnnotations
    allowed = {"scores", "feedback", "inlineComments", "canvasDataUrl", "textAnnotations"}
    draft_data = {k: v for k, v in body.items() if k in allowed}
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

    # Filtrar alunos pelas turmas do professor
    teacher_course_ids = current_user.get("course_ids", [])
    if current_user["role"] == "teacher" and teacher_course_ids:
        student_query = {"role": "student", "course_ids": {"$in": teacher_course_ids}}
    else:
        student_query = {"role": "student"}
    students = await db.users.find(student_query, {"_id": 1, "name": 1, "email": 1, "created_at": 1}).to_list(1000)
    result = []

    # Batch load ALL essays for all students at once
    all_student_ids = [str(s["_id"]) for s in students]
    all_essays = await db.essays.find(
        {"student_id": {"$in": all_student_ids}}, {"_id": 0}
    ).to_list(50000)

    # Group essays by student
    essays_by_student = {}
    for e in all_essays:
        sid = e.get("student_id", "")
        if sid not in essays_by_student:
            essays_by_student[sid] = []
        essays_by_student[sid].append(e)

    # Batch load all corrections for corrected essays
    corrected_essay_ids = [e["id"] for e in all_essays if e.get("status") == "corrected" and e.get("id")]
    corrections_map = {}
    if corrected_essay_ids:
        corrections = await db.corrections.find(
            {"essay_id": {"$in": corrected_essay_ids}},
            {"_id": 0, "essay_id": 1, "total_score": 1, "corrected_at": 1}
        ).to_list(len(corrected_essay_ids))
        corrections_map = {c["essay_id"]: c for c in corrections}

    for student in students:
        sid = str(student["_id"])
        essays = essays_by_student.get(sid, [])

        scores = []
        rewrite_count = sum(1 for e in essays if e.get("is_rewrite"))
        pending_count = sum(1 for e in essays if e.get("status") == "pending")
        corrected_count = sum(1 for e in essays if e.get("status") == "corrected")

        for essay in essays:
            if essay.get("status") == "corrected" and essay.get("id"):
                correction = corrections_map.get(essay["id"])
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
    total_pending = await db.essays.count_documents({"status": {"$in": ["pending", "in_progress"]}})
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

    # Frequência de envio — essays nos últimos 7 e 30 dias
    from datetime import timedelta
    now_dt = datetime.now(timezone.utc)
    week_ago = now_dt - timedelta(days=7)
    month_ago = now_dt - timedelta(days=30)
    essays_last_7  = await db.essays.count_documents({"submitted_at": {"$gte": week_ago}})
    essays_last_30 = await db.essays.count_documents({"submitted_at": {"$gte": month_ago}})

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
        "essays_last_7_days": essays_last_7,
        "essays_last_30_days": essays_last_30,
    }


@api_router.post("/upload")
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload de arquivo — armazena no MongoDB."""
    MAX_SIZE = 15 * 1024 * 1024  # 15MB
    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="Arquivo muito grande. Máximo: 15MB")

    import uuid
    file_id = str(uuid.uuid4())
    # Deduzir mime type pelo nome do arquivo (content_type pode vir None ou errado)
    ext = (file.filename or '').lower().rsplit('.', 1)[-1] if '.' in (file.filename or '') else ''
    ext_to_mime = {
        'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
        'gif': 'image/gif', 'webp': 'image/webp', 'bmp': 'image/bmp',
        'pdf': 'application/pdf',
    }
    mime = ext_to_mime.get(ext) or file.content_type or 'application/octet-stream'

    import base64
    data_b64 = base64.b64encode(data).decode('utf-8')
    data_url = f"data:{mime};base64,{data_b64}"
    
    # Salvar no MongoDB como backup
    await db.uploaded_files.insert_one({
        "file_id": file_id,
        "filename": file.filename,
        "mime_type": mime,
        "data_b64": data_b64,
        "size": len(data),
        "uploaded_by": current_user["_id"],
        "created_at": datetime.now(timezone.utc),
    })

    return {
        "file_id": file_id,
        "filename": file.filename,
        "url": data_url,  # data URL — funciona direto no <img src> sem HTTP request
        "size": len(data),
    }

@api_router.get("/files/{file_id}")
async def serve_file(file_id: str, request: Request):
    """Serve o arquivo pelo ID — sem autenticação."""
    from fastapi.responses import Response
    try:
        doc = await db.uploaded_files.find_one({"file_id": file_id})
        if not doc:
            logger.warning(f"File not found: {file_id}")
            raise HTTPException(status_code=404, detail="Arquivo não encontrado")

        import base64
        
        # Tentar data_b64 primeiro (novo formato), depois data (legado)
        data_b64 = doc.get("data_b64")
        if data_b64:
            file_bytes = base64.b64decode(data_b64)
        else:
            raw = doc.get("data")
            if raw is None:
                logger.error(f"File {file_id} has no data")
                raise HTTPException(status_code=404, detail="Dados ausentes")
            try:
                file_bytes = bytes(raw)
            except Exception as e:
                logger.error(f"Cannot read file {file_id}: {e}")
                raise HTTPException(status_code=500, detail="Erro ao ler arquivo")
        
        filename = doc.get("filename") or f"{file_id}.jpg"
        mime = doc.get("mime_type") or "application/octet-stream"
        # Se mime está errado, tentar deduzir pelo filename
        if mime in ('application/octet-stream', None, ''):
            ext = filename.lower().rsplit('.', 1)[-1] if '.' in filename else ''
            mime = {
                'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
                'gif': 'image/gif', 'webp': 'image/webp', 'pdf': 'application/pdf',
            }.get(ext, 'image/jpeg')

        # CORS explícito — necessário para <img> cross-origin
        origin = request.headers.get("origin", "*")
        return Response(
            content=file_bytes,
            media_type=mime,
            headers={
                "Content-Disposition": f'inline; filename="{filename}"',
                "Cache-Control": "public, max-age=3600",
                "Content-Length": str(len(file_bytes)),
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Credentials": "true",
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"serve_file {file_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/files-debug/{file_id}")
async def debug_file(file_id: str):
    """Debug — verifica se arquivo existe e seu tamanho."""
    doc = await db.uploaded_files.find_one({"file_id": file_id}, {"_id": 0, "file_id": 1, "filename": 1, "mime_type": 1, "size": 1})
    if not doc:
        # Listar alguns arquivos para diagnóstico
        recent = await db.uploaded_files.find({}, {"_id": 0, "file_id": 1, "filename": 1, "size": 1}).sort("created_at", -1).to_list(5)
        return {"found": False, "file_id": file_id, "recent_files": recent}
    return {"found": True, **doc}

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
async def update_quick_comments(request: Request, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Only teachers can update quick comments")
    
    body = await request.json()
    # Aceita tanto array direto quanto objeto com chave quick_comments
    if isinstance(body, list):
        quick_comments = body
    elif isinstance(body, dict):
        quick_comments = body.get("quick_comments", [])
    else:
        quick_comments = []

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

    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key:
        raise HTTPException(status_code=503, detail="Chave GEMINI_API_KEY não configurada no servidor.")

    texto = request.content[:4000] if len(request.content) > 4000 else request.content

    prompt = (
        "Voce e um professor de lingua portuguesa especialista em gramatica. "
        "Identifique APENAS os erros gramaticais da redacao abaixo: ortografia, concordancia, regencia, pontuacao, acentuacao e uso inadequado de palavras. "
        "NAO analise argumentacao, coesao, tema ou estrutura — apenas erros gramaticais. "
        "Retorne APENAS JSON valido, sem markdown, sem texto fora do JSON. "
        'Formato: {"erros": [{"id": "1", "trecho": "trecho exato com erro", '
        '"tipo": "gramatical", "descricao": "qual e o erro", "sugestao": "forma correta"}], '
        '"resumo": "resumo dos principais problemas gramaticais em 1-2 frases"} '
        "Retorne entre 0 e 15 erros. Se nao houver erros, retorne lista vazia. Use portugues brasileiro.\n\n"
        f"Redacao:\n\n{texto}"
    )

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.1, "maxOutputTokens": 2048}
    }

    import httpx, asyncio
    response_text = ""
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key={gemini_key}"
        async with httpx.AsyncClient(timeout=60.0) as client:
            for attempt in range(3):
                resp = await client.post(url, json=payload, headers={"Content-Type": "application/json"})
                if resp.status_code == 429:
                    await asyncio.sleep(2 ** attempt)
                    continue
                resp.raise_for_status()
                break
            else:
                raise HTTPException(status_code=429, detail="Limite da IA atingido. Aguarde alguns segundos e tente novamente.")

        response_text = resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()

        if "```" in response_text:
            for part in response_text.split("```"):
                part = part.strip().lstrip("json").strip()
                if part.startswith("{"):
                    response_text = part
                    break

        analysis = json_module.loads(response_text)
        for erro in analysis.get("erros", []):
            if not erro.get("id"):
                erro["id"] = str(uuid.uuid4())
            erro["tipo"] = "gramatical"  # forçar tipo gramatical
        return analysis

    except json_module.JSONDecodeError:
        logger.error(f"Failed to parse Gemini response: {response_text}")
        raise HTTPException(status_code=500, detail="A IA retornou um formato inesperado. Tente novamente.")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Gemini error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro na analise: {str(e)}")

# ============================================================
# CONFIGURAÇÕES PEDAGÓGICAS
# ============================================================

DEFAULT_COURSE_SETTINGS = {
    "show_teacher_name": True,
    "allow_post_correction_doubt": True,
    "allow_download": True,
    "allow_rewrite": True,
    "require_rewrite": False,
    "allow_ai_analysis": True,
    "correction_deadline_days": 0,   # 0 = sem prazo
    "confirm_before_publish": True,
    "confirm_before_delete": True,
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
    int_fields = {"correction_deadline_days"}
    clean = {}
    for k, v in body.items():
        if k not in allowed_keys:
            continue
        if k in int_fields:
            clean[k] = int(v) if v is not None else 0
        else:
            clean[k] = bool(v)
    await db.settings.update_one(
        {"key": "course_settings"},
        {"$set": {"key": "course_settings", **clean}},
        upsert=True
    )
    invalidate_cache("course_settings")
    return {"message": "Configurações salvas", **clean}

# ============================================================
# RESET DE SENHA VIA EMAIL (Resend)
# ============================================================

import secrets
from functools import lru_cache
import time

# Simple in-memory cache for frequently read, rarely changed settings
_settings_cache = {}
_cache_ttl = 300  # 5 minutes

async def get_cached_setting(key: str, default: dict):
    """Cache settings to avoid repeated DB reads for every request"""
    now = time.time()
    if key in _settings_cache:
        value, expires = _settings_cache[key]
        if now < expires:
            return value
    config = await db.settings.find_one({"key": key}, {"_id": 0})
    result = {**default, **(config or {})}
    _settings_cache[key] = (result, now + _cache_ttl)
    return result

def invalidate_cache(key: str = None):
    """Call after any settings update"""
    if key:
        _settings_cache.pop(key, None)
    else:
        _settings_cache.clear()

async def send_reset_email(to_email: str, to_name: str, reset_token: str):
    resend_key = os.getenv("RESEND_API_KEY")
    if not resend_key:
        raise Exception("RESEND_API_KEY não configurada")

    frontend_url = os.getenv("FRONTEND_URL", "https://essaypro-frontend.onrender.com")
    reset_link = f"{frontend_url}/reset-password?token={reset_token}"

    payload = {
        "from": os.getenv("RESEND_FROM_EMAIL", "RcN <onboarding@resend.dev>"),
        "to": [to_email],
        "subject": "Redefinição de senha — RcN",
        "html": f"""
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #FDF3E8;">
          <h2 style="color: #7C1805; font-size: 22px; margin-bottom: 8px;">Redefinir sua senha</h2>
          <p style="color: #6B5B4E; font-size: 15px;">Olá, <strong>{to_name}</strong>!</p>
          <p style="color: #6B5B4E; font-size: 14px;">
            Recebemos uma solicitação para redefinir a senha da sua conta no <strong>RcN</strong>.
            Clique no botão abaixo para criar uma nova senha:
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="{reset_link}"
              style="background-color: #7C1805; color: white; padding: 12px 28px; border-radius: 8px;
                     text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block;">
              Redefinir senha
            </a>
          </div>
          <p style="color: #6B5B4E; font-size: 12px;">
            Este link expira em <strong>1 hora</strong>. Se você não solicitou a redefinição, ignore este email.
          </p>
          <hr style="border: none; border-top: 1px solid #E8DDD0; margin: 24px 0;">
          <p style="color: #A89080; font-size: 11px; text-align: center;">redação com nicolle</p>
        </div>
        """
    }

    import httpx
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.resend.com/emails",
            json=payload,
            headers={"Authorization": f"Bearer {resend_key}", "Content-Type": "application/json"}
        )
        if resp.status_code not in (200, 201):
            raise Exception(f"Resend error: {resp.text}")

@api_router.post("/auth/forgot-password")
async def forgot_password(body: dict):
    email = body.get("email", "").lower().strip()
    if not email:
        raise HTTPException(status_code=400, detail="Email obrigatório")

    user = await db.users.find_one({"email": email})
    # Sempre retorna sucesso para não revelar se o email existe
    if not user:
        return {"message": "Se este email estiver cadastrado, você receberá as instruções em breve."}

    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(hours=1)

    await db.password_resets.update_one(
        {"email": email},
        {"$set": {"email": email, "token": token, "expires_at": expires, "used": False}},
        upsert=True
    )

    try:
        await send_reset_email(email, user.get("name", ""), token)
    except Exception as e:
        logger.error(f"Email send error: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro ao enviar email. Tente novamente.")

    return {"message": "Se este email estiver cadastrado, você receberá as instruções em breve."}

@api_router.post("/auth/reset-password")
async def reset_password(body: dict):
    token = body.get("token", "").strip()
    new_password = body.get("password", "").strip()

    if not token or not new_password:
        raise HTTPException(status_code=400, detail="Token e senha obrigatórios")
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="A senha deve ter pelo menos 6 caracteres")

    reset = await db.password_resets.find_one({"token": token, "used": False})
    if not reset:
        raise HTTPException(status_code=400, detail="Link inválido ou já utilizado")

    if datetime.now(timezone.utc) > reset["expires_at"]:
        raise HTTPException(status_code=400, detail="Link expirado. Solicite um novo.")

    hashed = hash_password(new_password)
    await db.users.update_one({"email": reset["email"]}, {"$set": {"password_hash": hashed}})
    await db.password_resets.update_one({"token": token}, {"$set": {"used": True}})

    return {"message": "Senha redefinida com sucesso! Faça login com sua nova senha."}

@api_router.get("/auth/validate-reset-token/{token}")
async def validate_reset_token(token: str):
    reset = await db.password_resets.find_one({"token": token, "used": False})
    if not reset:
        raise HTTPException(status_code=400, detail="Link inválido ou já utilizado")
    if datetime.now(timezone.utc) > reset["expires_at"]:
        raise HTTPException(status_code=400, detail="Link expirado")
    return {"valid": True, "email": reset["email"]}

# ============================================================
# LOGS DE ATIVIDADE E HISTÓRICO DE VERSÕES
# ============================================================

async def create_activity_log(
    user_id: str, user_name: str, action: str,
    entity_type: str, entity_id: str = None, detail: str = None
):
    """Registra uma ação no log de atividade"""
    await db.activity_logs.insert_one({
        "id": str(ObjectId()),
        "user_id": user_id,
        "user_name": user_name,
        "action": action,         # ex: published_correction, changed_score, deleted_essay
        "entity_type": entity_type,  # correction, essay, prompt, user
        "entity_id": entity_id,
        "detail": detail,
        "created_at": datetime.now(timezone.utc)
    })

@api_router.get("/admin/activity-logs")
async def get_activity_logs(
    limit: int = 50,
    action: str = None,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    query = {}
    if action:
        query["action"] = action
    logs = await db.activity_logs.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return logs

@api_router.get("/corrections/{essay_id}/history")
async def get_correction_history(essay_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    history = await db.correction_history.find(
        {"essay_id": essay_id}, {"_id": 0}
    ).sort("saved_at", -1).to_list(20)
    return history

# ============================================================
# RELATÓRIOS AVANÇADOS / RANKING
# ============================================================

@api_router.get("/admin/reports/ranking")
async def get_ranking(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    try:
        # Admin vê todos; professor filtra por turma
        teacher_course_ids = current_user.get("course_ids", [])
        if current_user["role"] == "teacher" and teacher_course_ids:
            student_filter = {"role": "student", "course_ids": {"$in": teacher_course_ids}}
        else:
            student_filter = {"role": "student"}
        students = await db.users.find(student_filter, {"_id": 1, "name": 1, "created_at": 1}).to_list(1000)
        result = []

        # Batch load all essays and corrections — evita N+1
        all_student_ids = [str(s["_id"]) for s in students]
        all_essays = await db.essays.find(
            {"student_id": {"$in": all_student_ids}}, {"_id": 0}
        ).to_list(50000)
        essays_by_student = {}
        for e in all_essays:
            essays_by_student.setdefault(e["student_id"], []).append(e)

        corrected_ids = [e["id"] for e in all_essays if e.get("status") == "corrected" and e.get("id")]
        corrections_list = await db.corrections.find(
            {"essay_id": {"$in": corrected_ids}}, {"_id": 0, "essay_id": 1, "total_score": 1, "corrected_at": 1}
        ).to_list(len(corrected_ids)) if corrected_ids else []
        corrections_by_essay = {c["essay_id"]: c for c in corrections_list}

        for student in students:
            sid = str(student["_id"])
            essays = essays_by_student.get(sid, [])
            if not essays:
                continue

            scores = []
            submission_dates = []
            for essay in essays:
                if essay.get("submitted_at"):
                    submission_dates.append(essay["submitted_at"])
                if essay.get("status") == "corrected" and essay.get("id"):
                    corr = corrections_by_essay.get(essay["id"])
                    if corr:
                        scores.append({"score": corr["total_score"], "date": corr.get("corrected_at")})

            scores.sort(key=lambda x: x["date"] if x["date"] else "")
            avg = sum(s["score"] for s in scores) / len(scores) if scores else 0
            best = max((s["score"] for s in scores), default=0)

            # Evolução: diferença entre primeira e última nota
            evolution = 0
            if len(scores) >= 2:
                evolution = scores[-1]["score"] - scores[0]["score"]

            # Frequência: essays por semana desde o cadastro
            try:
                created = student["created_at"]
                if isinstance(created, str):
                    created = datetime.fromisoformat(created.replace('Z', '+00:00'))
                weeks_active = max(1, (datetime.now(timezone.utc) - created).days / 7)
            except Exception:
                weeks_active = 1
            frequency = round(len(essays) / weeks_active, 2)

            result.append({
                "id": sid,
                "name": student["name"],
                "total_essays": len(essays),
                "corrected": len([e for e in essays if e.get("status") == "corrected"]),
                "rewrites": len([e for e in essays if e.get("is_rewrite")]),
                "average_score": round(avg, 1),
                "best_score": best,
                "evolution": evolution,
                "frequency_per_week": frequency,
                "scores_history": [s["score"] for s in scores[-6:]],
                "last_submission": max(submission_dates).isoformat() if submission_dates else None,
            })

        try:
            return sorted(result, key=lambda x: -x["average_score"])
        except Exception as e:
            logger.error(f"Ranking sort error: {e}")
            return result

    except Exception as e:
        logger.error(f"Report error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

@api_router.get("/admin/reports/prompts")
async def get_prompt_stats(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")

    prompts = await db.prompts.find({}, {"_id": 0, "id": 1, "title": 1}).to_list(1000)
    result = []

    for prompt in prompts:
        essays = await db.essays.find({"prompt_id": prompt["id"]}, {"_id": 0}).to_list(1000)
        if not essays:
            continue

        scores = []
        for essay in essays:
            if essay.get("status") == "corrected":
                corr = await db.corrections.find_one({"essay_id": essay["id"]}, {"_id": 0, "total_score": 1})
                if corr:
                    scores.append(corr["total_score"])

        avg = round(sum(scores) / len(scores), 1) if scores else 0
        result.append({
            "id": prompt["id"],
            "title": prompt["title"],
            "total_submissions": len(essays),
            "corrected": len(scores),
            "average_score": avg,
            "difficulty": "Alta" if avg < 400 else "Média" if avg < 700 else "Baixa",
        })

    return sorted(result, key=lambda x: -x["total_submissions"])

# ============================================================
# MULTIUNIDADE / MULTICURSO
# ============================================================

class CourseCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    modality: Optional[str] = "online"
    is_active: bool = True

class CourseResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    description: Optional[str] = ""
    modality: Optional[str] = "online"
    is_active: bool = True
    created_at: datetime
    teacher_count: Optional[int] = 0
    student_count: Optional[int] = 0

@api_router.get("/courses", response_model=List[CourseResponse])
async def list_courses(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    courses = await db.courses.find({}, {"_id": 0}).to_list(1000)
    result = []
    for c in courses:
        c["student_count"] = await db.users.count_documents({"role": "student", "course_ids": c["id"]})
        c["teacher_count"] = await db.users.count_documents({"role": "teacher", "course_ids": c["id"]})
        result.append(CourseResponse(**c))
    return result

@api_router.post("/courses", response_model=CourseResponse)
async def create_course(data: CourseCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    course = {
        "id": str(ObjectId()),
        "name": data.name,
        "description": data.description,
        "modality": data.modality,
        "is_active": data.is_active,
        "created_at": datetime.now(timezone.utc),
    }
    await db.courses.insert_one(course)
    course["student_count"] = 0
    course["teacher_count"] = 0
    return CourseResponse(**course)

@api_router.put("/courses/{course_id}")
async def update_course(course_id: str, data: CourseCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    await db.courses.update_one(
        {"id": course_id},
        {"$set": {"name": data.name, "description": data.description,
                  "modality": data.modality, "is_active": data.is_active}}
    )
    return {"ok": True}

@api_router.patch("/courses/{course_id}/toggle")
async def toggle_course(course_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    course = await db.courses.find_one({"id": course_id})
    if not course:
        raise HTTPException(status_code=404, detail="Not found")
    new_status = not course.get("is_active", True)
    await db.courses.update_one({"id": course_id}, {"$set": {"is_active": new_status}})
    return {"is_active": new_status}

@api_router.delete("/courses/{course_id}")
async def delete_course(course_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    await db.courses.delete_one({"id": course_id})
    # Remove course_id from all users
    await db.users.update_many({}, {"$pull": {"course_ids": course_id}})
    return {"ok": True}

@api_router.get("/courses/{course_id}/members")
async def get_course_members(course_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    members = await db.users.find(
        {"course_ids": course_id},
        {"_id": 1, "name": 1, "email": 1, "role": 1}
    ).to_list(1000)
    return [{"id": str(m["_id"]), "name": m["name"], "email": m["email"], "role": m["role"]} for m in members]

@api_router.post("/courses/{course_id}/add-member")
async def add_course_member(course_id: str, body: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    user_id = body.get("user_id")
    course = await db.courses.find_one({"id": course_id})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$addToSet": {"course_ids": course_id}}
    )
    return {"ok": True}

@api_router.post("/courses/{course_id}/remove-member")
async def remove_course_member(course_id: str, body: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    user_id = body.get("user_id")
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$pull": {"course_ids": course_id}}
    )
    return {"ok": True}

@api_router.get("/my/courses")
async def get_my_courses(current_user: dict = Depends(get_current_user)):
    """Retorna os cursos do usuário atual"""
    course_ids = current_user.get("course_ids", [])
    if not course_ids:
        return []
    courses = await db.courses.find({"id": {"$in": course_ids}, "is_active": True}, {"_id": 0}).to_list(100)
    return courses

# ============================================================
# BACKUP AUTOMÁTICO
# ============================================================

import asyncio
import json as json_module2

async def run_backup():
    """Exporta todas as coleções para um documento de backup no MongoDB"""
    try:
        collections = ["users", "essays", "corrections", "prompts", "courses", "drafts"]
        backup_data = {"created_at": datetime.now(timezone.utc).isoformat(), "collections": {}}
        for col in collections:
            docs = await db[col].find({}, {"_id": 0}).to_list(10000)
            backup_data["collections"][col] = docs
        await db.backups.insert_one({
            "created_at": datetime.now(timezone.utc),
            "data": backup_data,
            "size": len(str(backup_data))
        })
        # Manter apenas os últimos 7 backups
        all_backups = await db.backups.find({}, {"_id": 1}).sort("created_at", -1).to_list(100)
        if len(all_backups) > 7:
            old_ids = [b["_id"] for b in all_backups[7:]]
            await db.backups.delete_many({"_id": {"$in": old_ids}})
        logger.info("Backup automático concluído")
    except Exception as e:
        logger.error(f"Backup error: {str(e)}")

async def backup_scheduler():
    """Roda backup diário"""
    while True:
        await asyncio.sleep(24 * 60 * 60)  # 24 horas
        await run_backup()

async def keep_alive_scheduler():
    """Pinga o próprio servidor a cada 10min para evitar hibernação no Render Free"""
    import httpx
    await asyncio.sleep(60)  # aguarda o servidor iniciar
    backend_url = os.getenv("BACKEND_URL", "")
    if not backend_url:
        return  # Sem URL configurada, não faz nada
    while True:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                await client.get(f"{backend_url}/api/health")
        except Exception:
            pass
        await asyncio.sleep(600)  # 10 minutos

@api_router.get("/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}

@api_router.post("/admin/backup/run")
async def manual_backup(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    await run_backup()
    return {"message": "Backup realizado com sucesso!"}

@api_router.get("/admin/backup/list")
async def list_backups(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    backups = await db.backups.find({}, {"_id": 0, "data": 0}).sort("created_at", -1).to_list(10)
    return backups

@api_router.get("/admin/backup/download/{backup_id}")
async def download_backup(backup_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    from fastapi.responses import JSONResponse
    backup = await db.backups.find_one({"created_at": {"$exists": True}}, sort=[("created_at", -1)])
    if not backup:
        raise HTTPException(status_code=404, detail="Backup não encontrado")
    return JSONResponse(content=backup["data"])

# ============================================================
# EVOLUÇÃO DO ALUNO POR COMPETÊNCIA
# ============================================================

@api_router.get("/student/evolution")
async def get_student_evolution(current_user: dict = Depends(get_current_user)):
    student_id = current_user["_id"]
    essays = await db.essays.find(
        {"student_id": student_id, "status": "corrected"},
        {"_id": 0, "id": 1, "submitted_at": 1, "prompt_title": 1}
    ).sort("submitted_at", 1).to_list(20)

    result = []
    for essay in essays:
        corr = await db.corrections.find_one(
            {"essay_id": essay["id"]},
            {"_id": 0, "total_score": 1, "criteria_scores": 1, "corrected_at": 1}
        )
        if corr:
            result.append({
                "essay_id": essay["id"],
                "prompt_title": essay.get("prompt_title", ""),
                "submitted_at": essay.get("submitted_at"),
                "total_score": corr.get("total_score", 0),
                "criteria_scores": corr.get("criteria_scores", []),
            })
    return result

# ============================================================
# RELATÓRIO DE ENGAJAMENTO POR TURMA
# ============================================================

@api_router.get("/admin/reports/course-engagement")
async def get_course_engagement(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    try:
        courses = await db.courses.find({"is_active": True}, {"_id": 0}).to_list(100)
        result = []

        for course in courses:
            cid = course["id"]
            students = await db.users.find(
                {"role": "student", "course_ids": cid},
                {"_id": 1}
            ).to_list(1000)
            student_ids = [str(s["_id"]) for s in students]

            if not student_ids:
                result.append({
                    "course_id": cid,
                    "course_name": course["name"],
                    "total_students": 0,
                    "active_students": 0,
                    "total_essays": 0,
                    "total_corrected": 0,
                    "avg_score": 0,
                    "engagement_rate": 0,
                })
                continue

            # Essays nas últimas 4 semanas
            four_weeks_ago = datetime.now(timezone.utc) - timedelta(weeks=4)
            essays = await db.essays.find(
                {"student_id": {"$in": student_ids}},
                {"_id": 0, "student_id": 1, "status": 1, "submitted_at": 1}
            ).to_list(10000)

            def parse_dt_safe(v):
                if not v: return None
                if isinstance(v, str):
                    try: return datetime.fromisoformat(v.replace('Z','+00:00'))
                    except: return None
                return v
            recent = [e for e in essays if parse_dt_safe(e.get("submitted_at")) and parse_dt_safe(e.get("submitted_at")) >= four_weeks_ago]
            active_students = len(set(e["student_id"] for e in recent))
            corrected = [e for e in essays if e.get("status") == "corrected"]

            scores = []
            for essay in corrected[:50]:  # limitar para performance
                corr = await db.corrections.find_one(
                    {"essay_id": essay.get("id", "")}, {"_id": 0, "total_score": 1}
                )
                if corr:
                    scores.append(corr["total_score"])

            result.append({
                "course_id": cid,
                "course_name": course["name"],
                "modality": course.get("modality", ""),
                "total_students": len(student_ids),
                "active_students": active_students,
                "total_essays": len(essays),
                "total_corrected": len(corrected),
                "avg_score": round(sum(scores) / len(scores), 1) if scores else 0,
                "engagement_rate": round(active_students / len(student_ids) * 100, 1) if student_ids else 0,
            })

        try:
            return sorted(result, key=lambda x: -x["engagement_rate"])
        except Exception as e:
            logger.error(f"Engagement sort error: {e}")
            return result

    # ============================================================
    # CORREÇÃO EM LOTE (Batch Comments)
    # ============================================================

    except Exception as e:
        logger.error(f"Report error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

@api_router.post("/corrections/batch-comment")
async def batch_comment(body: dict, current_user: dict = Depends(get_current_user)):
    """Adiciona um comentário a múltiplas redações de uma vez"""
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    essay_ids = body.get("essay_ids", [])
    comment = body.get("comment", "").strip()
    if not comment or not essay_ids:
        raise HTTPException(status_code=400, detail="essay_ids e comment obrigatórios")
    count = 0
    for essay_id in essay_ids:
        draft = await db.drafts.find_one({"essay_id": essay_id, "teacher_id": current_user["_id"]})
        existing_comments = draft.get("inlineComments", []) if draft else []
        new_comment = {
            "id": len(existing_comments) + 1,
            "comment": comment,
            "type": "batch",
            "color": "#E53935",
        }
        await db.drafts.update_one(
            {"essay_id": essay_id, "teacher_id": current_user["_id"]},
            {"$push": {"inlineComments": new_comment}, "$set": {"essay_id": essay_id, "teacher_id": current_user["_id"]}},
            upsert=True
        )
        count += 1
    return {"message": f"Comentário adicionado a {count} redações", "count": count}

# ============================================================
# WHITE LABEL / PERSONALIZAÇÃO
# ============================================================

DEFAULT_BRANDING = {
    "platform_name": "redação com nicolle",
    "logo_url": "",
    "favicon_url": "",
    "primary_color": "#7C1805",
    "secondary_color": "#D66B27",
    "accent_color": "#36555A",
    "role_student": "Aluno",
    "role_teacher": "Professor",
    "role_admin": "Admin",
    "welcome_message": "",
    "footer_text": "",
}

@api_router.get("/settings/branding")
async def get_branding(current_user: dict = Depends(get_current_user)):
    config = await db.settings.find_one({"key": "branding"}, {"_id": 0})
    if not config:
        return DEFAULT_BRANDING
    result = {**DEFAULT_BRANDING}
    result.update({k: v for k, v in config.items() if k in DEFAULT_BRANDING})
    return result

@api_router.get("/settings/branding/public")
async def get_branding_public():
    """Endpoint público para carregar branding antes do login"""
    return await get_cached_setting("branding", DEFAULT_BRANDING)

@api_router.put("/settings/branding")
async def update_branding(body: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    allowed = set(DEFAULT_BRANDING.keys())
    clean = {k: str(v) for k, v in body.items() if k in allowed}
    await db.settings.update_one(
        {"key": "branding"},
        {"$set": {"key": "branding", **clean}},
        upsert=True
    )
    invalidate_cache("branding")
    return {"message": "Personalização salva", **clean}

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

@api_router.get("/credits/course/{course_id}")
async def get_course_credit_config(course_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    config = await db.settings.find_one({"key": f"credit_config_{course_id}"})
    if not config:
        return {"course_id": course_id, "mode": "default", "limit": 0}
    return {"course_id": course_id, "mode": config.get("mode", "default"), "limit": config.get("limit", 0)}

@api_router.put("/credits/course/{course_id}")
async def set_course_credit_config(course_id: str, body: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    mode = body.get("mode", "default")
    limit = int(body.get("limit", 0))
    await db.settings.update_one(
        {"key": f"credit_config_{course_id}"},
        {"$set": {"key": f"credit_config_{course_id}", "mode": mode, "limit": limit, "course_id": course_id}},
        upsert=True
    )
    return {"message": "Configuração de créditos da turma salva!"}

@api_router.get("/credits/me")
async def get_my_credits(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Students only")

    # Verificar config específica da turma do aluno primeiro
    student_course_ids = current_user.get("course_ids", [])
    course_config = None
    for cid in student_course_ids:
        cfg = await db.settings.find_one({"key": f"credit_config_{cid}"})
        if cfg and cfg.get("mode") != "default":
            course_config = cfg
            break

    config = course_config or await db.settings.find_one({"key": "credit_config"})
    mode = config.get("mode", "unlimited") if config else "unlimited"
    limit = config.get("limit", 4) if config else 4
    if mode == "default":  # fallback para global
        global_cfg = await db.settings.find_one({"key": "credit_config"})
        mode = global_cfg.get("mode", "unlimited") if global_cfg else "unlimited"
        limit = global_cfg.get("limit", 4) if global_cfg else 4

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

ALLOWED_ORIGINS = [
    os.environ.get("FRONTEND_URL", "http://localhost:3000"),
    "https://essaypro-frontend.onrender.com",
    "http://localhost:3000",
    "http://localhost:3001",
]

# Middleware CORS manual — cobre TODAS as respostas inclusive erros de dependências (401, 403)
@app.middleware("http")
async def cors_middleware(request: Request, call_next):
    origin = request.headers.get("origin", "")
    is_allowed = origin in ALLOWED_ORIGINS

    # Responder preflight OPTIONS imediatamente
    if request.method == "OPTIONS":
        headers = {
            "Access-Control-Allow-Origin": origin if is_allowed else "",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, Origin, X-Requested-With",
            "Access-Control-Max-Age": "3600",
        }
        return Response(status_code=200, headers=headers)

    # Processar request — capturar qualquer exceção não tratada
    try:
        response = await call_next(request)
    except Exception as exc:
        logger.error(f"Unhandled: {request.url} — {exc}")
        response = JSONResponse(status_code=500, content={"detail": "Erro interno"})

    # Adicionar CORS em TODA resposta (200, 401, 403, 500...)
    if is_allowed:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Expose-Headers"] = "*"

    return response

app.include_router(api_router)

@app.on_event("startup")
async def startup_event():
    # ── Índices de performance ──────────────────────────────────
    await db.users.create_index("email", unique=True)
    await db.users.create_index("role")
    await db.users.create_index("course_ids")
    await db.users.create_index("is_active")
    await db.users.create_index("is_approved")

    await db.essays.create_index("student_id")
    await db.essays.create_index("status")
    await db.essays.create_index("prompt_id")
    await db.essays.create_index("submitted_at")
    await db.essays.create_index([("student_id", 1), ("status", 1)])
    await db.essays.create_index([("status", 1), ("submitted_at", 1)])

    await db.corrections.create_index("essay_id", unique=True)
    await db.corrections.create_index("teacher_id")
    await db.corrections.create_index("corrected_at")

    await db.drafts.create_index([("essay_id", 1), ("teacher_id", 1)])
    await db.notifications.create_index([("user_id", 1), ("read", 1)])
    await db.notifications.create_index("created_at")
    await db.activity_logs.create_index("created_at")
    await db.activity_logs.create_index("user_id")
    await db.password_resets.create_index("token")
    await db.password_resets.create_index("expires_at")
    await db.prompts.create_index("is_active")
    await db.prompts.create_index("course_ids")

    logger.info("Índices MongoDB criados/verificados")
    
    # Migração: usuários com is_active=True mas is_approved=False → aprovar automaticamente
    # Esses usuários foram "ativados" pelo toggle mas não aprovados pelo fluxo correto
    fixed = await db.users.update_many(
        {"is_active": True, "is_approved": False},
        {"$set": {"is_approved": True}}
    )
    if fixed.modified_count > 0:
        logger.info(f"Migração: {fixed.modified_count} usuário(s) aprovado(s) automaticamente (is_active=True, is_approved=False)")

    # Corrigir URLs de arquivos que foram salvas sem domínio
    backend_url = os.getenv("BACKEND_URL", "").rstrip("/")
    if backend_url:
        # uploaded_files: corrigir url field
        broken_files = await db.uploaded_files.find(
            {"url": {"$regex": "^/api/files/"}}, {"_id": 1, "file_id": 1}
        ).to_list(10000)
        for f in broken_files:
            new_url = f"{backend_url}/api/files/{f['file_id']}"
            await db.uploaded_files.update_one({"_id": f["_id"]}, {"$set": {"url": new_url}})

        # essays: corrigir file_url field
        broken_essays = await db.essays.find(
            {"file_url": {"$regex": "^/api/files/"}}, {"_id": 1, "file_url": 1}
        ).to_list(10000)
        for e in broken_essays:
            new_url = f"{backend_url}{e['file_url']}"
            await db.essays.update_one({"_id": e["_id"]}, {"$set": {"file_url": new_url}})

        # prompts: corrigir supporting_files urls
        broken_prompts = await db.prompts.find(
            {"supporting_files.url": {"$regex": "^/api/files/"}}, {"_id": 1, "supporting_files": 1}
        ).to_list(1000)
        for p in broken_prompts:
            fixed = [
                {**sf, "url": f"{backend_url}{sf['url']}"} if sf.get("url", "").startswith("/api/files/") else sf
                for sf in p.get("supporting_files", [])
            ]
            await db.prompts.update_one({"_id": p["_id"]}, {"$set": {"supporting_files": fixed}})

        if broken_files or broken_essays or broken_prompts:
            logger.info(f"URLs corrigidas: {len(broken_files)} arquivos, {len(broken_essays)} redações, {len(broken_prompts)} propostas")

    # Iniciar schedulers em background
    asyncio.create_task(backup_scheduler())
    asyncio.create_task(keep_alive_scheduler())
    
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
