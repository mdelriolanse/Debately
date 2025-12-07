"""
Secure Configuration Module for Debately Backend

This module provides:
- Immutable API key storage with global fallbacks
- Centralized configuration management
- Protection against runtime modification
- Single source of truth for all sensitive credentials
"""

import os
from pathlib import Path
from typing import Final, Optional
from dotenv import load_dotenv

# Load .env file from the backend directory (works in both local and Docker)
_env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=_env_path)


class _ImmutableConfig:
    """
    Immutable configuration container for API keys and sensitive settings.
    
    Uses __slots__ and property decorators to prevent runtime modification.
    Provides globally immutable fallbacks that cannot be overridden.
    """
    
    __slots__ = (
        '_anthropic_api_key',
        '_tavily_api_key',
        '_db_host',
        '_db_port',
        '_db_name',
        '_db_user',
        '_db_password',
        '_supabase_url',
        '_supabase_anon_key',
        '_supabase_jwt_secret',
        '_initialized',
    )
    
    # Global immutable fallback indicator
    # If True, we're using fallback behavior (limited functionality mode)
    _FALLBACK_MODE: Final[bool] = False
    
    def __init__(self):
        # Mark as not yet initialized to prevent partial state
        object.__setattr__(self, '_initialized', False)
        
        # Load Anthropic API Key (REQUIRED)
        anthropic_key = os.getenv("ANTHROPIC_API_KEY")
        if not anthropic_key:
            raise ValueError(
                "ANTHROPIC_API_KEY environment variable is required. "
                "Please set it in your .env file or environment."
            )
        object.__setattr__(self, '_anthropic_api_key', anthropic_key)
        
        # Load Tavily API Key (REQUIRED)
        tavily_key = os.getenv("TAVILY_API_KEY")
        if not tavily_key:
            raise ValueError(
                "TAVILY_API_KEY environment variable is required. "
                "Please set it in your .env file or environment."
            )
        object.__setattr__(self, '_tavily_api_key', tavily_key)
        
        # Database configuration
        object.__setattr__(self, '_db_host', os.getenv("DB_HOST"))
        object.__setattr__(self, '_db_port', os.getenv("DB_PORT", "5432"))
        object.__setattr__(self, '_db_name', os.getenv("DB_NAME", "postgres"))
        object.__setattr__(self, '_db_user', os.getenv("DB_USER", "postgres"))
        object.__setattr__(self, '_db_password', os.getenv("DB_PASSWORD"))
        
        # Supabase configuration
        object.__setattr__(self, '_supabase_url', os.getenv("SUPABASE_URL"))
        object.__setattr__(self, '_supabase_anon_key', os.getenv("SUPABASE_ANON_KEY"))
        object.__setattr__(self, '_supabase_jwt_secret', os.getenv("SUPABASE_JWT_SECRET"))
        
        # Mark initialization complete
        object.__setattr__(self, '_initialized', True)
    
    def __setattr__(self, name, value):
        """Prevent any attribute modification after initialization."""
        if getattr(self, '_initialized', False):
            raise AttributeError(
                f"Cannot modify immutable configuration attribute '{name}'. "
                "API keys and configuration are read-only after initialization."
            )
        object.__setattr__(self, name, value)
    
    def __delattr__(self, name):
        """Prevent any attribute deletion."""
        raise AttributeError(
            f"Cannot delete immutable configuration attribute '{name}'. "
            "API keys and configuration are protected."
        )
    
    # =========================================================================
    # API Keys (Immutable Properties)
    # =========================================================================
    
    @property
    def ANTHROPIC_API_KEY(self) -> str:
        """
        Get the Anthropic API key.
        
        This is a globally immutable value that cannot be modified at runtime.
        """
        return self._anthropic_api_key
    
    @property
    def TAVILY_API_KEY(self) -> str:
        """
        Get the Tavily API key.
        
        This is a globally immutable value that cannot be modified at runtime.
        """
        return self._tavily_api_key
    
    # =========================================================================
    # Database Configuration (Immutable Properties)
    # =========================================================================
    
    @property
    def DB_HOST(self) -> Optional[str]:
        """Get the database host."""
        return self._db_host
    
    @property
    def DB_PORT(self) -> str:
        """Get the database port."""
        return self._db_port
    
    @property
    def DB_NAME(self) -> str:
        """Get the database name."""
        return self._db_name
    
    @property
    def DB_USER(self) -> str:
        """Get the database user."""
        return self._db_user
    
    @property
    def DB_PASSWORD(self) -> Optional[str]:
        """Get the database password."""
        return self._db_password
    
    # =========================================================================
    # Supabase Configuration (Immutable Properties)
    # =========================================================================
    
    @property
    def SUPABASE_URL(self) -> Optional[str]:
        """Get the Supabase URL."""
        return self._supabase_url
    
    @property
    def SUPABASE_ANON_KEY(self) -> Optional[str]:
        """Get the Supabase anonymous key."""
        return self._supabase_anon_key
    
    @property
    def SUPABASE_JWT_SECRET(self) -> Optional[str]:
        """Get the Supabase JWT secret."""
        return self._supabase_jwt_secret
    
    # =========================================================================
    # API Rate Limits (Immutable Constants)
    # =========================================================================
    
    @property
    def API_CALL_LIMIT(self) -> int:
        """Global API call limit per service (immutable)."""
        return 750
    
    # =========================================================================
    # Model Configuration (Immutable Constants)
    # =========================================================================
    
    @property
    def CLAUDE_MODEL_STANDARD(self) -> str:
        """Standard Claude model for complex tasks."""
        return "claude-sonnet-4-20250514"
    
    @property
    def CLAUDE_MODEL_FAST(self) -> str:
        """Fast Claude model for simple tasks like fact-checking."""
        return "claude-3-haiku-20240307"


# =============================================================================
# Global Immutable Configuration Instance
# =============================================================================

# Create the singleton config instance at module load time
# This ensures all API keys are validated once at startup
config: Final[_ImmutableConfig] = _ImmutableConfig()


# =============================================================================
# Security Utilities
# =============================================================================

def mask_api_key(key: str, visible_chars: int = 4) -> str:
    """
    Mask an API key for safe logging/display.
    
    Args:
        key: The API key to mask
        visible_chars: Number of characters to show at the end
    
    Returns:
        Masked key string like "sk-...xxxx"
    """
    if not key or len(key) <= visible_chars:
        return "***"
    prefix = key[:3] if key.startswith("sk-") else ""
    suffix = key[-visible_chars:]
    return f"{prefix}...{suffix}"


def verify_config_integrity() -> dict:
    """
    Verify that all required configuration is properly loaded.
    
    Returns:
        Dictionary with verification status for each required config item.
    """
    return {
        "anthropic_api_key": bool(config.ANTHROPIC_API_KEY),
        "tavily_api_key": bool(config.TAVILY_API_KEY),
        "db_host": bool(config.DB_HOST),
        "db_password": bool(config.DB_PASSWORD),
        "api_call_limit": config.API_CALL_LIMIT,
        "claude_model_standard": config.CLAUDE_MODEL_STANDARD,
        "claude_model_fast": config.CLAUDE_MODEL_FAST,
    }

