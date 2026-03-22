import sys
import os
import importlib.util

# Add backend directory to Python path
backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend')
sys.path.insert(0, backend_dir)

# Load backend/main.py via importlib to avoid circular import (this file is also main.py)
spec = importlib.util.spec_from_file_location("backend_app", os.path.join(backend_dir, "main.py"))
backend_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(backend_module)
app = backend_module.app
