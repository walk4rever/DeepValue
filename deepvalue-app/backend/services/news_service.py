import requests
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import os

from models.schemas import NewsArticle
from config import NEWS_API_KEY, FINNHUB_API_KEY

logger = logging.getLogger(__name__)

def get_news_for_company(symbol: str, from_date: str, to_date: str, limit: int = 10) -> List[NewsArticle]:
    """
    Get news articles for a specific company using Finnhub API
    """
    try:
        url = "https://finnhub.io/api/v1/company-news"
        params = {
            "symbol": symbol,
            "from": from_date,
            "to": to_date,
            "token": FINNHUB_API_KEY
        }
        
        response = requests.get(url, params=params)
        response.raise_for_status()
        
        articles = response.json()
        
        # Process and limit the articles
        processed_articles = []
        for article in articles[:limit]:
            processed_articles.append(
                NewsArticle(
                    id=article.get("id", 0),
                    title=article.get("headline", ""),
                    url=article.get("url", ""),
                    source=article.get("source", ""),
                    summary=article.get("summary", ""),
                    image_url=article.get("image", ""),
                    published_at=datetime.fromtimestamp(article.get("datetime", 0)),
                    related_symbols=[symbol]
                )
            )
        
        return processed_articles
    except Exception as e:
        logger.error(f"Error fetching news for {symbol}: {str(e)}")
        # Return empty list in case of error
        return []

def get_market_news(limit: int = 10) -> List[NewsArticle]:
    """
    Get general market news using NewsAPI
    """
    try:
        url = "https://newsapi.org/v2/top-headlines"
        params = {
            "category": "business",
            "language": "en",
            "apiKey": NEWS_API_KEY,
            "pageSize": limit
        }
        
        response = requests.get(url, params=params)
        response.raise_for_status()
        
        data = response.json()
        articles = data.get("articles", [])
        
        # Process the articles
        processed_articles = []
        for i, article in enumerate(articles):
            published_at = None
            try:
                if article.get("publishedAt"):
                    published_at = datetime.fromisoformat(article.get("publishedAt").replace("Z", "+00:00"))
            except:
                published_at = datetime.now()
                
            processed_articles.append(
                NewsArticle(
                    id=i,  # Generate an ID since NewsAPI doesn't provide one
                    title=article.get("title", ""),
                    url=article.get("url", ""),
                    source=article.get("source", {}).get("name", ""),
                    summary=article.get("description", ""),
                    image_url=article.get("urlToImage", ""),
                    published_at=published_at,
                    related_symbols=[]  # No specific symbols for general market news
                )
            )
        
        return processed_articles
    except Exception as e:
        logger.error(f"Error fetching market news: {str(e)}")
        # Return empty list in case of error
        return []
