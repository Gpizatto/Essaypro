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
        # Fallback: token enviado via header customizado (guia anônima / sem cookie)
        token = request.headers.get("X-Access-Token", "")
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
    name: str = Field(..., max_length=120, min_length=2)
    email: EmailStr
    password: str = Field(..., max_length=128, min_length=6)
    role: str = Field("student", max_length=20)

class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., max_length=128)

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
    title: Optional[str] = Field("", max_length=300)
    theme: Optional[str] = Field("", max_length=300)
    supporting_texts: Optional[str] = Field("", max_length=50000)
    instructions: Optional[str] = Field("", max_length=10000)
    criteria: Optional[List[Criterion]] = None
    course_ids: Optional[List[str]] = []
    start_date: Optional[str] = Field(None, max_length=30)
    end_date: Optional[str] = Field(None, max_length=30)
    supporting_files: Optional[List[dict]] = []

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
    prompt_id: str = Field(..., max_length=100)
    content: Optional[str] = Field("", max_length=500000)  # PDF multi-página pode gerar JSON grande
    submission_method: str = Field(..., max_length=20)
    file_url: Optional[str] = Field(None, max_length=5000)
    student_note: Optional[str] = Field(None, max_length=1000)
    parent_essay_id: Optional[str] = Field(None, max_length=100)
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
    selected_text: str = Field(..., max_length=1000)
    comment: str = Field(..., max_length=2000)
    color: str = Field(..., max_length=20)

class CorrectionSubmit(BaseModel):
    essay_id: str = Field(..., max_length=100)
    criteria_scores: List[CriteriaScore]
    total_score: float = Field(..., ge=0)
    general_feedback: str = Field(..., max_length=10000)
    strengths: Optional[str] = Field("", max_length=5000)
    improvements: Optional[str] = Field("", max_length=5000)
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

# ── RATE LIMITING (S-01 / S-02) ─────────────────────────────────────────────
from collections import defaultdict

_rate_store: dict = defaultdict(list)

