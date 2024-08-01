from flask import Flask, request, jsonify, send_from_directory, render_template_string, make_response
from flask_cors import CORS
import sqlite3
import socket

app = Flask(__name__)

# Enable CORS for all routes, allowing any origin
CORS(app, resources={r"/*": {"origins": "*", "supports_credentials": True}})

# Initialize SQLite database
def init_db():
    with sqlite3.connect('database.db') as conn:
        cursor = conn.cursor()
        cursor.execute('''CREATE TABLE IF NOT EXISTS strings (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            string TEXT NOT NULL)''')
        conn.commit()

# Route to accept and store string inputs
@app.route('/store_string', methods=['POST'])
def store_string():
    string = request.json.get('string')
    if not string:
        return jsonify({"error": "String is required"}), 400

    with sqlite3.connect('database.db') as conn:
        cursor = conn.cursor()
        cursor.execute('INSERT INTO strings (string) VALUES (?)', (string,))
        conn.commit()

    return jsonify({"message": "String stored successfully"}), 201

# Route to retrieve paginated stored strings
@app.route('/strings', methods=['GET'])
def get_strings():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    offset = (page - 1) * per_page

    with sqlite3.connect('database.db') as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT COUNT(*) FROM strings')
        total = cursor.fetchone()[0]

        cursor.execute('SELECT * FROM strings LIMIT ? OFFSET ?', (per_page, offset))
        rows = cursor.fetchall()
        strings = [{"id": row[0], "string": row[1]} for row in rows]

    return jsonify({
        "page": page,
        "per_page": per_page,
        "total": total,
        "total_pages": (total // per_page) + (1 if total % per_page > 0 else 0),
        "data": strings
    }), 200

# Function to get the computer's local IP address
def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # doesn't need to be reachable
        s.connect(('8.8.8.8', 1))
        ip_address = s.getsockname()[0]
    except Exception:
        ip_address = '127.0.0.1'
    finally:
        s.close()
    return ip_address

# print navigation links to the console with the local IP address of the computer and the port number of the Flask app with the input and display frontend routes
print(f"Display frontend: http://{get_local_ip()}:5000/display")
print(f"Input frontend: http://{get_local_ip()}:5000/input")

# Route to serve the display frontend
@app.route('/display')
def serve_display_frontend():
    ip_address = get_local_ip()
    with open('displayFrontend/index.html', 'r') as file:
        content = file.read()
    return render_template_string(content, ip_address=ip_address)

# Route to serve the input frontend
@app.route('/input')
def serve_input_frontend():
    ip_address = get_local_ip()
    with open('inputFrontend/index.html', 'r') as file:
        content = file.read()
    return render_template_string(content, ip_address=ip_address)

# Route to serve dynamic sketch.js for display frontend
@app.route('/display/static/sketch.js')
def serve_display_sketch():
    ip_address = get_local_ip()
    with open('displayFrontend/sketch.js', 'r') as file:
        content = file.read().replace('{{ ip_address }}', ip_address)
    return render_template_string(content)

# Route to serve static files for display frontend
@app.route('/display/static/<path:path>')
def serve_display_static(path):
    return send_from_directory('displayFrontend', path)

# Route to serve static files for input frontend
@app.route('/input/static/<path:path>')
def serve_input_static(path):
    return send_from_directory('inputFrontend', path)

# Adding CORS headers manually to all responses
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0')
