import os

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("SECRET_KEY", "sqlite-test-secret-key-for-samarthya-tests")

from app.db.base import Base
from app.db.session import engine
import app.models


Base.metadata.create_all(bind=engine)
