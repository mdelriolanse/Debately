from fastapi import APIRouter, HTTPException, Depends
import database
import fact_checker
import claude_service
from validate_proposition import validate_proposition
from middleware.auth import get_current_user
from models import PropositionValidateRequest, PropositionValidationResponse, TopicCreate, TopicResponse, TopicListItem, TopicDetailResponse
from utils.user import ensure_user_profile

router = APIRouter(prefix="/api/topics", tags=["topics"])

@router.post("/validate-proposition", tags=["topics"])
async def validate_proposition_endpoint(request: PropositionValidateRequest):
    """Validate a proposition and return suggestions"""
    result = validate_proposition(request.proposition)
    return PropositionValidationResponse(**result)

@router.post("", response_model=TopicResponse, status_code=201, tags=["topics"])
async def create_topic(
    topic: TopicCreate,
    user_data: dict = Depends(get_current_user)
):
    """Create a new debate topic."""
    user_id, username = ensure_user_profile(user_data)
    
    topic_data = database.create_topic(
        proposition=topic.proposition,
        created_by=username,
        user_id=user_id
    )
    if not topic_data:
        raise HTTPException(status_code=500, detail="Failed to create topic")
    
    return TopicResponse(
        topic_id=topic_data['id'],
        proposition=topic_data['proposition'],
        created_by=topic_data['created_by'],
        created_at=topic_data.get('created_at')
    )

@router.get("", response_model=list[TopicListItem])
async def get_topics():
    """Get all topics with pro/con argument counts."""
    topics = database.get_all_topics()
    return [TopicListItem(**topic) for topic in topics]

@router.get("/{topic_id}", response_model=TopicDetailResponse)
async def get_topic(topic_id: int):
    """
    Get a topic with its arguments and analysis.
    Automatically verifies arguments and generates Claude analysis if missing.
    Arguments are always sorted by validity score (highest first).
    """
    topic_data = database.get_topic_with_arguments(topic_id)
    if not topic_data:
        raise HTTPException(status_code=404, detail=f"Topic with id {topic_id} not found")
    
    # Check if any arguments need verification
    all_arguments = topic_data['pro_arguments'] + topic_data['con_arguments']
    needs_verification = any(
        arg.get('validity_score') is None for arg in all_arguments
    )
    
    # Auto-verify all arguments if needed
    if needs_verification and all_arguments:
        for arg in all_arguments:
            if arg.get('validity_score') is None:
                try:
                    verdict = fact_checker.verify_argument(
                        title=arg['title'],
                        content=arg['content'],
                        debate_proposition=topic_data['proposition']
                    )
                    database.update_argument_validity(
                        argument_id=arg['id'],
                        validity_score=verdict.validity_score,
                        validity_reasoning=verdict.reasoning,
                        key_urls=verdict.key_urls
                    )
                except Exception:
                    # Continue even if verification fails for one argument
                    pass
        
        # Refetch topic data with updated validity scores
        topic_data = database.get_topic_with_arguments(topic_id)
    
    # Check if Claude analysis is missing
    needs_analysis = (
        not topic_data.get('overall_summary') or
        not topic_data.get('consensus_view') or
        not topic_data.get('timeline_view')
    )
    
    # Auto-generate Claude analysis if needed
    if needs_analysis:
        pro_args = topic_data['pro_arguments']
        con_args = topic_data['con_arguments']
        
        if pro_args and con_args:
            try:
                result = claude_service.generate_summary(
                    proposition=topic_data['proposition'],
                    pro_arguments=pro_args,
                    con_arguments=con_args
                )
                database.update_topic_analysis(
                    topic_id=topic_id,
                    overall_summary=result['overall_summary'],
                    consensus_view=result['consensus_view'],
                    timeline_view=result['timeline_view']
                )
                # Update topic_data with new analysis
                topic_data['overall_summary'] = result['overall_summary']
                topic_data['consensus_view'] = result['consensus_view']
                topic_data['timeline_view'] = result['timeline_view']
            except Exception:
                # Continue even if analysis generation fails
                pass
    
    return TopicDetailResponse(**topic_data)

