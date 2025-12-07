import psycopg2
from datetime import timezone
from psycopg2.extras import RealDictCursor
from datetime import datetime
from typing import Optional, List
from uuid import UUID
import json
from config import config

# Database connection parameters from immutable config
DB_HOST = config.DB_HOST
DB_PORT = config.DB_PORT
DB_NAME = config.DB_NAME
DB_USER = config.DB_USER
DB_PASSWORD = config.DB_PASSWORD

def get_db_connection():
    """Get a database connection."""
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        sslmode='require',
        connect_timeout=10
    )
    return conn

def _format_datetime_to_iso(dt) -> Optional[str]:
    """Convert datetime object to ISO format string."""
    if dt is None:
        return None
    if isinstance(dt, datetime):
        return dt.isoformat()
    return str(dt) if dt else None

def init_db():
    """Initialize the database with tables."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create user_profiles table first (referenced by other tables)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_profiles (
            id UUID PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT NOT NULL,
            avatar_url TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Create topics table (using UUID for id)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS topics (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            proposition TEXT NOT NULL,
            created_by TEXT NOT NULL,
            user_id UUID,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            overall_summary TEXT,
            consensus_view TEXT,
            timeline_view TEXT,
            FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE SET NULL
        )
    """)
    
    # Create arguments table (topic_id is UUID)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS arguments (
            id SERIAL PRIMARY KEY,
            topic_id UUID NOT NULL,
            side TEXT NOT NULL CHECK(side IN ('pro', 'con')),
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            sources TEXT,
            author TEXT NOT NULL,
            user_id UUID,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE SET NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS comments (
            id SERIAL PRIMARY KEY,
            argument_id INTEGER NOT NULL,
            comment TEXT NOT NULL,
            user_id UUID,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (argument_id) REFERENCES arguments(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE SET NULL
        )
    """)
    
    # Create api_usage table for tracking global API call limits
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS api_usage (
            id SERIAL PRIMARY KEY,
            api_name TEXT UNIQUE NOT NULL,
            call_count INTEGER NOT NULL DEFAULT 0,
            last_reset TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    conn.commit()
    cursor.close()
    conn.close()
    
    # Run migration to add user_id columns if they don't exist
    migrate_add_user_id_columns()

def ensure_argument_matches_table():
    """Ensure the argument_matches table exists (safe to call repeatedly)."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS argument_matches (
            id SERIAL PRIMARY KEY,
            topic_id UUID NOT NULL,
            pro_id INTEGER NOT NULL,
            con_id INTEGER NOT NULL,
            reason TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
        )
    """)
    conn.commit()
    cursor.close()
    conn.close()

def get_topic(topic_id: str) -> Optional[dict]:
    """Get a topic by UUID."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute("SELECT * FROM topics WHERE id = %s", (topic_id,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    
    if row:
        topic = dict(row)
        topic['id'] = str(topic['id'])  # Convert UUID to string
        topic['created_at'] = _format_datetime_to_iso(topic.get('created_at'))
        return topic
    return None

def create_topic(proposition: str, created_by: str, user_id: Optional[UUID] = None) -> dict:
    """Create a new topic and return the full topic data."""
    import uuid as uuid_module
    topic_uuid = str(uuid_module.uuid4())
    
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute(
        "INSERT INTO topics (id, proposition, created_by, user_id, created_at) VALUES (%s, %s, %s, %s, %s) RETURNING *",
        (topic_uuid, proposition, created_by, str(user_id) if user_id else None, datetime.now(timezone.utc))
    )
    row = cursor.fetchone()
    conn.commit()
    cursor.close()
    conn.close()
    if row:
        topic = dict(row)
        topic['id'] = str(topic['id'])  # Convert UUID to string
        topic['created_at'] = _format_datetime_to_iso(topic.get('created_at'))
        return topic
    return None

