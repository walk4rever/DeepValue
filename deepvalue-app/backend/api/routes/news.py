from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from models.database import get_db
from models.schemas import NewsArticle, NewsResponse
from services.auth_service import get_current_user
from services.news_service import get_news_for_company, get_market_news

router = APIRouter()

@router.get("/news/market", response_model=List[NewsArticle])
def get_general_market_news(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get general market news articles
    """
    try:
        news = get_market_news(limit)
        return news
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch market news: {str(e)}"
        )

@router.get("/news/company/{symbol}", response_model=List[NewsArticle])
def get_company_news(
    symbol: str,
    days: int = 7,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get news articles for a specific company
    """
    try:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        news = get_news_for_company(
            symbol=symbol,
            from_date=start_date.strftime("%Y-%m-%d"),
            to_date=end_date.strftime("%Y-%m-%d"),
            limit=limit
        )
        return news
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch news for {symbol}: {str(e)}"
        )
