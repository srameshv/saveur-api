from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    supabase_url: str
    supabase_key: str
    anthropic_api_key: str
    google_places_api: str
    admin_token: str
    frontend_url: str = ""

    model_config = {"env_file": ".env"}


settings = Settings()