def get_all_topics() -> list:
    """Get all topics with pro/con counts and validity metrics."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    # First get basic topic info with counts
    cursor.execute("""
        SELECT 
            t.id,
            t.proposition,
            t.created_by,
            t.created_at,
            COUNT(CASE WHEN a.side = 'pro' THEN 1 END) as pro_count,
            COUNT(CASE WHEN a.side = 'con' THEN 1 END) as con_count
        FROM topics t
        LEFT JOIN arguments a ON t.id = a.topic_id
        GROUP BY t.id, t.proposition, t.created_by, t.created_at
        ORDER BY t.created_at DESC
    """)
    
    topics = [dict(row) for row in cursor.fetchall()]
    
    # Convert datetime to ISO string and calculate validity metrics for each topic
    for topic in topics:
        topic['id'] = str(topic['id'])  # Convert UUID to string
        topic['created_at'] = _format_datetime_to_iso(topic.get('created_at'))
        topic_id = topic['id']
        
        # Get average validity for PRO arguments
        cursor.execute("""
            SELECT AVG(validity_score) as avg_validity
            FROM arguments
            WHERE topic_id = %s AND side = 'pro' AND validity_score IS NOT NULL
        """, (topic_id,))
        pro_avg_result = cursor.fetchone()
        pro_avg = pro_avg_result['avg_validity'] if pro_avg_result and pro_avg_result['avg_validity'] is not None else None
        if pro_avg is not None:
            topic['pro_avg_validity'] = float(round(pro_avg, 1))
        else:
            topic['pro_avg_validity'] = None
        
        # Get average validity for CON arguments
        cursor.execute("""
            SELECT AVG(validity_score) as avg_validity
            FROM arguments
            WHERE topic_id = %s AND side = 'con' AND validity_score IS NOT NULL
        """, (topic_id,))
        con_avg_result = cursor.fetchone()
        con_avg = con_avg_result['avg_validity'] if con_avg_result and con_avg_result['avg_validity'] is not None else None
        if con_avg is not None:
            topic['con_avg_validity'] = float(round(con_avg, 1))
        else:
            topic['con_avg_validity'] = None
        
        # Calculate controversy level (only when there are more than 6 arguments)
        pro_count = topic['pro_count']
        con_count = topic['con_count']
        total_count = pro_count + con_count
        
        if total_count == 0 or total_count <= 6:
            topic['controversy_level'] = None
        else:
            # Calculate balance ratio (closer to 0.5 = more balanced/contested)
            balance_ratio = min(pro_count, con_count) / total_count if total_count > 0 else 0
            
            if balance_ratio >= 0.4:
                # Highly balanced (40%+ on both sides)
                topic['controversy_level'] = "Highly Contested"
            elif balance_ratio >= 0.25:
                # Moderately balanced (25-40% on smaller side)
                topic['controversy_level'] = "Moderately Contested"
            else:
                # One-sided (less than 25% on smaller side)
                topic['controversy_level'] = "Clear Consensus"
    
    cursor.close()
    conn.close()
    return topics

def get_topic_with_arguments(topic_id: str) -> Optional[dict]:
    """Get a topic with its arguments, sorted by validity score (highest first)."""
    topic = get_topic(topic_id)
    if not topic:
        return None
    
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    # Sort by validity_score DESC (nulls last), then created_at DESC
    cursor.execute("""
        SELECT * FROM arguments 
        WHERE topic_id = %s 
        ORDER BY 
            CASE WHEN validity_score IS NULL THEN 1 ELSE 0 END,
            validity_score DESC,
            created_at DESC
    """, (topic_id,))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    
    arguments = [dict(row) for row in rows]
    # Parse key_urls JSON and convert timestamps for each argument
    for arg in arguments:
        arg['topic_id'] = str(arg['topic_id'])  # Convert UUID to string
        if arg.get('key_urls'):
            try:
                arg['key_urls'] = json.loads(arg['key_urls'])
            except (json.JSONDecodeError, TypeError):
                arg['key_urls'] = []
        else:
            arg['key_urls'] = []
        # Convert datetime fields to ISO strings
        arg['created_at'] = _format_datetime_to_iso(arg.get('created_at'))
        arg['validity_checked_at'] = _format_datetime_to_iso(arg.get('validity_checked_at'))
    
    pro_arguments = [arg for arg in arguments if arg['side'] == 'pro']
    con_arguments = [arg for arg in arguments if arg['side'] == 'con']
    
    # Parse timeline_view if it exists
    timeline_view = None
    if topic.get('timeline_view'):
        try:
            timeline_view = json.loads(topic['timeline_view'])
        except (json.JSONDecodeError, TypeError):
            timeline_view = None
    
    return {
        'id': topic['id'],
        'proposition': topic['proposition'],
        'created_by': topic['created_by'],
        'created_at': _format_datetime_to_iso(topic.get('created_at')),
        'pro_arguments': pro_arguments,
        'con_arguments': con_arguments,
        'overall_summary': topic.get('overall_summary'),
        'consensus_view': topic.get('consensus_view'),
        'timeline_view': timeline_view
    }

def create_argument(topic_id: str, side: str, title: str, content: str, author: str, sources: Optional[str] = None, user_id: Optional[UUID] = None) -> int:
    """Create a new argument and return its ID."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """INSERT INTO arguments (topic_id, side, title, content, sources, author, user_id, created_at) 
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id""",
        (topic_id, side, title, content, sources, author, str(user_id) if user_id else None, datetime.now(timezone.utc))
    )
    argument_id = cursor.fetchone()[0]
    conn.commit()
    cursor.close()
    conn.close()
    return argument_id

def get_arguments(topic_id: str, side: Optional[str] = None) -> list:
    """Get arguments for a topic, optionally filtered by side."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    if side and side in ['pro', 'con']:
        cursor.execute(
            "SELECT * FROM arguments WHERE topic_id = %s AND side = %s ORDER BY created_at ASC",
            (topic_id, side)
        )
    else:
        cursor.execute(
            "SELECT * FROM arguments WHERE topic_id = %s ORDER BY created_at ASC",
            (topic_id,)
        )
    
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    arguments = [dict(row) for row in rows]
    # Convert datetime to ISO string for each argument
    for arg in arguments:
        arg['topic_id'] = str(arg['topic_id'])  # Convert UUID to string
        arg['created_at'] = _format_datetime_to_iso(arg.get('created_at'))
        arg['validity_checked_at'] = _format_datetime_to_iso(arg.get('validity_checked_at'))
    return arguments

