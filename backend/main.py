from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import database
from routes import topics, arguments, summaries, fact_checking, voting

# Initialize database
database.init_db()
# Run migration to add validity columns
database.migrate_add_validity_columns()
# Run migration to add votes column
database.migrate_add_votes_column()

# Create FastAPI app
app = FastAPI(title="Debate Platform API", version="1.0.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(topics.router)
app.include_router(arguments.router)
app.include_router(summaries.router)
app.include_router(fact_checking.router)
app.include_router(voting.router)

@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "Debate Platform API", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
