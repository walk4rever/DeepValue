from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from root .env file
root_dir = Path(__file__).parent.parent.parent
env_path = root_dir / '.env'
load_dotenv(dotenv_path=env_path)

# Import config after loading environment variables
from config import DATABASE_URL, DATABASE_POOL_SIZE, DATABASE_POOL_RECYCLE, DATABASE_POOL_TIMEOUT

# Create SQLAlchemy engine with connection pool settings
if DATABASE_URL.startswith("sqlite"):
    # SQLite doesn't support pool_size, pool_recycle, pool_timeout
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    # For other databases like PostgreSQL, MySQL, etc.
    engine = create_engine(
        DATABASE_URL,
        pool_size=DATABASE_POOL_SIZE,
        pool_recycle=DATABASE_POOL_RECYCLE,
        pool_timeout=DATABASE_POOL_TIMEOUT
    )

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class
Base = declarative_base()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