def get_argument_counts(topic_id: str) -> dict:
    """Get pro and con argument counts for a topic."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute("""
        SELECT 
            COUNT(CASE WHEN side = 'pro' THEN 1 END) as pro_count,
            COUNT(CASE WHEN side = 'con' THEN 1 END) as con_count
        FROM arguments
        WHERE topic_id = %s
    """, (topic_id,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    return dict(row) if row else {'pro_count': 0, 'con_count': 0}

def update_topic_analysis(topic_id: str, overall_summary: str, consensus_view: str, timeline_view: list):
    """Update topic with generated analysis."""
    conn = get_db_connection()
    cursor = conn.cursor()
    timeline_json = json.dumps(timeline_view) if timeline_view else None
    cursor.execute(
        """UPDATE topics 
           SET overall_summary = %s, consensus_view = %s, timeline_view = %s
           WHERE id = %s""",
        (overall_summary, consensus_view, timeline_json, topic_id)
    )
    conn.commit()
    cursor.close()
    conn.close()

def migrate_add_validity_columns():
    """Add validity-related columns to arguments table if they don't exist."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Check if columns exist using PostgreSQL information_schema
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'arguments' AND table_schema = 'public'
        """)
        columns = [row[0] for row in cursor.fetchall()]
        
        # Add columns if they don't exist
        if 'validity_score' not in columns:
            cursor.execute("ALTER TABLE arguments ADD COLUMN validity_score INTEGER")
        if 'validity_reasoning' not in columns:
            cursor.execute("ALTER TABLE arguments ADD COLUMN validity_reasoning TEXT")
        if 'validity_checked_at' not in columns:
            cursor.execute("ALTER TABLE arguments ADD COLUMN validity_checked_at TIMESTAMP")
        if 'key_urls' not in columns:
            cursor.execute("ALTER TABLE arguments ADD COLUMN key_urls TEXT")
        
        conn.commit()
    except Exception as e:
        # If error occurs, rollback
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()

def migrate_add_votes_column():
    """Add votes column to arguments table if it doesn't exist."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'arguments' AND table_schema = 'public'
        """)
        columns = [row[0] for row in cursor.fetchall()]
        
        if 'votes' not in columns:
            cursor.execute("ALTER TABLE arguments ADD COLUMN votes INTEGER DEFAULT 0")
            conn.commit()
    except Exception as e:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()

def migrate_add_user_id_columns():
    """Add user_id UUID columns to topics, arguments, and comments tables if they don't exist."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Check and add user_id to topics
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'topics' AND table_schema = 'public'
        """)
        topic_columns = [row[0] for row in cursor.fetchall()]
        if 'user_id' not in topic_columns:
            cursor.execute("ALTER TABLE topics ADD COLUMN user_id UUID")
            cursor.execute("ALTER TABLE topics ADD CONSTRAINT fk_topics_user FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE SET NULL")
        
        # Check and add user_id to arguments
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'arguments' AND table_schema = 'public'
        """)
        arg_columns = [row[0] for row in cursor.fetchall()]
        if 'user_id' not in arg_columns:
            cursor.execute("ALTER TABLE arguments ADD COLUMN user_id UUID")
            cursor.execute("ALTER TABLE arguments ADD CONSTRAINT fk_arguments_user FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE SET NULL")
        
        # Check and add user_id to comments
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'comments' AND table_schema = 'public'
        """)
        comment_columns = [row[0] for row in cursor.fetchall()]
        if 'user_id' not in comment_columns:
            cursor.execute("ALTER TABLE comments ADD COLUMN user_id UUID")
            cursor.execute("ALTER TABLE comments ADD CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE SET NULL")
        
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()

def get_argument(argument_id: int) -> Optional[dict]:
    """Get a single argument by ID."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute("SELECT * FROM arguments WHERE id = %s", (argument_id,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    
    if row:
        arg = dict(row)
        arg['topic_id'] = str(arg['topic_id'])  # Convert UUID to string
        # Parse key_urls JSON if it exists
        if arg.get('key_urls'):
            try:
                arg['key_urls'] = json.loads(arg['key_urls'])
            except (json.JSONDecodeError, TypeError):
                arg['key_urls'] = []
        else:
            arg['key_urls'] = []
        # Convert datetime fields to ISO strings
        arg['created_at'] = _format_datetime_to_iso(arg.get('created_at'))
        arg['validity_checked_at'] = _format_datetime_to_iso(arg.get('validity_checked_at'))
        return arg
    return None

