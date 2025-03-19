import yfinance as yf
from typing import List, Dict, Any, Optional
import pandas as pd
from datetime import datetime, timedelta

class CompanyService:
    async def get_company_details(self, symbol: str) -> Dict[str, Any]:
        """
        Get detailed information about a company by its ticker symbol
        """
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            # Get historical price data
            hist = ticker.history(period="1y")
            
            # Get financial data
            financials = ticker.financials
            balance_sheet = ticker.balance_sheet
            cash_flow = ticker.cashflow
            
            # Calculate key metrics
            key_metrics = self._calculate_key_metrics(ticker, info, financials, balance_sheet)
            
            # Format historical data
            historical_data = self._format_historical_data(financials, balance_sheet, cash_flow)
            
            # Prepare response
            return {
                "symbol": symbol,
                "name": info.get("longName", ""),
                "description": info.get("longBusinessSummary", ""),
                "sector": info.get("sector", ""),
                "industry": info.get("industry", ""),
                "website": info.get("website", ""),
                "market_cap": info.get("marketCap", 0),
                "current_price": info.get("currentPrice", 0) or info.get("regularMarketPrice", 0),
                "price_change": info.get("regularMarketChange", 0),
                "price_change_percent": info.get("regularMarketChangePercent", 0),
                "key_metrics": key_metrics,
                "historical_data": historical_data
            }
        except Exception as e:
            print(f"Error fetching company details for {symbol}: {str(e)}")
            return None
    
    async def search_companies(self, query: str, limit: int = 10) -> List[Dict[str, str]]:
        """
        Search for companies by name or symbol
        """
        # This is a simplified implementation
        # In a real app, you would use a proper search API or database
        try:
            # For demo purposes, return some hardcoded results
            results = [
                {"symbol": "AAPL", "name": "Apple Inc.", "sector": "Technology", "industry": "Consumer Electronics"},
                {"symbol": "MSFT", "name": "Microsoft Corporation", "sector": "Technology", "industry": "Software"},
                {"symbol": "AMZN", "name": "Amazon.com, Inc.", "sector": "Consumer Cyclical", "industry": "Internet Retail"},
                {"symbol": "GOOGL", "name": "Alphabet Inc.", "sector": "Communication Services", "industry": "Internet Content & Information"},
                {"symbol": "META", "name": "Meta Platforms, Inc.", "sector": "Communication Services", "industry": "Internet Content & Information"},
                {"symbol": "TSLA", "name": "Tesla, Inc.", "sector": "Consumer Cyclical", "industry": "Auto Manufacturers"},
                {"symbol": "BRK.A", "name": "Berkshire Hathaway Inc.", "sector": "Financial Services", "industry": "Insurance"},
                {"symbol": "JNJ", "name": "Johnson & Johnson", "sector": "Healthcare", "industry": "Drug Manufacturers"},
                {"symbol": "V", "name": "Visa Inc.", "sector": "Financial Services", "industry": "Credit Services"},
                {"symbol": "PG", "name": "Procter & Gamble Company", "sector": "Consumer Defensive", "industry": "Household & Personal Products"}
            ]
            
            # Filter by query
            filtered_results = [
                company for company in results 
                if query.lower() in company["symbol"].lower() or query.lower() in company["name"].lower()
            ]
            
            return filtered_results[:limit]
        except Exception as e:
            print(f"Error searching companies: {str(e)}")
            return []
    
    def _calculate_key_metrics(self, ticker, info, financials, balance_sheet) -> List[Dict[str, Any]]:
        """
        Calculate key financial metrics for a company
        """
        metrics = []
        
        try:
            # P/E Ratio
            if info.get("trailingPE"):
                metrics.append({
                    "name": "pe_ratio",
                    "value": info.get("trailingPE"),
                    "unit": "",
                    "period": "TTM"
                })
            
            # EPS
            if info.get("trailingEps"):
                metrics.append({
                    "name": "earnings_per_share",
                    "value": info.get("trailingEps"),
                    "unit": "$",
                    "period": "TTM"
                })
            
            # Dividend Yield
            if info.get("dividendYield"):
                metrics.append({
                    "name": "dividend_yield",
                    "value": info.get("dividendYield") * 100,
                    "unit": "%",
                    "period": "TTM"
                })
            
            # Return on Equity
            if info.get("returnOnEquity"):
                metrics.append({
                    "name": "return_on_equity",
                    "value": info.get("returnOnEquity") * 100,
                    "unit": "%",
                    "period": "TTM"
                })
            
            # Debt to Equity
            if info.get("debtToEquity"):
                metrics.append({
                    "name": "debt_to_equity",
                    "value": info.get("debtToEquity") / 100,
                    "unit": "",
                    "period": "MRQ"
                })
            
            # Profit Margin
            if info.get("profitMargins"):
                metrics.append({
                    "name": "profit_margin",
                    "value": info.get("profitMargins") * 100,
                    "unit": "%",
                    "period": "TTM"
                })
            
            # Revenue Growth
            if info.get("revenueGrowth"):
                metrics.append({
                    "name": "revenue_growth",
                    "value": info.get("revenueGrowth") * 100,
                    "unit": "%",
                    "period": "YOY"
                })
            
            # Beta
            if info.get("beta"):
                metrics.append({
                    "name": "beta",
                    "value": info.get("beta"),
                    "unit": "",
                    "period": "5Y"
                })
            
            return metrics
        except Exception as e:
            print(f"Error calculating metrics: {str(e)}")
            return []
    
    def _format_historical_data(self, financials, balance_sheet, cash_flow) -> List[Dict[str, Any]]:
        """
        Format historical financial data
        """
        try:
            # Get the dates from financials
            if financials.empty:
                return []
            
            dates = financials.columns.tolist()
            historical_data = []
            
            for date in dates:
                data_point = {
                    "date": date.strftime("%Y-%m-%d"),
                    "revenue": financials.loc["Total Revenue", date] if "Total Revenue" in financials.index else None,
                    "net_income": financials.loc["Net Income", date] if "Net Income" in financials.index else None,
                    "eps": None,  # Would need to calculate from net income and shares outstanding
                    "pe_ratio": None  # Would need historical price data
                }
                historical_data.append(data_point)
            
            return historical_data
        except Exception as e:
            print(f"Error formatting historical data: {str(e)}")
            return []
