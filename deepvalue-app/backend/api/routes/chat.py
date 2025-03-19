from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from services.llm_service import LLMService
from services.auth_service import get_current_user
from models.models import User

router = APIRouter()
llm_service = LLMService()

class ChatMessage(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str
    sources: Optional[List[dict]] = None

@router.post("/chat", response_model=ChatResponse)
async def chat(
    message: ChatMessage,
    current_user: User = Depends(get_current_user)
):
    try:
        # Process the message and generate response using LLM
        response, sources = await llm_service.process_message(
            message.message,
            user_context={
                "user_id": current_user.id,
                "interests": current_user.interests,
                "watchlist": current_user.watchlist
            }
        )
        
        return ChatResponse(
            response=response,
            sources=sources
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing chat message: {str(e)}"
        )
