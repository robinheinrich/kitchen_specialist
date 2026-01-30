from fastapi import FastAPI, Request
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import os
import logging

from .database import DatabaseManager
from .api import router as api_router

# Configure logging
logging.basicConfig(level=logging.INFO)
_LOGGER = logging.getLogger(__name__)

app = FastAPI()

# Database setup
db_manager = DatabaseManager()

@app.middleware("http")
async def normalize_slashes(request: Request, call_next):
    # Fix for Home Assistant Ingress sending "//" instead of "/"
    if request.url.path == "//":
        request.scope["path"] = "/"
    return await call_next(request)

@app.on_event("startup")
async def startup_event():
    db_manager.initialize()
    app.state.db = db_manager

# Mount Static Files
BASE_DIR = Path(__file__).resolve().parent
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")

# Templates
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

# Mount API
app.include_router(api_router, prefix="/api")

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    ingress_path = request.headers.get("X-Ingress-Path", "")
    root_path = f"{ingress_path.rstrip('/')}/" if ingress_path else "/"
    _LOGGER.info(f"Serving root with Ingress Path: {ingress_path}, Base: {root_path}")
    return templates.TemplateResponse("index.html", {"request": request, "root_path": root_path})

@app.get("/health")
async def health_check():
    return {"status": "ok"}
    
# Debug: Catch-all to see what path is being requested if 404
@app.exception_handler(404)
async def custom_404_handler(request: Request, exc):
    _LOGGER.error(f"404 Error for path: {request.url.path}")
    return JSONResponse(
        status_code=404,
        content={"detail": f"Not Found: {request.url.path}"},
    )
