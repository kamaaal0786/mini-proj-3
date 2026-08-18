"""
Application configuration — reads from .env file.
All thresholds live here so they never scatter into frontend or business logic.
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


import os
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "mini_proj.db"))

class Settings(BaseSettings):
    database_url: str = f"sqlite:///{DB_PATH}"
    jwt_secret: str = "dev-secret-key"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 480
    model_path: str = "../ml/model/dropout_model.joblib"

    # Intervention thresholds — single source of truth (SDK Section 10)
    attendance_threshold: float = 75.0
    failed_subjects_threshold: int = 2
    credit_deficit_threshold: float = 10.0
    assignment_completion_threshold: float = 60.0

    allowed_origins: str = "http://localhost:5173,http://localhost:3000"

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "protected_namespaces": ("settings_",),  # suppress model_ namespace warning
    }


@lru_cache()
def get_settings() -> Settings:
    return Settings()
