# ForgeAI

ForgeAI is an enterprise-grade AI Software Engineering Copilot that assists developers throughout the Software Development Lifecycle (SDLC). It provides deep repository intelligence, code search, and contextual chat backed by leading AI models.

## Tech Stack

### Frontend
- Next.js (React)
- TypeScript
- Tailwind CSS
- shadcn/ui

### Backend
- Node.js (Express)
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT Authentication

## AI Providers

ForgeAI leverages OpenRouter as its primary AI gateway and natively supports:
- **OpenAI** (e.g., GPT-4o)
- **NVIDIA NIM** (e.g., Nemotron 30B)
- **Qwen** (e.g., Qwen 2.5 Coder)

## Environment Variables

### Backend (`backend/.env`)
Create a `.env` file from the example:
```bash
cp backend/.env.example backend/.env
```
Ensure you have a PostgreSQL database running and a valid `OPENROUTER_API_KEY`.

### Frontend (`frontend/.env.local`)
Create a `.env.local` file from the example:
```bash
cp frontend/.env.example frontend/.env.local
```

## Running the Application

### 1. Database Setup
Ensure PostgreSQL is running.
```bash
cd backend
npx prisma generate
npx prisma db push
```

### 2. Start Backend
```bash
cd backend
npm run dev
```

### 3. Start Frontend
```bash
cd frontend
npm run dev
```

## MVP Capabilities
- **Authentication**: Secure JWT-based user signup and login.
- **Repository Code Search**: Semantic search over codebase functions, files, and classes.
- **Repository Chat**: Interactive AI assistant with deep repository context, markdown rendering, and source citations.
- **Repository Intelligence**: On-demand explainability and codebase analysis.
- **Provider Selection**: Seamlessly switch between AI models and providers.

## Status

🚀 MVP Stable Release