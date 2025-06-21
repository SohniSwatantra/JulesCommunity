from flask import Flask, request, jsonify
import logging # Added for logging
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import desc, func
from decimal import Decimal
import bcrypt # Added for password hashing
import os # For file paths
from werkzeug.utils import secure_filename # For secure file uploads
from flask import send_from_directory # To serve uploaded files if needed later

# It's good practice to have models and db session management in separate files
from models import User, Product, ApplicationSetting, Prompt, ShowcaseProject, SessionLocal, engine, Base, get_db

# Create tables if they don't exist (alternative to running init_db.py separately for simple cases)
# Base.metadata.create_all(bind=engine)

app = Flask(__name__)


# Dependency for database session
def get_db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.route("/")
def hello():
    return "Hello! Your Flask app with SQLAlchemy is running. Use specific endpoints to interact with the database."

# --- User Routes ---
@app.route('/users', methods=['POST'])
def create_user():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('email') or not data.get('password'):
        return jsonify({"error": "Missing username, email, or password"}), 400

    db: Session = next(get_db_session())
    try:
        # Hash the password
        hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        new_user = User(
            username=data['username'],
            email=data['email'],
            password_hash=hashed_password # Store the hashed password
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return jsonify({"message": "User created", "user_id": new_user.id, "username": new_user.username}), 201
    except IntegrityError: # Handles unique constraint violations (e.g., username or email already exists)
        db.rollback()
        return jsonify({"error": "Username or email already exists"}), 409
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

@app.route('/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    db: Session = next(get_db_session())
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            return jsonify({
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "created_at": user.created_at.isoformat()
            })
        return jsonify({"error": "User not found"}), 404
    finally:
        db.close()

# --- Product Routes ---
@app.route('/products', methods=['POST'])
def add_product():
    data = request.get_json()
    if not data or not data.get('name') or data.get('price') is None: # price can be 0
        return jsonify({"error": "Missing product name or price"}), 400

    db: Session = next(get_db_session())
    try:
        new_product = Product(
            name=data['name'],
            description=data.get('description'),
            price=data['price'],
            sku=data.get('sku'),
            stock_quantity=data.get('stock_quantity', 0)
        )
        db.add(new_product)
        db.commit()
        db.refresh(new_product)
        return jsonify({"message": "Product added", "product_id": new_product.id}), 201
    except IntegrityError:
        db.rollback()
        return jsonify({"error": "Product SKU already exists"}), 409
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

@app.route('/products', methods=['GET'])
def list_products():
    db: Session = next(get_db_session())
    try:
        products = db.query(Product).all()
        return jsonify([{
            "id": p.id, "name": p.name, "description": p.description,
            "price": str(p.price), "sku": p.sku, "stock_quantity": p.stock_quantity
        } for p in products])
    finally:
        db.close()

# --- Application Settings Routes ---
@app.route('/settings/<string:key>', methods=['GET'])
def get_setting(key):
    db: Session = next(get_db_session())
    try:
        setting = db.query(ApplicationSetting).filter(ApplicationSetting.key == key).first()
        if setting:
            return jsonify({"key": setting.key, "value": setting.value, "description": setting.description})
        return jsonify({"error": "Setting not found"}), 404
    finally:
        db.close()

@app.route('/settings', methods=['POST'])
def create_or_update_setting():
    data = request.get_json()
    if not data or not data.get('key'):
        return jsonify({"error": "Missing setting key"}), 400

    db: Session = next(get_db_session())
    try:
        setting = db.query(ApplicationSetting).filter(ApplicationSetting.key == data['key']).first()
        if setting: # Update existing setting
            setting.value = data.get('value')
            setting.description = data.get('description', setting.description)
            message = "Setting updated"
        else: # Create new setting
            setting = ApplicationSetting(
                key=data['key'],
                value=data.get('value'),
                description=data.get('description')
            )
            db.add(setting)
            message = "Setting created"

        db.commit()
        db.refresh(setting)
        return jsonify({"message": message, "setting": {"key": setting.key, "value": setting.value}}), 200 if message == "Setting updated" else 201
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

# --- Prompt Routes ---
@app.route('/prompts', methods=['GET'])
def get_prompts():
    db: Session = next(get_db_session())
    try:
        query = db.query(Prompt)

        # Filtering
        category = request.args.get('category')
        if category:
            query = query.filter(Prompt.category == category)

        search_term = request.args.get('term')
        if search_term:
            query = query.filter(
                (Prompt.title.ilike(f"%{search_term}%")) |
                (Prompt.description.ilike(f"%{search_term}%"))
            )

        # Sorting
        sort_by = request.args.get('sort_by', 'date') # Default sort by date
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
            "id": p.id,
            "title": p.title,
            "category": p.category,
            "description": p.description,
            "prompt_text": p.prompt_text,
            "rating": str(p.rating) if p.rating is not None else None,
            "usage_count": p.usage_count,
            "created_at": p.created_at.isoformat()
        } for p in prompts])
    finally:
        db.close()

@app.route('/prompts/categories', methods=['GET'])
def get_prompt_categories():
    db: Session = next(get_db_session())
    try:
        categories = db.query(Prompt.category, func.count(Prompt.category).label('count')).group_by(Prompt.category).order_by(Prompt.category).all()
        return jsonify([{"name": cat, "count": count} for cat, count in categories])
    finally:
        db.close()

