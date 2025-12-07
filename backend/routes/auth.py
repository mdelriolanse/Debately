from fastapi import APIRouter, HTTPException, Depends
from uuid import UUID
import database
from middleware.auth import get_current_user, get_current_user_optional
from models import UserProfileResponse
from utils.user import ensure_user_profile

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/sync-profile", response_model=UserProfileResponse)
async def sync_profile(user_data: dict = Depends(get_current_user)):
    """
    Sync user profile from Supabase auth to user_profiles table.
    Called after OAuth login to create/update user profile.
    """
    user_id, username = ensure_user_profile(user_data)
    profile = database.get_user_profile(user_id)
    
    if not profile:
        raise HTTPException(status_code=500, detail="Failed to create user profile")
    
    return UserProfileResponse(
        id=str(profile['id']),
        username=profile['username'],
        email=profile['email'],
        avatar_url=profile.get('avatar_url'),
        created_at=profile.get('created_at'),
        updated_at=profile.get('updated_at')
    )

@router.get("/me", response_model=UserProfileResponse)
async def get_current_user_profile(user_data: dict = Depends(get_current_user)):
    """
    Get the current user's profile.
    """
    user_id, _ = ensure_user_profile(user_data)
    profile = database.get_user_profile(user_id)
    
    if not profile:
        raise HTTPException(status_code=404, detail="User profile not found")
    
    return UserProfileResponse(
        id=str(profile['id']),
        username=profile['username'],
        email=profile['email'],
        avatar_url=profile.get('avatar_url'),
        created_at=profile.get('created_at'),
        updated_at=profile.get('updated_at')
    )

@router.post("/logout")
async def logout(user_data: dict = Depends(get_current_user_optional)):
    """
    Logout endpoint for consistency with login flow.
    Currently, Supabase handles token invalidation client-side,
    but this endpoint can be used for any server-side cleanup if needed.
    Accepts optional auth to handle cases where token might already be invalid.
    """
    # Future: Add any server-side session cleanup here if needed
    # For now, this is just for consistency with the login flow
    return {"message": "Logged out successfully"}

@router.delete("/account")
async def delete_account(user_data: dict = Depends(get_current_user)):
    """
    Delete the user's account and all associated data.
    This will:
    - Delete the user profile from user_profiles table
    - Set user_id to NULL in topics, arguments, and comments (preserves content)
    """
    user_id = UUID(user_data['user_id'])
    
    success = database.delete_user_profile(user_id)
    if not success:
        raise HTTPException(status_code=404, detail="User profile not found")
    
    return {"message": "Account deleted successfully"}




