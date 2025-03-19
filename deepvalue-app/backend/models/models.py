from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text, Float, DateTime, Table, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import uuid

# Association table for user-company watchlist
watchlist_association = Table(
    'watchlist_association',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id')),
    Column('company_id', Integer, ForeignKey('companies.id'))
)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    interests = Column(JSON, default=list)
    
    # Relationships
    notes = relationship("Note", back_populates="owner")
    watchlist = relationship("Company", secondary=watchlist_association, back_populates="watched_by")
    chat_history = relationship("ChatMessage", back_populates="user")

class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, unique=True, index=True)
    name = Column(String)
    description = Column(Text)
    sector = Column(String)
    industry = Column(String)
    website = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    financial_data = relationship("FinancialData", back_populates="company")
    news_items = relationship("NewsItem", back_populates="company")
    watched_by = relationship("User", secondary=watchlist_association, back_populates="watchlist")

class FinancialData(Base):
    __tablename__ = "financial_data"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    date = Column(DateTime)
    data_type = Column(String)  # e.g., "quarterly_report", "annual_report", "daily_price"
    data = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    company = relationship("Company", back_populates="financial_data")

class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    content = Column(Text)
    tags = Column(JSON, default=list)
    owner_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    owner = relationship("User", back_populates="notes")

class NewsItem(Base):
    __tablename__ = "news_items"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    summary = Column(Text)
    content = Column(Text)
    source = Column(String)
    url = Column(String)
    published_at = Column(DateTime)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    industries = Column(JSON, default=list)
    tags = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    company = relationship("Company", back_populates="news_items")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    role = Column(String)  # "user" or "assistant"
    content = Column(Text)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="chat_history")
