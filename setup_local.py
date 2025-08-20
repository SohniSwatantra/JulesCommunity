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
    """Create sample data for testing"""
    
    print("🌱 Creating sample data...")
    
    try:
        # Sample Users
        sample_users = [
            User(username='testuser', email='test@example.com', password_hash='hashed_password'),
            User(username='developer', email='dev@example.com', password_hash='hashed_password')
        ]
        
        # Sample Products
        sample_products = [
            Product(name='AI Tool License', description='Premium AI tool subscription', price=Decimal('29.99'), sku='AI-001'),
            Product(name='Advanced Features', description='Unlock advanced AI features', price=Decimal('49.99'), sku='AI-002')
        ]
        
        # Sample Application Settings
        sample_settings = [
            ApplicationSetting(key='site_name', value='Jules Community Hub', description='Site name'),
            ApplicationSetting(key='max_upload_size', value='10MB', description='Maximum file upload size')
        ]
        
        # Sample Prompts
        sample_prompts = [
            Prompt(
                title='Code Review Assistant',
                category='Development',
                description='Help review code for best practices and bugs',
                prompt_text='Please review this code for best practices, potential bugs, and suggest improvements:',
                rating=Decimal('4.5'),
                usage_count=150
            ),
            Prompt(
                title='Email Writer',
                category='Writing',
                description='Compose professional emails',
                prompt_text='Write a professional email for the following situation:',
                rating=Decimal('4.2'),
                usage_count=89
            ),
            Prompt(
                title='Documentation Generator',
                category='Development',
                description='Generate documentation for code',
                prompt_text='Create comprehensive documentation for this code including usage examples:',
                rating=Decimal('4.7'),
                usage_count=201
            )
        ]
        
        # Sample Showcase Projects
        sample_showcase_projects = [
            ShowcaseProject(
                title='AI-Powered Task Manager',
                category='Productivity',
                description='A smart task manager that uses AI to prioritize and categorize tasks automatically',
                link='https://github.com/example/ai-task-manager',
                image_filename='task_manager.jpg'
            ),
            ShowcaseProject(
                title='Code Documentation Bot',
                category='Development',
                description='Automatically generates documentation for codebases using AI analysis',
                link='https://github.com/example/doc-bot',
                image_filename='doc_bot.jpg'
            )
        ]
        
        # Sample Guides
        sample_guides = [
            Guide(url='https://blog.example.com/getting-started-with-ai', category='blogpost'),
            Guide(url='https://youtube.com/watch?v=ai-tutorial', category='youtube'),
            Guide(url='https://reddit.com/r/AI/post/tutorial', category='redditpost'),
            Guide(url='https://twitter.com/ai_expert/status/tutorial', category='xpost')
        ]
        
        # Sample Project Data (for homepage)
        sample_project_data = [
            ProjectData(
                name='Community Chat Bot',
                description='A Discord bot that helps manage community interactions using AI',
                url='https://github.com/example/community-bot'
            ),
            ProjectData(
                name='Smart Content Curator',
                description='AI tool that curates and organizes content from various sources',
                url='https://github.com/example/content-curator'
            )
        ]
        
        # Sample Feedback
        sample_feedback = [
            Feedback(
                feedback_type='feature',
                summary='Add dark mode support',
                details='It would be great to have a dark mode option for better user experience during night time usage.',
                email='user@example.com',
                status='under_review'
            ),
            Feedback(
                feedback_type='bug',
                summary='Form submission issue on mobile',
                details='The feedback form doesn\'t submit properly on mobile devices. The submit button becomes unresponsive.',
                email='mobile_user@example.com',
                status='investigating'
            )
        ]
        
        # Add all sample data to session
        for user in sample_users:
            db.session.add(user)
        
        for product in sample_products:
            db.session.add(product)
        
        for setting in sample_settings:
            db.session.add(setting)
        
        for prompt in sample_prompts:
            db.session.add(prompt)
        
        for project in sample_showcase_projects:
            db.session.add(project)
        
        for guide in sample_guides:
            db.session.add(guide)
        
        for project_data in sample_project_data:
            db.session.add(project_data)
        
        for feedback in sample_feedback:
            db.session.add(feedback)
        
        # Commit all changes
        db.session.commit()
        
        print("✅ Sample data created successfully!")
        print(f"   - {len(sample_users)} users")
        print(f"   - {len(sample_products)} products")
        print(f"   - {len(sample_settings)} settings")
        print(f"   - {len(sample_prompts)} prompts")
        print(f"   - {len(sample_showcase_projects)} showcase projects")
        print(f"   - {len(sample_guides)} guides")
        print(f"   - {len(sample_project_data)} project data entries")
        print(f"   - {len(sample_feedback)} feedback items")
        
    except Exception as e:
        db.session.rollback()
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
