from typing import Dict, List, Tuple, Optional
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

class LLMService:
    def __init__(self):
        # Initialize model and tokenizer
        self.model = None  # Lazy loading
        self.tokenizer = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
    async def load_model(self):
        if self.model is None:
            # Load model and tokenizer
            model_name = "gpt2"  # Replace with your preferred model
            self.tokenizer = AutoTokenizer.from_pretrained(model_name)
            self.model = AutoModelForCausalLM.from_pretrained(model_name).to(self.device)

    async def process_message(
        self,
        message: str,
        user_context: Dict
    ) -> Tuple[str, Optional[List[Dict]]]:
        """
        Process user message and generate a response with relevant information
        
        Args:
            message: User's input message
            user_context: Dictionary containing user context (interests, watchlist, etc.)
            
        Returns:
            Tuple containing:
            - Response text
            - List of source references (optional)
        """
        await self.load_model()
        
        # Analyze message intent and extract key information
        intent, entities = await self._analyze_message(message)
        
        # Gather relevant data based on intent and entities
        context_data = await self._gather_context_data(intent, entities, user_context)
        
        # Generate response using the model
        response = await self._generate_response(message, context_data)
        
        # Extract and format sources
        sources = await self._extract_sources(context_data)
        
        return response, sources

    async def _analyze_message(self, message: str):
        """
        Analyze message to determine intent and extract relevant entities
        """
        # Implement intent classification and entity extraction
        # This is a simplified example
        intents = {
            "company_analysis": ["analyze", "company", "valuation", "metrics"],
            "market_trends": ["market", "trend", "sector", "industry"],
            "investment_strategy": ["strategy", "invest", "portfolio", "risk"]
        }
        
        message_lower = message.lower()
        detected_intent = None
        detected_entities = []
        
        # Simple intent matching
        for intent, keywords in intents.items():
            if any(keyword in message_lower for keyword in keywords):
                detected_intent = intent
                break
        
        # Simple entity extraction (e.g., stock symbols in uppercase)
        import re
        stock_symbols = re.findall(r'\b[A-Z]{1,5}\b', message)
        if stock_symbols:
            detected_entities.extend(stock_symbols)
        
        return detected_intent or "general", detected_entities

    async def _gather_context_data(
        self,
        intent: str,
        entities: List[str],
        user_context: Dict
    ) -> Dict:
        """
        Gather relevant data based on the message intent and entities
        """
        context_data = {
            "intent": intent,
            "entities": entities,
            "market_data": {},
            "company_data": {},
            "sources": []
        }
        
        # Gather market data if needed
        if intent in ["market_trends", "investment_strategy"]:
            market_data = await self._fetch_market_data()
            context_data["market_data"] = market_data
        
        # Gather company data if entities contain stock symbols
        for symbol in entities:
            try:
                company_data = await self._fetch_company_data(symbol)
                context_data["company_data"][symbol] = company_data
            except Exception as e:
                print(f"Error fetching data for {symbol}: {str(e)}")
        
        return context_data

    async def _generate_response(self, message: str, context_data: Dict) -> str:
        """
        Generate response using the LLM model with context
        """
        # Prepare prompt with context
        prompt = self._prepare_prompt(message, context_data)
        
        # Generate response
        inputs = self.tokenizer(prompt, return_tensors="pt").to(self.device)
        outputs = self.model.generate(
            inputs["input_ids"],
            max_length=500,
            num_return_sequences=1,
            temperature=0.7,
            top_p=0.9,
            do_sample=True
        )
        
        response = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        # Post-process response
        response = self._post_process_response(response)
        
        return response

    def _prepare_prompt(self, message: str, context_data: Dict) -> str:
        """
        Prepare the prompt for the model with relevant context
        """
        prompt_parts = [
            "As a financial analysis assistant, please help with the following question:",
            message,
            "\nContext:"
        ]
        
        # Add relevant market context if available
        if context_data["market_data"]:
            prompt_parts.append("\nMarket Overview:")
            # Add relevant market data
        
        # Add company-specific context if available
        if context_data["company_data"]:
            prompt_parts.append("\nCompany Information:")
            for symbol, data in context_data["company_data"].items():
                prompt_parts.append(f"\n{symbol}:")
                # Add relevant company data
        
        prompt_parts.append("\nResponse:")
        
        return "\n".join(prompt_parts)

    def _post_process_response(self, response: str) -> str:
        """
        Clean and format the model's response
        """
        # Remove any prompt text that might have been repeated
        response = response.split("Response:")[-1].strip()
        
        # Clean up any artifacts
        response = response.replace("<|endoftext|>", "")
        
        return response

    async def _fetch_market_data(self) -> Dict:
        """
        Fetch current market data
        """
        # Implement market data fetching
        # This is a simplified example
        try:
            # Fetch major index data
            indices = ['^GSPC', '^DJI', '^IXIC']
            market_data = {}
            
            for index in indices:
                ticker = yf.Ticker(index)
                info = ticker.info
                market_data[index] = {
                    "price": info.get("regularMarketPrice"),
                    "change": info.get("regularMarketChange"),
                    "change_percent": info.get("regularMarketChangePercent")
                }
            
            return market_data
        except Exception as e:
            print(f"Error fetching market data: {str(e)}")
            return {}

    async def _fetch_company_data(self, symbol: str) -> Dict:
        """
        Fetch company-specific data
        """
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            # Get historical data
            hist = ticker.history(period="1y")
            
            return {
                "name": info.get("longName"),
                "sector": info.get("sector"),
                "industry": info.get("industry"),
                "market_cap": info.get("marketCap"),
                "pe_ratio": info.get("trailingPE"),
                "price": info.get("regularMarketPrice"),
                "price_change": info.get("regularMarketChange"),
                "price_change_percent": info.get("regularMarketChangePercent"),
                "historical_data": hist.to_dict('records')
            }
        except Exception as e:
            print(f"Error fetching company data for {symbol}: {str(e)}")
            return {}

    async def _extract_sources(self, context_data: Dict) -> List[Dict]:
        """
        Extract and format source references from the context data
        """
        sources = []
        
        # Add market data sources
        if context_data.get("market_data"):
            sources.append({
                "type": "market_data",
                "description": "Real-time market data",
                "timestamp": datetime.now().isoformat()
            })
        
        # Add company-specific sources
        for symbol, data in context_data.get("company_data", {}).items():
            if data:
                sources.append({
                    "type": "company_data",
                    "symbol": symbol,
                    "description": f"Financial data for {data.get('name', symbol)}",
                    "timestamp": datetime.now().isoformat()
                })
        
        return sources
