from flask import Flask, request, jsonify
from flask_migrate import Migrate # Added for Flask-Migrate
import logging
from sqlalchemy.exc import IntegrityError
from sqlalchemy import desc, func
from decimal import Decimal
import bcrypt
import os
from werkzeug.utils import secure_filename
from flask import send_from_directory

# Import db instance and all models from models.py
from models import db, User, Product, ApplicationSetting, Prompt, ShowcaseProject, Guide, Project as ProjectData # Renamed imported Project to ProjectData

app = Flask(__name__)

# --- Configuration ---
# General Flask settings
UPLOAD_FOLDER = 'uploads/showcase_images' # Used by ShowcaseProject
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg', 'gif'} # Used by ShowcaseProject

# SQLAlchemy settings for Flask-SQLAlchemy
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///projects.db' # Database URI
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False # Disable modification tracking

# Initialize extensions
db.init_app(app) # Initialize Flask-SQLAlchemy
migrate = Migrate(app, db) # Initialize Flask-Migrate

# Ensure the upload folder exists
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Helper function for file uploads (used by ShowcaseProject)
def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

# --- Routes ---

from flask import render_template # Add render_template

@app.route("/")
def hello():
    try:
        submitted_projects = db.session.query(ProjectData).all()
    except Exception as e:
        app.logger.error(f"Error fetching project data for / route: {e}")
        submitted_projects = [] # Present an empty list on error
    # Assuming index.html will be updated to display these projects
    # and also other content it might already have.
    # For now, we just pass the projects.
    # The existing ShowcaseProjects are typically shown on showcase.html,
    # so this will be for the newly added 'ProjectData' type projects.
    return render_template("index.html", submitted_projects=submitted_projects)

# --- User Routes ---
@app.route('/users', methods=['POST'])
def create_user():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('email') or not data.get('password'):
        return jsonify({"error": "Missing username, email, or password"}), 400

    try:
        hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        new_user = User(
            username=data['username'],
            email=data['email'],
            password_hash=hashed_password
        )
        db.session.add(new_user)
        db.session.commit()
        return jsonify({"message": "User created", "user_id": new_user.id, "username": new_user.username}), 201
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Username or email already exists"}), 409
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error creating user: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    try:
        user = db.session.get(User, user_id) # More modern way to get by primary key
        if user:
            return jsonify({
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "created_at": user.created_at.isoformat() if user.created_at else None
            })
        return jsonify({"error": "User not found"}), 404
    except Exception as e:
        app.logger.error(f"Error getting user {user_id}: {e}")
        return jsonify({"error": str(e)}), 500

# --- Product Routes ---
@app.route('/products', methods=['POST'])
def add_product():
    data = request.get_json()
    if not data or not data.get('name') or data.get('price') is None:
        return jsonify({"error": "Missing product name or price"}), 400

    try:
        new_product = Product(
            name=data['name'],
            description=data.get('description'),
            price=Decimal(data['price']), # Ensure price is Decimal
            sku=data.get('sku'),
            stock_quantity=data.get('stock_quantity', 0)
        )
        db.session.add(new_product)
        db.session.commit()
        return jsonify({"message": "Product added", "product_id": new_product.id}), 201
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Product SKU already exists"}), 409
    except ValueError: # For Decimal conversion error
        db.session.rollback()
        return jsonify({"error": "Invalid price format"}), 400
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error adding product: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/products', methods=['GET'])
def list_products():
    try:
        products = db.session.query(Product).all()
        return jsonify([{
            "id": p.id, "name": p.name, "description": p.description,
            "price": str(p.price), "sku": p.sku, "stock_quantity": p.stock_quantity
        } for p in products])
    except Exception as e:
        app.logger.error(f"Error listing products: {e}")
        return jsonify({"error": str(e)}), 500

