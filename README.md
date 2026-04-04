# NIC - Sistema de Correção de Redações

## Stack
- **Backend**: FastAPI + MongoDB (Motor)
- **Frontend**: React + TailwindCSS + shadcn/ui
- **IA**: Anthropic Claude (SDK oficial)

## Variáveis de Ambiente

Copie `.env.example` para `.env` e preencha:

```
MONGO_URL=mongodb://...
DB_NAME=nic_db
SECRET_KEY=...
ANTHROPIC_API_KEY=sk-ant-...
REACT_APP_BACKEND_URL=https://seu-backend.onrender.com
```

## Rodando localmente

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --port 8001
```

### Frontend
```bash
cd frontend
npm install
npm start
```

## Deploy na Render

### Backend (Web Service)
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
- Adicionar as variáveis de ambiente no painel

### Frontend (Static Site)
- Build Command: `npm install && npm run build`
- Publish Directory: `build`
- Adicionar `REACT_APP_BACKEND_URL` apontando para a URL do backend
# Essaypro
