import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
import os
from .models import Product, Recipe, Settings

_LOGGER = logging.getLogger(__name__)

class DatabaseManager:
    def __init__(self, data_path: str = None):
        if data_path:
            self.data_path = Path(data_path)
        else:
            self.data_path = Path(os.getenv("DATA_PATH", "/data"))
            
        self.shopping_list: List[Dict] = []
        self.inventory: List[Dict] = []
        self.recipes: List[Dict] = []
        self.templates: List[Dict] = []
        self.settings: Dict = {"default_tab": "shopping"}
        
    def initialize(self):
        self.data_path.mkdir(exist_ok=True, parents=True)
        self.load_all_data()
        
    def load_all_data(self):
        self.shopping_list = self._load_json("shopping_list.json")
        self.inventory = self._load_json("inventory.json")
        self.recipes = self._load_json("recipes.json")
        self.templates = self._load_json("templates.json")
        self.settings = self._load_json("settings.json") or {"default_tab": "shopping"}

    def _load_json(self, filename: str) -> Any:
        file_path = self.data_path / filename
        if file_path.exists():
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                _LOGGER.error(f"Error loading {filename}: {e}")
        return [] if filename != "settings.json" else {}

    def save_data(self, filename: str, data: Any):
        file_path = self.data_path / filename
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            _LOGGER.error(f"Error saving {filename}: {e}")

    # Generic CRUD
    def add_item(self, list_name: str, item: Dict) -> Dict:
        target_list = getattr(self, list_name)
        new_id = max([i.get('id', 0) for i in target_list], default=0) + 1
        item['id'] = new_id
        target_list.append(item)
        self.save_data(f"{list_name}.json", target_list)
        return item

    def remove_item(self, list_name: str, item_id: int):
        target_list = getattr(self, list_name)
        # Filter out the item
        setattr(self, list_name, [i for i in target_list if i.get('id') != item_id])
        self.save_data(f"{list_name}.json", getattr(self, list_name))

    def update_item(self, list_name: str, item_id: int, updates: Dict) -> Optional[Dict]:
        target_list = getattr(self, list_name)
        for item in target_list:
            if item.get('id') == item_id:
                item.update(updates)
                self.save_data(f"{list_name}.json", target_list)
                return item
        return None

    def update_settings(self, new_settings: Dict):
        self.settings.update(new_settings)
        self.save_data("settings.json", self.settings)
