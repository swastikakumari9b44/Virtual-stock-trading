"""Convenience entry point so `python seed_database.py` works from backend/.

Delegates to scripts/seed_database.py (supports --reset).
"""
import runpy
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
runpy.run_path(str(Path(__file__).resolve().parent / "scripts" / "seed_database.py"), run_name="__main__")
