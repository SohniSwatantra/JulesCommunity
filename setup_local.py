#!/usr/bin/env python3
"""
Local development setup script
Creates database tables and sample data for testing
"""

import os
import sys
from flask import Flask
from models import db, User, Product, ApplicationSetting, Prompt, ShowcaseProject, Guide, Project as ProjectData, Feedback
from app import app
from decimal import Decimal

def create_sample_data():
    """Create sample data for testing using an idempotent transaction-safe pipeline"""
    
    print("🌱 Creating sample data...")
    import bcrypt

    def hash_password(password):
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

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

    try:
        # Standard password hashing for test accounts
        hashed_password = hash_password('password123')

        # 1. Users
        users_to_seed = [
            {
                'lookup': [{'username': 'testuser'}, {'email': 'test@example.com'}],
                'extra': {'password_hash': hashed_password}
            },
            {
                'lookup': [{'username': 'developer'}, {'email': 'dev@example.com'}],
                'extra': {'password_hash': hashed_password}
            }
        ]
        for u in users_to_seed:
            seed_record(User, u['lookup'], u['extra'], update_on_exists=False)

        # 2. Products
        products_to_seed = [
            {
                'lookup': {'sku': 'AI-001'},
                'extra': {'name': 'AI Tool License', 'description': 'Premium AI tool subscription', 'price': Decimal('29.99'), 'stock_quantity': 50}
            },
            {
                'lookup': {'sku': 'AI-002'},
                'extra': {'name': 'Advanced Features', 'description': 'Unlock advanced AI features', 'price': Decimal('49.99'), 'stock_quantity': 100}
            }
        ]
        for p in products_to_seed:
            seed_record(Product, p['lookup'], p['extra'], update_on_exists=True)

        # 3. Settings
        settings_to_seed = [
            {
                'lookup': {'key': 'site_name'},
                'extra': {'value': 'Jules Community Hub', 'description': 'Site name'}
            },
            {
                'lookup': {'key': 'max_upload_size'},
                'extra': {'value': '10MB', 'description': 'Maximum file upload size'}
            }
        ]
        for s in settings_to_seed:
            seed_record(ApplicationSetting, s['lookup'], s['extra'], update_on_exists=True)

        # 4. Prompts
        prompts_to_seed = [
            {
                'lookup': {'title': 'Code Review Assistant'},
                'extra': {
                    'category': 'Development',
                    'description': 'Help review code for best practices and bugs',
                    'prompt_text': 'Please review this code for best practices, potential bugs, and suggest improvements:',
                    'rating': Decimal('4.5'),
                    'usage_count': 150
                }
            },
            {
                'lookup': {'title': 'Email Writer'},
                'extra': {
                    'category': 'Writing',
                    'description': 'Compose professional emails',
                    'prompt_text': 'Write a professional email for the following situation:',
                    'rating': Decimal('4.2'),
                    'usage_count': 89
                }
            },
            {
                'lookup': {'title': 'Documentation Generator'},
                'extra': {
                    'category': 'Development',
                    'description': 'Generate documentation for code',
                    'prompt_text': 'Create comprehensive documentation for this code including usage examples:',
                    'rating': Decimal('4.7'),
                    'usage_count': 201
                }
            }
        ]
        for pr in prompts_to_seed:
            seed_record(Prompt, pr['lookup'], pr['extra'], update_on_exists=True)

        # 5. Showcase Projects
        showcase_projects_to_seed = [
            {
                'lookup': {'title': 'AI-Powered Task Manager'},
                'extra': {
                    'category': 'Productivity',
                    'description': 'A smart task manager that uses AI to prioritize and categorize tasks automatically',
                    'link': 'https://github.com/example/ai-task-manager',
                    'image_filename': 'task_manager.jpg'
                }
            },
            {
                'lookup': {'title': 'Code Documentation Bot'},
                'extra': {
                    'category': 'Development',
                    'description': 'Automatically generates documentation for codebases using AI analysis',
                    'link': 'https://github.com/example/doc-bot',
                    'image_filename': 'doc_bot.jpg'
                }
            }
        ]
        for sp in showcase_projects_to_seed:
            seed_record(ShowcaseProject, sp['lookup'], sp['extra'], update_on_exists=True)

        # 6. Guides
        guides_to_seed = [
            {'lookup': {'url': 'https://blog.example.com/getting-started-with-ai'}, 'extra': {'category': 'blogpost'}},
            {'lookup': {'url': 'https://youtube.com/watch?v=ai-tutorial'}, 'extra': {'category': 'youtube'}},
            {'lookup': {'url': 'https://reddit.com/r/AI/post/tutorial'}, 'extra': {'category': 'redditpost'}},
            {'lookup': {'url': 'https://twitter.com/ai_expert/status/tutorial'}, 'extra': {'category': 'xpost'}}
        ]
        for g in guides_to_seed:
            seed_record(Guide, g['lookup'], g['extra'], update_on_exists=True)

        # 7. Project Data
        projects_data_to_seed = [
            {
                'lookup': {'name': 'Community Chat Bot'},
                'extra': {
                    'description': 'A Discord bot that helps manage community interactions using AI',
                    'url': 'https://github.com/example/community-bot'
                }
            },
            {
                'lookup': {'name': 'Smart Content Curator'},
                'extra': {
                    'description': 'AI tool that curates and organizes content from various sources',
                    'url': 'https://github.com/example/content-curator'
                }
            }
        ]
        for pd in projects_data_to_seed:
            seed_record(ProjectData, pd['lookup'], pd['extra'], update_on_exists=True)

        # 8. Feedback
        feedback_to_seed = [
            {
                'lookup': {'summary': 'Add dark mode support'},
                'extra': {
                    'feedback_type': 'feature',
                    'details': 'It would be great to have a dark mode option for better user experience during night time usage.',
                    'email': 'user@example.com',
                    'status': 'under_review'
                }
            },
            {
                'lookup': {'summary': 'Form submission issue on mobile'},
                'extra': {
                    'feedback_type': 'bug',
                    'details': "The feedback form doesn't submit properly on mobile devices. The submit button becomes unresponsive.",
                    'email': 'mobile_user@example.com',
                    'status': 'investigating'
                }
            }
        ]
        for fb in feedback_to_seed:
            seed_record(Feedback, fb['lookup'], fb['extra'], update_on_exists=True)

        print("✅ Sample data created successfully!")

    except Exception as e:
        print(f"❌ Error creating sample data: {e}")
        return False
    
    return True

