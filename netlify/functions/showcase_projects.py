import json
import sqlite3
import os
import base64
from datetime import datetime

def handler(event, context):
    """
    Netlify Function to handle showcase project submissions and retrieval
    """
    
    # Handle CORS
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    }
    
    # Handle preflight request
    if event['httpMethod'] == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': ''
        }
    
    try:
        if event['httpMethod'] == 'POST':
            return handle_submit_project(event, headers)
        elif event['httpMethod'] == 'GET':
            return handle_get_projects(event, headers)
        else:
            return {
                'statusCode': 405,
                'headers': headers,
                'body': json.dumps({'error': 'Method not allowed'})
            }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': f'Internal server error: {str(e)}'})
        }

def handle_submit_project(event, headers):
    """Handle showcase project submission"""
    try:
        # Parse request body
        body = json.loads(event['body'])
        title = body.get('title') or body.get('project-title')
        category = body.get('category') or body.get('project-category')
        description = body.get('description') or body.get('project-description')
        link = body.get('link') or body.get('project-link')
        image_data = body.get('image') or body.get('project-image')
        
        if not title or not category or not description:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'Missing required fields: title, category, or description'})
            }
        
        # Connect to database
        db_path = '/tmp/community.db'
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Create table if it doesn't exist
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS showcase_projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                category TEXT NOT NULL,
                description TEXT NOT NULL,
                link TEXT,
                image_filename TEXT,
                image_data TEXT,
                submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Handle image data (if provided as base64)
        image_filename = None
        if image_data:
            # Simple image handling - in production, you'd want to use a proper file storage service
            image_filename = f"project_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
        
        # Insert new project
        cursor.execute(
            'INSERT INTO showcase_projects (title, category, description, link, image_filename, image_data) VALUES (?, ?, ?, ?, ?, ?)',
            (title, category, description, link, image_filename, image_data)
        )
        
        project_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return {
            'statusCode': 201,
            'headers': headers,
            'body': json.dumps({
                'message': 'Project submitted successfully!',
                'project': {
                    'id': project_id,
                    'title': title,
                    'category': category,
                    'description': description,
                    'link': link,
                    'image_filename': image_filename
                }
            })
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': f'Error submitting project: {str(e)}'})
        }

def handle_get_projects(event, headers):
    """Handle showcase project retrieval with filtering"""
    try:
        # Connect to database
        db_path = '/tmp/community.db'
        
        if not os.path.exists(db_path):
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps([])
            }
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get query parameters
        query_params = event.get('queryStringParameters') or {}
        category = query_params.get('category')
        search_term = query_params.get('search')
        
        # Build query
        where_conditions = []
        params = []
        
        if category and category != 'all':
            where_conditions.append('category = ?')
            params.append(category)
        
        if search_term:
            where_conditions.append('(title LIKE ? OR description LIKE ?)')
            params.extend([f'%{search_term}%', f'%{search_term}%'])
        
        where_clause = 'WHERE ' + ' AND '.join(where_conditions) if where_conditions else ''
        
        query = f'SELECT id, title, category, description, link, image_filename, submitted_at FROM showcase_projects {where_clause} ORDER BY submitted_at DESC'
        
        cursor.execute(query, params)
        projects = cursor.fetchall()
        conn.close()
        
        # Format response
        formatted_projects = []
        for project in projects:
            formatted_projects.append({
                'id': project[0],
                'title': project[1],
                'category': project[2],
                'description': project[3],
                'link': project[4],
                'image_url': f"/uploads/showcase_images/{project[5]}" if project[5] else None,
                'image_filename': project[5],
                'submitted_at': project[6]
            })
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(formatted_projects)
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': f'Error fetching projects: {str(e)}'})
        }