def _get_ip(request: Request) -> str:
    """Pega o IP real considerando proxies (Render.com usa X-Forwarded-For)."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

def check_rate_limit(request: Request, max_calls: int, window_seconds: int) -> None:
    """Levanta HTTP 429 se o IP ultrapassar max_calls na janela window_seconds."""
    ip = _get_ip(request)
    now = time.time()
    window_start = now - window_seconds
    _rate_store[ip] = [t for t in _rate_store[ip] if t > window_start]
    if len(_rate_store[ip]) >= max_calls:
        retry_after = int(window_seconds - (now - _rate_store[ip][0]))
        raise HTTPException(
            status_code=429,
            detail=f"Muitas tentativas. Tente novamente em {retry_after} segundos.",
            headers={"Retry-After": str(retry_after)},
        )
    _rate_store[ip].append(now)

# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI()
api_router = APIRouter(prefix="/api")

@api_router.post("/auth/register")
async def register(user_data: UserRegister, request: Request):
    # S-01: max 5 cadastros por hora por IP
    check_rate_limit(request, max_calls=5, window_seconds=3600)
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
    # Enviar email de boas-vindas (não bloqueia o cadastro se falhar)
    try:
        await send_welcome_email(email, user_data.name)
    except (Exception,) as e:  # httpx.RequestError, ValueError
        logger.warning(f"Welcome email failed: {str(e)}")
    return {"message": "Cadastro realizado! Aguarde a aprovação do administrador para acessar a plataforma."}

@api_router.post("/auth/login", response_model=UserResponse)
async def login(login_data: UserLogin, response: Response, request: Request):
    # S-01: max 20 tentativas de login por minuto por IP
    check_rate_limit(request, max_calls=20, window_seconds=60)
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
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=True, samesite="none", max_age=28800, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=True, samesite="none", max_age=604800, path="/")
    # Expor token no header para fallback em ambientes que bloqueiam cookies (guia anônima)
    response.headers["X-Access-Token"] = access_token
    response.headers["X-Refresh-Token"] = refresh_token
    
    return UserResponse(id=user_id, name=user["name"], email=user["email"], role=user["role"], created_at=user["created_at"])

@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    """Renova o access_token usando o refresh_token (cookie ou header)"""
    # Tentar pegar refresh_token do cookie primeiro, depois do header
    token = request.cookies.get("refresh_token")
    if not token:
        token = request.headers.get("X-Refresh-Token", "")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user_id = str(user["_id"])
        new_access = create_access_token(user_id, user["email"])
        response.set_cookie(key="access_token", value=new_access, httponly=True, secure=True, samesite="none", max_age=28800, path="/")
        response.headers["X-Access-Token"] = new_access
        return {"access_token": new_access, "token_type": "bearer"}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired — please login again")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

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

# ── Rascunho de proposta ──────────────────────────────────────────────────────

@api_router.post("/prompts/draft")
async def save_prompt_draft(body: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Only teachers can save drafts")
    draft_data = {
        "teacher_id": current_user["_id"],
        "saved_at": datetime.now(timezone.utc),
        **{k: v for k, v in body.items()},
    }
    await db.prompt_drafts.update_one(
        {"teacher_id": current_user["_id"]},
        {"$set": draft_data},
        upsert=True,
    )
    return {"message": "Draft saved"}

@api_router.get("/prompts/draft")
async def get_prompt_draft(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Only teachers can access drafts")
    draft = await db.prompt_drafts.find_one({"teacher_id": current_user["_id"]}, {"_id": 0})
    if not draft:
        raise HTTPException(status_code=404, detail="No draft found")
    return draft

@api_router.delete("/prompts/draft")
async def delete_prompt_draft(current_user: dict = Depends(get_current_user)):
    await db.prompt_drafts.delete_one({"teacher_id": current_user["_id"]})
    return {"message": "Draft deleted"}

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
async def get_all_prompts(
    current_user: dict = Depends(get_current_user),
    search: Optional[str] = Query(None, description="Buscar por título ou tema"),
    is_active: Optional[bool] = Query(None, description="Filtrar por status ativo/inativo"),
):
    """P-08: Busca e filtro server-side em propostas."""
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")

    query: dict = {}
    if search:
        regex = {"$regex": search, "$options": "i"}
        query["$or"] = [{"title": regex}, {"theme": regex}]
    if is_active is not None:
        query["is_active"] = is_active

    prompts = await db.prompts.find(query, {"_id": 0}).to_list(1000)
    default_criteria = [{"id": "c1", "nome": "Competência 1", "descricao": "", "peso_maximo": 200}]
    for p in prompts:
        if "criteria" not in p or not p["criteria"]:
            p["criteria"] = default_criteria
    return [PromptResponse(**p) for p in prompts]

@api_router.post("/essays", response_model=EssayResponse)
async def submit_essay(essay_data: EssaySubmit, current_user: dict = Depends(get_current_user)):
    # Log para debug de 422
    logger.info(f"submit_essay: method={essay_data.submission_method}, content_len={len(essay_data.content or '')}, file_url={bool(essay_data.file_url)}")
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
    except (Exception,) as e:  # KeyError, TypeError, ValueError
        logger.warning(f"Essay enrich error: {e}")

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
async def get_all_teacher_essays(
    current_user: dict = Depends(get_current_user),
    status: Optional[str] = Query(None, description="Filtrar por status: pending, in_progress, corrected"),
    page: int = Query(1, ge=1, description="Página (começa em 1)"),
    page_size: int = Query(100, ge=1, le=500, description="Itens por página (máx 500)"),
    course_id: Optional[str] = Query(None, description="Filtrar por turma"),
):
    """Retorna redações paginadas com filtro por status e turma."""
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")

    query: dict = {}

    # Determinar filtro de turma
    if course_id and course_id != "all":
        filter_courses = [course_id]
    elif current_user["role"] == "teacher":
        filter_courses = current_user.get("course_ids", [])
    else:
        filter_courses = []

    if filter_courses:
        students = await db.users.find(
            {"role": "student", "course_ids": {"$in": filter_courses}},
            {"_id": 1}
        ).to_list(10000)
        student_ids = [str(s["_id"]) for s in students]
        query["student_id"] = {"$in": student_ids}

    if status:
        query["status"] = status

    skip = (page - 1) * page_size

    # Contar total para paginação
    total = await db.essays.count_documents(query)

    essays = await db.essays.find(query, {"_id": 0}).sort(
        "submitted_at", -1
    ).skip(skip).limit(page_size).to_list(page_size)

    # Batch load nomes e títulos — 2 queries para N essays
    sid_set = {e["student_id"] for e in essays if e.get("student_id")}
    pid_set = {e["prompt_id"] for e in essays if e.get("prompt_id")}
    students_map = {}
    if sid_set:
        sl = await db.users.find({"_id": {"$in": [ObjectId(s) for s in sid_set]}}, {"_id": 1, "name": 1}).to_list(len(sid_set))
        students_map = {str(s["_id"]): s["name"] for s in sl}
    prompts_map = {}
    if pid_set:
        pl = await db.prompts.find({"id": {"$in": list(pid_set)}}, {"_id": 0, "id": 1, "title": 1}).to_list(len(pid_set))
        prompts_map = {p["id"]: p["title"] for p in pl}
    for essay in essays:
        essay["student_name"] = students_map.get(essay.get("student_id", ""), "")
        essay["prompt_title"] = prompts_map.get(essay.get("prompt_id", ""), "")

    return {
        "essays": [EssayResponse(**e).model_dump() for e in essays],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size,
    }

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
        # Enviar email ao aluno
        try:
            student = await db.users.find_one({"_id": ObjectId(essay_data["student_id"])}, {"_id": 0, "email": 1, "name": 1})
            if student:
                await send_correction_ready_email(
                    to_email=student["email"],
                    to_name=student["name"],
                    prompt_title=essay_data.get("prompt_title", "sua redação"),
                    essay_id=correction_data.essay_id,
                )
        except (Exception,) as e:  # httpx.RequestError, ValueError
            logger.warning(f"Correction email failed: {str(e)}")


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
    
    # Batch load corrections — 1 query instead of N
    scores = []
    if corrected_essays:
        essay_ids = [e["id"] for e in corrected_essays if e.get("id")]
        corrections = await db.corrections.find(
            {"essay_id": {"$in": essay_ids}}, {"_id": 0, "total_score": 1}
        ).to_list(len(essay_ids))
        scores = [c["total_score"] for c in corrections]
    
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0

    return {
        "total_essays": len(essays),
        "pending_corrections": len([e for e in essays if e["status"] == "pending"]),
        "average_score": avg_score,
        "best_score": max(scores) if scores else 0,
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
async def get_all_users(
    current_user: dict = Depends(get_current_user),
    search: Optional[str] = Query(None, description="Buscar por nome ou email"),
    role: Optional[str] = Query(None, description="Filtrar por role: student, teacher, admin"),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
):
    """P-08: Busca e filtro server-side — evita carregar todos os usuários no frontend."""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    query: dict = {}
    if search:
        regex = {"$regex": search, "$options": "i"}
        query["$or"] = [{"name": regex}, {"email": regex}]
    if role:
        query["role"] = role

    skip = (page - 1) * page_size
    total = await db.users.count_documents(query)
    users = await db.users.find(
        query,
        {"_id": 1, "name": 1, "email": 1, "role": 1, "created_at": 1, "is_active": 1, "course_ids": 1}
    ).skip(skip).limit(page_size).to_list(page_size)

    items = [UserResponse(
        id=str(u["_id"]), name=u["name"], email=u["email"], role=u["role"],
        is_active=u.get("is_active", True), course_ids=u.get("course_ids", []),
        created_at=u["created_at"]
    ) for u in users]

    # Manter compatibilidade: retorna lista direta (sem quebrar frontend existente)
    # Headers com metadata de paginação
    return items

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
    """P-02: Calcula stats do professor via aggregation pipeline — sem carregar 10.000 docs."""
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")

    tid = current_user["_id"]
    now = datetime.now(timezone.utc)
    today_start     = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start      = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    month_start     = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    six_months_ago  = now - timedelta(days=180)

    # Filtro compatível com teacher_id como string ou ObjectId
    try:
        tid_filter = {"$or": [{"teacher_id": tid}, {"teacher_id": ObjectId(tid)}]}
    except (ValueError, TypeError):  # ObjectId inválido
        tid_filter = {"teacher_id": tid}

    # ── Contagens periódicas via aggregation — 1 query ──────────────────────
    period_agg = await db.corrections.aggregate([
        {"$match": tid_filter},
        {"$group": {
            "_id": None,
            "total":     {"$sum": 1},
            "today":     {"$sum": {"$cond": [{"$gte": ["$corrected_at", today_start]}, 1, 0]}},
            "this_week": {"$sum": {"$cond": [{"$gte": ["$corrected_at", week_start]}, 1, 0]}},
            "this_month":{"$sum": {"$cond": [{"$gte": ["$corrected_at", month_start]}, 1, 0]}},
            "avg_time":  {"$avg": "$correction_time_minutes"},
        }}
    ]).to_list(1)
    counts = period_agg[0] if period_agg else {"total": 0, "today": 0, "this_week": 0, "this_month": 0, "avg_time": 0}

    # ── Por mês — últimos 6 meses via aggregation ────────────────────────────
    monthly_agg = await db.corrections.aggregate([
        {"$match": {**tid_filter, "corrected_at": {"$gte": six_months_ago}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m", "date": "$corrected_at"}},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}},
        {"$limit": 6},
    ]).to_list(6)
    monthly_data = [{"month": r["_id"], "count": r["count"]} for r in monthly_agg if r.get("_id")]

    # ── Por semana — últimas 4 semanas ───────────────────────────────────────
    weekly = []
    for i in range(3, -1, -1):
        w_start = (now - timedelta(days=now.weekday() + 7 * i)).replace(hour=0, minute=0, second=0, microsecond=0)
        w_end   = w_start + timedelta(days=7)
        count   = await db.corrections.count_documents({
            **tid_filter,
            "corrected_at": {"$gte": w_start, "$lt": w_end}
        })
        weekly.append({"week": w_start.strftime("%d/%m"), "count": count})

    avg_hours = round((counts.get("avg_time") or 0) / 60, 1)

    return {
        "total_corrections": counts.get("total", 0),
        "today":             counts.get("today", 0),
        "this_week":         counts.get("this_week", 0),
        "this_month":        counts.get("this_month", 0),
        "avg_hours":         avg_hours,
        "monthly_data":      monthly_data,
        "weekly_data":       weekly,
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

    # Se professor solicitou reescrita → notificar aluno
    if update.get("suggest_rewrite"):
        essay_doc = await db.essays.find_one({"id": essay_id}, {"_id": 0})
        if essay_doc:
            prompt_doc = await db.prompts.find_one({"id": essay_doc.get("prompt_id")}, {"_id": 0, "title": 1})
            prompt_title = prompt_doc["title"] if prompt_doc else "sua redação"
            teacher_name = current_user.get("name", "O professor")
            await create_notification(
                user_id=essay_doc["student_id"],
                title="Reescrita solicitada ✏️",
                message=f"{teacher_name} solicitou que você reescreva sua redação sobre '{prompt_title}'. Acesse Minhas Redações para enviar a nova versão.",
                type="warning",
                link=f"/essay/{essay_id}/correction"
            )
            # Enviar email ao aluno
            try:
                student = await db.users.find_one({"_id": ObjectId(essay_doc["student_id"])}, {"_id": 0, "email": 1, "name": 1})
                if student:
                    await send_rewrite_requested_email(
                        to_email=student["email"],
                        to_name=student["name"],
                        teacher_name=teacher_name,
                        prompt_title=prompt_title,
                        essay_id=essay_id,
                    )
            except (Exception,) as e:  # httpx.RequestError, ValueError
                logger.warning(f"Rewrite email failed: {str(e)}")

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

@api_router.get("/essays/{essay_id}/rewrite")
async def get_essay_rewrite(essay_id: str, current_user: dict = Depends(get_current_user)):
    """Retorna a reescrita de uma redação, se existir"""
    rewrite = await db.essays.find_one({"parent_essay_id": essay_id, "is_rewrite": True}, {"_id": 0})
    if not rewrite:
        raise HTTPException(status_code=404, detail="No rewrite found")
    rewrite["id"] = rewrite.get("id", str(rewrite.get("_id", "")))
    # Buscar correção da reescrita, se existir
    rewrite_correction = await db.corrections.find_one({"essay_id": rewrite["id"]}, {"_id": 0})
    return {
        "rewrite": rewrite,
        "rewrite_correction": rewrite_correction,
    }

@api_router.get("/essays/{essay_id}/parent-correction")
async def get_parent_correction(essay_id: str, current_user: dict = Depends(get_current_user)):
    """Para uma reescrita, retorna a correção da redação original"""
    essay = await db.essays.find_one({"id": essay_id}, {"_id": 0})
    if not essay or not essay.get("parent_essay_id"):
        raise HTTPException(status_code=404, detail="Not a rewrite or parent not found")
    parent_correction = await db.corrections.find_one({"essay_id": essay["parent_essay_id"]}, {"_id": 0})
    if not parent_correction:
        raise HTTPException(status_code=404, detail="Parent correction not found")
    # Serializar ObjectId
    if "_id" in parent_correction:
        del parent_correction["_id"]
    return {"parent_essay_id": essay["parent_essay_id"], "parent_correction": parent_correction}

@api_router.get("/teacher/students")
async def get_teacher_students(
    current_user: dict = Depends(get_current_user),
    search: Optional[str] = Query(None, description="Buscar por nome ou email do aluno"),
):
    """P-08: Busca server-side de alunos via $regex no MongoDB."""
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")

    # Filtrar alunos pelas turmas do professor
    teacher_course_ids = current_user.get("course_ids", [])
    if current_user["role"] == "teacher" and teacher_course_ids:
        student_query: dict = {"role": "student", "course_ids": {"$in": teacher_course_ids}}
    else:
        student_query = {"role": "student"}

    # P-08: aplicar busca server-side com $regex
    if search:
        regex = {"$regex": search, "$options": "i"}
        student_query["$or"] = [{"name": regex}, {"email": regex}]

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

    # Batch counts via aggregation — 3 queries instead of 7
    user_agg = await db.users.aggregate([
        {"$group": {"_id": "$role", "count": {"$sum": 1}}}
    ]).to_list(10)
    user_counts = {r["_id"]: r["count"] for r in user_agg}
    total_users = sum(user_counts.values())
    total_students = user_counts.get("student", 0)
    total_teachers = user_counts.get("teacher", 0)

    essay_agg = await db.essays.aggregate([
        {"$group": {"_id": {"status": "$status", "is_rewrite": "$is_rewrite"}, "count": {"$sum": 1}}}
    ]).to_list(20)
    total_essays = sum(r["count"] for r in essay_agg)
    total_pending = sum(r["count"] for r in essay_agg if r["_id"].get("status") in ["pending", "in_progress"])
    total_rewrites = sum(r["count"] for r in essay_agg if r["_id"].get("is_rewrite"))
    total_corrections = await db.corrections.count_documents({})

    # P-03: média de notas via aggregation — sem carregar 10.000 docs
    score_agg = await db.corrections.aggregate([
        {"$group": {"_id": None, "avg": {"$avg": "$total_score"}}}
    ]).to_list(1)
    avg_score = score_agg[0]["avg"] if score_agg else 0

    # P-03: top propostas via aggregation — sem carregar todos os essays
    prompt_agg = await db.essays.aggregate([
        {"$group": {"_id": "$prompt_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5},
    ]).to_list(5)
    top_prompt_ids = [r["_id"] for r in prompt_agg if r.get("_id")]
    top_prompts = []
    if top_prompt_ids:
        plist = await db.prompts.find({"id": {"$in": top_prompt_ids}}, {"_id": 0, "id": 1, "title": 1}).to_list(5)
        pmap = {p["id"]: p["title"] for p in plist}
        top_prompts = [{"title": pmap[r["_id"]], "count": r["count"]} for r in prompt_agg if r.get("_id") in pmap]

    # P-03: top alunos via aggregation
    student_agg = await db.essays.aggregate([
        {"$group": {"_id": "$student_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5},
    ]).to_list(5)
    top_student_ids = [r["_id"] for r in student_agg if r.get("_id")]
    top_students = []
    if top_student_ids:
        try:
            ulist = await db.users.find(
                {"_id": {"$in": [ObjectId(sid) for sid in top_student_ids]}},
                {"_id": 1, "name": 1}
            ).to_list(5)
            umap = {str(u["_id"]): u["name"] for u in ulist}
            top_students = [{"name": umap[r["_id"]], "count": r["count"]} for r in student_agg if r.get("_id") in umap]
        except (KeyError, TypeError, ValueError):
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
        "average_score": round(avg_score or 0, 1),
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
    except (OSError, IOError, Exception) as e:
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

# ── Modelos de critérios personalizados ──────────────────────────────────────

@api_router.get("/users/criteria-models")
async def get_criteria_models(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Only teachers can access criteria models")
    user = await db.users.find_one({"_id": ObjectId(current_user["_id"])}, {"_id": 0, "criteria_models": 1})
    return {"criteria_models": user.get("criteria_models", [])}

@api_router.post("/users/criteria-models")
async def save_criteria_model(body: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Only teachers can save criteria models")
    name = body.get("name", "").strip()
    criteria = body.get("criteria", [])
    if not name:
        raise HTTPException(status_code=400, detail="Model name is required")
    user = await db.users.find_one({"_id": ObjectId(current_user["_id"])})
    models = user.get("criteria_models", [])
    new_model = {
        "id": f"cm_{int(datetime.now(timezone.utc).timestamp() * 1000)}",
        "name": name,
        "criteria": criteria,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    models.append(new_model)
    await db.users.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": {"criteria_models": models}}
    )
    return {"message": "Model saved", "model": new_model}

@api_router.delete("/users/criteria-models/{model_id}")
async def delete_criteria_model(model_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Only teachers can delete criteria models")
    user = await db.users.find_one({"_id": ObjectId(current_user["_id"])})
    models = [m for m in user.get("criteria_models", []) if m.get("id") != model_id]
    await db.users.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": {"criteria_models": models}}
    )
    return {"message": "Model deleted"}

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

# ── HELPERS DE EMAIL (Resend) ────────────────────────────────────────────────

def _email_wrapper(title: str, body_html: str) -> str:
    """Template base para todos os emails da plataforma."""
    platform = os.getenv("PLATFORM_NAME", "redação com nicolle")
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #FDF3E8; border-radius: 12px; overflow: hidden;">
      <div style="background: #7C1805; padding: 24px 32px;">
        <p style="color: #DAB257; font-size: 22px; margin: 0; font-weight: bold;">{platform}</p>
      </div>
      <div style="padding: 32px;">
        <h2 style="color: #7C1805; font-size: 20px; margin: 0 0 16px 0;">{title}</h2>
        {body_html}
        <hr style="border: none; border-top: 1px solid #E8DDD0; margin: 28px 0 16px 0;">
        <p style="color: #A89080; font-size: 11px; text-align: center; margin: 0;">{platform}</p>
      </div>
    </div>
    """

