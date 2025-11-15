import sqlite3
from datetime import datetime
from typing import Optional, List
import json

DATABASE_FILE = "debate_platform.db"

def get_db_connection():
    """Get a database connection."""
    conn = sqlite3.connect(DATABASE_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize the database with tables."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create topics table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS topics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question TEXT NOT NULL,
            created_by TEXT NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            overall_summary TEXT,
            consensus_view TEXT,
            timeline_view TEXT
        )
    """)
    
    # Create arguments table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS arguments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            topic_id INTEGER NOT NULL,
            side TEXT NOT NULL CHECK(side IN ('pro', 'con')),
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            sources TEXT,
            author TEXT NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
        )
    """)
    
    conn.commit()
    conn.close()

def ensure_argument_matches_table():
    """Ensure the argument_matches table exists (safe to call repeatedly)."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS argument_matches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            topic_id INTEGER NOT NULL,
            pro_id INTEGER NOT NULL,
            con_id INTEGER NOT NULL,
            reason TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
        )
    """)
    conn.commit()
    conn.close()

def get_topic(topic_id: int) -> Optional[dict]:
    """Get a topic by ID."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM topics WHERE id = ?", (topic_id,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return dict(row)
    return None

def create_topic(question: str, created_by: str) -> int:
    """Create a new topic and return its ID."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO topics (question, created_by, created_at) VALUES (?, ?, ?)",
        (question, created_by, datetime.utcnow().isoformat())
    )
    topic_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return topic_id

def get_all_topics() -> list:
    """Get all topics with pro/con counts and validity metrics."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # First get basic topic info with counts
    cursor.execute("""
        SELECT 
            t.id,
            t.question,
            t.created_by,
            t.created_at,
            COUNT(CASE WHEN a.side = 'pro' THEN 1 END) as pro_count,
            COUNT(CASE WHEN a.side = 'con' THEN 1 END) as con_count
        FROM topics t
        LEFT JOIN arguments a ON t.id = a.topic_id
        GROUP BY t.id, t.question, t.created_by, t.created_at
        ORDER BY t.created_at DESC
    """)
    
    topics = [dict(row) for row in cursor.fetchall()]
    
    # Calculate validity metrics for each topic
    for topic in topics:
        topic_id = topic['id']
        
        # Get average validity for PRO arguments
        cursor.execute("""
            SELECT AVG(validity_score) as avg_validity
            FROM arguments
            WHERE topic_id = ? AND side = 'pro' AND validity_score IS NOT NULL
        """, (topic_id,))
        pro_avg_result = cursor.fetchone()
        pro_avg = pro_avg_result[0] if pro_avg_result and pro_avg_result[0] is not None else None
        if pro_avg is not None:
            topic['pro_avg_validity'] = float(round(pro_avg, 1))
        else:
            topic['pro_avg_validity'] = None
        
        # Get average validity for CON arguments
        cursor.execute("""
            SELECT AVG(validity_score) as avg_validity
            FROM arguments
            WHERE topic_id = ? AND side = 'con' AND validity_score IS NOT NULL
        """, (topic_id,))
        con_avg_result = cursor.fetchone()
        con_avg = con_avg_result[0] if con_avg_result and con_avg_result[0] is not None else None
        if con_avg is not None:
            topic['con_avg_validity'] = float(round(con_avg, 1))
        else:
            topic['con_avg_validity'] = None
        
        # Calculate controversy level
        pro_count = topic['pro_count']
        con_count = topic['con_count']
        total_count = pro_count + con_count
        
        if total_count == 0:
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
    
    conn.close()
    return topics

def get_topic_with_arguments(topic_id: int) -> Optional[dict]:
    """Get a topic with its arguments, sorted by validity score (highest first)."""
    topic = get_topic(topic_id)
    if not topic:
        return None
    
    conn = get_db_connection()
    cursor = conn.cursor()
    # Sort by validity_score DESC (nulls last), then created_at DESC
    cursor.execute("""
        SELECT * FROM arguments 
        WHERE topic_id = ? 
        ORDER BY 
            CASE WHEN validity_score IS NULL THEN 1 ELSE 0 END,
            validity_score DESC,
            created_at DESC
    """, (topic_id,))
    rows = cursor.fetchall()
    conn.close()
    
    arguments = [dict(row) for row in rows]
    # Parse key_urls JSON for each argument
    for arg in arguments:
        if arg.get('key_urls'):
            try:
                arg['key_urls'] = json.loads(arg['key_urls'])
            except (json.JSONDecodeError, TypeError):
                arg['key_urls'] = []
        else:
            arg['key_urls'] = []
    
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
        'question': topic['question'],
        'created_by': topic['created_by'],
        'created_at': topic['created_at'],
        'pro_arguments': pro_arguments,
        'con_arguments': con_arguments,
        'overall_summary': topic.get('overall_summary'),
        'consensus_view': topic.get('consensus_view'),
        'timeline_view': timeline_view
    }

def create_argument(topic_id: int, side: str, title: str, content: str, author: str, sources: Optional[str] = None) -> int:
    """Create a new argument and return its ID."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """INSERT INTO arguments (topic_id, side, title, content, sources, author, created_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (topic_id, side, title, content, sources, author, datetime.utcnow().isoformat())
    )
    argument_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return argument_id

