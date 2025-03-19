from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel
from services.company_service import CompanyService
from services.auth_service import get_current_user
from models.models import User

router = APIRouter()
company_service = CompanyService()

class FinancialMetric(BaseModel):
    name: str
    value: float
    unit: str
    period: str

class FinancialData(BaseModel):
    date: str
    revenue: Optional[float] = None
    net_income: Optional[float] = None
    eps: Optional[float] = None
    pe_ratio: Optional[float] = None
    dividend_yield: Optional[float] = None
    debt_to_equity: Optional[float] = None
    current_ratio: Optional[float] = None
    return_on_equity: Optional[float] = None
    gross_margin: Optional[float] = None
    operating_margin: Optional[float] = None

class CompanyDetail(BaseModel):
    symbol: str
    name: str
    description: str
    sector: str
    industry: str
    website: str
    market_cap: float
    current_price: float
    price_change: float
    price_change_percent: float
    key_metrics: List[FinancialMetric]
    historical_data: List[FinancialData]

@router.get("/company/{symbol}", response_model=CompanyDetail)
async def get_company_details(
    symbol: str,
    current_user: User = Depends(get_current_user)
):
    try:
        company_data = await company_service.get_company_details(symbol)
        if not company_data:
            raise HTTPException(status_code=404, detail=f"Company with symbol {symbol} not found")
        return company_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class CompanySearchResult(BaseModel):
    symbol: str
    name: str
    sector: str
    industry: str

@router.get("/company/search/{query}", response_model=List[CompanySearchResult])
async def search_companies(
    query: str,
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user)
):
    try:
        results = await company_service.search_companies(query, limit)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
