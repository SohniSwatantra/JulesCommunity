from models import create_tables, engine, SessionLocal, User, ApplicationSetting, Product

def initialize_database():
    print("Initializing database...")
    # Create all tables
    create_tables()
    print("Tables created successfully (if they didn't already exist).")

    # Optional: Add some initial data for demonstration
    db = SessionLocal()
    try:
        # Check if settings already exist to avoid duplicates if script is run multiple times
        if db.query(ApplicationSetting).count() == 0:
            print("Adding initial application settings...")
            default_settings = [
                ApplicationSetting(key="site_name", value="My Awesome App", description="The public name of the application."),
                ApplicationSetting(key="maintenance_mode", value="false", description="Set to 'true' to enable maintenance mode."),
                ApplicationSetting(key="admin_email", value="admin@example.com", description="Default admin contact email.")
            ]
            db.add_all(default_settings)
            db.commit()
            print("Initial application settings added.")
        else:
            print("Application settings already exist, skipping initial data.")

        # Check if products already exist
        if db.query(Product).count() == 0:
            print("Adding initial sample products...")
            sample_products = [
                Product(name="Laptop Pro", description="High-performance laptop for professionals.", price=1200.00, sku="LP1001", stock_quantity=50),
                Product(name="Wireless Mouse", description="Ergonomic wireless mouse.", price=25.50, sku="WM2002", stock_quantity=200),
                Product(name="Mechanical Keyboard", description="RGB Mechanical Keyboard with blue switches.", price=75.00, sku="MK3003", stock_quantity=100)
            ]
            db.add_all(sample_products)
            db.commit()
            print("Initial sample products added.")
        else:
            print("Products already exist, skipping initial data.")

        # Note: Adding initial users should be handled carefully, especially regarding passwords.
        # For now, we'll skip adding a default user here, as password hashing should be part of user creation logic in the app.

    except Exception as e:
        print(f"An error occurred during initial data population: {e}")
        db.rollback()
    finally:
        db.close()

    print("Database initialization complete.")

if __name__ == "__main__":
    initialize_database()