def get_arguments(topic_id: int, side: Optional[str] = None) -> list:
    """Get arguments for a topic, optionally filtered by side."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if side and side in ['pro', 'con']:
        cursor.execute(
            "SELECT * FROM arguments WHERE topic_id = ? AND side = ? ORDER BY created_at ASC",
            (topic_id, side)
        )
    else:
        cursor.execute(
            "SELECT * FROM arguments WHERE topic_id = ? ORDER BY created_at ASC",
            (topic_id,)
        )
    
    # Create argument_matches table to persist pro/con links
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS argument_matches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            topic_id INTEGER NOT NULL,
            pro_id INTEGER NOT NULL,
            con_id INTEGER NOT NULL,
            reason TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
        )
    """)
    
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_argument_counts(topic_id: int) -> dict:
    """Get pro and con argument counts for a topic."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT 
            COUNT(CASE WHEN side = 'pro' THEN 1 END) as pro_count,
            COUNT(CASE WHEN side = 'con' THEN 1 END) as con_count
        FROM arguments
        WHERE topic_id = ?
    """, (topic_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else {'pro_count': 0, 'con_count': 0}

def update_topic_analysis(topic_id: int, overall_summary: str, consensus_view: str, timeline_view: list):
    """Update topic with generated analysis."""
    conn = get_db_connection()
    cursor = conn.cursor()
    timeline_json = json.dumps(timeline_view) if timeline_view else None
    cursor.execute(
        """UPDATE topics 
           SET overall_summary = ?, consensus_view = ?, timeline_view = ?
           WHERE id = ?""",
        (overall_summary, consensus_view, timeline_json, topic_id)
    )
    conn.commit()
    conn.close()

def migrate_add_validity_columns():
    """Add validity-related columns to arguments table if they don't exist."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if columns exist by trying to query them
    # SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN in older versions,
    # so we'll use a try-except approach or check pragma table_info
    try:
        # Try to get table info
        cursor.execute("PRAGMA table_info(arguments)")
        columns = [row[1] for row in cursor.fetchall()]
        
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
        conn.close()

def migrate_add_votes_column():
    """Add votes column to arguments table if it doesn't exist."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("PRAGMA table_info(arguments)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if 'votes' not in columns:
            cursor.execute("ALTER TABLE arguments ADD COLUMN votes INTEGER DEFAULT 0")
            conn.commit()
    except Exception as e:
        conn.rollback()
        raise
    finally:
        conn.close()

def get_argument(argument_id: int) -> Optional[dict]:
    """Get a single argument by ID."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM arguments WHERE id = ?", (argument_id,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        arg = dict(row)
        # Parse key_urls JSON if it exists
        if arg.get('key_urls'):
            try:
                arg['key_urls'] = json.loads(arg['key_urls'])
            except (json.JSONDecodeError, TypeError):
                arg['key_urls'] = []
        else:
            arg['key_urls'] = []
        return arg
    return None

def update_argument_validity(argument_id: int, validity_score: int, validity_reasoning: str, key_urls: Optional[List[str]] = None):
    """Update argument validity fields."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Convert key_urls list to JSON string
    key_urls_json = json.dumps(key_urls) if key_urls else None
    
    cursor.execute(
        """UPDATE arguments 
           SET validity_score = ?, validity_reasoning = ?, validity_checked_at = ?, key_urls = ?
           WHERE id = ?""",
        (validity_score, validity_reasoning, datetime.utcnow().isoformat(), key_urls_json, argument_id)
    )
    conn.commit()
    conn.close()

def get_arguments_sorted_by_validity(topic_id: int, side: Optional[str] = None) -> list:
    """Get arguments sorted by validity score (highest first, unverified at end)."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if side and side in ['pro', 'con']:
        cursor.execute("""
            SELECT * FROM arguments 
            WHERE topic_id = ? AND side = ?
            ORDER BY 
                CASE WHEN validity_score IS NULL THEN 1 ELSE 0 END,
                validity_score DESC,
                created_at DESC
        """, (topic_id, side))
    else:
        cursor.execute("""
            SELECT * FROM arguments 
            WHERE topic_id = ?
            ORDER BY 
                CASE WHEN validity_score IS NULL THEN 1 ELSE 0 END,
                validity_score DESC,
                created_at DESC
        """, (topic_id,))
    
    rows = cursor.fetchall()
    conn.close()
    
    arguments = [dict(row) for row in rows]
    # Parse key_urls JSON for each argument
    for arg in arguments:
        if arg.get('key_urls'):
            try:
                arg['key_urls'] = json.loads(arg['key_urls'])
            except (json.JSONDecodeError, TypeError):
                arg['key_urls'] = []
        else:
            arg['key_urls'] = []
    
    return arguments

def get_argument_matches(topic_id: int) -> list:
    """Get persisted argument matches for a topic."""
    ensure_argument_matches_table()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT pro_id, con_id, reason FROM argument_matches WHERE topic_id = ?",
        (topic_id,)
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def save_argument_matches(topic_id: int, matches: list):
    """Save argument matches to database."""
    ensure_argument_matches_table()
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Clear existing matches for this topic
    cursor.execute("DELETE FROM argument_matches WHERE topic_id = ?", (topic_id,))
    
    # Insert new matches
    for match in matches:
        cursor.execute(
            """INSERT INTO argument_matches (topic_id, pro_id, con_id, reason)
               VALUES (?, ?, ?, ?)""",
            (topic_id, match['pro_id'], match['con_id'], match.get('reason'))
        )
    
    conn.commit()
    conn.close()

def upvote_argument(argument_id: int) -> int:
    """Increment vote count for an argument and return new count."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute(
        "UPDATE arguments SET votes = votes + 1 WHERE id = ?",
        (argument_id,)
    )
    
    cursor.execute("SELECT votes FROM arguments WHERE id = ?", (argument_id,))
    row = cursor.fetchone()
    votes = row[0] if row else 0
    
    conn.commit()
    conn.close()
    return votes

def downvote_argument(argument_id: int) -> int:
    """Decrement vote count for an argument and return new count."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute(
        "UPDATE arguments SET votes = votes - 1 WHERE id = ?",
        (argument_id,)
    )
    
    cursor.execute("SELECT votes FROM arguments WHERE id = ?", (argument_id,))
    row = cursor.fetchone()
    votes = row[0] if row else 0
    
    conn.commit()
    conn.close()
    return votes

