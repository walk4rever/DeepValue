from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session

from models.database import get_db
from models.models import User, Company
from services.auth_service import get_current_user

router = APIRouter()

class CompanyBase(BaseModel):
    symbol: str
    name: str
    sector: Optional[str] = None
    industry: Optional[str] = None
    categoryId: Optional[int] = None

class WatchlistResponse(BaseModel):
    id: int
    symbol: str
    name: str
    sector: Optional[str] = None
    industry: Optional[str] = None
    categoryId: Optional[int] = None
    priceChange: Optional[float] = None

@router.get("/watchlist", response_model=List[WatchlistResponse])
async def get_watchlist(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Return the user's watchlist
    watchlist_items = []
    for company in current_user.watchlist:
        # In a real app, you'd fetch the latest price data here
        watchlist_items.append({
            "id": company.id,
            "symbol": company.symbol,
            "name": company.name,
            "sector": company.sector,
            "industry": company.industry,
            "categoryId": 1,  # This would come from a user-company category mapping
            "priceChange": 0.0  # This would be fetched from a market data service
        })
    return watchlist_items

@router.post("/watchlist", status_code=status.HTTP_201_CREATED)
async def add_to_watchlist(
    company_data: CompanyBase,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if company exists in database
    company = db.query(Company).filter(Company.symbol == company_data.symbol).first()
    
    # If not, create it
    if not company:
        company = Company(
            symbol=company_data.symbol,
            name=company_data.name,
            sector=company_data.sector,
            industry=company_data.industry
        )
        db.add(company)
        db.commit()
        db.refresh(company)
    
    # Check if company is already in watchlist
    if company in current_user.watchlist:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Company {company_data.symbol} is already in watchlist"
        )
    
    # Add to watchlist
    current_user.watchlist.append(company)
    db.commit()
    
    return {"message": f"Added {company_data.symbol} to watchlist"}

@router.delete("/watchlist/{symbol}")
async def remove_from_watchlist(
    symbol: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Find company
    company = db.query(Company).filter(Company.symbol == symbol).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with symbol {symbol} not found"
        )
    
    # Check if company is in watchlist
    if company not in current_user.watchlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company {symbol} is not in watchlist"
        )
    
    # Remove from watchlist
    current_user.watchlist.remove(company)
    db.commit()
    
    return {"message": f"Removed {symbol} from watchlist"}