def update_argument(argument_id: int, title: str, content: str, sources: Optional[str] = None):
    """Update an argument's title, content, and sources."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """UPDATE arguments 
           SET title = %s, content = %s, sources = %s
           WHERE id = %s""",
        (title, content, sources, argument_id)
    )
    conn.commit()
    cursor.close()
    conn.close()

def update_argument_validity(argument_id: int, validity_score: int, validity_reasoning: str, key_urls: Optional[List[str]] = None):
    """Update argument validity fields."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Convert key_urls list to JSON string
    key_urls_json = json.dumps(key_urls) if key_urls else None
    
    cursor.execute(
        """UPDATE arguments 
           SET validity_score = %s, validity_reasoning = %s, validity_checked_at = %s, key_urls = %s
           WHERE id = %s""",
        (validity_score, validity_reasoning, datetime.now(timezone.utc), key_urls_json, argument_id)
    )
    conn.commit()
    cursor.close()
    conn.close()

def get_arguments_sorted_by_validity(topic_id: str, side: Optional[str] = None) -> list:
    """Get arguments sorted by validity score (highest first, unverified at end)."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    if side and side in ['pro', 'con']:
        cursor.execute("""
            SELECT * FROM arguments 
            WHERE topic_id = %s AND side = %s
            ORDER BY 
                CASE WHEN validity_score IS NULL THEN 1 ELSE 0 END,
                validity_score DESC,
                created_at DESC
        """, (topic_id, side))
    else:
        cursor.execute("""
            SELECT * FROM arguments 
            WHERE topic_id = %s
            ORDER BY 
                CASE WHEN validity_score IS NULL THEN 1 ELSE 0 END,
                validity_score DESC,
                created_at DESC
        """, (topic_id,))
    
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    
    arguments = [dict(row) for row in rows]
    # Parse key_urls JSON and convert timestamps for each argument
    for arg in arguments:
        arg['topic_id'] = str(arg['topic_id'])  # Convert UUID to string
        if arg.get('key_urls'):
            try:
                arg['key_urls'] = json.loads(arg['key_urls'])
            except (json.JSONDecodeError, TypeError):
                arg['key_urls'] = []
        else:
            arg['key_urls'] = []
        # Convert datetime fields to ISO strings
        arg['created_at'] = _format_datetime_to_iso(arg.get('created_at'))
        arg['validity_checked_at'] = _format_datetime_to_iso(arg.get('validity_checked_at'))
    
    return arguments

def get_argument_matches(topic_id: str) -> list:
    """Get persisted argument matches for a topic."""
    ensure_argument_matches_table()
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute(
        "SELECT pro_id, con_id, reason FROM argument_matches WHERE topic_id = %s",
        (topic_id,)
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [dict(row) for row in rows]

def save_argument_matches(topic_id: str, matches: list):
    """Save argument matches to database."""
    ensure_argument_matches_table()
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Clear existing matches for this topic
    cursor.execute("DELETE FROM argument_matches WHERE topic_id = %s", (topic_id,))
    
    # Insert new matches
    for match in matches:
        cursor.execute(
            """INSERT INTO argument_matches (topic_id, pro_id, con_id, reason)
               VALUES (%s, %s, %s, %s)""",
            (topic_id, match['pro_id'], match['con_id'], match.get('reason'))
        )
    
    conn.commit()
    cursor.close()
    conn.close()

def delete_argument_matches_for_topic(topic_id: str):
    """Delete all argument matches for a topic."""
    ensure_argument_matches_table()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM argument_matches WHERE topic_id = %s", (topic_id,))
    conn.commit()
    cursor.close()
    conn.close()

def upvote_argument(argument_id: int) -> int:
    """Increment vote count for an argument and return new count."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute(
        "UPDATE arguments SET votes = votes + 1 WHERE id = %s RETURNING votes",
        (argument_id,)
    )
    result = cursor.fetchone()
    votes = result[0] if result else 0
    
    conn.commit()
    cursor.close()
    conn.close()
    return votes

