<div align="center">
  <h1>debately.</h1>
  <p><strong>AI-powered debate platform for structured discourse</strong></p>
  <p>Create topics, contribute arguments, let AI synthesize understanding. The resilient platform for structured debate.</p>
</div>

---

## Overview

Debately is a fact-checked debate platform that uses Claude AI to synthesize arguments, verify claims, and provide evidence-based analysis. It enables users to engage in structured debates with automatic fact-checking, AI-powered synthesis, and intelligent argument matching.

## Features

-  **AI-Powered Synthesis** - Claude Sonnet 4 generates comprehensive debate summaries, consensus views, and timelines
-  **Automatic Fact-Checking** - Claude Haiku + Tavily verify arguments and assign 1-5 star validity scores
-  **Relevance Filtering** - AI automatically rejects irrelevant arguments (no spam or off-topic content)
-  **Evidence-Based Scoring** - Validity scores based on high-quality sources (relevance score > 0.5)
-  **Voting System** - Users can upvote/downvote arguments to show support
-  **Argument Matching** - AI identifies which pro arguments directly rebut con arguments
-  **Topic Metrics** - View average validity scores, controversy levels, and argument counts
-  **Comments** - Users can comment on arguments for deeper discussion
-  **Authentication** - Secure user authentication via Supabase with Google OAuth
-  **Proposition Validation** - AI validates and reformulates debate propositions for clarity
-  **Contribution Limits** - Per-user contribution limits (25 topics + arguments combined) to ensure quality
-  **API Rate Limiting** - Global API call limits (750 per service) to manage costs

## Tech Stack

### Backend
- **Framework**: FastAPI (async Python framework)
- **Database**: PostgreSQL with psycopg2
- **AI Models**:
  - Claude Sonnet 4 (`claude-sonnet-4-20250514`) - Synthesis, matching, proposition validation
  - Claude Haiku (`claude-3-haiku-20240307`) - Fast fact-checking
- **APIs**: 
  - Anthropic API - Claude AI integration
  - Tavily API - Evidence search and fact verification
