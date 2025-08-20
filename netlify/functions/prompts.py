import json
import sqlite3
import os
from datetime import datetime

def handler(event, context):
    """
    Netlify Function to handle prompt submissions and retrieval
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
            return handle_submit_prompt(event, headers)
        elif event['httpMethod'] == 'GET':
            return handle_get_prompts(event, headers)
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

def handle_submit_prompt(event, headers):
    """Handle prompt submission"""
    try:
        # Parse request body
        body = json.loads(event['body'])
        title = body.get('title') or body.get('prompt-title')
        category = body.get('category') or body.get('prompt-category')
        description = body.get('description') or body.get('prompt-description')
        prompt_text = body.get('prompt_text') or body.get('prompt-text')
        rating = body.get('rating')
        
        if not title or not category or not prompt_text:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'Missing required fields: title, category, or prompt_text'})
            }
        
        # Connect to database
        db_path = '/tmp/community.db'
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Create table if it doesn't exist
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS prompts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                category TEXT NOT NULL,
                description TEXT,
                prompt_text TEXT NOT NULL,
                rating REAL,
                usage_count INTEGER DEFAULT 0,
                is_featured BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Insert new prompt
        cursor.execute(
            'INSERT INTO prompts (title, category, description, prompt_text, rating) VALUES (?, ?, ?, ?, ?)',
            (title, category, description, prompt_text, float(rating) if rating else None)
        )
        
        prompt_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return {
            'statusCode': 201,
            'headers': headers,
            'body': json.dumps({
                'message': 'Prompt created successfully!',
                'prompt': {
                    'id': prompt_id,
                    'title': title,
                    'category': category,
                    'description': description,
                    'prompt_text': prompt_text,
                    'rating': rating,
                    'usage_count': 0
                }
            })
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': f'Error submitting prompt: {str(e)}'})
        }

def handle_get_prompts(event, headers):
    """Handle prompt retrieval with filtering and sorting"""
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
        search_term = query_params.get('term')
        sort_by = query_params.get('sort_by', 'date')
        
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
        
        # Sort options
        if sort_by == 'popularity':
            order_by = 'ORDER BY usage_count DESC'
        elif sort_by == 'rating':
            order_by = 'ORDER BY rating DESC'
        elif sort_by == 'title':
            order_by = 'ORDER BY title ASC'
        else:  # default to date
            order_by = 'ORDER BY created_at DESC'
        
        query = f'SELECT id, title, category, description, prompt_text, rating, usage_count, created_at FROM prompts {where_clause} {order_by}'
        
        cursor.execute(query, params)
        prompts = cursor.fetchall()
        conn.close()
        
        # Format response
        formatted_prompts = []
        for prompt in prompts:
            formatted_prompts.append({
                'id': prompt[0],
                'title': prompt[1],
                'category': prompt[2],
                'description': prompt[3],
                'prompt_text': prompt[4],
                'rating': prompt[5],
                'usage_count': prompt[6],
                'created_at': prompt[7]
            })
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(formatted_prompts)
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': f'Error fetching prompts: {str(e)}'})
        }
