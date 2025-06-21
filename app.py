from flask import Flask, request, jsonify
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import bcrypt # Added for password hashing

# It's good practice to have models and db session management in separate files
from models import User, Product, ApplicationSetting, SessionLocal, engine, Base, get_db

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


if __name__ == '__main__':
    # For development server. In production, use a WSGI server like Gunicorn.
    # Make sure to run init_db.py first if you haven't or tables don't exist.
    print("Attempting to create database tables if they don't exist (via app.py)...")
    Base.metadata.create_all(bind=engine) # Ensures tables are created when app starts
    print("Tables checked/created.")
    print("To initialize with sample data, run: python init_db.py")
    app.run(debug=True)
