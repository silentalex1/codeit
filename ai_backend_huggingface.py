from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os
import time

app = Flask(__name__)
CORS(app)

# Hugging Face API configuration
HF_API_URL = os.getenv("HF_API_URL", "https://api-inference.huggingface.co/models/realalexdev/prysmisai-v1")
HF_API_TOKEN = os.getenv("HF_API_TOKEN", "")

if not HF_API_TOKEN:
    print("⚠️  WARNING: HF_API_TOKEN not set in environment variables")
    print("Please set it using: set HF_API_TOKEN=your_token_here")
    print("Or create a .env file with HF_API_TOKEN=your_token")

@app.route('/api/chat', methods=['POST', 'OPTIONS'])
def chat():
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        if not request.is_json:
            return jsonify({'error': 'Content-Type must be application/json'}), 400
            
        data = request.json
        user_message = data.get('message', '')
        
        if not user_message:
            return jsonify({'error': 'No message provided'}), 400
        
        if not HF_API_TOKEN:
            return jsonify({'error': 'HF_API_TOKEN not configured'}), 500
        
        # Prepare system message for better responses
        system_message = "You are PrysmisAI, a coding assistant specialized in Roblox Lua. You give concise, accurate, and complete answers without repeating yourself."
        full_message = f"{system_message}\n\nUser: {user_message}\nAssistant:"
        
        headers = {
            "Authorization": f"Bearer {HF_API_TOKEN}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "inputs": full_message,
            "parameters": {
                "max_new_tokens": 512,
                "temperature": 0.7,
                "top_p": 0.9,
                "repetition_penalty": 1.2,
                "return_full_text": False
            }
        }
        
        print(f"Sending request to Hugging Face API...")
        
        response = requests.post(HF_API_URL, headers=headers, json=payload, timeout=30)
        
        if response.status_code != 200:
            print(f"Hugging Face API error: {response.status_code}")
            print(f"Response: {response.text}")
            return jsonify({'error': f'Hugging Face API error: {response.status_code}'}), 500
        
        result = response.json()
        
        # Extract the generated text from Hugging Face response
        if isinstance(result, list) and len(result) > 0:
            ai_response = result[0].get('generated_text', '')
        elif isinstance(result, dict):
            ai_response = result.get('generated_text', '')
        else:
            ai_response = str(result)
        
        # Clean up the response - remove the system message and user input if present
        if "Assistant:" in ai_response:
            ai_response = ai_response.split("Assistant:")[-1].strip()
        
        # Remove any remaining system message
        if system_message in ai_response:
            ai_response = ai_response.replace(system_message, "").strip()
        
        # Remove user message if present
        if user_message in ai_response:
            ai_response = ai_response.replace(user_message, "").strip()
        
        print(f"Response generated: {ai_response[:50]}...")
        
        return jsonify({
            'id': f'chatcmpl_prysmis_{int(time.time())}',
            'object': 'chat.completion',
            'created': int(time.time()),
            'model': 'prysmis-1-hf',
            'choices': [{
                'index': 0,
                'message': {
                    'role': 'assistant',
                    'content': ai_response
                },
                'finish_reason': 'stop'
            }],
            'usage': {
                'prompt_tokens': len(user_message),
                'completion_tokens': len(ai_response),
                'total_tokens': len(user_message) + len(ai_response)
            }
        })
        
    except requests.exceptions.Timeout:
        print("Request timeout to Hugging Face API")
        return jsonify({'error': 'Request timeout to Hugging Face API'}), 504
    except Exception as e:
        print(f"Error in chat: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy', 
        'model': 'hugging-face-api',
        'api_url': HF_API_URL.replace(YOUR_USERNAME, 'your-username') if 'YOUR_USERNAME' in HF_API_URL else HF_API_URL
    })

if __name__ == '__main__':
    print("Starting AI API Server with Hugging Face integration...")
    print(f"Hugging Face API URL: {HF_API_URL}")
    print(f"API Token configured: {bool(HF_API_TOKEN)}")
    app.run(host='localhost', port=5000, debug=False)