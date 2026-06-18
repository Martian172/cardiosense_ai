# CardioSense AI — Backend

> Production-grade FastAPI backend for ECG anomaly detection using PyTorch autoencoders and a LangChain RAG agent.

---

## 🏗️ Architecture

```
backend/
├── app/
│   ├── main.py               # FastAPI entrypoint
│   ├── core/
│   │   ├── config.py         # pydantic-settings configuration
│   │   ├── database.py       # SQLAlchemy 2.0 async engine
│   │   └── security.py       # JWT + bcrypt auth
│   ├── models/               # SQLAlchemy ORM models
│   ├── schemas/              # Pydantic v2 schemas
│   ├── routers/              # API route handlers
│   ├── services/             # Business logic
│   │   ├── ecg_model.py      # PyTorch inference service
│   │   ├── ecg_generator.py  # Synthetic ECG generator
│   │   └── agent_service.py  # LangChain RAG agent
│   └── ml/
│       ├── model.py          # ECGAutoencoder architecture
│       └── train_mock.py     # Mock weight generation script
└── tests/                    # pytest test suite
```

---

## 🚀 Quick Start

### 1. Prerequisites

- Python 3.11+
- pip

### 2. Setup

```bash
# Clone / navigate to backend directory
cd backend

# Create virtual environment
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate    # macOS/Linux

# Install dependencies
pip install torch==2.3.0 --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env and set at minimum SECRET_KEY and optionally OPENAI_API_KEY
```

### 3. Generate Model Weights

```bash
python -m app.ml.train_mock
```

This runs ~30 epochs of training on synthetic ECG data and saves `app/ml/ecg_autoencoder.pt`.

### 4. Run the Server

```bash
uvicorn app.main:app --reload --port 8000
```

Visit:
- API Docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- Health: http://localhost:8000/health

---

## 🔑 API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | — | Register new account |
| POST | `/api/auth/login` | — | Login, receive JWT |
| GET | `/api/auth/me` | ✅ Bearer | Current user profile |

### ECG Scans

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/scans/analyze` | ✅ Bearer | Analyse ECG + persist |
| GET | `/api/scans` | ✅ Bearer | List scans (paginated) |
| GET | `/api/scans/{id}` | ✅ Bearer | Scan detail + signals |
| DELETE | `/api/scans/{id}` | ✅ Bearer | Delete scan |
| POST | `/api/scans/demo` | — | Demo (generated ECG) |

### AI Agent

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/agent/chat` | ✅ Bearer | Chat with cardiology AI |
| GET | `/api/agent/sessions/{id}/history` | ✅ Bearer | Conversation history |

### WebSocket

| Protocol | Endpoint | Description |
|----------|----------|-------------|
| WS | `/ws/ecg-stream` | Real-time 250Hz ECG stream |

---

## 🔌 WebSocket Protocol

Connect to `ws://localhost:8000/ws/ecg-stream`.

**Server → Client** (every 100ms, 25 samples):
```json
{
  "frames": [
    {
      "timestamp": 1718476800.123,
      "value": 0.42,
      "sample_index": 125,
      "is_anomalous_region": false,
      "variant": "normal"
    }
  ],
  "chunk_index": 10
}
```

**Client → Server** (control messages):
```json
{"action": "set_variant", "variant": "afib"}
{"action": "stop"}
```

Available variants: `normal`, `st_elevation`, `afib`, `pvc`

---

## 🧠 ML Model

The `ECGAutoencoder` uses a convolutional encoder-decoder architecture:

- **Input**: `(batch, 1, 500)` — 2 seconds at 250 Hz
- **Encoder**: 4× Conv1d blocks with BatchNorm, ReLU, MaxPool → 32-dim latent
- **Decoder**: Transposed Conv + Upsample → reconstructed signal
- **Anomaly detection**: Sliding window MSE vs. configurable threshold
- **Anomaly score**: `1 - exp(-mse / threshold)` → normalised [0, 1]

---

## 🤖 AI Agent

The LangChain agent uses:
- **ChromaDB** vector store with 30+ curated cardiology facts
- **OpenAI `gpt-4o-mini`** as the LLM
- **Retrieval-augmented generation** for factual grounding
- **Per-session memory** (last 6 conversation turns)
- **Scan context injection** when `scan_id` is provided
- **Fallback mode** when `OPENAI_API_KEY` is not set

---

## 🧪 Running Tests

```bash
pytest tests/ -v
```

With coverage:
```bash
pytest tests/ -v --cov=app --cov-report=term-missing
```

---

## 🐳 Docker

```bash
# Build (generates model weights at build time)
docker build -t cardiosense-backend .

# Run
docker run -p 8000:8000 \
  -e SECRET_KEY=your-secret-key \
  -e OPENAI_API_KEY=sk-... \
  cardiosense-backend
```

---

## ⚙️ Configuration Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | *(required)* | JWT signing key (32+ char hex) |
| `ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Token TTL |
| `DATABASE_URL` | `sqlite+aiosqlite:///./cardiosense.db` | SQLAlchemy URL |
| `OPENAI_API_KEY` | *(optional)* | Enables full AI agent |
| `MODEL_PATH` | `app/ml/ecg_autoencoder.pt` | Path to model weights |
| `ANOMALY_THRESHOLD` | `0.05` | MSE threshold for anomaly flag |
| `CORS_ORIGINS` | `["http://localhost:5173","http://localhost:3000"]` | Allowed origins |

---

## 📁 Database Migrations

```bash
# Create a new migration
alembic revision --autogenerate -m "add column xyz"

# Apply migrations
alembic upgrade head

# Rollback one step
alembic downgrade -1
```

---

## 🔒 Security Notes

- Passwords are hashed with **bcrypt** (12 rounds)
- JWTs are signed with **HS256** — use RS256 for multi-service deployments
- Scan data is scoped by `user_id` — cross-user access returns 404 (not 403) to avoid information leakage
- The Docker image runs as a **non-root user** (`appuser`)
- Never commit `.env` to version control
