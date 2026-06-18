# CardioSense AI 🫀

<div align="center">

![CardioSense AI](https://img.shields.io/badge/CardioSense-AI-00d4aa?style=for-the-badge&logo=heart&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.137-009688?style=for-the-badge&logo=fastapi)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![PyTorch](https://img.shields.io/badge/PyTorch-2.6-EE4C2C?style=for-the-badge&logo=pytorch)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2-3178C6?style=for-the-badge&logo=typescript)
![Gemini](https://img.shields.io/badge/Gemini-2.5_Flash-4285F4?style=for-the-badge&logo=google)

**Production-grade ECG Anomaly Detection SaaS powered by Deep Learning & Generative AI**

[Live Demo](#) · [API Docs](http://localhost:8000/docs) · [Report Bug](https://github.com/Martian172/cardiosense-ai/issues)

</div>

---

## 🎯 Overview

CardioSense AI is a full-stack, production-style web application for real-time ECG signal analysis and cardiac anomaly detection. It uses a **1D Convolutional Autoencoder** trained on normal sinus rhythm patterns — when an anomalous signal is detected, the reconstruction error spikes, flagging the irregular segment.

The platform includes:
- 🔬 **AI-powered ECG analysis** with anomaly localization
- 📡 **Real-time ECG streaming** via WebSocket
- 🤖 **Dr. CardioBot** — a RAG-powered cardiology AI assistant (Gemini 2.5 Flash)
- 📊 **Analytics dashboard** with historical scan trends
- 🔐 **JWT authentication** with secure user accounts

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 React 18 + TypeScript                    │
│         TanStack Query · Zustand · Recharts             │
│              Framer Motion · Tailwind CSS                │
└───────────────────┬─────────────────────────────────────┘
                    │  REST + WebSocket
┌───────────────────▼─────────────────────────────────────┐
│              FastAPI (ASGI / Uvicorn)                    │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐ ┌────────────┐  │
│  │   Auth   │ │  Scans   │ │  Agent  │ │ WebSocket  │  │
│  └────┬─────┘ └────┬─────┘ └────┬────┘ └────┬───────┘  │
│       │            │            │             │          │
│  ┌────▼────────────▼────────────▼─────────────▼──────┐  │
│  │  ECGModelService  │  AgentService (Gemini RAG)     │  │
│  │  (PyTorch 1D CNN) │  Fallback chain + KB retrieval │  │
│  └───────────────────┴────────────────────────────────┘  │
│             SQLAlchemy 2.0 Async · SQLite/PostgreSQL      │
└─────────────────────────────────────────────────────────┘
```

---

## ✨ Features

### ECG Analysis
- Upload or generate ECG signals (Normal, AFib, STEMI, PVC variants)
- **PyTorch 1D Conv Autoencoder** inference — reconstruction-based anomaly detection
- Sliding-window localization highlights exact anomalous segments
- Anomaly score (0–100%) with risk classification

### Real-time Monitor
- Live WebSocket ECG stream at 250 Hz simulation
- Animated heart-rate display with anomaly alerts
- Signal quality indicator

### Dr. CardioBot (AI Assistant)
- Powered by **Google Gemini 2.5 Flash**
- RAG pipeline with 30+ cardiology knowledge base entries
- Scan-contextual responses (explains YOUR specific ECG results)
- Graceful 4-model fallback chain on rate limits

### Dashboard & Analytics
- Scan history with paginated table
- 30-day anomaly trend charts
- Score distribution analysis
- Per-user statistics

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **ML Model** | PyTorch 2.6 — 1D Conv Autoencoder |
| **Backend** | FastAPI 0.137, Uvicorn, SQLAlchemy 2.0 async |
| **Auth** | JWT (python-jose) + bcrypt |
| **Database** | SQLite (dev) / PostgreSQL (prod) via aiosqlite |
| **AI Agent** | Google Gemini 2.5 Flash, Keyword RAG |
| **Frontend** | React 18, TypeScript 5, Vite 5 |
| **State** | TanStack Query v5 (server) + Zustand (client) |
| **Charts** | Recharts, Framer Motion |
| **Styling** | Tailwind CSS, glassmorphism design |
| **Containers** | Docker, docker-compose |

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+ and pip
- Node.js 18+ and npm
- Git

### 1. Clone the repository
```bash
git clone https://github.com/Martian172/cardiosense-ai.git
cd cardiosense-ai
```

### 2. Backend setup
```bash
cd backend

# Create virtual environment
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — add your GEMINI_API_KEY and a strong SECRET_KEY

# Generate ML model weights (~38 seconds)
python -m app.ml.train_mock

# Start the server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend setup
```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Start the dev server
npm run dev
```

### 4. Open the app
- **Frontend**: http://localhost:5173
- **API Docs**: http://localhost:8000/docs
- **Health**: http://localhost:8000/health

---

## 🐳 Docker Compose (One Command)

```bash
# Copy and configure environment
cp .env.example .env
# Add GEMINI_API_KEY and SECRET_KEY to .env

# Build and start all services
docker-compose up --build

# App: http://localhost:5173
# API: http://localhost:8000
```

---

## ⚙️ Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Security (REQUIRED - generate with: python -c "import secrets; print(secrets.token_hex(32))")
SECRET_KEY=your-super-secret-key-min-32-chars

# Google Gemini AI (REQUIRED for Dr. CardioBot)
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash

# Database
DATABASE_URL=sqlite+aiosqlite:///./cardiosense.db

# ML Model
MODEL_PATH=app/ml/ecg_autoencoder.pt
ANOMALY_THRESHOLD=0.05

# CORS
CORS_ORIGINS=["http://localhost:5173"]
```

Get a free Gemini API key at: https://aistudio.google.com/apikey

---

## 🧠 ML Model Details

### Architecture: 1D Convolutional Autoencoder

```
Input: (batch, 1, 500) — 2 seconds of ECG at 250 Hz

ENCODER
  Conv1d(1→16, k=7, s=2) → BN → ReLU   [500→250]
  Conv1d(16→32, k=5, s=2) → BN → ReLU  [250→125]
  Conv1d(32→64, k=3, s=2) → BN → ReLU  [125→63]
  Conv1d(64→32, k=3) → BN → ReLU       [bottleneck]

DECODER
  ConvTranspose1d layers (mirror of encoder)
  Final: Tanh activation

Output: (batch, 1, 500) — reconstructed signal
```

### Anomaly Detection
- **Training**: Only on normal sinus rhythm → model learns "normal"
- **Inference**: `anomaly_score = MSE / (MSE + threshold)` — smooth 0→1
- **Localization**: 50-sample sliding window, step=25, merged overlapping regions
- **Threshold**: 0.05 MSE (configurable via `ANOMALY_THRESHOLD`)

### Supported ECG Variants (Demo)
| Type | Description | Typical Score |
|------|-------------|---------------|
| Normal | Regular P-QRS-T, 60-80 bpm | 0.05 – 0.25 |
| AFib | Irregular RR, no P waves | 0.55 – 0.75 |
| PVC | Wide QRS, compensatory pause | 0.45 – 0.70 |
| ST Elevation | Elevated ST segment (STEMI) | 0.30 – 0.55 |

---

## 📁 Project Structure

```
cardiosense-ai/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── core/               # Config, database, security
│   │   ├── ml/                 # PyTorch model definition + training script
│   │   ├── models/             # SQLAlchemy ORM models
│   │   ├── routers/            # API route handlers
│   │   ├── schemas/            # Pydantic request/response schemas
│   │   ├── services/           # Business logic (ECG model, agent, generator)
│   │   └── main.py             # FastAPI app entrypoint
│   ├── tests/                  # pytest test suite
│   ├── alembic/                # Database migrations
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/                   # React + TypeScript frontend
│   ├── src/
│   │   ├── components/         # Reusable UI components (ECG charts, chat, dashboard)
│   │   ├── hooks/              # Custom React hooks (auth, ECG stream, scans)
│   │   ├── pages/              # Route pages (Landing, Dashboard, Analyze, Monitor...)
│   │   ├── store/              # Zustand global state
│   │   ├── lib/                # Axios client, React Query, utilities
│   │   └── types/              # TypeScript interfaces
│   ├── package.json
│   ├── vite.config.ts
│   ├── Dockerfile
│   └── .env.example
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## 🔌 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login, get JWT |
| GET | `/api/auth/me` | Yes | Current user profile |
| POST | `/api/scans/analyze` | Yes | Analyze ECG signal |
| POST | `/api/scans/demo` | No | Demo scan (no auth needed) |
| GET | `/api/scans` | Yes | Paginated scan history |
| GET | `/api/scans/{id}` | Yes | Single scan detail |
| GET | `/api/scans/stats` | Yes | Aggregated statistics |
| POST | `/api/agent/chat` | Optional | Chat with Dr. CardioBot |
| WS | `/ws/ecg-stream` | No | Real-time ECG stream |
| GET | `/health` | No | Service health check |

Full interactive docs: **http://localhost:8000/docs**

---

## 🧪 Running Tests

```bash
cd backend
.venv\Scripts\activate
pytest tests/ -v --tb=short
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 👨‍💻 Author

Built by **Martian172** as a portfolio/showcase project demonstrating full-stack ML engineering skills.

- 🔗 GitHub: [@Martian172](https://github.com/Martian172)

---

<div align="center">

⭐ **Star this repo if you found it useful!**

![CardioSense AI](https://img.shields.io/badge/Made_with-❤️_&_PyTorch-EE4C2C?style=flat-square)

</div>
