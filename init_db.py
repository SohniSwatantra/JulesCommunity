from app import app
from models import db, User, ApplicationSetting, Product, Prompt, Guide, ShowcaseProject, Project
from decimal import Decimal

def initialize_database():
    with app.app_context():
        print("Initializing database...")
        # The table creation is now handled by Flask-Migrate, so create_all() is not needed.
        # db.create_all()

        # Optional: Add some initial data for demonstration
        try:
            # Check if settings already exist to avoid duplicates if script is run multiple times
            if db.session.query(ApplicationSetting).count() == 0:
                print("Adding initial application settings...")
                default_settings = [
                    ApplicationSetting(key="site_name", value="My Awesome App", description="The public name of the application."),
                    ApplicationSetting(key="maintenance_mode", value="false", description="Set to 'true' to enable maintenance mode."),
                    ApplicationSetting(key="admin_email", value="admin@example.com", description="Default admin contact email.")
                ]
                db.session.add_all(default_settings)
                db.session.commit()
                print("Initial application settings added.")
            else:
                print("Application settings already exist, skipping initial data.")

            # Check if products already exist
            if db.session.query(Product).count() == 0:
                print("Adding initial sample products...")
                sample_products = [
                    Product(name="Laptop Pro", description="High-performance laptop for professionals.", price=Decimal("1200.00"), sku="LP1001", stock_quantity=50),
                    Product(name="Wireless Mouse", description="Ergonomic wireless mouse.", price=Decimal("25.50"), sku="WM2002", stock_quantity=200),
                    Product(name="Mechanical Keyboard", description="RGB Mechanical Keyboard with blue switches.", price=Decimal("75.00"), sku="MK3003", stock_quantity=100)
                ]
                db.session.add_all(sample_products)
                db.session.commit()
                print("Initial sample products added.")
            else:
                print("Products already exist, skipping initial data.")

            # Check if prompts already exist
            if db.session.query(Prompt).count() == 0:
                print("Adding initial sample prompts...")
                sample_prompts = [
                    Prompt(title="Code Debugger",
                           category="Debugging",
                           description="Helps identify and suggest fixes for bugs in a given code snippet.",
                           prompt_text="Analyze the following Python code for potential bugs and suggest fixes.\nProvide a brief explanation for each identified issue.\n\nCode:\n```python\n{{paste code here}}\n```",
                           rating=Decimal("4.5"),
                           usage_count=150),
                    Prompt(title="Blog Post Outline Generator",
                           category="Writing",
                           description="Generates a structured outline for a blog post on a specified topic.",
                           prompt_text="Create a comprehensive blog post outline for the topic: \"{{topic}}\".\nThe outline should include:\n- Main sections (H2)\n- Key talking points under each section (H3/bullets)\n- A suggested introduction and conclusion.\nTarget audience: {{target audience}}\nTone: {{desired tone}}",
                           rating=Decimal("5.0"),
                           usage_count=250),
                    Prompt(title="SQL Query Generator",
                           category="Coding",
                           description="Generates SQL queries based on natural language description.",
                           prompt_text="Based on the following database schema and natural language request, generate the appropriate SQL query.\n\nSchema:\n{{paste schema here}}\n\nRequest: {{natural language request}}",
                           rating=Decimal("4.0"),
                           usage_count=120),
                    Prompt(title="Email Subject Line Creator",
                           category="Writing",
                           description="Creates catchy email subject lines for a given email body or topic.",
                           prompt_text="Generate 5 catchy email subject lines for an email with the following content/topic:\n\nTopic/Content Summary:\n{{email summary here}}\n\nTarget Audience: {{target audience}}",
                           usage_count=90), # No rating for this one
                    Prompt(title="Unit Test Helper",
                           category="Coding",
                           description="Helps write unit tests for a given function or class.",
                           prompt_text="For the following {{language}} function/class, please help me write comprehensive unit tests.\n\nFunction/Class:\n```{{language}}\n{{code here}}\n```\n\nConsider edge cases, typical inputs, and error conditions.",
                           rating=Decimal("4.2"),
                           usage_count=180)
                ]
                db.session.add_all(sample_prompts)
                db.session.commit()
                print("Initial sample prompts added.")
            else:
                print("Prompts already exist, skipping initial data.")

            # Check if showcase projects already exist
            if db.session.query(ShowcaseProject).count() == 0:
                print("Adding initial sample showcase projects...")
                sample_projects = [
                    ShowcaseProject(title="Jules AI Community Hub",
                                    category="Web Development",
                                    description="The very website you are on! Built with Flask and Jules AI integration for content generation and assistance.",
                                    link="https://julescommunity.com", # Placeholder link
                                    image_filename=None), # No image for this initial one, or add a placeholder image
                    ShowcaseProject(title="Automated Code Reviewer",
                                    category="Automation",
                                    description="A tool that uses Jules to automatically review code submissions for common errors and style issues.",
                                    link="https://github.com/example/jules-code-reviewer", # Placeholder link
                                    image_filename=None)
                ]
                db.session.add_all(sample_projects)
                db.session.commit()
                print("Initial sample showcase projects added.")
            else:
                print("Showcase projects already exist, skipping initial data.")

            # Check if Project (projects_data) already exist
            if db.session.query(Project).count() == 0:
                print("Adding initial sample projects_data...")
                sample_projects_data = [
                    Project(name="Awesome Project 1", description="This is the first awesome project.", url="http://example.com/project1"),
                    Project(name="Awesome Project 2", description="This is the second awesome project.", url="http://example.com/project2"),
                    Project(name="Awesome Project 3", description="This is the third awesome project.", url="http://example.com/project3")
                ]
                db.session.add_all(sample_projects_data)
                db.session.commit()
                print("Initial sample projects_data added.")
            else:
                print("projects_data already exists, skipping initial data.")

        except Exception as e:
            print(f"An error occurred during initial data population: {e}")
            db.session.rollback()
        finally:
            # The session is managed by the app context, so no need to close it manually.
            pass

    print("Database initialization complete.")

if __name__ == "__main__":
    initialize_database()
