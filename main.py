from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

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

# Route to serve the frontend
@app.route('/')
def serve_frontend():
    return send_from_directory('.', 'index.html')

if __name__ == '__main__':
    init_db()
    app.run(debug=True)
