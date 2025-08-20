import json
import sqlite3
import os
from datetime import datetime

def handler(event, context):
    """
    Netlify Function to handle feedback submissions and retrieval
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
            return handle_submit_feedback(event, headers)
        elif event['httpMethod'] == 'GET':
            return handle_get_feedback(event, headers)
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

def handle_submit_feedback(event, headers):
    """Handle feedback submission"""
    try:
        # Parse request body
        body = json.loads(event['body'])
        feedback_type = body.get('feedback_type') or body.get('feedback-type')
        summary = body.get('summary') or body.get('feedback-summary')
        details = body.get('details') or body.get('feedback-details')
        email = body.get('email') or body.get('feedback-email')
        
        if not feedback_type or not summary or not details:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'Missing required fields: feedback_type, summary, or details'})
            }
        
        # Connect to database
        db_path = '/tmp/community.db'
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Create table if it doesn't exist
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS feedback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                feedback_type TEXT NOT NULL,
                summary TEXT NOT NULL,
                details TEXT NOT NULL,
                email TEXT,
                status TEXT DEFAULT 'submitted',
                submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Insert new feedback
        cursor.execute(
            'INSERT INTO feedback (feedback_type, summary, details, email) VALUES (?, ?, ?, ?)',
            (feedback_type, summary, details, email)
        )
        
        feedback_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return {
            'statusCode': 201,
            'headers': headers,
            'body': json.dumps({
                'message': 'Feedback submitted successfully!',
                'feedback': {
                    'id': feedback_id,
                    'feedback_type': feedback_type,
                    'summary': summary,
                    'details': details,
                    'email': email,
                    'status': 'submitted'
                }
            })
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': f'Error submitting feedback: {str(e)}'})
        }

def handle_get_feedback(event, headers):
    """Handle feedback retrieval"""
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
        
        # Get feedback with optional filtering
        query_params = event.get('queryStringParameters') or {}
        feedback_type = query_params.get('type')
        
        if feedback_type:
            cursor.execute('SELECT id, feedback_type, summary, details, email, status, submitted_at FROM feedback WHERE feedback_type = ? ORDER BY id DESC', (feedback_type,))
        else:
            cursor.execute('SELECT id, feedback_type, summary, details, email, status, submitted_at FROM feedback ORDER BY id DESC')
        
        feedback_list = cursor.fetchall()
        conn.close()
        
        # Format response
        formatted_feedback = []
        for feedback in feedback_list:
            formatted_feedback.append({
                'id': feedback[0],
                'feedback_type': feedback[1],
                'summary': feedback[2],
                'details': feedback[3],
                'email': feedback[4],
                'status': feedback[5],
                'submitted_at': feedback[6]
            })
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(formatted_feedback)
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': f'Error fetching feedback: {str(e)}'})
        }