def downvote_argument(argument_id: int) -> int:
    """Decrement vote count for an argument and return new count."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute(
        "UPDATE arguments SET votes = votes - 1 WHERE id = %s RETURNING votes",
        (argument_id,)
    )
    result = cursor.fetchone()
    votes = result[0] if result else 0
    
    conn.commit()
    cursor.close()
    conn.close()
    return votes

def create_comment(argument_id: int, comment: str, user_id: Optional[UUID] = None) -> int:
    """Create a new comment for an argument and return the comment ID."""
    conn = get_db_connection() 
    cursor = conn.cursor()

    cursor.execute(
        """INSERT INTO comments (argument_id, comment, user_id, created_at) VALUES (%s, %s, %s, %s) RETURNING id""",
        (argument_id, comment, str(user_id) if user_id else None, datetime.now(timezone.utc))
    )

    result = cursor.fetchone()
    comment_id = result[0] if result else None
    conn.commit()
    cursor.close()
    conn.close()
    return comment_id

def get_comments(argument_id: int) -> list[dict]:
    """Get all comments for an argument, ordered by creation date (oldest first)."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, argument_id, comment, created_at
        FROM comments
        WHERE argument_id = %s
        ORDER BY created_at ASC
    """, (argument_id,))
    
    rows = cursor.fetchall()
    comments = []
    for row in rows:
        comments.append({
            'id': row[0],
            'argument_id': row[1],
            'comment': row[2],
            'created_at': row[3].isoformat() if row[3] else None
        })
    
    cursor.close()
    conn.close()
    return comments

# User Profile Functions

def create_user_profile(user_id: UUID, email: str, username: str, avatar_url: Optional[str] = None) -> dict:
    """Create a new user profile or update existing one."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Try to update existing profile first
        cursor.execute("""
            UPDATE user_profiles 
            SET username = %s, email = %s, avatar_url = %s, updated_at = %s
            WHERE id = %s
            RETURNING *
        """, (username, email, avatar_url, datetime.now(timezone.utc), str(user_id)))
        
        row = cursor.fetchone()
        
        if not row:
            # Create new profile if it doesn't exist
            cursor.execute("""
                INSERT INTO user_profiles (id, username, email, avatar_url, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (str(user_id), username, email, avatar_url, datetime.now(timezone.utc), datetime.now(timezone.utc)))
            row = cursor.fetchone()
        
        conn.commit()
        
        if row:
            profile = dict(row)
            profile['created_at'] = _format_datetime_to_iso(profile.get('created_at'))
            profile['updated_at'] = _format_datetime_to_iso(profile.get('updated_at'))
            return profile
        return None
    except Exception as e:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()

def get_user_profile(user_id: UUID) -> Optional[dict]:
    """Get a user profile by user_id."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        cursor.execute("SELECT * FROM user_profiles WHERE id = %s", (str(user_id),))
        row = cursor.fetchone()
        
        if row:
            profile = dict(row)
            profile['created_at'] = _format_datetime_to_iso(profile.get('created_at'))
            profile['updated_at'] = _format_datetime_to_iso(profile.get('updated_at'))
            return profile
        return None
    finally:
        cursor.close()
        conn.close()

def get_or_create_user_profile(user_id: UUID, email: str, username: str, avatar_url: Optional[str] = None) -> dict:
    """Get existing user profile or create a new one."""
    profile = get_user_profile(user_id)
    if profile:
        return profile
    return create_user_profile(user_id, email, username, avatar_url)

def delete_user_profile(user_id: UUID) -> bool:
    """Delete a user profile and all associated data."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Check if profile exists
        profile = get_user_profile(user_id)
        if not profile:
            return False
        
        # Delete the user profile
        # Foreign keys are set to ON DELETE SET NULL, so topics, arguments, and comments
        # will have their user_id set to NULL automatically
        cursor.execute("DELETE FROM user_profiles WHERE id = %s", (str(user_id),))
        
        conn.commit()
        return cursor.rowcount > 0
    except Exception as e:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


def get_user_contribution_count(user_id: UUID) -> int:
    """Get total count of topics + arguments created by a user."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Count topics created by user
        cursor.execute(
            "SELECT COUNT(*) FROM topics WHERE user_id = %s",
            (str(user_id),)
        )
        topic_count = cursor.fetchone()[0]
        
        # Count arguments created by user
        cursor.execute(
            "SELECT COUNT(*) FROM arguments WHERE user_id = %s",
            (str(user_id),)
        )
        argument_count = cursor.fetchone()[0]
        
        return topic_count + argument_count
    finally:
        cursor.close()
        conn.close()


# API Usage Tracking Functions

def get_api_call_count(api_name: str) -> int:
    """Get the current call count for an API."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            "SELECT call_count FROM api_usage WHERE api_name = %s",
            (api_name,)
        )
        result = cursor.fetchone()
        return result[0] if result else 0
    finally:
        cursor.close()
        conn.close()


def increment_api_call_count(api_name: str) -> int:
    """Increment the call count for an API and return the new count."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Use upsert to handle first-time insertion
        cursor.execute("""
            INSERT INTO api_usage (api_name, call_count, last_reset)
            VALUES (%s, 1, CURRENT_TIMESTAMP)
            ON CONFLICT (api_name) 
            DO UPDATE SET call_count = api_usage.call_count + 1
            RETURNING call_count
        """, (api_name,))
        
        result = cursor.fetchone()
        conn.commit()
        return result[0] if result else 1
    finally:
        cursor.close()
        conn.close()


def check_api_limit(api_name: str, limit: int = 750) -> bool:
    """Check if an API is under its call limit. Returns True if under limit."""
    current_count = get_api_call_count(api_name)
    return current_count < limit


if __name__ == '__main__':
    # Test database connection
    conn = get_db_connection()
    print("Database connection successful!")
    conn.close()