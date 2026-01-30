from pydantic import BaseModel
from typing import List, Optional, Literal

class Product(BaseModel):
    id: Optional[int] = None
    name: str
    amount: float
    unit: Literal["st", "g", "kg", "l", "ml", "Kiste"]
    
class RecipeIngredient(BaseModel):
    name: str
    amount: float
    unit: Literal["st", "g", "kg", "l", "ml", "Kiste"]

class Recipe(BaseModel):
    id: Optional[int] = None
    title: str
    description: Optional[str] = ""
    servings: int
    ingredients: List[RecipeIngredient]
    is_custom: bool = True

class Settings(BaseModel):
    default_tab: Literal["shopping", "inventory", "recipes", "templates"] = "shopping"
