from app import app
from models import db, User, ApplicationSetting, Product, Prompt, Guide, ShowcaseProject, Project
from decimal import Decimal

def initialize_database():
    with app.app_context():
        print("Initializing database...")
        # The table creation is now handled by Flask-Migrate, so create_all() is not needed.
        # db.create_all()

        def seed_record(model_class, lookup_filters, create_kwargs, update_on_exists=False):
            try:
                with db.session.begin_nested():
                    if isinstance(lookup_filters, list):
                        existing = None
                        for filt in lookup_filters:
                            existing = db.session.query(model_class).filter_by(**filt).first()
                            if existing:
                                break
                    else:
                        existing = db.session.query(model_class).filter_by(**lookup_filters).first()
                        
                    if existing:
                        if update_on_exists:
                            for k, v in create_kwargs.items():
                                setattr(existing, k, v)
                            print(f"   🔄 Updated existing {model_class.__name__}")
                        else:
                            print(f"   🛡️ Preserved existing {model_class.__name__}")
                    else:
                        init_args = {}
                        if isinstance(lookup_filters, list):
                            for filt in lookup_filters:
                                init_args.update(filt)
                        else:
                            init_args.update(lookup_filters)
                        init_args.update(create_kwargs)
                        new_record = model_class(**init_args)
                        db.session.add(new_record)
                        print(f"   🌱 Inserted new {model_class.__name__}")
                db.session.commit()
            except Exception as e:
                db.session.rollback()
                print(f"   ❌ Error seeding {model_class.__name__}: {e}")
                raise e

        # Optional: Add some initial data for demonstration
        try:
            # 1. Application settings
            settings_to_seed = [
                {"lookup": {"key": "site_name"}, "extra": {"value": "My Awesome App", "description": "The public name of the application."}},
                {"lookup": {"key": "maintenance_mode"}, "extra": {"value": "false", "description": "Set to 'true' to enable maintenance mode."}},
                {"lookup": {"key": "admin_email"}, "extra": {"value": "admin@example.com", "description": "Default admin contact email."}}
            ]
            for s in settings_to_seed:
                seed_record(ApplicationSetting, s['lookup'], s['extra'], update_on_exists=True)

            # 2. Products
            products_to_seed = [
                {"lookup": {"sku": "LP1001"}, "extra": {"name": "Laptop Pro", "description": "High-performance laptop for professionals.", "price": Decimal("1200.00"), "stock_quantity": 50}},
                {"lookup": {"sku": "WM2002"}, "extra": {"name": "Wireless Mouse", "description": "Ergonomic wireless mouse.", "price": Decimal("25.50"), "stock_quantity": 200}},
                {"lookup": {"sku": "MK3003"}, "extra": {"name": "Mechanical Keyboard", "description": "RGB Mechanical Keyboard with blue switches.", "price": Decimal("75.00"), "stock_quantity": 100}}
            ]
            for p in products_to_seed:
                seed_record(Product, p['lookup'], p['extra'], update_on_exists=True)

            # 3. Prompts
            prompts_to_seed = [
                {
                    "lookup": {"title": "Code Debugger"},
                    "extra": {
                        "category": "Debugging",
                        "description": "Helps identify and suggest fixes for bugs in a given code snippet.",
                        "prompt_text": "Analyze the following Python code for potential bugs and suggest fixes.\nProvide a brief explanation for each identified issue.\n\nCode:\n```python\n{{paste code here}}\n```",
                        "rating": Decimal("4.5"),
                        "usage_count": 150
                    }
                },
                {
                    "lookup": {"title": "Blog Post Outline Generator"},
                    "extra": {
                        "category": "Writing",
                        "description": "Generates a structured outline for a blog post on a specified topic.",
                        "prompt_text": "Create a comprehensive blog post outline for the topic: \"{{topic}}\".\nThe outline should include:\n- Main sections (H2)\n- Key talking points under each section (H3/bullets)\n- A suggested introduction and conclusion.\nTarget audience: {{target audience}}\nTone: {{desired tone}}",
                        "rating": Decimal("5.0"),
                        "usage_count": 250
                    }
                },
                {
                    "lookup": {"title": "SQL Query Generator"},
                    "extra": {
                        "category": "Coding",
                        "description": "Generates SQL queries based on natural language description.",
                        "prompt_text": "Based on the following database schema and natural language request, generate the appropriate SQL query.\n\nSchema:\n{{paste schema here}}\n\nRequest: {{natural language request}}",
                        "rating": Decimal("4.0"),
                        "usage_count": 120
                    }
                },
                {
                    "lookup": {"title": "Email Subject Line Creator"},
                    "extra": {
                        "category": "Writing",
                        "description": "Creates catchy email subject lines for a given email body or topic.",
                        "prompt_text": "Generate 5 catchy email subject lines for an email with the following content/topic:\n\nTopic/Content Summary:\n{{email summary here}}\n\nTarget Audience: {{target audience}}",
                        "usage_count": 90
                    }
                },
                {
                    "lookup": {"title": "Unit Test Helper"},
                    "extra": {
                        "category": "Coding",
                        "description": "Helps write unit tests for a given function or class.",
                        "prompt_text": "For the following {{language}} function/class, please help me write comprehensive unit tests.\n\nFunction/Class:\n```{{language}}\n{{code here}}\n```\n\nConsider edge cases, typical inputs, and error conditions.",
                        "rating": Decimal("4.2"),
                        "usage_count": 180
                    }
                }
            ]
            for pr in prompts_to_seed:
                seed_record(Prompt, pr['lookup'], pr['extra'], update_on_exists=True)

            # 4. Showcase projects
            showcase_to_seed = [
                {
                    "lookup": {"title": "Jules AI Community Hub"},
                    "extra": {
                        "category": "Web Development",
                        "description": "The very website you are on! Built with Flask and Jules AI integration for content generation and assistance.",
                        "link": "https://julescommunity.com",
                        "image_filename": None
                    }
                },
                {
                    "lookup": {"title": "Automated Code Reviewer"},
                    "extra": {
                        "category": "Automation",
                        "description": "A tool that uses Jules to automatically review code submissions for common errors and style issues.",
                        "link": "https://github.com/example/jules-code-reviewer",
                        "image_filename": None
                    }
                }
            ]
            for sp in showcase_to_seed:
                seed_record(ShowcaseProject, sp['lookup'], sp['extra'], update_on_exists=True)

            # 5. Project data (projects_data)
            projects_data_to_seed = [
                {"lookup": {"name": "Awesome Project 1"}, "extra": {"description": "This is the first awesome project.", "url": "http://example.com/project1"}},
                {"lookup": {"name": "Awesome Project 2"}, "extra": {"description": "This is the second awesome project.", "url": "http://example.com/project2"}},
                {"lookup": {"name": "Awesome Project 3"}, "extra": {"description": "This is the third awesome project.", "url": "http://example.com/project3"}}
            ]
            for pd in projects_data_to_seed:
                seed_record(Project, pd['lookup'], pd['extra'], update_on_exists=True)

        except Exception as e:
            print(f"An error occurred during initial data population: {e}")
            db.session.rollback()
        finally:
            # The session is managed by the app context, so no need to close it manually.
            pass

    print("Database initialization complete.")

if __name__ == "__main__":
    initialize_database()
