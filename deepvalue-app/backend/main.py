from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import logging

from api.routes import company, watchlist, chat, auth
# Import the newly created modules
from api.routes import news, notes
from models.database import engine, Base
import models.models as models
from config import (
    APP_NAME, APP_ENV, BACKEND_HOST, BACKEND_PORT, BACKEND_RELOAD,
    CORS_ORIGINS, CORS_METHODS, CORS_HEADERS, LOG_LEVEL, LOG_FORMAT
)

# Configure logging
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format=LOG_FORMAT
)
logger = logging.getLogger(__name__)

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=f"{APP_NAME} API",
    description=f"API for {APP_NAME} investment research platform",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=CORS_METHODS,
    allow_headers=CORS_HEADERS,
)

# Include routers
app.include_router(auth.router, prefix="/api", tags=["Authentication"])
app.include_router(company.router, prefix="/api", tags=["Companies"])
app.include_router(watchlist.router, prefix="/api", tags=["Watchlist"])
app.include_router(news.router, prefix="/api", tags=["News"])
app.include_router(chat.router, prefix="/api", tags=["Chat"])
app.include_router(notes.router, prefix="/api", tags=["Notes"])

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "environment": APP_ENV,
        "app_name": APP_NAME
    }

# Mount static files for frontend (in production)
if APP_ENV == "production":
    app.mount("/", StaticFiles(directory="../frontend/dist", html=True), name="static")

if __name__ == "__main__":
    logger.info(f"Starting {APP_NAME} API in {APP_ENV} mode")
    import uvicorn
    uvicorn.run(
        "main:app",
        host=BACKEND_HOST,
        port=BACKEND_PORT,
        reload=BACKEND_RELOAD
    )
