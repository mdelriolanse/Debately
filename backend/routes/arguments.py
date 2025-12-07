from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional
import database
import fact_checker
from middleware.auth import get_current_user
from models import ArgumentCreate, ArgumentCreateResponse, ArgumentResponse
from utils.user import ensure_user_profile

router = APIRouter(prefix="/api/topics/{topic_id}/arguments", tags=["arguments"])

# Contribution limit per user (topics + arguments combined)
USER_CONTRIBUTION_LIMIT = 25

@router.post("", response_model=ArgumentCreateResponse, status_code=201)
async def create_argument(
    topic_id: str, 
    argument: ArgumentCreate,
    user_data: dict = Depends(get_current_user)
):
    """Create a new argument for a topic."""
    # Validate topic exists
    topic = database.get_topic(topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail=f"Topic with id {topic_id} not found")
    
    # Validate side
    if argument.side not in ['pro', 'con']:
        raise HTTPException(status_code=400, detail="side must be either 'pro' or 'con'")
    
    user_id, username = ensure_user_profile(user_data)
    
    # Check user's contribution quota BEFORE running expensive fact-checker
    contribution_count = database.get_user_contribution_count(user_id)
    if contribution_count >= USER_CONTRIBUTION_LIMIT:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "quota_exceeded",
                "message": f"You've reached the limit of {USER_CONTRIBUTION_LIMIT} contributions (topics + arguments). Thank you for your participation!",
                "current_count": contribution_count,
                "limit": USER_CONTRIBUTION_LIMIT
            }
        )
    
    # Run fact-checker to verify relevance before saving
    verdict = fact_checker.verify_argument(
        title=argument.title,
        content=argument.content,
        debate_proposition=topic['proposition']
    )
    
    # Reject irrelevant arguments
    if not verdict.is_relevant:
        raise HTTPException(status_code=400, detail={
            "error": "Argument not relevant",
            "reasoning": verdict.reasoning,
            "message": f"This argument was rejected as not relevant to the debate proposition: '{topic['proposition']}'. Please submit an argument with factual claims related to the debate."
        })
    
    # Create the argument
    argument_id = database.create_argument(
        topic_id=topic_id,
        side=argument.side,
        title=argument.title,
        content=argument.content,
        author=username,
        sources=argument.sources,
        user_id=user_id
    )
    
    # Save validity score immediately
    database.update_argument_validity(
        argument_id=argument_id,
        validity_score=verdict.validity_score,
        validity_reasoning=verdict.reasoning,
        key_urls=verdict.key_urls
    )
    
    return ArgumentCreateResponse(argument_id=argument_id)


@router.put("/{argument_id}")
async def update_argument(topic_id: str, argument_id: int, argument: ArgumentCreate):
    """Update an existing argument. Clearing persisted matches for the topic so they will be re-evaluated."""
    # Validate topic exists
    topic = database.get_topic(topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail=f"Topic with id {topic_id} not found")

    # Validate argument exists
    args = database.get_arguments(topic_id)
    arg_exists = any(a['id'] == argument_id for a in args)
    if not arg_exists:
        raise HTTPException(status_code=404, detail=f"Argument with id {argument_id} not found in topic {topic_id}")

    database.update_argument(argument_id, argument.title, argument.content, argument.sources)
    # Clear persisted matches for this topic so they will be recomputed on next request
    database.delete_argument_matches_for_topic(topic_id)
    return {"status": "ok"}

@router.get("", response_model=list[ArgumentResponse])
async def get_arguments(
    topic_id: str,
    side: Optional[str] = Query(None, description="Filter by side: 'pro', 'con', or 'both' (default)")
):
    """Get arguments for a topic, optionally filtered by side."""
    # Validate topic exists
    topic = database.get_topic(topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail=f"Topic with id {topic_id} not found")
    
    # Validate side parameter
    if side and side not in ['pro', 'con', 'both']:
        raise HTTPException(status_code=400, detail="side query parameter must be 'pro', 'con', or 'both'")
    
    filter_side = None if (side is None or side == 'both') else side
    arguments = database.get_arguments(topic_id, filter_side)
    return [ArgumentResponse(**arg) for arg in arguments]