@app.route('/prompts', methods=['POST'])
def create_prompt():
    data = request.get_json()
    app.logger.info(f"Received prompt submission data: {data}")

    if not data or not data.get('title') or not data.get('category') or not data.get('prompt_text'):
        app.logger.warning("Prompt submission failed: Missing title, category, or prompt_text.")
        return jsonify({"error": "Missing title, category, or prompt_text"}), 400

    db: Session = next(get_db_session())
    try:
        app.logger.info("Creating new Prompt object.")
        new_prompt = Prompt(
            title=data['title'],
            category=data['category'],
            description=data.get('description'),
            prompt_text=data['prompt_text'],
            # Rating can be optional, usage_count defaults to 0
            rating=Decimal(data['rating']) if data.get('rating') else None
        )
        db.add(new_prompt)
        app.logger.info("Adding new prompt to session.")
        db.commit()
        app.logger.info(f"Prompt committed to database. New prompt ID: {new_prompt.id}")
        db.refresh(new_prompt)
        app.logger.info("Prompt refreshed from database.")

        response_data = {
            "message": "Prompt created",
            "prompt": {
                "id": new_prompt.id,
                "title": new_prompt.title,
                "category": new_prompt.category,
                "description": new_prompt.description,
                "prompt_text": new_prompt.prompt_text,
                "rating": str(new_prompt.rating) if new_prompt.rating is not None else None,
                "usage_count": new_prompt.usage_count,
                "created_at": new_prompt.created_at.isoformat()
            }
        }
        app.logger.info(f"Successfully created prompt. Response: {response_data}")
        return jsonify(response_data), 201
    except ValueError as ve: # Handle invalid Decimal conversion for rating
        db.rollback()
        app.logger.error(f"ValueError during prompt creation: {ve}. Data: {data}")
        return jsonify({"error": "Invalid rating format. Must be a number."}), 400
    except IntegrityError as ie:
        db.rollback()
        app.logger.error(f"IntegrityError during prompt creation: {ie}. Data: {data}")
        return jsonify({"error": "Database integrity error. Possible duplicate or constraint violation."}), 409
    except Exception as e:
        db.rollback()
        app.logger.error(f"Unhandled exception during prompt creation: {e}. Data: {data}", exc_info=True)
        return jsonify({"error": "An unexpected error occurred on the server."}), 500
    finally:
        app.logger.debug("Closing database session for prompt creation.")
        db.close()

# --- Showcase Project Routes ---
@app.route('/showcase/projects', methods=['POST'])
def create_showcase_project():
    db: Session = next(get_db_session())
    try:
        # Data from form-data; request.form for text fields, request.files for files
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
                # To avoid filename collisions, prepend with a unique identifier or timestamp if necessary
                # For simplicity here, we'll just use the secure filename.
                # Consider adding timestamp: filename = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{filename}"
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                image_filename = filename
            elif file.filename != '': # File was provided but not allowed type
                return jsonify({"error": "Invalid image file type. Allowed types: png, jpg, jpeg, gif"}), 400

        new_project = ShowcaseProject(
            title=title,
            category=category,
            description=description,
            link=link,
            image_filename=image_filename
        )
        db.add(new_project)
        db.commit()
        db.refresh(new_project)

        return jsonify({
            "message": "Project submitted successfully!",
            "project": {
                "id": new_project.id,
                "title": new_project.title,
                "category": new_project.category,
                "description": new_project.description,
                "link": new_project.link,
                "image_filename": new_project.image_filename,
                "submitted_at": new_project.submitted_at.isoformat()
            }
        }), 201

    except Exception as e:
        db.rollback()
        app.logger.error(f"Error creating showcase project: {e}") # Log the error
        return jsonify({"error": "An internal error occurred: " + str(e)}), 500
    finally:
        db.close()

@app.route('/showcase/projects', methods=['GET'])
def get_showcase_projects():
    db: Session = next(get_db_session())
    try:
        projects = db.query(ShowcaseProject).order_by(desc(ShowcaseProject.submitted_at)).all()

        # Construct image URLs. This assumes the client will prepend the base URL.
        # Or, you could return full URLs: f"{request.host_url.rstrip('/')}/uploads/showcase_images/{p.image_filename}"
        return jsonify([{
            "id": p.id,
            "title": p.title,
            "category": p.category,
            "description": p.description,
            "link": p.link,
            "image_url": f"/uploads/showcase_images/{p.image_filename}" if p.image_filename else None,
            "image_filename": p.image_filename, # Keep filename for reference if needed
            "submitted_at": p.submitted_at.isoformat()
        } for p in projects])
    except Exception as e:
        app.logger.error(f"Error fetching showcase projects: {e}")
        return jsonify({"error": "An internal error occurred: " + str(e)}), 500
    finally:
        db.close()

# Route to serve uploaded images
@app.route('/uploads/showcase_images/<filename>')
def uploaded_showcase_image(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


if __name__ == '__main__':
    # For development server. In production, use a WSGI server like Gunicorn.
    # Make sure to run init_db.py first if you haven't or tables don't exist.
    app.logger.info("Attempting to create database tables if they don't exist (via app.py)...")
    Base.metadata.create_all(bind=engine) # Ensures tables are created when app starts
    app.logger.info("Tables checked/created.")
    print("To initialize with sample data, run: python init_db.py") # Keep this print for console feedback
    app.run(debug=True)
