# JulesCommunity
A website for Jules Community. Contain Jules Updates, Prompts, Projects, Docs and much more.

## Backend API with SQLite Database

This project now includes a Python-based backend API using Flask and SQLAlchemy to interact with an SQLite database. The database stores information about users, products, and application settings.

### Project Structure

- `app.py`: The main Flask application file with API endpoints.
- `models.py`: Contains SQLAlchemy database models and session management.
- `init_db.py`: A script to initialize the database and create tables (and optionally add sample data).
- `requirements.txt`: Python dependencies.
- `app.db`: The SQLite database file (will be created when `init_db.py` or `app.py` is run).

### Setup and Usage

#### 1. Prerequisites
- Python 3.x
- pip (Python package installer)

#### 2. Install Dependencies
Navigate to the project root directory in your terminal and run:
```bash
pip install -r requirements.txt
```

#### 3. Initialize the Database
Before running the application for the first time, or if you want to reset the database with sample data, run the initialization script:
```bash
python init_db.py
```
This will create an `app.db` file in the project root and set up the necessary tables. It will also populate some sample data for products and application settings.

#### 4. Run the Flask Application
To start the development server:
```bash
python app.py
```
The application will typically be available at `http://127.0.0.1:5000/`.

### API Endpoints

Here are some of the available API endpoints:

**Users**
- `POST /users`: Create a new user.
  - **Body (JSON):** `{"username": "testuser", "email": "test@example.com", "password": "securepassword123"}`
  - **Success Response (201):** `{"message": "User created", "user_id": 1, "username": "testuser"}`
- `GET /users/<user_id>`: Retrieve a user by their ID.
  - **Success Response (200):** `{"id": 1, "username": "testuser", "email": "test@example.com", "created_at": "..."}`

**Products**
- `POST /products`: Add a new product.
  - **Body (JSON):** `{"name": "Awesome Gadget", "description": "The best gadget ever.", "price": 49.99, "sku": "AG001", "stock_quantity": 100}`
  - **Success Response (201):** `{"message": "Product added", "product_id": 1}`
- `GET /products`: List all products.
  - **Success Response (200):** `[{"id": 1, "name": "Laptop Pro", ...}, ...]`

**Application Settings**
- `POST /settings`: Create or update an application setting.
  - **Body (JSON):** `{"key": "site_title", "value": "My Jules App", "description": "The main title for the website"}`
  - **Success Response (200/201):** `{"message": "Setting created/updated", "setting": {"key": "site_title", "value": "My Jules App"}}`
- `GET /settings/<key>`: Retrieve an application setting by its key.
  - **Success Response (200):** `{"key": "site_title", "value": "My Jules App", "description": "..."}`

### Notes
- The SQLite database file (`app.db`) will be created in the root of the project. It's advisable to add `app.db` to your `.gitignore` file if you don't want to commit the actual database contents.
- For production environments, use a proper WSGI server (like Gunicorn or uWSGI) instead of Flask's built-in development server.
- Password hashing is implemented using `bcrypt`.
