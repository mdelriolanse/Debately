import os
import json
from pathlib import Path
from typing import List, Dict
from anthropic import Anthropic
import logging

logger = logging.getLogger(__name__)

env_path = Path(__file__).parent / '.env'

# Initialize Claude client
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
if not ANTHROPIC_API_KEY:
    raise ValueError("ANTHROPIC_API_KEY environment variable is required")

client = Anthropic(api_key=ANTHROPIC_API_KEY)
MODEL = "claude-sonnet-4-20250514"

response_json = """
    {
        "original_input": "The user's original input, quoted verbatim",
        "is_valid": <boolean>,
        "rejection_reason": <str or None>,
        "interpretation": "A brief sentence explaining how you understood the user's intent and what angle(s) they seem interested in",
        "suggestions": [
            {
            "proposition": "The formal debate proposition",
            "type": "policy | value | fact"
            }
        ]
    }
"""

prompt_template = """
    <role>
    You are a debate proposition formatter. Your task is to take a user's input—whether it's a question, a vague topic, or a rough statement—and convert it into formal debate propositions suitable for a speech and debate competition.
    </role>

    <guidelines>
    A good proposition is:
    - A clear declarative statement (not a question)
    - Concise, typically one sentence
    - Balanced enough that reasonable people could argue either side
    - Written in a formal but accessible register
    - Specific enough to be meaningfully debated, but not so narrow it limits argumentation
    </guidelines>

    <proposition_types>
    Policy: Advocates for a specific action. Often begins with "The United States federal government should..." or "This house would..." Example: "The United States federal government should implement universal basic income."

    Value: Makes a comparative or evaluative claim. Often uses framing like "X is more important than Y" or "X has done more harm than good." Example: "Individual privacy is more important than national security."

    Fact: Asserts something is true or will occur. Example: "Artificial intelligence will displace more jobs than it creates."
    </proposition_types>

    <user_proposition>
    {proposition}
    </user_proposition>

    <output_format>
    Respond with valid JSON only, no markdown code fences or explanation.
    {response_json}
    </output_format>

    <validity_rules>
    The is_valid signals to the pipeline if the proposition is an appropriate baseline for coherent debate.
    It should be returned as True if it follows the guidelines mentioned above.

    If the input contains one of the following flaws, return is_valid as False:
    - Is nonsensical, incoherent, or too vague to interpret
    - Contains harmful, hateful, or inappropriate content
    - Is not a topic that can be reasonably debated (e.g., purely personal questions, factual lookups with no room for disagreement)

    When is_valid is false, set interpretation to null and suggestions to an empty array.
    </validity_rules>

    <requirements>
    - Provide exactly 5 suggestions, ordered from most to least aligned with the user's apparent intent
    - Each suggestion should offer a meaningfully different angle or framing on the topic
    - Vary the proposition types where appropriate
    </requirements>
"""

def validate_proposition(proposition: str):
    try:
        # Format the prompt template with the user's proposition
        formatted_prompt = prompt_template.format(
            proposition=proposition,
            response_json=response_json
        )
        
        message = client.messages.create(
            model=MODEL,
            max_tokens=4096,
            messages=[
                {
                    "role": "user",
                    "content": formatted_prompt
                }
            ]
        )

        response_text = message.content[0].text.strip()
        
        # Try to parse JSON from the response
        # Claude might wrap JSON in markdown code blocks
        # TODO standardize JSON unpacking from Claude API.
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()
        
        result = json.loads(response_text)

        if not all(key in result for key in ['original_input', 'is_valid', 'rejection_reason', 'interpretation', 'suggestions']):
            raise ValueError("Missing required fields in Claude response")
        
        if not isinstance(result['suggestions'], list):
            raise ValueError("suggestions must be a list")

        logger.info(f"Successfully unpacked Claude proposition validation response: {json.dumps(result, indent=2)}")

        return result

    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse JSON from Claude response: {e}")

    except Exception as e:
        raise RuntimeError(f"Claude API error: {e}")