async def send_email(to_email: str, subject: str, html: str) -> bool:
    """Envia email via Resend. Retorna True se enviou, False se não há chave configurada."""
    resend_key = os.getenv("RESEND_API_KEY")
    if not resend_key:
        logger.warning("RESEND_API_KEY não configurada — email não enviado")
        return False

    email_from = os.getenv("EMAIL_FROM", "onboarding@resend.dev")

    import httpx
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                "https://api.resend.com/emails",
                json={"from": email_from, "to": [to_email], "subject": subject, "html": html},
                headers={"Authorization": f"Bearer {resend_key}", "Content-Type": "application/json"}
            )
            if resp.status_code not in (200, 201):
                logger.error(f"Resend error {resp.status_code}: {resp.text}")
                return False
            return True
    except (Exception,) as e:  # httpx.RequestError, httpx.TimeoutException, OSError
        logger.error(f"Email send exception: {str(e)}")
        return False

async def send_reset_email(to_email: str, to_name: str, reset_token: str):
    frontend_url = os.getenv("FRONTEND_URL", "https://essaypro.onrender.com")
    reset_link = f"{frontend_url}/reset-password?token={reset_token}"

    body = f"""
        <p style="color: #6B5B4E; font-size: 15px; margin: 0 0 12px 0;">Olá, <strong>{to_name}</strong>!</p>
        <p style="color: #6B5B4E; font-size: 14px; margin: 0 0 24px 0;">
          Recebemos uma solicitação para redefinir a senha da sua conta.
          Clique no botão abaixo para criar uma nova senha:
        </p>
        <div style="text-align: center; margin: 0 0 24px 0;">
          <a href="{reset_link}"
            style="background: #7C1805; color: white; padding: 12px 32px; border-radius: 8px;
                   text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block;">
            Redefinir senha
          </a>
        </div>
        <p style="color: #6B5B4E; font-size: 12px; margin: 0;">
          Este link expira em <strong>1 hora</strong>.
          Se você não solicitou a redefinição, ignore este email.
        </p>
    """
    ok = await send_email(to_email, "Redefinição de senha", _email_wrapper("Redefinir sua senha", body))
    if not ok:
        raise Exception("Falha ao enviar email de redefinição")

