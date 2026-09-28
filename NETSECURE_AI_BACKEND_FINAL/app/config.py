from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./netsecure_ai.db"
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-flash-latest"
    max_config_size_mb: int = 5
    app_name: str = "NETSECURE AI"
    app_version: str = "1.0.0"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
