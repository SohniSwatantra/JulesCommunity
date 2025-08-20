#!/usr/bin/env python3
"""
Static site generator for Netlify deployment
Converts Flask templates to static HTML files with database integration
"""

import os
import shutil
import json
from flask import Flask
from models import db, Project as ProjectData, ShowcaseProject, Prompt, Guide, Feedback
from app import app

def create_static_site():
    """Generate static HTML files from Flask templates"""
    
    # Create build directory
    build_dir = 'dist'
    if os.path.exists(build_dir):
        shutil.rmtree(build_dir)
    os.makedirs(build_dir)
    
    print("🏗️  Starting static site generation...")
    
    # Initialize database and get data for static generation
    with app.app_context():
        try:
            # Initialize database tables if they don't exist
            db.create_all()
            
            # Get data for static pages (empty lists if DB doesn't exist or is empty)
            submitted_projects = db.session.query(ProjectData).all()
            showcase_projects = db.session.query(ShowcaseProject).all()
            prompts = db.session.query(Prompt).all()
            guides = db.session.query(Guide).all()
            feedback_list = db.session.query(Feedback).all()
            
            print(f"📊 Found {len(submitted_projects)} submitted projects")
            print(f"📊 Found {len(showcase_projects)} showcase projects")
            print(f"📊 Found {len(prompts)} prompts")
            print(f"📊 Found {len(guides)} guides")
            print(f"📊 Found {len(feedback_list)} feedback items")
            
        except Exception as e:
            print(f"⚠️  Database error (creating empty data): {e}")
            submitted_projects = []
            showcase_projects = []
            prompts = []
            guides = []
            feedback_list = []
    
    # Generate static HTML files
    with app.test_client() as client:
        
        # Generate index.html with project data
        print("📄 Generating index.html...")
        try:
            response = client.get('/')
            if response.status_code == 200:
                html_content = response.get_data(as_text=True)
                # Replace Flask routes with Netlify Functions
                html_content = replace_api_routes(html_content)
                with open(f'{build_dir}/index.html', 'w', encoding='utf-8') as f:
                    f.write(html_content)
                print("✅ index.html generated successfully")
            else:
                print(f"❌ Error generating index.html: Status {response.status_code}")
                create_fallback_index(build_dir)
        except Exception as e:
            print(f"❌ Error generating index.html: {e}")
            create_fallback_index(build_dir)
    
    # Copy other HTML template files (convert them to static)
    template_files = [
        'docs.html', 'changelog.html', 'news.html', 'prompts.html', 'guides.html', 
        'showcase.html', 'integrations.html', 'feedback.html'
    ]
    
    for template_file in template_files:
        template_path = f'templates/{template_file}'
        if os.path.exists(template_path):
            print(f"📄 Processing {template_file}...")
            try:
                with open(template_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                # Replace API routes with Netlify Functions
                content = replace_api_routes(content)
                with open(f'{build_dir}/{template_file}', 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"✅ {template_file} processed successfully")
            except Exception as e:
                print(f"❌ Error processing {template_file}: {e}")
        else:
            print(f"⚠️  {template_file} not found, skipping...")
    
    # Copy static assets
    static_files = ['style.css', 'script.js', 'image.png', 'placeholder.jpg']
    for static_file in static_files:
        if os.path.exists(static_file):
            print(f"📁 Copying {static_file}...")
            try:
                shutil.copy(static_file, f'{build_dir}/{static_file}')
                print(f"✅ {static_file} copied successfully")
            except Exception as e:
                print(f"❌ Error copying {static_file}: {e}")
        else:
            print(f"⚠️  {static_file} not found, skipping...")
    
    # Create _redirects file for Netlify
    print("🔀 Creating _redirects file...")
    redirects_content = """# Netlify Functions API routes
/api/feedback/*  /.netlify/functions/feedback/:splat  200
/api/prompts/*  /.netlify/functions/prompts/:splat  200
/api/guides/*  /.netlify/functions/guides/:splat  200
/api/showcase/*  /.netlify/functions/showcase/:splat  200
/api/projects/*  /.netlify/functions/projects/:splat  200

# Direct function access
/submit_project_data  /.netlify/functions/submit_project_data  200
/list_project_data  /.netlify/functions/list_project_data  200
/feedback  /.netlify/functions/feedback  200
/prompts  /.netlify/functions/prompts  200
/guides  /.netlify/functions/guides  200
/showcase/projects  /.netlify/functions/showcase_projects  200

# SPA fallback - must be last
/*    /index.html   200
"""
    
    with open(f'{build_dir}/_redirects', 'w') as f:
        f.write(redirects_content)
    print("✅ _redirects file created")
    
    # Create sample data for initial deployment (so the site isn't empty)
    print("📊 Creating sample data files...")
    create_sample_data_files(build_dir)
    
    print(f"🎉 Static site generated successfully in '{build_dir}' directory!")
    print(f"📁 Files created: {len(os.listdir(build_dir))} files")

def replace_api_routes(content):
    """Replace Flask API routes with Netlify Functions"""
    replacements = {
        'action="/feedback"': 'action="/.netlify/functions/feedback"',
        'action="/prompts"': 'action="/.netlify/functions/prompts"',
        'action="/guides"': 'action="/.netlify/functions/guides"',
        'action="/showcase/projects"': 'action="/.netlify/functions/showcase_projects"',
        'action="/submit_project_data"': 'action="/.netlify/functions/submit_project_data"',
        '"/feedback"': '"/.netlify/functions/feedback"',
        '"/prompts"': '"/.netlify/functions/prompts"',
        '"/guides"': '"/.netlify/functions/guides"',
        '"/showcase/projects"': '"/.netlify/functions/showcase_projects"',
        '"/submit_project_data"': '"/.netlify/functions/submit_project_data"',
        '"/list_project_data"': '"/.netlify/functions/list_project_data"',
    }
    
    for old_route, new_route in replacements.items():
        content = content.replace(old_route, new_route)
    
    return content

def create_fallback_index(build_dir):
    """Create a basic index.html if template rendering fails"""
    print("🔧 Creating fallback index.html...")
    try:
        with open('templates/index.html', 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Replace template variables with placeholder content
        content = content.replace('{% if submitted_projects %}', '<!-- No projects yet -->')
        content = content.replace('{% endif %}', '')
        content = content.replace('{% for project in submitted_projects %}', '')
        content = content.replace('{% endfor %}', '')
        content = content.replace('{{ project.name }}', 'Sample Project')
        content = content.replace('{{ project.description }}', 'Sample Description')
        content = content.replace('{{ project.url }}', '#')
        
        # Replace API routes
        content = replace_api_routes(content)
        
        with open(f'{build_dir}/index.html', 'w', encoding='utf-8') as f:
            f.write(content)
        print("✅ Fallback index.html created")
    except Exception as e:
        print(f"❌ Error creating fallback index.html: {e}")

def create_sample_data_files(build_dir):
    """Create sample JSON data files for development"""
    try:
        # Create data directory
        data_dir = f'{build_dir}/data'
        os.makedirs(data_dir, exist_ok=True)
        
        # Sample projects
        sample_projects = [
            {
                "id": 1,
                "name": "AI Code Assistant",
                "description": "A VS Code extension that helps with code completion using Jules AI",
                "url": "https://github.com/example/ai-assistant"
            }
        ]
        
        # Sample prompts
        sample_prompts = [
            {
                "id": 1,
                "title": "Code Review Assistant",
                "category": "Development",
                "description": "Help review code for best practices and bugs",
                "prompt_text": "Please review this code for best practices, potential bugs, and suggest improvements:",
                "rating": "4.5",
                "usage_count": 150,
                "created_at": "2024-01-15T10:00:00Z"
            }
        ]
        
        # Sample guides
        sample_guides = [
            {
                "id": 1,
                "url": "https://blog.example.com/getting-started-with-jules",
                "category": "blogpost",
                "submitted_at": "2024-01-15T10:00:00Z"
            }
        ]
        
        # Write sample data files
        with open(f'{data_dir}/projects.json', 'w') as f:
            json.dump(sample_projects, f, indent=2)
        
        with open(f'{data_dir}/prompts.json', 'w') as f:
            json.dump(sample_prompts, f, indent=2)
        
        with open(f'{data_dir}/guides.json', 'w') as f:
            json.dump(sample_guides, f, indent=2)
        
        print("✅ Sample data files created")
    except Exception as e:
        print(f"❌ Error creating sample data files: {e}")

if __name__ == '__main__':
    create_static_site()