async def send_welcome_email(to_email: str, to_name: str):
    """Email de boas-vindas após cadastro."""
    platform = os.getenv("PLATFORM_NAME", "redação com nicolle")
    body = f"""
        <p style="color: #6B5B4E; font-size: 15px; margin: 0 0 12px 0;">
          Olá, <strong>{to_name}</strong>! Seja bem-vinda 🎉
        </p>
        <p style="color: #6B5B4E; font-size: 14px; margin: 0 0 16px 0;">
          Seu cadastro no <strong>{platform}</strong> foi recebido com sucesso.
          Assim que o administrador aprovar sua conta, você receberá acesso à plataforma.
        </p>
        <p style="color: #6B5B4E; font-size: 14px; margin: 0;">
          Fique de olho neste email — você será notificada quando sua conta for aprovada.
        </p>
    """
    await send_email(to_email, f"Bem-vinda ao {platform}!", _email_wrapper("Cadastro recebido ✅", body))

async def send_correction_ready_email(to_email: str, to_name: str, prompt_title: str, essay_id: str):
    """Email notificando que a correção ficou pronta."""
    frontend_url = os.getenv("FRONTEND_URL", "https://essaypro.onrender.com")
    link = f"{frontend_url}/essay/{essay_id}/correction"
    body = f"""
        <p style="color: #6B5B4E; font-size: 15px; margin: 0 0 12px 0;">Olá, <strong>{to_name}</strong>!</p>
        <p style="color: #6B5B4E; font-size: 14px; margin: 0 0 16px 0;">
          Sua redação sobre <strong>"{prompt_title}"</strong> foi corrigida e já está disponível para você visualizar.
        </p>
        <div style="text-align: center; margin: 0 0 24px 0;">
          <a href="{link}"
            style="background: #36555A; color: white; padding: 12px 32px; border-radius: 8px;
                   text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block;">
            Ver correção
          </a>
        </div>
        <p style="color: #6B5B4E; font-size: 12px; margin: 0;">
          Acesse a plataforma para ver sua nota, anotações e feedback do professor.
        </p>
    """
    await send_email(to_email, "Sua redação foi corrigida! ✅", _email_wrapper("Correção disponível 📝", body))

