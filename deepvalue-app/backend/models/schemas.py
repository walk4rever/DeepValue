from pydantic import BaseModel, Field, EmailStr, validator
from typing import List, Optional, Dict, Any
from datetime import datetime
import re

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str

class UserCreate(UserBase):
    password: str
    
    @validator('password')
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: int
    created_at: datetime
    
    class Config:
        orm_mode = True

# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    
class TokenData(BaseModel):
    email: Optional[str] = None

# Company schemas
class CompanyBase(BaseModel):
    symbol: str
    name: str
    
class CompanyCreate(CompanyBase):
    sector: Optional[str] = None
    industry: Optional[str] = None
    description: Optional[str] = None
    
class CompanyResponse(CompanyBase):
    sector: Optional[str] = None
    industry: Optional[str] = None
    description: Optional[str] = None
    current_price: Optional[float] = None
    price_change: Optional[float] = None
    price_change_percent: Optional[float] = None
    market_cap: Optional[float] = None
    pe_ratio: Optional[float] = None
    dividend_yield: Optional[float] = None
    
    class Config:
        orm_mode = True

class CompanyDetail(CompanyResponse):
    historical_prices: Optional[Dict[str, List[float]]] = None
    financial_ratios: Optional[Dict[str, float]] = None
    income_statement: Optional[Dict[str, Any]] = None
    balance_sheet: Optional[Dict[str, Any]] = None
    cash_flow: Optional[Dict[str, Any]] = None
    
    class Config:
        orm_mode = True

# Watchlist schemas
class WatchlistItemBase(BaseModel):
    company_symbol: str
    
class WatchlistItemCreate(WatchlistItemBase):
    notes: Optional[str] = None
    
class WatchlistItemResponse(WatchlistItemBase):
    id: int
    user_id: int
    notes: Optional[str] = None
    created_at: datetime
    company_name: Optional[str] = None
    current_price: Optional[float] = None
    price_change_percent: Optional[float] = None
    
    class Config:
        orm_mode = True

# News schemas
class NewsArticle(BaseModel):
    id: int
    title: str
    url: str
    source: str
    summary: Optional[str] = None
    image_url: Optional[str] = None
    published_at: datetime
    related_symbols: List[str] = []

class NewsResponse(BaseModel):
    articles: List[NewsArticle]
    
# Chat schemas
class ChatMessage(BaseModel):
    role: str
    content: str
    
class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    company_context: Optional[str] = None
    
class ChatResponse(BaseModel):
    message: ChatMessage
    sources: Optional[List[Dict[str, Any]]] = None

# Note schemas
class NoteBase(BaseModel):
    title: str
    content: str
    company_symbol: Optional[str] = None
    
class NoteCreate(NoteBase):
    pass
    
class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    company_symbol: Optional[str] = None
    
class NoteResponse(NoteBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        orm_mode = True
