from fastapi import APIRouter, HTTPException
import database
from models import CommentCreate, CommentCreateResponse, CommentResponse
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/arguments", tags=["voting"])

@router.post("/{argument_id}/upvote")
async def upvote_argument(argument_id: int):
    """Upvote an argument. Increments vote count by 1."""
    # Validate argument exists
    argument = database.get_argument(argument_id)
    if not argument:
        raise HTTPException(status_code=404, detail=f"Argument with id {argument_id} not found")
    
    try:
        votes = database.upvote_argument(argument_id)
        return {"argument_id": argument_id, "votes": votes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upvote argument: {str(e)}")

@router.post("/{argument_id}/downvote")
async def downvote_argument(argument_id: int):
    """Downvote an argument. Decrements vote count by 1."""
    # Validate argument exists
    argument = database.get_argument(argument_id)
    if not argument:
        raise HTTPException(status_code=404, detail=f"Argument with id {argument_id} not found")
    
    try:
        votes = database.downvote_argument(argument_id)
        return {"argument_id": argument_id, "votes": votes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to downvote argument: {str(e)}")

@router.get("/{argument_id}/comments", response_model=list[CommentResponse])
async def get_comments(argument_id: int):
    """Get all comments for an argument."""
    logger.info(f"Fetching comments for argument {argument_id}")
    
    # Validate argument exists
    argument = database.get_argument(argument_id)
    if not argument:
        logger.error(f"Argument {argument_id} not found")
        raise HTTPException(status_code=404, detail=f"Argument with id {argument_id} not found")

    try:
        comments = database.get_comments(argument_id)
        logger.info(f"Successfully fetched {len(comments)} comments for argument {argument_id}")
        return comments
    except HTTPException:
        # Re-raise HTTP exceptions (like 404) without modification
        raise
    except Exception as e:
        logger.error(f"Exception in get_comments: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get comments: {str(e)}")

@router.post("/{argument_id}/comment", response_model=CommentCreateResponse, status_code=201)
async def comment_on_argument(argument_id: int, comment: CommentCreate):
    """Create a new comment on an argument."""
    logger.info(f"Creating comment for argument {argument_id}")
    
    # Validate argument exists
    argument = database.get_argument(argument_id)
    if not argument:
        logger.error(f"Argument {argument_id} not found")
        raise HTTPException(status_code=404, detail=f"Argument with id {argument_id} not found")

    try:
        comment_id = database.create_comment(argument_id, comment.comment)
        logger.info(f"Successfully created comment {comment_id} for argument {argument_id}")
        return CommentCreateResponse(comment_id=comment_id)
    except HTTPException:
        # Re-raise HTTP exceptions (like 404) without modification
        raise
    except Exception as e:
        logger.error(f"Exception in comment_on_argument: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to comment on argument: {str(e)}")