async def send_rewrite_requested_email(to_email: str, to_name: str, teacher_name: str, prompt_title: str, essay_id: str):
    """Email notificando que o professor solicitou reescrita."""
    frontend_url = os.getenv("FRONTEND_URL", "https://essaypro.onrender.com")
    link = f"{frontend_url}/essay/{essay_id}/correction"
    body = f"""
        <p style="color: #6B5B4E; font-size: 15px; margin: 0 0 12px 0;">Olá, <strong>{to_name}</strong>!</p>
        <p style="color: #6B5B4E; font-size: 14px; margin: 0 0 16px 0;">
          <strong>{teacher_name}</strong> solicitou que você reescreva sua redação sobre
          <strong>"{prompt_title}"</strong>.
        </p>
        <p style="color: #6B5B4E; font-size: 14px; margin: 0 0 24px 0;">
          Acesse a plataforma, leia o feedback da correção e envie sua nova versão.
        </p>
        <div style="text-align: center; margin: 0 0 24px 0;">
          <a href="{link}"
            style="background: #D66B27; color: white; padding: 12px 32px; border-radius: 8px;
                   text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block;">
            Ver correção e reescrever
          </a>
        </div>
    """
    await send_email(to_email, "Reescrita solicitada ✏️", _email_wrapper("Seu professor quer uma nova versão", body))

