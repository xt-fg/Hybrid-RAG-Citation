"""Application configuration"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings"""
    # API
    APP_NAME: str = "Hybrid RAG API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # LLM Configuration
    LLM_API_KEY: str = ""
    LLM_BASE_URL: str = "https://api.openai.com/v1"
    LLM_MODEL: str = "gpt-4o-mini"
    
    # Embedding Configuration (独立配置)
    EMBEDDING_API_KEY: str = ""
    EMBEDDING_BASE_URL: str = "https://api.openai.com/v1"
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    
    # RAG Settings
    RRF_K: int = 60  # RRF constant
    TOP_K: int = 5   # Number of results to return
    BM25_WEIGHT: float = 0.5
    DENSE_WEIGHT: float = 0.5
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings"""
    return Settings()
