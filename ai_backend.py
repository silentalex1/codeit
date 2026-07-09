from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
import os
import sys
import time

app = Flask(__name__)
CORS(app)

# Try multiple possible model paths
possible_paths = [
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "prysmisai-v1-merged"),
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "prysmisai-v1-merged"),
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "prysmisai-v1-merged"),
    os.environ.get('MODEL_PATH', './prysmisai-v1-merged')
]

MODEL_PATH = None
for path in possible_paths:
    if os.path.exists(path):
        MODEL_PATH = path
        break

if not MODEL_PATH:
    print("ERROR: Model not found in any of these locations:")
    for path in possible_paths:
        print(f"  - {path}")
    sys.exit(1)

print("Loading PrysmisAI model...")
print(f"Model path: {MODEL_PATH}")
print(f"Model exists: {os.path.exists(MODEL_PATH)}")

if not os.path.exists(MODEL_PATH):
    print(f"ERROR: Model not found at {MODEL_PATH}")
    sys.exit(1)

try:
    print("Loading tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH, fix_mistral_regex=True)
    
    if tokenizer.pad_token is None:
        if tokenizer.eos_token is not None:
            tokenizer.pad_token = tokenizer.eos_token
        else:
            tokenizer.pad_token = tokenizer.eos_token_id if hasattr(tokenizer, 'eos_token_id') else 0
    
    print("Tokenizer loaded successfully!")
    
    print("Loading model (this may take a minute on CPU)...")
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_PATH,
        dtype=torch.float32,
        device_map="cpu",
        low_cpu_mem_usage=True
    )
    
    if hasattr(model, 'generation_config'):
        model.generation_config.max_length = None
    
    print("Model loaded successfully!")
    
except Exception as e:
    print(f"Error loading model: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

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
        
        messages = [
            {"role": "system", "content": "You are PrysmisAI, a coding assistant. You give concise, accurate, and complete answers without repeating yourself."},
            {"role": "user", "content": user_message}
        ]
        
        input_text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        inputs = tokenizer(input_text, return_tensors="pt")
        
        print(f"Generating response for: {user_message[:50]}...")
        
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=512,
                temperature=0.7,
                top_p=0.9,
                repetition_penalty=1.2,
                no_repeat_ngram_size=4,
                do_sample=True,
                pad_token_id=tokenizer.eos_token_id if tokenizer.eos_token_id is not None else tokenizer.pad_token_id,
            )
        
        response = tokenizer.decode(outputs[0][inputs["input_ids"].shape[-1]:], skip_special_tokens=True)
        
        print(f"Response generated: {response[:50]}...")
        
        return jsonify({
            'id': f'chatcmpl_prysmis_{int(time.time())}',
            'object': 'chat.completion',
            'created': int(time.time()),
            'model': 'prysmis-1',
            'choices': [{
                'index': 0,
                'message': {
                    'role': 'assistant',
                    'content': response
                },
                'finish_reason': 'stop'
            }],
            'usage': {
                'prompt_tokens': len(user_message),
                'completion_tokens': len(response),
                'total_tokens': len(user_message) + len(response)
            }
        })
        
    except Exception as e:
        print(f"Error in chat: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'model': 'loaded'})

if __name__ == '__main__':
    print("Starting AI API Server on port 5000...")
    app.run(host='localhost', port=5000, debug=False)