@api_router.post("/auth/forgot-password")
async def forgot_password(body: dict, request: Request):
    # S-01: max 10 tentativas de reset por hora por IP
    check_rate_limit(request, max_calls=10, window_seconds=3600)
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
    current_user: dict = Depends(get_current_user),
    limit: int = Query(50, ge=1, le=500),
    action: Optional[str] = Query(None),
    search: Optional[str] = Query(None, description="Buscar por nome de usuário ou detalhe"),
    page: int = Query(1, ge=1),
):
    """P-08: Busca server-side em logs de atividade."""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    query: dict = {}
    if action:
        query["action"] = action
    if search:
        regex = {"$regex": search, "$options": "i"}
        query["$or"] = [{"user_name": regex}, {"detail": regex}]

    skip = (page - 1) * limit
    logs = await db.activity_logs.find(query, {"_id": 0}).sort(
        "created_at", -1
    ).skip(skip).limit(limit).to_list(limit)
    total = await db.activity_logs.count_documents(query)
    return {"logs": logs, "total": total, "page": page}

@api_router.get("/corrections/{essay_id}/history")
async def get_correction_history(essay_id: str, current_user: dict = Depends(get_current_user)):
    # Alunos podem ver o histórico da própria redação
    if current_user["role"] == "student":
        essay = await db.essays.find_one({"id": essay_id}, {"_id": 0, "student_id": 1})
        if not essay or str(essay.get("student_id", "")) != str(current_user["_id"]):
            raise HTTPException(status_code=403, detail="Access denied")
    elif current_user["role"] not in ["teacher", "admin"]:
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

        # P-04: Limitar campos buscados + projeção — reduz dados trafegados
        all_student_ids = [str(s["_id"]) for s in students]
        all_essays = await db.essays.find(
            {"student_id": {"$in": all_student_ids}},
            {"_id": 0, "id": 1, "student_id": 1, "status": 1, "is_rewrite": 1, "submitted_at": 1, "prompt_id": 1}
        ).to_list(10000)  # P-04: reduzido de 50000 para 10000 com projeção de campos
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
            except (ValueError, TypeError, ZeroDivisionError):
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
    name: str = Field(..., max_length=200, min_length=2)
    description: Optional[str] = Field("", max_length=1000)
    modality: Optional[str] = Field("online", max_length=20)
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
    """Exporta todas as coleções para um documento de backup no MongoDB.
    Mantém os últimos 7 backups. Notifica admin por email em caso de falha."""
    started_at = datetime.now(timezone.utc)
    try:
        collections = ["users", "essays", "corrections", "prompts", "courses", "drafts",
                       "notifications", "course_settings", "activity_logs"]
        backup_data = {"created_at": started_at.isoformat(), "collections": {}, "counts": {}}
        total_docs = 0
        for col in collections:
            docs = await db[col].find({}, {"_id": 0}).to_list(10000)
            backup_data["collections"][col] = docs
            backup_data["counts"][col] = len(docs)
            total_docs += len(docs)

        raw_size = len(str(backup_data))
        size_kb = round(raw_size / 1024, 1)

        await db.backups.insert_one({
            "created_at": started_at,
            "data": backup_data,
            "size": raw_size,
            "size_kb": size_kb,
            "total_docs": total_docs,
            "collections": list(backup_data["counts"].keys()),
            "counts": backup_data["counts"],
        })

        # Manter apenas os últimos 7 backups
        all_backups = await db.backups.find({}, {"_id": 1}).sort("created_at", -1).to_list(100)
        if len(all_backups) > 7:
            old_ids = [b["_id"] for b in all_backups[7:]]
            await db.backups.delete_many({"_id": {"$in": old_ids}})

        elapsed = round((datetime.now(timezone.utc) - started_at).total_seconds(), 1)
        logger.info(f"Backup automático concluído: {total_docs} docs, {size_kb}KB em {elapsed}s")
        return {"total_docs": total_docs, "size_kb": size_kb, "elapsed": elapsed}

    except (OSError, IOError, Exception) as e:
        logger.error(f"Backup error: {str(e)}")
        # Notificar admin por email
        try:
            admin_email = os.getenv("ADMIN_EMAIL", "")
            if admin_email:
                platform = os.getenv("PLATFORM_NAME", "EssayPro")
                await send_email(
                    admin_email,
                    f"⚠️ Falha no backup — {platform}",
                    f"<p>O backup automático falhou em {started_at.strftime('%d/%m/%Y %H:%M')}.</p>"
                    f"<p><strong>Erro:</strong> {str(e)}</p>"
                    f"<p>Verifique os logs do servidor.</p>"
                )
        except Exception:
            pass
        raise

