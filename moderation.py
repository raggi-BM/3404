import requests
import json

# Define the URL for the local Ollama instance
OLLAMA_URL = "http://localhost:11434/api/chat"

# Define the model you want to use
# Default MODEL_NAME = "vanilj/hermes-3-llama-3.1-8b:latest"

def check_content_appropriateness(user_prompt, MODEL_NAME="vanilj/hermes-3-llama-3.1-8b:latest"):
    """
    Sends a user prompt to the LLM for content moderation and returns True if the content is approved,
    False otherwise.
    
    Args:
    - user_prompt (str): The content to be checked.
    
    Returns:
    - bool: True if the content is appropriate, False otherwise.
    """
    
    # Define the tool function that the LLM can call
    moderation_tool = {
        "type": "function",
        "function": {
            "name": "approve_content",
            "description": "Approve or disapprove content based on its appropriateness.",
            "parameters": {
                "type": "object",
                "properties": {
                    "approve": {
                        "type": "boolean",
                        "description": "True if content is appropriate, False otherwise."
                    }
                },
                "required": ["approve"]
            }
        }
    }

    # Prepare the payload
    payload = {
        "model": MODEL_NAME,
        "messages": [
            {
                "role": "system",
                "content": "You are a content moderation tool. Your task is to determine if the content contains any curse words, offensive language, or inappropriate content. If the content contains such language, return False. Otherwise, return True. Always ensure your response is clear and in the format: {'approve': True/False}."
            },
            {
                "role": "user",
                "content": user_prompt
            }
        ],
        "tools": [moderation_tool],
        "format": "json",  # Ensure that the response is formatted as JSON
        "stream": False    # Get the response in a single JSON object
    }

    # Send the request to the local Ollama instance
    response = requests.post(OLLAMA_URL, json=payload)

    # Check the response
    if response.status_code == 200:
        llm_response = response.json()

        # Extract tool calls if they exist
        tool_calls = llm_response.get('message', {}).get('tool_calls', [])

        # If no tool calls were made, disapprove the content
        if not tool_calls:
            return False
        else:
            # Parse the approval value correctly based on its type
            approval_value = tool_calls[0]['function']['arguments'].get('approve', False)
            if isinstance(approval_value, str):
                return approval_value.lower() == "true"
            elif isinstance(approval_value, bool):
                return approval_value
            else:
                return False
    else:
        raise Exception(f"Failed to get a response from the LLM. Status code: {response.status_code}")
