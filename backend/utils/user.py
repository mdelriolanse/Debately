"""User utility functions for ensuring user profiles exist."""

from uuid import UUID
import database


def ensure_user_profile(user_data: dict) -> tuple[UUID, str]:
    """
    Ensure a user profile exists for the authenticated user.
    Creates the profile if it doesn't exist.
    
    Args:
        user_data: The user data dict from get_current_user middleware
        
    Returns:
        Tuple of (user_id, username)
        
    Raises:
        ValueError: If user_id is invalid
    """
    user_id = UUID(user_data['user_id'])
    user_metadata = user_data.get('user_metadata', {})
    email = user_data.get('email', '')
    
    # Determine username from metadata or email
    username = (
        user_metadata.get('full_name') or 
        user_metadata.get('name') or 
        email.split('@')[0] if email else 'user'
    )
    
    # Ensure user profile exists (creates if it doesn't exist)
    # This is required because tables have foreign key constraints on user_id
    profile = database.get_or_create_user_profile(
        user_id=user_id,
        email=email,
        username=username,
        avatar_url=user_metadata.get('avatar_url')
    )
    
    # Return user_id and username from profile (may have been updated)
    return user_id, profile['username']

