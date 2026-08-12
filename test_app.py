import unittest
import json
import os

# Configure app for testing BEFORE importing app and db
# This is crucial for Flask-SQLAlchemy
TEST_DB_FILE = 'test_app.db'
os.environ['FLASK_APP_TEST_DB_URI'] = f'sqlite:///{TEST_DB_FILE}'

from app import app
from models import db, User, Product, ApplicationSetting, Project as ProjectData # Import ProjectData

class AppTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        """Set up for all tests once."""
        cls.test_db_file = TEST_DB_FILE
        app.config['SQLALCHEMY_DATABASE_URI'] = os.environ['FLASK_APP_TEST_DB_URI']
        app.config['TESTING'] = True
        app.config['WTF_CSRF_ENABLED'] = False # Disable CSRF for testing forms if any

        with app.app_context():
            db.create_all()

    @classmethod
    def tearDownClass(cls):
        """Tear down after all tests once."""
        with app.app_context():
            db.drop_all()

        if os.path.exists(cls.test_db_file):
            os.remove(cls.test_db_file)
        # Clean up environment variable
        if 'FLASK_APP_TEST_DB_URI' in os.environ:
            del os.environ['FLASK_APP_TEST_DB_URI']


    def setUp(self):
        """Set up for each test method."""
        self.app_context = app.app_context()
        self.app_context.push() # Push an app context for each test
        self.client = app.test_client()

        # Clean data from tables before each test to ensure test isolation
        db.session.query(User).delete()
        db.session.query(Product).delete()
        db.session.query(ApplicationSetting).delete()
        db.session.query(ProjectData).delete() # Clean ProjectData table
        # Add other models here if they need cleaning: Prompt, ShowcaseProject, Guide
        db.session.commit()

        # If specific tests need specific pre-existing data, add it here.
        if self._testMethodName == 'test_07_get_setting':
            setting = ApplicationSetting(key="site_name", value="Test Site for test_07", description="...")
            db.session.add(setting)
            db.session.commit()

        if self._testMethodName == 'test_09_update_setting':
            setting = ApplicationSetting(key='update_setting_key', value='initial_value_for_09', description='Setting to be updated')
            db.session.add(setting)
            db.session.commit()

    def tearDown(self):
        """Tear down after each test method."""
        db.session.remove() # Ensures the session is properly closed
        self.app_context.pop() # Pop the app context

    def test_01_home_page(self):
        """Test the home page"""
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        # Check for a part of the title or a unique static string
        self.assertIn(b"Jules Community", response.data)
        # Check that submitted_projects is handled (even if empty)
        self.assertIn(b"Submitted Community Projects", response.data)


    def test_02_create_user(self):
        """Test creating a new user"""
        response = self.client.post('/users',
                                 data=json.dumps(dict(username='testuser1', email='test1@example.com', password='password123')),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 201, response.data.decode())
        data = json.loads(response.data)
        self.assertEqual(data['username'], 'testuser1')
        self.assertIn('user_id', data)


    def test_03_create_user_duplicate_username(self):
        """Test creating a user with a duplicate username"""
        # First user
        self.client.post('/users',
                      data=json.dumps(dict(username='testuser2', email='test2@example.com', password='password123')),
                      content_type='application/json')
        # Attempt to create another user with the same username
        response = self.client.post('/users',
                                 data=json.dumps(dict(username='testuser2', email='test3@example.com', password='password456')),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 409, response.data.decode())

    def test_04_get_user(self):
        """Test getting a user by ID"""
        # Create a user first
        post_response = self.client.post('/users',
                                      data=json.dumps(dict(username='testuser4', email='test4@example.com', password='password123')),
                                      content_type='application/json')
        self.assertEqual(post_response.status_code, 201, f"Failed to create user for get_user test: {post_response.data.decode()}")
        user_id = json.loads(post_response.data)['user_id']

        # Get the user
        response = self.client.get(f'/users/{user_id}')
        self.assertEqual(response.status_code, 200, response.data.decode())
        data = json.loads(response.data)
        self.assertEqual(data['username'], 'testuser4')

    def test_05_add_product(self):
        """Test adding a new product"""
        response = self.client.post('/products',
                                 data=json.dumps(dict(name='Test Product', price=10.99, sku='TP001')),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 201, response.data.decode())
        data = json.loads(response.data)
        self.assertIn('product_id', data)

    def test_06_list_products(self):
        """Test listing all products"""
        # Add a product first
        add_prod_response = self.client.post('/products',
                      data=json.dumps(dict(name='Test Product 2', price=19.99, sku='TP002')),
                      content_type='application/json')
        self.assertEqual(add_prod_response.status_code, 201, f"Failed to add product for list_products test: {add_prod_response.data.decode()}")

        response = self.client.get('/products')
        self.assertEqual(response.status_code, 200, response.data.decode())
        data = json.loads(response.data)
        self.assertIsInstance(data, list)
        self.assertTrue(any(p['sku'] == 'TP002' for p in data), "Added product not found in list")


    def test_07_get_setting(self):
        """Test getting an application setting (created in setUp for this test)"""
        response = self.client.get('/settings/site_name') # site_name is added in setUp for this test
        self.assertEqual(response.status_code, 200, response.data.decode())
        data = json.loads(response.data)
        self.assertEqual(data['key'], 'site_name')
        self.assertEqual(data['value'], 'Test Site for test_07')

    def test_08_create_setting(self):
        """Test creating a new application setting"""
        response = self.client.post('/settings',
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
        response = self.client.post('/settings',
                                 data=json.dumps(dict(key=key_to_update, value='updated_value')),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 200, response.data.decode())
        data = json.loads(response.data)
        self.assertEqual(data['setting']['value'], 'updated_value')

    # --- Tests for ProjectData (newly added functionality) ---

    def test_10_submit_project_data_success(self):
        """Test submitting a new project via /submit_project_data"""
        project_payload = {
            "name": "Test Project Alpha",
            "description": "A cool project for testing.",
            "url": "http://example.com/alpha"
        }
        response = self.client.post('/submit_project_data',
                                    data=json.dumps(project_payload),
                                    content_type='application/json')
        self.assertEqual(response.status_code, 201, response.data.decode())
        data = json.loads(response.data)
        self.assertEqual(data['message'], 'Project data submitted successfully!')
        self.assertEqual(data['project']['name'], project_payload['name'])
        self.assertEqual(data['project']['description'], project_payload['description'])
        self.assertEqual(data['project']['url'], project_payload['url'])
        self.assertIn('id', data['project'])

        # Verify in DB
        project_id = data['project']['id']
        project_in_db = db.session.get(ProjectData, project_id)
        self.assertIsNotNone(project_in_db)
        self.assertEqual(project_in_db.name, project_payload['name'])

    def test_11_submit_project_data_missing_fields(self):
        """Test submitting project data with missing fields"""
        response = self.client.post('/submit_project_data',
                                    data=json.dumps({"name": "Missing Desc and URL"}),
                                    content_type='application/json')
        self.assertEqual(response.status_code, 400, response.data.decode())
        data = json.loads(response.data)
        self.assertIn("Missing name, description, or URL", data['error'])

    def test_12_list_project_data(self):
        """Test listing submitted projects via /list_project_data"""
        # First, submit a couple of projects
        project1_payload = {"name": "Project Gamma", "description": "Gamma Desc", "url": "http://example.com/gamma"}
        project2_payload = {"name": "Project Delta", "description": "Delta Desc", "url": "http://example.com/delta"}

        self.client.post('/submit_project_data', data=json.dumps(project1_payload), content_type='application/json')
        self.client.post('/submit_project_data', data=json.dumps(project2_payload), content_type='application/json')

        response = self.client.get('/list_project_data')
        self.assertEqual(response.status_code, 200, response.data.decode())
        data = json.loads(response.data)
        self.assertIsInstance(data, list)
        self.assertEqual(len(data), 2)

        project_names_in_response = [p['name'] for p in data]
        self.assertIn(project1_payload['name'], project_names_in_response)
        self.assertIn(project2_payload['name'], project_names_in_response)

    def test_13_get_homepage_with_project_data(self):
        """Test that submitted project data appears on the homepage"""
        project_payload = {
            "name": "Homepage Test Project",
            "description": "This project should appear on the homepage.",
            "url": "http://example.com/homepage_test"
        }
        post_response = self.client.post('/submit_project_data',
                                         data=json.dumps(project_payload),
                                         content_type='application/json')
        self.assertEqual(post_response.status_code, 201)

        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)

        # Check for project details in the HTML response
        self.assertIn(bytes(project_payload['name'], 'utf-8'), response.data)
        self.assertIn(bytes(project_payload['description'], 'utf-8'), response.data)
        # Check for the link URL (href attribute)
        self.assertIn(bytes(f'href="{project_payload["url"]}"', 'utf-8'), response.data)
        self.assertIn(b"Submitted Community Projects", response.data) # Section title

    def test_14_list_project_data_empty(self):
        """Test listing projects when none are submitted"""
        response = self.client.get('/list_project_data')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(len(data), 0)

    def test_15_get_homepage_no_project_data(self):
        """Test homepage when no project data is submitted"""
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"No community projects submitted yet", response.data)

    def test_16_seeding_idempotency_and_password_hashing(self):
        """Test that seeding is transaction-safe, idempotent, and hashes passwords securely with bcrypt"""
        import bcrypt
        from setup_local import create_sample_data
        
        # Clean users table first
        db.session.query(User).delete()
        db.session.commit()
        
        # 1. First run of create_sample_data should seed users and other tables successfully
        res1 = create_sample_data()
        self.assertTrue(res1)
        
        # Query seeded users
        test_user = db.session.query(User).filter_by(username='testuser').first()
        dev_user = db.session.query(User).filter_by(username='developer').first()
        
        self.assertIsNotNone(test_user)
        self.assertIsNotNone(dev_user)
        
        # Verify passwords are secure bcrypt hashes (usable and correct password)
        self.assertTrue(bcrypt.checkpw('password123'.encode('utf-8'), test_user.password_hash.encode('utf-8')))
        self.assertTrue(bcrypt.checkpw('password123'.encode('utf-8'), dev_user.password_hash.encode('utf-8')))
        
        # 2. Second run of create_sample_data should run successfully without unique constraint failures
        res2 = create_sample_data()
        self.assertTrue(res2)
        
        # Verify users are preserved/same
        test_user_after = db.session.query(User).filter_by(username='testuser').first()
        self.assertEqual(test_user.id, test_user_after.id)

    def test_17_startup_check_behavior(self):
        """Test that the startup migration alignment check correctly identifies alignment state"""
        from app import verify_database_schema_aligned
        import unittest.mock as mock
        
        # 1. Under normal test conditions, the check should bypass and return None
        # We can verify it returns without calling sys.exit
        with mock.patch('sys.exit') as mock_exit:
            verify_database_schema_aligned(app)
            mock_exit.assert_not_called()


if __name__ == '__main__':
    unittest.main()
