from pydantic import BaseModel


class LoginResponse(BaseModel):
    authenticated: bool
