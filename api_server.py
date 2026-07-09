from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
import os
import sys

app = Flask(__name__)
CORS(app)

# Get the correct model path
script_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(os.path.dirname(script_dir), "prysmisai-v1-merged")

print("Loading PrysmisAI model...")
print(f"Script directory: {script_dir}")
print(f"Model path: {model_path}")
print(f"Model exists: {os.path.exists(model_path)}")

if not os.path.exists(model_path):
    print(f"ERROR: Model not found at {model_path}")
    print("Please ensure the model folder exists in the parent directory")
    sys.exit(1)

try:
    print("Loading tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(model_path)
    
    # Set pad token if not set
    if tokenizer.pad_token is None:
        if tokenizer.eos_token is not None:
            tokenizer.pad_token = tokenizer.eos_token
        else:
            tokenizer.pad_token = tokenizer.eos_token_id if hasattr(tokenizer, 'eos_token_id') else 0
    
    print("Tokenizer loaded successfully!")
    
    print("Loading model (this may take a minute on CPU)...")
    model = AutoModelForCausalLM.from_pretrained(
        model_path,
        torch_dtype=torch.float32,
        device_map="cpu",
        low_cpu_mem_usage=True
    )
    
    # Clear generation config to avoid conflicts
    if hasattr(model, 'generation_config'):
        model.generation_config.max_length = None
    
    print("Model loaded successfully!")
    
except Exception as e:
    print(f"Error loading model: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

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
            'response': response,
            'model': 'PSAI-v1.0'
        })
        
    except Exception as e:
        print(f"Error in chat: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("Starting PrysmisAI API Server...")
    print("Open http://localhost:8000 in your browser")
    app.run(host='localhost', port=8000, debug=True)