def setup_database():
    """Initialize database and create tables"""
    
    print("🗄️  Setting up database...")
    
    try:
        with app.app_context():
            # Create all tables
            db.create_all()
            print("✅ Database tables created successfully!")
            
            # Check if we should create sample data
            existing_prompts = db.session.query(Prompt).count()
            if existing_prompts == 0:
                print("📊 No existing data found, creating sample data...")
                create_sample_data()
            else:
                print(f"📊 Found {existing_prompts} existing prompts, skipping sample data creation")
        
        return True
        
    except Exception as e:
        print(f"❌ Error setting up database: {e}")
        return False

def run_tests():
    """Run basic tests to verify setup"""
    
    print("🧪 Running basic tests...")
    
    try:
        with app.app_context():
            # Test database connections
            prompt_count = db.session.query(Prompt).count()
            project_count = db.session.query(ProjectData).count()
            feedback_count = db.session.query(Feedback).count()
            
            print(f"✅ Database tests passed!")
            print(f"   - Prompts: {prompt_count}")
            print(f"   - Projects: {project_count}")
            print(f"   - Feedback: {feedback_count}")
        
        # Test Flask app
        with app.test_client() as client:
            response = client.get('/')
            if response.status_code == 200:
                print("✅ Flask app test passed!")
            else:
                print(f"❌ Flask app test failed: Status {response.status_code}")
                return False
        
        return True
        
    except Exception as e:
        print(f"❌ Tests failed: {e}")
        return False

def main():
    """Main setup function"""
    
    print("🚀 Starting local development setup...")
    print("=" * 50)
    
    # Setup database
    if not setup_database():
        print("❌ Database setup failed!")
        sys.exit(1)
    
    # Run tests
    if not run_tests():
        print("❌ Tests failed!")
        sys.exit(1)
    
    print("=" * 50)
    print("🎉 Local development setup completed successfully!")
    print("")
    print("Next steps:")
    print("1. Run 'python app.py' to start the Flask development server")
    print("2. Open http://localhost:5000 in your browser")
    print("3. Test all forms and functionality")
    print("4. Run 'python build_static.py' to generate static site for Netlify")
    print("")
    print("For Netlify deployment:")
    print("1. Push your code to GitHub")
    print("2. Connect your repo to Netlify")
    print("3. Netlify will automatically detect the build settings from netlify.toml")

if __name__ == '__main__':
    main()
