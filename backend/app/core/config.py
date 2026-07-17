"""Application configuration"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings"""
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # API
    APP_NAME: str = "知源文档知识服务"
    APP_VERSION: str = "1.1.0"
    DEBUG: bool = False
    
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
    DENSE_MIN_SCORE: float = 0.2

    # Knowledge base storage
    STORAGE_DIR: str = "storage"
    MAX_UPLOAD_MB: int = 25
    CHUNK_SIZE: int = 900
    CHUNK_OVERLAP: int = 120

@lru_cache()
def get_settings() -> Settings:
    """Get cached settings"""
    return Settings()
