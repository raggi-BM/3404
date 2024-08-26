from flask import Flask, request, jsonify, send_from_directory, render_template_string
from flask_cors import CORS
import sqlite3
import socket
import logging
from flask_socketio import SocketIO, emit
from moderation import check_content_appropriateness
import qrcode
from colorama import init, Fore, Back, Style

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")
CORS(app, resources={r"/*": {"origins": "*", "supports_credentials": True}})
init()


def qr_to_terminal(data):
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=1,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)

    qr_code = qr.get_matrix()

    for row in qr_code:
        line = ''.join([Back.BLACK + '  ' if cell else Back.WHITE + '  ' for cell in row])
        print(line + Style.RESET_ALL)

# Function to get the computer's local IP address
def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 1))
        ip_address = s.getsockname()[0]
    except Exception:
        ip_address = '127.0.0.1'
    finally:
        s.close()
    return ip_address

local_ip = get_local_ip()

# Initialize SQLite database
def init_db():
    with sqlite3.connect('database.db') as conn:
        cursor = conn.cursor()
        cursor.execute('''CREATE TABLE IF NOT EXISTS strings (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            string TEXT NOT NULL,
                            approved BOOLEAN NOT NULL)''')
        conn.commit()

# Route to retrieve paginated stored strings, only return approved strings
@app.route('/strings', methods=['GET'])
def get_strings():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    offset = (page - 1) * per_page

    with sqlite3.connect('database.db') as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT COUNT(*) FROM strings WHERE approved = 1')
        total = cursor.fetchone()[0]

        cursor.execute('SELECT * FROM strings WHERE approved = 1 LIMIT ? OFFSET ?', (per_page, offset))
        rows = cursor.fetchall()
        strings = [{"id": row[0], "string": row[1], "approved": row[2]} for row in rows]

    return jsonify({
        "page": page,
        "per_page": per_page,
        "total": total,
        "total_pages": (total // per_page) + (1 if total % per_page > 0 else 0),
        "data": strings
    }), 200

# Route to retrieve all stored strings with their approval status, supporting pagination
@app.route('/get_all', methods=['GET'])
def get_all_strings():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 100, type=int)
    offset = (page - 1) * per_page

    with sqlite3.connect('database.db') as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT COUNT(*) FROM strings')
        total = cursor.fetchone()[0]

        cursor.execute('SELECT * FROM strings LIMIT ? OFFSET ?', (per_page, offset))
        rows = cursor.fetchall()
        strings = [{"id": row[0], "string": row[1], "approved": row[2]} for row in rows]

    return jsonify({
        "page": page,
        "per_page": per_page,
        "total": total,
        "total_pages": (total // per_page) + (1 if total % per_page > 0 else 0),
        "data": strings
    }), 200

@app.route('/store_string', methods=['POST'])
def store_string():
    string = request.json.get('string')
    if not string:
        return jsonify({"error": "String is required"}), 400

    # Check if the content is appropriate using the moderation function
    is_appropriate = check_content_appropriateness(string)

    # Store the string along with its approval status
    with sqlite3.connect('database.db') as conn:
        cursor = conn.cursor()
        cursor.execute('INSERT INTO strings (string, approved) VALUES (?, ?)', (string, is_appropriate))
        conn.commit()

    # Emit the new string to the display frontend if it's approved
    if is_appropriate:
        cursor.execute('SELECT last_insert_rowid()')
        new_id = cursor.fetchone()[0]
        socketio.emit('new_word', {"id": new_id, "string": string})

    # Fetch all strings from the database
    cursor.execute('SELECT id, string, approved FROM strings')
    all_strings = cursor.fetchall()

    # Emit all stored words to the moderator dashboard
    socketio.emit('all_words', [
        {"id": row[0], "string": row[1], "approved": bool(row[2])}
        for row in all_strings
    ])

    return jsonify({"message": "String stored successfully", "approved": is_appropriate}), 201


# Route to approve/unapprove a string
@app.route('/approve_string/<int:id>', methods=['PUT'])
def approve_string(id):
    data = request.get_json()
    approved = data.get('approved', False)

    with sqlite3.connect('database.db') as conn:
        cursor = conn.cursor()
        cursor.execute('UPDATE strings SET approved = ? WHERE id = ?', (approved, id))
        conn.commit()

    # Notify the display frontend of the change
    if approved:
        cursor.execute('SELECT * FROM strings WHERE id = ?', (id,))
        row = cursor.fetchone()
        word = {"id": row[0], "string": row[1]}
        socketio.emit('new_word', word)  # Emit event to add the word to the display
    else:
        socketio.emit('remove_word', {'id': id})  # Emit event to remove the word from the display

    return jsonify({"message": "String updated successfully"}), 200

# Route to delete a string
@app.route('/delete_string/<int:id>', methods=['DELETE'])
def delete_string(id):
    with sqlite3.connect('database.db') as conn:
        cursor = conn.cursor()
        cursor.execute('DELETE FROM strings WHERE id = ?', (id,))
        conn.commit()

    # Notify the display frontend to remove the word
    socketio.emit('remove_word', {'id': id})

    return jsonify({"message": "String deleted successfully"}), 200

# Route to serve the moderator frontend
@app.route('/moderator')
def serve_moderator_frontend():
    ip_address = get_local_ip()
    with open('moderator/index.html', 'r') as file:
        content = file.read()
    return render_template_string(content, ip_address=ip_address)

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

if __name__ == '__main__':
    log = logging.getLogger('werkzeug')
    log.setLevel(logging.ERROR)

    init_db()
    print("################################")
    print(f"Display frontend: http://{local_ip}:5000/display")
    print(f"Input frontend: http://{local_ip}:5000/input")
    print(f"Moderator frontend: http://{local_ip}:5000/moderator")
    print("################################")
    print("QR Code Moderator Frontend:")
    print("################################")
    qr_to_terminal(f"http://{local_ip}:5000/moderator")
    socketio.run(app, debug=False, host='0.0.0.0')
