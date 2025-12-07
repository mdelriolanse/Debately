from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import database
from routes import topics, arguments, summaries, fact_checking, voting, auth
import logging
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize database
database.init_db()
# Run migration to add validity columns
database.migrate_add_validity_columns()
# Run migration to add votes column
database.migrate_add_votes_column()
# Reset all vote counts to 0 (disregard seeded baseline votes)
database.migrate_reset_vote_counts()

# Create FastAPI app
app = FastAPI(title="Debately API", version="1.0.0")

# Import HTTPException for exception handlers
from fastapi import HTTPException

# Add exception handler for validation errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Log validation errors with full details."""
    logger.error(f"Validation error on {request.method} {request.url.path}")
    try:
        body = await request.body()
        logger.error(f"Request body: {body.decode('utf-8', errors='ignore')}")
    except:
        logger.error("Could not read request body")
    logger.error(f"Validation errors: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()}
    )

# Add exception handler for HTTPException (logs 500-level errors)
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Log HTTP exceptions (especially 500-level errors)."""
    if exc.status_code >= 500:
        logger.error(f"HTTP {exc.status_code} on {request.method} {request.url.path}: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

# Add exception handler for all unhandled exceptions
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Log unhandled exceptions with full traceback."""
    logger.exception(f"Unhandled exception on {request.method} {request.url.path}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"}
    )

# Add logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all requests and responses."""
    logger.info(f"{request.method} {request.url.path}")
    
    # Read and log request body for POST/PUT/PATCH
    if request.method in ["POST", "PUT", "PATCH"]:
        body = await request.body()
        if body:
            try:
                import json
                body_json = json.loads(body)
                logger.info(f"Request body: {json.dumps(body_json, indent=2)}")
            except:
                logger.info(f"Request body (raw): {body.decode('utf-8', errors='ignore')}")
        
        # Recreate request with body for downstream handlers
        async def receive():
            return {"type": "http.request", "body": body}
        request._receive = receive
    
    response = await call_next(request)
    logger.info(f"Response status: {response.status_code}")
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://debately-delta.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(topics.router)
app.include_router(arguments.router)
app.include_router(summaries.router)
app.include_router(fact_checking.router)
app.include_router(voting.router)

@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "Debate Platform API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring and load balancers."""
    from config import config, verify_config_integrity
    
    try:
        # Check database connection
        conn = database.get_db_connection()
        conn.close()
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        error_detail = str(e)
        
        # Get config integrity status (uses immutable config)
        config_status = verify_config_integrity()
        
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy", 
                "database": "disconnected", 
                "error": error_detail,
                "diagnostics": {
                    "db_host_set": bool(config.DB_HOST),
                    "db_user_set": bool(config.DB_USER),
                    "db_password_set": bool(config.DB_PASSWORD),
                    "db_name": config.DB_NAME,
                    "db_port": config.DB_PORT,
                }
            }
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
