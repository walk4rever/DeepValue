import os
import json
import uuid
from typing import Optional
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from fastapi.templating import Jinja2Templates

from app.claude_client import ClaudeClient
from app.chat_history import ChatHistoryService

# Load environment variables from .env.aws file
load_dotenv(dotenv_path='.env.aws')

# Create FastAPI app
app = FastAPI(title="DeepValue API", description="智能投资分析平台 API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Create Claude client
claude_client = ClaudeClient()
# Create chat history service
chat_history_service = ChatHistoryService()

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Define request models
class ChatRequest(BaseModel):
    message: str
    sessionId: Optional[str] = None
    enableReasoning: Optional[bool] = False

class ClearHistoryRequest(BaseModel):
    sessionId: str

# API endpoint for chat (POST method)
@app.post("/api/chat")
async def chat(request: ChatRequest):
    try:
        # Always use Claude 3.7
        model_id = 'us.anthropic.claude-3-7-sonnet-20250219-v1:0'
        
        # Get or create session
        session_id = request.sessionId or f"session_{uuid.uuid4()}"
        session = await chat_history_service.get_session(session_id)
        if not session:
            session_id = await chat_history_service.create_session(session_id)
        
        # Get all messages for the session
        stored_messages = await chat_history_service.get_messages(session_id)
        
        # Add user message
        await chat_history_service.add_message(session_id, 'user', request.message)
        
        # Format messages for Claude
        claude_messages = [
            {"role": msg["role"], "content": msg["content"]}
            for msg in stored_messages
        ]
        claude_messages.append({"role": "user", "content": request.message})
        
        # Get response from Claude
        claude_response = await claude_client.send_message(
            model_id=model_id,
            messages=claude_messages,
            enable_reasoning=request.enableReasoning
        )
        
        # Add assistant response
        await chat_history_service.add_message(session_id, 'assistant', claude_response["response"])
        
        # Send response to client
        return {
            "response": claude_response["response"],
            "reasoning": claude_response["reasoning"],
            "sessionId": session_id
        }
    except Exception as error:
        print(f"Error in chat API: {error}")
        
        # Send a more user-friendly error message
        raise HTTPException(
            status_code=500,
            detail="An error occurred while processing your request. Please try again."
        )

# API endpoint for streaming chat (GET method)
@app.get("/api/chat")
async def stream_chat(
    message: str,
    sessionId: Optional[str] = None,
    enableReasoning: Optional[bool] = False
):
    async def event_generator():
        try:
            model_id = 'us.anthropic.claude-3-7-sonnet-20250219-v1:0'
            
            # Get or create session
            current_session_id = sessionId or f"session_{uuid.uuid4()}"
            session = await chat_history_service.get_session(current_session_id)
            
            if not session:
                current_session_id = await chat_history_service.create_session(current_session_id)
                
                # Send session ID to client
                yield {
                    "event": "message",
                    "data": json.dumps({"type": "session", "sessionId": current_session_id})
                }
            
            # Get all messages for the session
            stored_messages = await chat_history_service.get_messages(current_session_id)
            
            # Add user message
            await chat_history_service.add_message(current_session_id, 'user', message)
            
            # Format messages for Claude
            claude_messages = [
                {"role": msg["role"], "content": msg["content"]}
                for msg in stored_messages
            ]
            claude_messages.append({"role": "user", "content": message})
            
            # Stream response from Claude
            full_response = ""
            
            async for chunk in claude_client.stream_message(
                model_id=model_id,
                messages=claude_messages,
                enable_reasoning=enableReasoning
            ):
                if chunk["type"] == "thinking":
                    yield {
                        "event": "message",
                        "data": json.dumps({"type": "thinking", "content": chunk["content"]})
                    }
                elif chunk["type"] == "content":
                    yield {
                        "event": "message",
                        "data": json.dumps({"type": "content", "content": chunk["content"]})
                    }
                elif chunk["type"] == "done":
                    # Save the full response to DynamoDB
                    await chat_history_service.add_message(current_session_id, 'assistant', chunk["content"])
                    
                    # Send done event
                    yield {
                        "event": "message",
                        "data": json.dumps({"type": "done"})
                    }
                elif chunk["type"] == "error":
                    yield {
                        "event": "message",
                        "data": json.dumps({"type": "error", "error": chunk["error"]})
                    }
        except Exception as error:
            print(f"Error in streaming chat API: {error}")
            yield {
                "event": "message",
                "data": json.dumps({"type": "error", "error": "An error occurred while processing your request"})
            }
    
    return EventSourceResponse(event_generator())

# API endpoint to fetch chat history
@app.get("/api/history")
async def get_history(sessionId: str):
    try:
        if not sessionId:
            raise HTTPException(status_code=400, detail="Session ID is required")
        
        # Get messages for the session
        messages = await chat_history_service.get_messages(sessionId)
        
        return {
            "success": True,
            "sessionId": sessionId,
            "messages": messages
        }
    except Exception as error:
        print(f"Error fetching chat history: {error}")
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch chat history. Please try again."
        )

# API endpoint to clear chat history
@app.post("/api/history/clear")
async def clear_history(request: ClearHistoryRequest):
    try:
        if not request.sessionId:
            raise HTTPException(status_code=400, detail="Session ID is required")
        
        # Clear session messages but keep the same session ID
        cleared_session_id = await chat_history_service.clear_session(request.sessionId)
        
        return {
            "success": True,
            "sessionId": cleared_session_id
        }
    except Exception as error:
        print(f"Error clearing chat history: {error}")
        raise HTTPException(
            status_code=500,
            detail="Failed to clear chat history. Please try again."
        )

# Root endpoint
@app.get("/", response_class=HTMLResponse)
async def root():
    # Read the index.html file
    with open("static/index.html", "r") as f:
        html_content = f.read()
    return html_content

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", 3000)), reload=True)
