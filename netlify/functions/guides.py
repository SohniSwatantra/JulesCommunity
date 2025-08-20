import json
import sqlite3
import os
from datetime import datetime

def handler(event, context):
    """
    Netlify Function to handle guide submissions and retrieval
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
            return handle_submit_guide(event, headers)
        elif event['httpMethod'] == 'GET':
            return handle_get_guides(event, headers)
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

def handle_submit_guide(event, headers):
    """Handle guide submission"""
    try:
        # Parse request body
        body = json.loads(event['body'])
        url = body.get('url') or body.get('guide-url')
        category = body.get('category') or body.get('guide-category')
        
        if not url or not category:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'Missing required fields: url or category'})
            }
        
        # Connect to database
        db_path = '/tmp/community.db'
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Create table if it doesn't exist
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS guides (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT NOT NULL UNIQUE,
                category TEXT NOT NULL,
                submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Check if URL already exists
        cursor.execute('SELECT id FROM guides WHERE url = ?', (url,))
        if cursor.fetchone():
            conn.close()
            return {
                'statusCode': 409,
                'headers': headers,
                'body': json.dumps({'error': 'This guide URL has already been submitted'})
            }
        
        # Insert new guide
        cursor.execute(
            'INSERT INTO guides (url, category) VALUES (?, ?)',
            (url, category)
        )
        
        guide_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return {
            'statusCode': 201,
            'headers': headers,
            'body': json.dumps({
                'message': 'Guide submitted successfully!',
                'guide': {
                    'id': guide_id,
                    'url': url,
                    'category': category
                }
            })
        }
        
    except sqlite3.IntegrityError:
        return {
            'statusCode': 409,
            'headers': headers,
            'body': json.dumps({'error': 'This guide URL has already been submitted'})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': f'Error submitting guide: {str(e)}'})
        }

def handle_get_guides(event, headers):
    """Handle guide retrieval with filtering"""
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
        
        # Build query
        if category and category != 'all':
            cursor.execute('SELECT id, url, category, submitted_at FROM guides WHERE category = ? ORDER BY submitted_at DESC', (category,))
        else:
            cursor.execute('SELECT id, url, category, submitted_at FROM guides ORDER BY submitted_at DESC')
        
        guides = cursor.fetchall()
        conn.close()
        
        # Format response
        formatted_guides = []
        for guide in guides:
            formatted_guides.append({
                'id': guide[0],
                'url': guide[1],
                'category': guide[2],
                'submitted_at': guide[3]
            })
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(formatted_guides)
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': f'Error fetching guides: {str(e)}'})
        }