- **Authentication**: Supabase Auth with JWT tokens
- **Security**: Immutable configuration system, secure API key management
- **Deployment**: Docker support with docker-compose for development

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4.1.9
- **UI Components**: Shadcn/ui (Radix UI primitives)
- **Authentication**: Supabase SSR with middleware
- **State Management**: React Context API
- **Visual Effects**: Aurora background animations
- **Analytics**: Vercel Analytics

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+ (or use Docker)
- Anthropic API key ([Get one here](https://console.anthropic.com/))
- Tavily API key ([Get one here](https://tavily.com/))
- Supabase account ([Get one here](https://supabase.com/))

### Backend Setup

1. **Navigate to backend directory:**
```bash
cd backend
```

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

3. **Set up environment variables:**
   
   Create a `.env` file in the `backend` directory:
```env
# Required: Anthropic API Key
ANTHROPIC_API_KEY=your_anthropic_key_here

# Required: Tavily API Key
TAVILY_API_KEY=your_tavily_key_here

# Required: Supabase Configuration
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_JWT_SECRET=your_jwt_secret_here

# Required: Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=debate_platform
DB_USER=postgres
DB_PASSWORD=your_password

# Optional: CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000
```

4. **Set up PostgreSQL database:**
```bash
# Create database
createdb debate_platform

# Or using psql
psql -U postgres
CREATE DATABASE debate_platform;
```

5. **Run database migrations:**
   The database tables are automatically created on first run via `database.init_db()`.

6. **Run the server:**
```bash
uvicorn main:app --reload
```

Backend will be available at `http://localhost:8000`

**Note**: For detailed Supabase authentication setup, see [SUPABASE_AUTH_SETUP.md](./SUPABASE_AUTH_SETUP.md)

### Frontend Setup

1. **Navigate to frontend directory:**
```bash
cd frontend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
   
   Create a `.env.local` file in the `frontend` directory:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
NEXT_PUBLIC_API_URL=http://localhost:8000
```

4. **Run the development server:**
```bash
npm run dev
```

Frontend will be available at `http://localhost:3000`

### Docker Setup (Development)

For containerized development with PostgreSQL:

```bash
cd backend
docker-compose up
```

This will:
- Start PostgreSQL in a container
- Start the FastAPI backend with hot-reload
- Automatically sync code changes

## Usage

1. **Sign In** - Use Google OAuth to authenticate (configured via Supabase)
2. **Create a Debate** - Click "Start a Debate" and enter a proposition
3. **Add Arguments** - Submit pro and con arguments with sources
4. **Automatic Verification** - Arguments are automatically fact-checked on submission
5. **View Analysis** - Claude generates summaries, consensus views, and timelines automatically
6. **Vote** - Upvote or downvote arguments to show support
7. **Comment** - Add comments on arguments for deeper discussion

## Architecture

### Multi-Model AI Strategy

The platform uses a cost-optimized multi-model approach:

- **Claude Sonnet 4**: Used for complex reasoning tasks
  - Debate synthesis (overall summary, consensus view, timeline)
  - Argument matching (identifying which pro arguments rebut con arguments)
  - Proposition validation and reformulation
  
- **Claude Haiku**: Used for fast, cost-effective tasks
  - Fact-checking (10x cheaper, 2-3x faster than Sonnet)
  - Relevance checking
  - Claim extraction

### Fact-Checking Pipeline

1. **Extract Core Claim** - Claude Haiku extracts the verifiable factual claim from the argument
2. **Search Evidence** - Tavily API searches for evidence (filters sources with relevance score > 0.5)
3. **Analyze & Score** - Claude Haiku analyzes evidence and assigns 1-5 star validity score
4. **Store Results** - Validity score, reasoning, and key URLs are saved to the database

### Automatic Relevance Checking

Before saving an argument, the system:
1. Checks if the argument is relevant to the debate proposition
2. Rejects irrelevant arguments (opinions, spam, off-topic content)
3. Provides clear reasoning for rejection

### API Rate Limiting

- Global API call limit: 750 calls per service (Anthropic, Tavily)
- Tracks usage in `api_usage` table
- Prevents excessive API costs

### User Contribution Limits

- Per-user limit: 25 contributions (topics + arguments combined)
- Enforced before expensive operations (fact-checking)
- Prevents abuse and ensures quality

### Key Endpoints

- `POST /api/topics` - Create a new debate topic
- `GET /api/topics` - Get all topics with metrics
- `GET /api/topics/{topic_id}` - Get topic with arguments and analysis
- `POST /api/topics/{topic_id}/arguments` - Create an argument
- `POST /api/arguments/{argument_id}/verify` - Verify argument validity
- `POST /api/arguments/{argument_id}/upvote` - Upvote an argument
- `POST /api/arguments/{argument_id}/downvote` - Downvote an argument
- `POST /api/topics/validate-proposition` - Validate and reformulate proposition

## Project Structure

```
.
├── backend/                    # FastAPI backend
│   ├── routes/                 # API endpoint modules
│   │   ├── topics.py           # Topic CRUD operations
│   │   ├── arguments.py        # Argument CRUD operations
│   │   ├── summaries.py        # AI synthesis endpoints
│   │   ├── fact_checking.py    # Fact-checking endpoints
│   │   ├── voting.py           # Voting and comments
│   │   └── auth.py             # Authentication endpoints
│   ├── middleware/             # Middleware modules
│   │   └── auth.py             # Supabase JWT authentication
│   ├── utils/                  # Utility modules
│   │   └── user.py             # User profile management
│   ├── database.py             # Database operations and migrations
│   ├── claude_service.py       # Claude Sonnet 4 integration
│   ├── fact_checker.py         # Claude Haiku fact-checking
│   ├── validate_proposition.py # Proposition validation
│   ├── config.py               # Immutable configuration system
│   ├── models.py               # Pydantic request/response models
│   ├── main.py                 # FastAPI application entry point
│   ├── requirements.txt        # Python dependencies
│   ├── Dockerfile              # Production Docker image
│   └── docker-compose.yml      # Development Docker setup
│
├── frontend/                   # Next.js frontend
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx            # Home page
│   │   ├── browse/             # Browse debates page
│   │   ├── new/                # Create debate page
│   │   ├── topic/[id]/         # Topic detail page
│   │   └── auth/callback/      # OAuth callback handler
│   ├── components/             # React components
│   │   ├── Header.tsx          # Navigation header
│   │   ├── AuroraBackground.tsx # Visual effects
│   │   ├── auth/               # Authentication components
│   │   └── ui/                 # Shadcn/ui components
│   ├── contexts/               # React context providers
│   │   ├── AuthContext.tsx     # Authentication state
│   │   └── AuroraContext.tsx   # Aurora effects state
│   ├── lib/                    # Library code
│   │   ├── supabase/           # Supabase client setup
│   │   └── utils.ts             # Utility functions
│   ├── src/                    # Source code
│   │   └── api.ts              # API client functions
│   ├── public/                 # Static assets
│   │   └── logo-icon.png       # Application logo
│   ├── package.json            # Node.js dependencies
│   └── tsconfig.json           # TypeScript configuration
│
├── SUPABASE_AUTH_SETUP.md      # Supabase authentication guide
└── README.md                   # This file
```

## Database Schema

### Core Tables

- **user_profiles** - User account information (linked to Supabase auth)
- **topics** - Debate topics/propositions
- **arguments** - Pro/con arguments with validity scores
- **comments** - Comments on arguments
- **argument_matches** - AI-identified pro/con argument relationships
- **votes** - User votes on arguments
- **api_usage** - API call tracking for rate limiting
