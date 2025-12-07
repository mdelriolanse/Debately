from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from uuid import UUID
from supabase import create_client, Client
from jose import JWTError, jwt
import httpx
import sys
from pathlib import Path

# Add parent directory to path for config import
sys.path.insert(0, str(Path(__file__).parent.parent))
from config import config

# Security scheme
security = HTTPBearer()

# Supabase configuration from immutable config
SUPABASE_URL = config.SUPABASE_URL
SUPABASE_ANON_KEY = config.SUPABASE_ANON_KEY

def get_supabase_client() -> Optional[Client]:
    """Get Supabase client for token verification."""
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        return None
    return create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

async def verify_token(token: str) -> dict:
    """
    Verify Supabase JWT token and return the decoded payload.
    """
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        missing = []
        if not SUPABASE_URL:
            missing.append("SUPABASE_URL")
        if not SUPABASE_ANON_KEY:
            missing.append("SUPABASE_ANON_KEY")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Supabase configuration missing: {', '.join(missing)}. Please add these environment variables to your backend/.env file. See SUPABASE_AUTH_SETUP.md for instructions."
        )
    
    try:
        # Use Supabase client to verify the token
        supabase = get_supabase_client()
        if not supabase:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to initialize Supabase client"
            )
        
        # Verify token by getting user
        response = supabase.auth.get_user(token)
        
        if not response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token"
            )
        
        # Return user data
        return {
            'user_id': response.user.id,
            'email': response.user.email,
            'user_metadata': response.user.user_metadata or {}
        }
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token verification failed: {str(e)}"
        )

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """
    FastAPI dependency to get the current authenticated user.
    Extracts and verifies the JWT token from the Authorization header.
    """
    token = credentials.credentials
    user_data = await verify_token(token)
    return user_data

async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[dict]:
    """
    FastAPI dependency to get the current user if authenticated, None otherwise.
    Useful for endpoints that work with or without authentication.
    """
    if not credentials:
        return None
    
    try:
        token = credentials.credentials
        user_data = await verify_token(token)
        return user_data
    except HTTPException:
        return None




