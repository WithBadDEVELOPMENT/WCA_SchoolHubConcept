import os
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)
TXT_FILE = os.path.join(os.path.dirname(__file__), 'teachers.txt')

def read_teachers():
    teachers = []
    if not os.path.exists(TXT_FILE):
        return teachers
    with open(TXT_FILE, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and '|' in line:
                parts = line.split('|')
                if len(parts) >= 4:
                    teachers.append({
                        'name': parts[0],
                        'role': parts[1],
                        'category': parts[2],
                        'email': parts[3]
                    })
    return teachers

def append_teacher(name, role, category, email):
    # Format line for teachers.txt file write
    entry = f"{name.strip()}|{role.strip()}|{category.strip()}|{email.strip()}\n"
    with open(TXT_FILE, 'a', encoding='utf-8') as f:
        f.write(entry)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/teachers', methods=['GET'])
def get_teachers():
    return jsonify(read_teachers())

@app.route('/api/teachers', methods=['POST'])
def add_teacher():
    data = request.get_json()
    if not data or not all(k in data for k in ('name', 'role', 'category', 'email')):
        return jsonify({'error': 'Missing required fields'}), 400
    
    append_teacher(data['name'], data['role'], data['category'], data['email'])
    return jsonify({'message': 'Teacher successfully appended to server text file!'}), 201

if __name__ == '__main__':
    app.run(debug=True, port=5000)
