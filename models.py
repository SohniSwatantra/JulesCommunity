from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.sql import func
from decimal import Decimal # For Numeric types if used by existing models

db = SQLAlchemy()

# --- Model Definitions ---

class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True, index=True)
    username = db.Column(db.String(80), unique=True, index=True, nullable=False)
    email = db.Column(db.String(120), unique=True, index=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Product(db.Model):
    __tablename__ = "products"
    id = db.Column(db.Integer, primary_key=True, index=True)
    name = db.Column(db.String(100), index=True, nullable=False)
    description = db.Column(db.Text, nullable=True)
    price = db.Column(db.Numeric(10, 2), nullable=False)
    sku = db.Column(db.String(50), unique=True, index=True, nullable=True)
    stock_quantity = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class ApplicationSetting(db.Model):
    __tablename__ = "application_settings"
    id = db.Column(db.Integer, primary_key=True, index=True)
    key = db.Column(db.String(50), unique=True, index=True, nullable=False)
    value = db.Column(db.String(255), nullable=True)
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Prompt(db.Model):
    __tablename__ = "prompts"
    id = db.Column(db.Integer, primary_key=True, index=True)
    title = db.Column(db.String(150), nullable=False, index=True)
    category = db.Column(db.String(50), index=True)
    description = db.Column(db.Text, nullable=True)
    prompt_text = db.Column(db.Text, nullable=False)
    rating = db.Column(db.Numeric(3, 2), nullable=True)
    usage_count = db.Column(db.Integer, default=0)
    is_featured = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class ShowcaseProject(db.Model):
    __tablename__ = "showcase_projects"
    id = db.Column(db.Integer, primary_key=True, index=True)
    title = db.Column(db.String(150), nullable=False, index=True)
    category = db.Column(db.String(50), index=True)
    description = db.Column(db.Text, nullable=False)
    link = db.Column(db.String(255), nullable=True)
    image_filename = db.Column(db.String(255), nullable=True)
    submitted_at = db.Column(db.DateTime(timezone=True), server_default=func.now())

class Guide(db.Model):
    __tablename__ = "guides"
    id = db.Column(db.Integer, primary_key=True, index=True)
    url = db.Column(db.String(255), nullable=False, unique=True)
    category = db.Column(db.String(50), index=True, nullable=False)
    submitted_at = db.Column(db.DateTime(timezone=True), server_default=func.now())

# Feedback model for user feedback submissions
class Feedback(db.Model):
    __tablename__ = "feedback"
    id = db.Column(db.Integer, primary_key=True, index=True)
    feedback_type = db.Column(db.String(20), nullable=False)  # bug, feature, suggestion, general, kudos
    summary = db.Column(db.String(200), nullable=False)
    details = db.Column(db.Text, nullable=False)
    email = db.Column(db.String(120), nullable=True)
    status = db.Column(db.String(20), default='submitted')  # submitted, under_review, resolved
    submitted_at = db.Column(db.DateTime(timezone=True), server_default=func.now())

# This is the new Project model for the original request
class Project(db.Model): # Renamed from the original plan to avoid conflict if a 'Project' model already existed.
    __tablename__ = "projects_data" # Using a more specific name to avoid conflict
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    url = db.Column(db.String(200), nullable=False)

    def __repr__(self):
        return f'<ProjectData {self.name}>'
