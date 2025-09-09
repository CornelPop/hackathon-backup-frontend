from pathlib import Path
from typing import List, Union
from pydantic import AnyHttpUrl
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- OpenAI ---
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"       # <-- added for assistant module
    OPENAI_TEMPERATURE: float = 0.4         # <-- added for assistant module

    # --- Postgres ---
    DATABASE_URL: str = "postgresql+psycopg://ai_app:ai_app_password@localhost:5432/ai_assistant_dev"

    # --- JWT ---
    JWT_SECRET: str = "dev-secret-change-me"
    JWT_ALG: str = "HS256"
    JWT_EXPIRES_MINUTES: int = 60

    # --- Public URL used to build absolute links for uploaded media
    PUBLIC_BASE_URL: Union[AnyHttpUrl, str] = "http://127.0.0.1:8000"

    # --- CORS (your Vite dev server)
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    # --- Media directory (absolute path)
    MEDIA_DIR: str = str(Path(__file__).resolve().parents[2] / "media")

    # --- Stripe ---
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PUBLIC_KEY: str = ""  # for frontend, optional

    # --- Fraud model config ---
    FRAUD_MODEL_PATH: Path = Path("models/fraud_model.joblib")
    # choose which threshold to use by default: "best_threshold" or "high_precision_threshold"
    FRAUD_THRESHOLD_NAME: str = "best_threshold"

    # Where Stripe redirects after checkout (frontend pages)
    PAYMENTS_SUCCESS_URL: str = "http://localhost:5173/payments/success"
    PAYMENTS_CANCEL_URL: str  = "http://localhost:5173/payments/cancel"

settings = Settings()