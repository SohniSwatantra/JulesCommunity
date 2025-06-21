import unittest
import json
import os

# Import models module for early patching
import models as models_module
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# --- Start of Global Patching ---
# This code runs when test_app.py is imported.
# It patches models.py *before* app.py (and its routes) are imported later in this file.

TEST_DB_FILE = 'test_app.db' # Define a global for the test database filename

# Create a new engine instance for the test database.
_test_engine = create_engine(
    f'sqlite:///{TEST_DB_FILE}',
    connect_args={"check_same_thread": False}
)

# Directly modify the engine and SessionLocal in the imported models_module.
# Any subsequent import of 'engine' or 'SessionLocal' from 'models' by other modules
# (like app.py) will get these patched versions.
models_module.engine = _test_engine
models_module.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_test_engine)

# Ensure that the Base metadata in models_module is bound to this test_engine.
# This is crucial for Base.metadata.create_all() to work on the correct database.
models_module.Base.metadata.bind = _test_engine

# Create all tables in the test database immediately after patching.
# This ensures tables exist before any app code (like route handlers) tries to access them.
models_module.Base.metadata.create_all(bind=_test_engine)
# --- End of Global Patching ---

# Now, import the Flask app. It will see the patched models_module.
from app import app
# Import specific model classes for use in assertions, now that models_module is patched.
from models import User, Product, ApplicationSetting

# Configure the app for testing (already done by global patching for DB)
app.config['TESTING'] = True


class AppTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        """Set up for all tests once. Tables are already created by global patching."""
        cls.test_db_file = TEST_DB_FILE  # Use the global test DB filename
        cls.test_engine = models_module.engine # Use the globally patched engine

        # Optional: Populate any truly global test data once here, if needed.
        # session = models_module.SessionLocal()
        # try:
        #     # Example: if not session.query(models_module.SomeGlobalSetting).first(): ...
        #     session.commit()
        # finally:
        #     session.close()

    @classmethod
    def tearDownClass(cls):
        """Tear down after all tests once."""
        # Drop all tables from the test database
        models_module.Base.metadata.drop_all(bind=cls.test_engine)
        # Remove the test database file
        if os.path.exists(cls.test_db_file):
            os.remove(cls.test_db_file)

    def setUp(self):
        """Set up for each test method."""
        self.app = app.test_client()
        # Use the globally patched SessionLocal from models_module
        self.SessionLocal = models_module.SessionLocal

        # Clean data from tables before each test to ensure test isolation
        session = self.SessionLocal()
        try:
            session.query(User).delete() # User from models, now correctly mapped
            session.query(Product).delete()
            session.query(ApplicationSetting).delete()
            session.commit()

            # If specific tests need specific pre-existing data, add it here.
            # This makes tests more self-contained.
            if self._testMethodName == 'test_07_get_setting':
                setting = ApplicationSetting(key="site_name", value="Test Site for test_07", description="...")
                session.add(setting)
                session.commit()

            if self._testMethodName == 'test_09_update_setting':
                 # Ensure the setting to be updated exists for this test
                setting = ApplicationSetting(key='update_setting_key', value='initial_value_for_09', description='Setting to be updated')
                session.add(setting)
                session.commit()

        except Exception as e:
            session.rollback()
            print(f"Error in setUp (cleaning/populating data): {e}")
        finally:
            session.close()


    def test_01_home_page(self):
        """Test the home page"""
        response = self.app.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Hello! Your Flask app with SQLAlchemy is running.", response.data)

    def test_02_create_user(self):
        """Test creating a new user"""
        response = self.app.post('/users',
                                 data=json.dumps(dict(username='testuser1', email='test1@example.com', password='password123')),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 201, response.data.decode())
        data = json.loads(response.data)
        self.assertEqual(data['username'], 'testuser1')
        self.assertIn('user_id', data)


    def test_03_create_user_duplicate_username(self):
        """Test creating a user with a duplicate username"""
        # First user
        self.app.post('/users',
                      data=json.dumps(dict(username='testuser2', email='test2@example.com', password='password123')),
                      content_type='application/json')
        # Attempt to create another user with the same username
        response = self.app.post('/users',
                                 data=json.dumps(dict(username='testuser2', email='test3@example.com', password='password456')),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 409, response.data.decode())

    def test_04_get_user(self):
        """Test getting a user by ID"""
        # Create a user first
        post_response = self.app.post('/users',
                                      data=json.dumps(dict(username='testuser4', email='test4@example.com', password='password123')),
                                      content_type='application/json')
        self.assertEqual(post_response.status_code, 201, f"Failed to create user for get_user test: {post_response.data.decode()}")
        user_id = json.loads(post_response.data)['user_id']

        # Get the user
        response = self.app.get(f'/users/{user_id}')
        self.assertEqual(response.status_code, 200, response.data.decode())
        data = json.loads(response.data)
        self.assertEqual(data['username'], 'testuser4')

    def test_05_add_product(self):
        """Test adding a new product"""
        response = self.app.post('/products',
                                 data=json.dumps(dict(name='Test Product', price=10.99, sku='TP001')),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 201, response.data.decode())
        data = json.loads(response.data)
        self.assertIn('product_id', data)

    def test_06_list_products(self):
        """Test listing all products"""
        # Add a product first
        add_prod_response = self.app.post('/products',
                      data=json.dumps(dict(name='Test Product 2', price=19.99, sku='TP002')),
                      content_type='application/json')
        self.assertEqual(add_prod_response.status_code, 201, f"Failed to add product for list_products test: {add_prod_response.data.decode()}")

        response = self.app.get('/products')
        self.assertEqual(response.status_code, 200, response.data.decode())
        data = json.loads(response.data)
        self.assertIsInstance(data, list)
        self.assertTrue(any(p['sku'] == 'TP002' for p in data), "Added product not found in list")


    def test_07_get_setting(self):
        """Test getting an application setting (created in setUp for this test)"""
        response = self.app.get('/settings/site_name') # site_name is added in setUp for this test
        self.assertEqual(response.status_code, 200, response.data.decode())
        data = json.loads(response.data)
        self.assertEqual(data['key'], 'site_name')
        self.assertEqual(data['value'], 'Test Site for test_07')

    def test_08_create_setting(self):
        """Test creating a new application setting"""
        response = self.app.post('/settings',
                                 data=json.dumps(dict(key='new_setting', value='new_value', description='A new test setting')),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 201, response.data.decode())
        data = json.loads(response.data)
        self.assertEqual(data['setting']['key'], 'new_setting')
        self.assertEqual(data['setting']['value'], 'new_value')

    def test_09_update_setting(self):
        """Test updating an existing application setting (created in setUp for this test)"""
        key_to_update = 'update_setting_key' # This key is added in setUp for this test.

        # Now, update it
        response = self.app.post('/settings',
                                 data=json.dumps(dict(key=key_to_update, value='updated_value')),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 200, response.data.decode())
        data = json.loads(response.data)
        self.assertEqual(data['setting']['value'], 'updated_value')


if __name__ == '__main__':
    unittest.main()
