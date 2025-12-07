from fastapi import APIRouter, HTTPException, Depends
import database
from middleware.auth import get_current_user
from models import CommentCreate, CommentCreateResponse, CommentResponse
from utils.user import ensure_user_profile

router = APIRouter(prefix="/api/arguments", tags=["arguments"])

@router.post("/{argument_id}/upvote")
async def upvote_argument(argument_id: int):
    """Upvote an argument. Increments vote count by 1."""
    argument = database.get_argument(argument_id)
    if not argument:
        raise HTTPException(status_code=404, detail=f"Argument with id {argument_id} not found")
    
    votes = database.upvote_argument(argument_id)
    return {"argument_id": argument_id, "votes": votes}

@router.post("/{argument_id}/downvote")
async def downvote_argument(argument_id: int):
    """Downvote an argument. Decrements vote count by 1."""
    argument = database.get_argument(argument_id)
    if not argument:
        raise HTTPException(status_code=404, detail=f"Argument with id {argument_id} not found")
    
    votes = database.downvote_argument(argument_id)
    return {"argument_id": argument_id, "votes": votes}

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