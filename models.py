import datetime

from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Numeric, UniqueConstraint
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.sql import func

DATABASE_URL = "sqlite:///./app.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False}) # check_same_thread for SQLite with Flask
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (UniqueConstraint('username'), UniqueConstraint('email'),)

class ApplicationSetting(Base):
    __tablename__ = "application_settings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    key = Column(String, unique=True, index=True, nullable=False)
    value = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (UniqueConstraint('key'),)

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    price = Column(Numeric(10, 2), nullable=False) # Example: 10 digits in total, 2 after decimal point
    sku = Column(String, unique=True, index=True, nullable=True)
    stock_quantity = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (UniqueConstraint('sku'),)


class Prompt(Base):
    __tablename__ = "prompts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String, nullable=False)
    category = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    prompt_text = Column(Text, nullable=False)
    rating = Column(Numeric(2, 1), nullable=True)  # e.g., 4.5
    usage_count = Column(Integer, default=0, nullable=False, index=True) # For popularity
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Prompt(id={self.id}, title='{self.title}', category='{self.category}')>"


class ShowcaseProject(Base):
    __tablename__ = "showcase_projects"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String, nullable=False)
    category = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=False)
    link = Column(String, nullable=True) # Link to GitHub, website, etc.
    image_filename = Column(String, nullable=True) # Stores the name of the uploaded image file
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    # Optional: user_id = Column(Integer, ForeignKey('users.id'), nullable=True) # If linking to a user

    def __repr__(self):
        return f"<ShowcaseProject(id={self.id}, title='{self.title}', category='{self.category}')>"


class Guide(Base):
    __tablename__ = "guides"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    url = Column(String, nullable=False)
    category = Column(String, nullable=False, index=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<Guide(id={self.id}, url='{self.url}', category='{self.category}')>"


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Utility to create tables (can be called from init_db.py)
def create_tables():
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    # This part is for demonstration or direct execution,
    # normally table creation would be handled by a migration tool or a dedicated script.
    print("Creating database tables...")
    create_tables()
    print("Database tables created (if they didn't exist).")