async def backup_scheduler():
    """Roda backup diário — faz um backup inicial 5min após o servidor subir,
    depois a cada 24h."""
    await asyncio.sleep(5 * 60)  # aguarda 5min para o servidor estabilizar
    await run_backup()           # backup inicial
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
        except (Exception,) as e:  # OSError, RuntimeError — manter loop rodando
            logger.warning(f"Backup loop error: {e}")
        await asyncio.sleep(600)  # 10 minutos

@api_router.get("/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}

@api_router.post("/admin/backup/run")
async def manual_backup(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    stats = await run_backup()
    return {
        "message": "Backup realizado com sucesso!",
        "total_docs": stats.get("total_docs", 0),
        "size_kb": stats.get("size_kb", 0),
        "elapsed_seconds": stats.get("elapsed", 0),
    }

@api_router.get("/admin/backup/list")
async def list_backups(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    backups = await db.backups.find(
        {}, {"_id": 1, "created_at": 1, "size_kb": 1, "total_docs": 1, "counts": 1}
    ).sort("created_at", -1).to_list(10)
    return [{
        "id": str(b["_id"]),
        "created_at": b["created_at"].isoformat() if hasattr(b["created_at"], "isoformat") else b["created_at"],
        "size_kb": b.get("size_kb", 0),
        "total_docs": b.get("total_docs", 0),
        "counts": b.get("counts", {}),
    } for b in backups]

@api_router.get("/admin/backup/download/{backup_id}")
async def download_backup(backup_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    from fastapi.responses import JSONResponse
    # Buscar pelo backup_id (string de created_at) ou o mais recente se "latest"
    if backup_id == "latest":
        backup = await db.backups.find_one({}, sort=[("created_at", -1)])
    else:
        try:
            backup = await db.backups.find_one({"_id": ObjectId(backup_id)})
        except Exception:
            backup = await db.backups.find_one({}, sort=[("created_at", -1)])
    if not backup:
        raise HTTPException(status_code=404, detail="Backup não encontrado")
    return JSONResponse(
        content=backup["data"],
        headers={"Content-Disposition": f"attachment; filename=backup-{backup['created_at'].strftime('%Y%m%d-%H%M')}.json"}
    )

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

    def _parse_dt(v):
        """Converte string ISO ou datetime para datetime aware."""
        if not v:
            return None
        if isinstance(v, str):
            try:
                return datetime.fromisoformat(v.replace("Z", "+00:00"))
            except (ValueError, AttributeError):
                return None
        if hasattr(v, "tzinfo"):
            return v if v.tzinfo else v.replace(tzinfo=timezone.utc)
        return None

    try:
        courses = await db.courses.find({"is_active": True}, {"_id": 0}).to_list(100)
        four_weeks_ago = datetime.now(timezone.utc) - timedelta(weeks=4)
        result = []

        for course in courses:
            cid = course.get("id", "")
            if not cid:
                continue

            # Alunos da turma
            students = await db.users.find(
                {"role": "student", "course_ids": cid}, {"_id": 1}
            ).to_list(1000)
            student_ids = [str(s["_id"]) for s in students]

            if not student_ids:
                result.append({
                    "course_id": cid, "course_name": course.get("name", ""),
                    "modality": course.get("modality", ""),
                    "total_students": 0, "active_students": 0,
                    "total_essays": 0, "total_corrected": 0,
                    "avg_score": 0, "engagement_rate": 0,
                })
                continue

            # Essays da turma
            essays = await db.essays.find(
                {"student_id": {"$in": student_ids}},
                {"_id": 0, "id": 1, "student_id": 1, "status": 1, "submitted_at": 1}
            ).to_list(5000)

            # Alunos ativos nas últimas 4 semanas
            active_sids = set()
            for e in essays:
                dt = _parse_dt(e.get("submitted_at"))
                if dt and dt >= four_weeks_ago:
                    active_sids.add(e.get("student_id", ""))

            corrected = [e for e in essays if e.get("status") == "corrected"]

            # Scores em batch
            scores = []
            corrected_ids = [e["id"] for e in corrected[:50] if e.get("id")]
            if corrected_ids:
                corrs = await db.corrections.find(
                    {"essay_id": {"$in": corrected_ids}},
                    {"_id": 0, "total_score": 1}
                ).to_list(len(corrected_ids))
                scores = [c["total_score"] for c in corrs if c.get("total_score") is not None]

            result.append({
                "course_id": cid,
                "course_name": course.get("name", ""),
                "modality": course.get("modality", ""),
                "total_students": len(student_ids),
                "active_students": len(active_sids),
                "total_essays": len(essays),
                "total_corrected": len(corrected),
                "avg_score": round(sum(scores) / len(scores), 1) if scores else 0,
                "engagement_rate": round(len(active_sids) / len(student_ids) * 100, 1) if student_ids else 0,
            })

        return sorted(result, key=lambda x: -x["engagement_rate"])

    except Exception as e:
        logger.error(f"course-engagement error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro ao calcular engajamento: {str(e)}")

# ============================================================
# CORREÇÃO EM LOTE (Batch Comments)
# ============================================================

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
    # Cores de destaque
    "primary_color": "#7C1805",
    "secondary_color": "#D66B27",
    "accent_color": "#36555A",
    # Cores de fundo e texto
    "bg_color": "#FDF3E8",
    "bg_card_color": "#FFFFFF",
    "text_color": "#2C1A0E",
    "text_soft_color": "#6B5B4E",
    "border_color": "#E8DDD0",
    # Nomes de perfis
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

# S-05: origens permitidas via variável de ambiente
# ALLOWED_ORIGINS no Render: URLs separadas por vírgula
# Ex: ALLOWED_ORIGINS=https://essaypro.onrender.com,https://essaypro-frontend.onrender.com
_raw_origins = os.environ.get("ALLOWED_ORIGINS", "")
_extra_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

ALLOWED_ORIGINS = list(set([
    os.environ.get("FRONTEND_URL", "https://essaypro.onrender.com"),
    "https://essaypro-frontend.onrender.com",
    "https://essaypro.onrender.com",
    "http://localhost:3000",
    "http://localhost:3001",
    *_extra_origins,   # origens extras vindas da env var
]))

# S-02: Rate limiting geral — 300 requests por minuto por IP
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse as _JSONResponse

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    logger.warning(f"Validation error on {request.url.path}: {errors}")
    # Extrair mensagem legível
    messages = []
    for e in errors:
        field = " → ".join(str(loc) for loc in e.get("loc", []))
        msg = e.get("msg", "inválido")
        messages.append(f"{field}: {msg}")
    return _JSONResponse(
        status_code=422,
        content={"detail": "; ".join(messages) or "Dados inválidos"}
    )

@app.middleware("http")
async def global_rate_limit_middleware(request: Request, call_next):
    # Ignorar rotas estáticas e de saúde
    if request.url.path in ("/", "/health", "/docs", "/openapi.json"):
        return await call_next(request)
    ip = _get_ip(request)
    now = time.time()
    window_start = now - 60  # janela de 1 minuto
    _rate_store[f"global:{ip}"] = [t for t in _rate_store[f"global:{ip}"] if t > window_start]
    if len(_rate_store[f"global:{ip}"]) >= 300:
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=429,
            content={"detail": "Muitas requisições. Tente novamente em instantes."},
            headers={"Retry-After": "60"},
        )
    _rate_store[f"global:{ip}"].append(now)
    return await call_next(request)

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
            "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, Origin, X-Requested-With, X-Access-Token, X-Refresh-Token",
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
        response.headers["Access-Control-Expose-Headers"] = "X-Access-Token, X-Refresh-Token, Content-Disposition"

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

    # P-05/P-06/P-07: Índices em collections sem índice (adicionados na otimização de performance)
    await db.correction_history.create_index("essay_id")
    await db.correction_history.create_index("saved_at")
    await db.courses.create_index("is_active")
    await db.courses.create_index("name")
    await db.uploaded_files.create_index("file_id")
    await db.prompt_drafts.create_index("teacher_id")
    await db.essays.create_index([("status", 1), ("submitted_at", -1)])  # P-01: suporte ao sort paginado
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
