"""
Load API keys from .env or config.example.env.
Call load_config() at startup so FRED_API_KEY and BLS_API_KEY are set.
"""

import os
from pathlib import Path


def load_config() -> None:
    """
    Load environment variables from .env or config.example.env.
    Prefers .env if it exists; falls back to config.example.env.
    """
    root = Path(__file__).parent
    for name in (".env", "config.example.env"):
        path = root / name
        if path.exists():
            _load_env_file(path)
            return


def _load_env_file(path: Path) -> None:
    """Parse KEY=VALUE lines and set os.environ (don't overwrite existing)."""
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, _, value = line.partition("=")
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = value