# --- Application Settings Routes ---
@app.route('/settings/<string:key>', methods=['GET'])
def get_setting(key):
    try:
        setting = db.session.query(ApplicationSetting).filter(ApplicationSetting.key == key).first()
        if setting:
            return jsonify({"key": setting.key, "value": setting.value, "description": setting.description})
        return jsonify({"error": "Setting not found"}), 404
    except Exception as e:
        app.logger.error(f"Error getting setting {key}: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/settings', methods=['POST'])
def create_or_update_setting():
    data = request.get_json()
    if not data or not data.get('key'):
        return jsonify({"error": "Missing setting key"}), 400

    try:
        setting = db.session.query(ApplicationSetting).filter(ApplicationSetting.key == data['key']).first()
        if setting:
            setting.value = data.get('value')
            setting.description = data.get('description', setting.description)
            message = "Setting updated"
        else:
            setting = ApplicationSetting(
                key=data['key'],
                value=data.get('value'),
                description=data.get('description')
            )
            db.session.add(setting)
            message = "Setting created"
        db.session.commit()
        return jsonify({"message": message, "setting": {"key": setting.key, "value": setting.value}}), 200 if message == "Setting updated" else 201
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error creating/updating setting: {e}")
        return jsonify({"error": str(e)}), 500

# --- Prompt Routes ---
@app.route('/prompts', methods=['GET'])
def get_prompts():
    try:
        query = db.session.query(Prompt)
        category = request.args.get('category')
        if category:
            query = query.filter(Prompt.category == category)
        search_term = request.args.get('term')
        if search_term:
            query = query.filter(
                (Prompt.title.ilike(f"%{search_term}%")) |
                (Prompt.description.ilike(f"%{search_term}%"))
            )
        sort_by = request.args.get('sort_by', 'date')
        if sort_by == 'popularity':
            query = query.order_by(desc(Prompt.usage_count))
        elif sort_by == 'date':
            query = query.order_by(desc(Prompt.created_at))
        elif sort_by == 'title':
            query = query.order_by(Prompt.title)
        elif sort_by == 'rating':
            query = query.order_by(desc(Prompt.rating))
        prompts = query.all()
        return jsonify([{
            "id": p.id, "title": p.title, "category": p.category, "description": p.description,
            "prompt_text": p.prompt_text, "rating": str(p.rating) if p.rating is not None else None,
            "usage_count": p.usage_count, "created_at": p.created_at.isoformat() if p.created_at else None
        } for p in prompts])
    except Exception as e:
        app.logger.error(f"Error getting prompts: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/prompts/categories', methods=['GET'])
def get_prompt_categories():
    try:
        categories = db.session.query(Prompt.category, func.count(Prompt.category).label('count')).group_by(Prompt.category).order_by(Prompt.category).all()
        return jsonify([{"name": cat, "count": count} for cat, count in categories])
    except Exception as e:
        app.logger.error(f"Error getting prompt categories: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/prompts', methods=['POST'])
def create_prompt():
    data = request.get_json()
    app.logger.info(f"Received prompt submission data: {data}")
    if not data or not data.get('title') or not data.get('category') or not data.get('prompt_text'):
        app.logger.warning("Prompt submission failed: Missing title, category, or prompt_text.")
        return jsonify({"error": "Missing title, category, or prompt_text"}), 400

    try:
        new_prompt = Prompt(
            title=data['title'],
            category=data['category'],
            description=data.get('description'),
            prompt_text=data['prompt_text'],
            rating=Decimal(data['rating']) if data.get('rating') else None
        )
        db.session.add(new_prompt)
        db.session.commit()
        app.logger.info(f"Prompt committed to database. New prompt ID: {new_prompt.id}")
        response_data = {
            "message": "Prompt created",
            "prompt": {
                "id": new_prompt.id, "title": new_prompt.title, "category": new_prompt.category,
                "description": new_prompt.description, "prompt_text": new_prompt.prompt_text,
                "rating": str(new_prompt.rating) if new_prompt.rating is not None else None,
                "usage_count": new_prompt.usage_count,
                "created_at": new_prompt.created_at.isoformat() if new_prompt.created_at else None
            }
        }
        return jsonify(response_data), 201
    except ValueError:
        db.session.rollback()
        app.logger.error(f"ValueError during prompt creation (rating format?). Data: {data}")
        return jsonify({"error": "Invalid rating format. Must be a number."}), 400
    except IntegrityError as ie:
        db.session.rollback()
        app.logger.error(f"IntegrityError during prompt creation: {ie}. Data: {data}")
        return jsonify({"error": "Database integrity error."}), 409
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Unhandled exception during prompt creation: {e}. Data: {data}", exc_info=True)
        return jsonify({"error": "An unexpected error occurred."}), 500

# --- Showcase Project Routes ---
@app.route('/showcase/projects', methods=['POST'])
def create_showcase_project():
    try:
        title = request.form.get('project-title')
        category = request.form.get('project-category')
        description = request.form.get('project-description')
        link = request.form.get('project-link')

        if not title or not category or not description:
            return jsonify({"error": "Missing required fields: title, category, or description"}), 400

        image_filename = None
        if 'project-image' in request.files:
            file = request.files['project-image']
            if file and file.filename != '' and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                image_filename = filename
            elif file.filename != '':
                return jsonify({"error": "Invalid image file type."}), 400

        new_project = ShowcaseProject(
            title=title, category=category, description=description,
            link=link, image_filename=image_filename
        )
        db.session.add(new_project)
        db.session.commit()
        return jsonify({
            "message": "Project submitted successfully!",
            "project": {
                "id": new_project.id, "title": new_project.title, "category": new_project.category,
                "description": new_project.description, "link": new_project.link,
                "image_filename": new_project.image_filename,
                "submitted_at": new_project.submitted_at.isoformat() if new_project.submitted_at else None
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error creating showcase project: {e}")
        return jsonify({"error": "An internal error occurred: " + str(e)}), 500

@app.route('/showcase/projects', methods=['GET'])
def get_showcase_projects():
    try:
        projects = db.session.query(ShowcaseProject).order_by(desc(ShowcaseProject.submitted_at)).all()
        return jsonify([{
            "id": p.id, "title": p.title, "category": p.category, "description": p.description,
            "link": p.link, "image_url": f"/uploads/showcase_images/{p.image_filename}" if p.image_filename else None,
            "image_filename": p.image_filename,
            "submitted_at": p.submitted_at.isoformat() if p.submitted_at else None
        } for p in projects])
    except Exception as e:
        app.logger.error(f"Error fetching showcase projects: {e}")
        return jsonify({"error": "An internal error occurred: " + str(e)}), 500

@app.route('/uploads/showcase_images/<filename>')
def uploaded_showcase_image(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# --- Guide Routes ---
@app.route('/guides', methods=['POST'])
def create_guide():
    data = request.get_json()
    app.logger.info(f"Received guide submission data: {data}")
    if not data or not data.get('url') or not data.get('category'):
        app.logger.warning("Guide submission failed: Missing url or category.")
        return jsonify({"error": "Missing URL or category"}), 400

    try:
        new_guide = Guide(url=data['url'], category=data['category'])
        db.session.add(new_guide)
        db.session.commit()
        app.logger.info(f"Guide committed to database. New guide ID: {new_guide.id}")
        return jsonify({
            "message": "Guide submitted successfully!",
            "guide": {
                "id": new_guide.id, "url": new_guide.url, "category": new_guide.category,
                "submitted_at": new_guide.submitted_at.isoformat() if new_guide.submitted_at else None
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error creating guide: {e}", exc_info=True)
        return jsonify({"error": "An unexpected error occurred."}), 500

@app.route('/guides', methods=['GET'])
def get_guides():
    try:
        query = db.session.query(Guide)
        category = request.args.get('category')
        if category and category.lower() != 'all':
            query = query.filter(Guide.category == category)
        query = query.order_by(desc(Guide.submitted_at))
        guides = query.all()
        return jsonify([{
            "id": g.id, "url": g.url, "category": g.category,
            "submitted_at": g.submitted_at.isoformat() if g.submitted_at else None
        } for g in guides])
    except Exception as e:
        app.logger.error(f"Error fetching guides: {e}", exc_info=True)
        return jsonify({"error": "An unexpected error occurred."}), 500

# --- New ProjectData Routes (for the original request) ---
# These routes will interact with the 'projects_data' table via the ProjectData model

@app.route('/submit_project_data', methods=['POST']) # Changed endpoint to avoid conflict
def submit_project_data():
    data = request.get_json()
    if not data or not data.get('name') or not data.get('description') or not data.get('url'):
        return jsonify({"error": "Missing name, description, or URL"}), 400

    try:
        new_project_entry = ProjectData(
            name=data['name'],
            description=data['description'],
            url=data['url']
        )
        db.session.add(new_project_entry)
        db.session.commit()
        return jsonify({
            "message": "Project data submitted successfully!",
            "project": {
                "id": new_project_entry.id,
                "name": new_project_entry.name,
                "description": new_project_entry.description,
                "url": new_project_entry.url
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error submitting project data: {e}")
        return jsonify({"error": "An internal error occurred: " + str(e)}), 500

@app.route('/list_project_data', methods=['GET']) # Changed endpoint to avoid conflict
def list_project_data():
    try:
        projects = db.session.query(ProjectData).all()
        return jsonify([{
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "url": p.url
        } for p in projects])
    except Exception as e:
        app.logger.error(f"Error listing project data: {e}")
        return jsonify({"error": "An internal error occurred: " + str(e)}), 500


if __name__ == '__main__':
    # The `db.create_all()` call is generally not needed here if using Flask-Migrate.
    # Migrations (flask db init, migrate, upgrade) will handle table creation.
    # However, for simple non-migration setups or testing, you might use:
    # with app.app_context():
    #     db.create_all()
    app.run(debug=True)
