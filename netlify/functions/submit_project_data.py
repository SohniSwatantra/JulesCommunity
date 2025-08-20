import json
import sqlite3
import os
from datetime import datetime

def handler(event, context):
    """
    Netlify Function to handle project data submissions (main projects on homepage)
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
    
    if event['httpMethod'] != 'POST':
        return {
            'statusCode': 405,
            'headers': headers,
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    try:
        # Parse request body
        body = json.loads(event['body'])
        name = body.get('name')
        description = body.get('description')
        url = body.get('url')
        
        if not name or not description or not url:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'Missing required fields: name, description, or url'})
            }
        
        # Connect to database
        db_path = '/tmp/community.db'
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Create table if it doesn't exist
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS projects_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                url TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Insert new project
        cursor.execute(
            'INSERT INTO projects_data (name, description, url) VALUES (?, ?, ?)',
            (name, description, url)
        )
        
        project_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return {
            'statusCode': 201,
            'headers': headers,
            'body': json.dumps({
                'message': 'Project data submitted successfully!',
                'project': {
                    'id': project_id,
                    'name': name,
                    'description': description,
                    'url': url
                }
            })
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': f'Internal server error: {str(e)}'})
        }
