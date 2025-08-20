import json
import sqlite3
import os

def handler(event, context):
    """
    Netlify Function to list all project data (main projects on homepage)
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
    
    if event['httpMethod'] != 'GET':
        return {
            'statusCode': 405,
            'headers': headers,
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    try:
        # Connect to database
        db_path = '/tmp/community.db'
        
        if not os.path.exists(db_path):
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps([])  # Return empty array if no database
            }
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get all projects
        cursor.execute('SELECT id, name, description, url, created_at FROM projects_data ORDER BY id DESC')
        projects = cursor.fetchall()
        
        conn.close()
        
        # Format response
        project_list = []
        for project in projects:
            project_list.append({
                'id': project[0],
                'name': project[1],
                'description': project[2],
                'url': project[3],
                'created_at': project[4]
            })
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(project_list)
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': f'Internal server error: {str(e)}'})
        }
