from fastapi import APIRouter, HTTPException
import database

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

