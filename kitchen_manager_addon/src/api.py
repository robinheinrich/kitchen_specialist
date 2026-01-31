from fastapi import APIRouter, HTTPException, Request
from typing import List, Optional
from pydantic import BaseModel
from .database import DatabaseManager

router = APIRouter()

def get_db(request: Request) -> DatabaseManager:
    return request.app.state.db

# --- Models for Requests ---
class ItemRequest(BaseModel):
    name: str
    amount: float
    unit: str

class MoveRequest(BaseModel):
    target: str # 'inventory' or 'shopping'

class SettingsRequest(BaseModel):
    default_tab: str

# --- Shopping List ---
@router.get("/shopping")
async def get_shopping(request: Request):
    return get_db(request).shopping_list

@router.post("/shopping")
async def add_shopping(item: ItemRequest, request: Request):
    return get_db(request).add_item("shopping_list", item.dict())

@router.put("/shopping/{item_id}")
async def update_shopping(item_id: int, item: ItemRequest, request: Request):
    updated = get_db(request).update_item("shopping_list", item_id, item.dict())
    if not updated:
        raise HTTPException(404, "Item not found")
    return updated

@router.delete("/shopping/{item_id}")
async def delete_shopping(item_id: int, request: Request):
    get_db(request).remove_item("shopping_list", item_id)
    return {"status": "ok"}

@router.post("/{source}/{item_id}/move/{target}")
async def move_item(source: str, item_id: int, target: str, request: Request):
    db = get_db(request)

    mapping = {
        "shopping": "shopping_list",
        "inventory": "inventory",
        "templates": "templates"
    }

    if source not in mapping or target not in mapping:
        raise HTTPException(400, "Invalid list name")

    return db.move_item(mapping[source], mapping[target], item_id)

# --- Inventory ---
@router.get("/inventory")
async def get_inventory(request: Request):
    return get_db(request).inventory

@router.post("/inventory")
async def add_inventory(item: ItemRequest, request: Request):
    return get_db(request).add_item("inventory", item.dict())

@router.put("/inventory/{item_id}")
async def update_inventory(item_id: int, item: ItemRequest, request: Request):
    updated = get_db(request).update_item("inventory", item_id, item.dict())
    if not updated:
        raise HTTPException(404, "Item not found")
    return updated

@router.delete("/inventory/{item_id}")
async def delete_inventory(item_id: int, request: Request):
    get_db(request).remove_item("inventory", item_id)
    return {"status": "ok"}

# --- Templates ---
@router.get("/templates")
async def get_templates(request: Request):
    return get_db(request).templates

@router.post("/templates")
async def add_template(item: ItemRequest, request: Request):
    return get_db(request).add_item("templates", item.dict())

@router.put("/templates/{item_id}")
async def update_template(item_id: int, item: ItemRequest, request: Request):
    updated = get_db(request).update_item("templates", item_id, item.dict())
    if not updated:
        raise HTTPException(404, "Item not found")
    return updated

@router.delete("/templates/{item_id}")
async def delete_template(item_id: int, request: Request):
    get_db(request).remove_item("templates", item_id)
    return {"status": "ok"}

@router.post("/templates/{item_id}/use")
async def use_template(item_id: int, request: Request):
    db = get_db(request)
    item = next((i for i in db.templates if i['id'] == item_id), None)
    if not item:
        raise HTTPException(404, "Item not found")
        
    db.add_item("shopping_list", {
        "name": item['name'],
        "amount": item['amount'],
        "unit": item['unit']
    })
    return {"status": "ok"}

# --- Recipes ---
@router.get("/recipes")
async def get_recipes(request: Request):
    # Retrieve local recipes + Mock external search results
    # For MVP, we just return stored recipes
    return get_db(request).recipes

@router.post("/recipes")
async def add_recipe(recipe: dict, request: Request):
    return get_db(request).add_item("recipes", recipe)

@router.post("/recipes/{recipe_id}/cook")
async def cook_recipe(recipe_id: int, request: Request):
    # Logic to deduct ingredients
    db = get_db(request)
    recipe = next((r for r in db.recipes if r['id'] == recipe_id), None)
    if not recipe:
        raise HTTPException(404, "Recipe not found")
        
    # Simple updated logic: find ingredient by name in inventory and deduct
    for ing in recipe.get('ingredients', []):
        inv_item = next((i for i in db.inventory if i['name'].lower() == ing['name'].lower()), None)
        if inv_item:
            inv_item['amount'] -= ing['amount']
            if inv_item['amount'] <= 0:
                # Automove to shopping list candidate or just delete?
                pass
    
    db.save_data("inventory.json", db.inventory)
    return {"status": "ok"}

# --- Settings ---
@router.get("/settings")
async def get_settings(request: Request):
    return get_db(request).settings

@router.post("/settings")
async def update_settings(settings: SettingsRequest, request: Request):
    get_db(request).update_settings(settings.dict())
    return {"status": "ok"}
