from fastapi import APIRouter, HTTPException, Depends
import database
from middleware.auth import get_current_user
from models import CommentCreate, CommentCreateResponse, CommentResponse
from utils.user import ensure_user_profile
from uuid import UUID

router = APIRouter(prefix="/api/arguments", tags=["arguments"])

@router.post("/{argument_id}/upvote")
async def upvote_argument(argument_id: int, user_data: dict = Depends(get_current_user)):
    """Upvote an argument. Requires authentication. Returns vote count and user's vote status."""
    argument = database.get_argument(argument_id)
    if not argument:
        raise HTTPException(status_code=404, detail=f"Argument with id {argument_id} not found")
    
    user_id, _ = ensure_user_profile(user_data)
    votes, user_vote_status = database.upvote_argument(argument_id, user_id)
    return {
        "argument_id": argument_id,
        "votes": votes,
        "user_vote": user_vote_status
    }

@router.post("/{argument_id}/downvote")
async def downvote_argument(argument_id: int, user_data: dict = Depends(get_current_user)):
    """Downvote an argument. Requires authentication. Returns vote count and user's vote status."""
    argument = database.get_argument(argument_id)
    if not argument:
        raise HTTPException(status_code=404, detail=f"Argument with id {argument_id} not found")
    
    user_id, _ = ensure_user_profile(user_data)
    votes, user_vote_status = database.downvote_argument(argument_id, user_id)
    return {
        "argument_id": argument_id,
        "votes": votes,
        "user_vote": user_vote_status
    }

@router.get("/{argument_id}/comments", response_model=list[CommentResponse])
async def get_comments(argument_id: int):
    """Get all comments for an argument."""
    argument = database.get_argument(argument_id)
    if not argument:
        raise HTTPException(status_code=404, detail=f"Argument with id {argument_id} not found")

    return database.get_comments(argument_id)

@router.post("/{argument_id}/comment", response_model=CommentCreateResponse, status_code=201)
async def comment_on_argument(
    argument_id: int, 
    comment: CommentCreate,
    user_data: dict = Depends(get_current_user)
):
    """Create a new comment on an argument."""
    argument = database.get_argument(argument_id)
    if not argument:
        raise HTTPException(status_code=404, detail=f"Argument with id {argument_id} not found")

    user_id, _ = ensure_user_profile(user_data)
    comment_id = database.create_comment(argument_id, comment.comment, user_id=user_id)
    return CommentCreateResponse(comment_id=comment_id)