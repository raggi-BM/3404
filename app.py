#  /$$$$$$$  /$$        /$$$$$$   /$$$$$$  /$$   /$$ /$$      /$$  /$$$$$$  /$$$$$$$$ /$$   /$$
# | $$__  $$| $$       /$$__  $$ /$$__  $$| $$  /$$/| $$$    /$$$ /$$__  $$|__  $$__/| $$  | $$
# | $$  \ $$| $$      | $$  \ $$| $$  \__/| $$ /$$/ | $$$$  /$$$$| $$  \ $$   | $$   | $$  | $$
# | $$$$$$$ | $$      | $$$$$$$$| $$      | $$$$$/  | $$ $$/$$ $$| $$$$$$$$   | $$   | $$$$$$$$
# | $$__  $$| $$      | $$__  $$| $$      | $$  $$  | $$  $$$| $$| $$__  $$   | $$   | $$__  $$
# | $$  \ $$| $$      | $$  | $$| $$    $$| $$\  $$ | $$\  $ | $$| $$  | $$   | $$   | $$  | $$
# | $$$$$$$/| $$$$$$$$| $$  | $$|  $$$$$$/| $$ \  $$| $$ \/  | $$| $$  | $$   | $$   | $$  | $$
# |_______/ |________/|__/  |__/ \______/ |__/  \__/|__/     |__/|__/  |__/   |__/   |__/  |__/

from flask import Flask, request, jsonify, send_from_directory, render_template_string, make_response
from flask_cors import CORS
import sqlite3
import socket
import logging
from flask_socketio import SocketIO, emit
from moderation import check_content_appropriateness
import qrcode
from colorama import init, Fore, Back, Style
import os
import json
import math


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
        line = ''.join(
            [Back.BLACK + '  ' if cell else Back.WHITE + '  ' for cell in row])
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
                            approved BOOLEAN NOT NULL,
                            count INTEGER DEFAULT 1,
                            approved_true_count INTEGER DEFAULT 0,
                            approved_false_count INTEGER DEFAULT 0,
                            human_approved BOOLEAN DEFAULT NULL)''')  # Closing parentheses should be here
        conn.commit()


def calculate_approval(approved_true_count, approved_false_count, total_count, manual_override=False):
    # Debugging: Log the inputs
    print(
        f"Calculating approval for true: {approved_true_count}, false: {approved_false_count}, manual_override: {manual_override}")

    # If manually approved, return True regardless of AI results
    if manual_override:
        print("Manual override detected, returning True")
        return True

    # Calculate the total count from true and false counts
    total_count = approved_true_count + approved_false_count

    # Handle case where no votes have been cast
    if total_count == 0:
        print("No votes cast, returning False")
        return False

    # Define the confidence threshold (e.g., 70% approval needed)
    confidence_threshold = 0.6
    approval_ratio = approved_true_count / total_count

    # Debugging: Log the ratio
    print(f"Approval ratio: {approval_ratio}")

    # If the difference between true and false is small, let's treat it conservatively
    if abs(approved_true_count - approved_false_count) <= 2:
        print("Small difference between true and false counts, returning False")
        return False  # Conservative decision, requires strong majority for approval

    # Check if the approval ratio meets the confidence threshold
    if approval_ratio >= confidence_threshold:
        print("Approval ratio exceeds threshold, returning True")
        return True
    else:
        print("Approval ratio below threshold, returning False")
        return False


# Route to retrieve paginated stored strings, only return approved strings
@app.route('/strings', methods=['GET'])
def get_strings():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 100, type=int)
    offset = (page - 1) * per_page

    with sqlite3.connect('database.db') as conn:
        cursor = conn.cursor()

        # Count the total number of strings with either human approval or AI approval
        cursor.execute('''
            SELECT COUNT(*) FROM strings 
            WHERE 
                (human_approved IS NOT NULL AND human_approved = 1) 
                OR (human_approved IS NULL AND approved_true_count > approved_false_count)
        ''')
        total = cursor.fetchone()[0]

        # Fetch the strings with manual approval or AI approval
        cursor.execute('''
            SELECT * FROM strings 
            WHERE 
                (human_approved IS NOT NULL AND human_approved = 1) 
                OR (human_approved IS NULL AND approved_true_count > approved_false_count)
            LIMIT ? OFFSET ?
        ''', (per_page, offset))

        rows = cursor.fetchall()

        strings = [{
            "id": row[0],
            "string": row[1],
            "approved": row[2],
            "count": row[3],
            "approved_true_count": row[4],
            "approved_false_count": row[5],
            # Include the human_approved field in the results
            "human_approved": row[6]
        } for row in rows]

    return jsonify({
        "page": page,
        "per_page": per_page,
        "total": total,
        "total_pages": (total // per_page) + (1 if total % per_page > 0 else 0),
        "data": strings
    }), 200


@app.route('/get_all', methods=['GET'])
def get_all_strings():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    offset = (page - 1) * per_page

    with sqlite3.connect('database.db') as conn:
        cursor = conn.cursor()

        # Get the total count of all rows for pagination
        cursor.execute('SELECT COUNT(*) FROM strings')
        total = cursor.fetchone()[0]

        # Fetch the strings with all details (without filtering by approval)
        cursor.execute('SELECT * FROM strings LIMIT ? OFFSET ?',
                       (per_page, offset))
        rows = cursor.fetchall()

        strings = []
        for row in rows:
            # Extracting values from the row
            word_id = row[0]
            string = row[1]
            approved = row[2]  # This is the stored AI approval status
            count = row[3]
            approved_true_count = row[4]
            approved_false_count = row[5]
            human_approved = row[6]  # Manual approval status

            # Use the calculate_approval function to determine the dynamic approval status
            if human_approved is not None:
                final_approved = human_approved  # Use manual approval if set
            else:
                # Apply the same logic as the SQL query in the strings route
                final_approved = calculate_approval(
                    approved_true_count, approved_false_count, count)

            # Add the row data to the response
            strings.append({
                "id": word_id,
                "string": string,
                "approved": final_approved,  # Dynamically calculated approval status
                "count": count,
                "approved_true_count": approved_true_count,
                "approved_false_count": approved_false_count,
                "manually_approved": human_approved  # Include manual approval status
            })

    return jsonify({
        "page": page,
        "per_page": per_page,
        "total": total,
        "total_pages": (total // per_page) + (1 if total % per_page > 0 else 0),
        "data": strings
    }), 200


# Load the list of prohibited words
with open(os.path.join(os.path.dirname(__file__), 'words.json'), 'r') as f:
    prohibited_words = set(json.load(f))


@app.route('/store_string', methods=['POST'])
def store_string():
    string = request.json.get('string')
    # Get 'dev' flag, default to False if not provided
    dev = request.json.get('dev', False)

    if not string:
        return jsonify({"error": "String is required"}), 400

    lower_string = string.lower()  # Convert string to lowercase

    with sqlite3.connect('database.db') as conn:
        cursor = conn.cursor()

        # Skip moderation if dev mode is active
        if not dev:

            # Check for prohibited words before running any moderation
            # if any(prohibited_word in lower_string for prohibited_word in prohibited_words):
            if lower_string in prohibited_words:
                return jsonify({
                    "message": "String contains prohibited words and was not stored",
                    "string": lower_string,
                    "approved": False
                }), 400

        # Check if the string already exists in the database (use lowercase string for comparison)
        cursor.execute(
            'SELECT id, count, approved_true_count, approved_false_count, approved, human_approved FROM strings WHERE string = ?', (lower_string,))
        row = cursor.fetchone()

        if row:
            # String exists, increment count and possibly skip moderation if dev flag is set
            word_id = row[0]
            new_count = row[1] + 1
            approved_true_count = row[2]
            approved_false_count = row[3]
            ai_approved = row[4]  # AI-based approval status
            human_approved = row[5]  # Master manual approval status

            if not dev:
                # Run moderation 5 times
                for _ in range(5):
                    is_appropriate = check_content_appropriateness(
                        lower_string)
                    if is_appropriate:
                        approved_true_count += 1
                    else:
                        approved_false_count += 1

                # Update counts and recalculate AI approval
                final_approved = calculate_approval(
                    approved_true_count, approved_false_count, new_count)

                # **New Logic**: Use human_approved as a master override
                if human_approved is not None:  # If manually reviewed, use that decision
                    final_approved = human_approved
            else:
                # If dev flag is set, automatically approve the string
                final_approved = True

            # Update the database
            cursor.execute('UPDATE strings SET count = ?, approved_true_count = ?, approved_false_count = ?, approved = ?, human_approved = ? WHERE id = ?',
                           (new_count, approved_true_count, approved_false_count, final_approved, human_approved, word_id))

        else:
            # String doesn't exist, initialize counts and possibly skip moderation if dev flag is set
            approved_true_count = 0
            approved_false_count = 0
            # Initialize human_approved as None for new strings
            human_approved = None

            if not dev:
                for _ in range(3):
                    is_appropriate = check_content_appropriateness(
                        lower_string)
                    if is_appropriate:
                        approved_true_count += 1
                    else:
                        approved_false_count += 1

                new_count = 1

                # Calculate approval using the custom function
                final_approved = calculate_approval(
                    approved_true_count, approved_false_count, new_count)
            else:
                # If dev flag is set, automatically approve the string
                final_approved = True
                new_count = 1

            # Insert new string, assume no manual approval yet (human_approved = None)
            cursor.execute('INSERT INTO strings (string, approved, count, approved_true_count, approved_false_count, human_approved) VALUES (?, ?, ?, ?, ?, ?)',
                           (lower_string, final_approved, new_count, approved_true_count, approved_false_count, None))
            cursor.execute('SELECT last_insert_rowid()')
            word_id = cursor.fetchone()[0]

        conn.commit()

    # Emit the new/updated string to the display frontend **only if** AI approved it or dev mode is enabled
    if final_approved:
        socketio.emit('new_word', {"id": word_id,
                      "string": lower_string, "count": new_count})

    # Emit all stored words to the moderator dashboard
    cursor.execute('SELECT id, string, approved, count FROM strings')
    all_strings = cursor.fetchall()

    socketio.emit('all_words', [
        {"id": row[0], "string": row[1],
            "approved": bool(row[2]), "count": row[3]}
        for row in all_strings
    ])

    return jsonify({
        "message": "String stored successfully",
        "string": lower_string,
        "approved": bool(final_approved),
        "ai_approved_true_count": approved_true_count,
        "ai_approved_false_count": approved_false_count,
        "total_count": new_count,
        "manually_approved": human_approved,
        "dev_mode": dev  # Return whether dev mode was active
    }), 201


# Route to approve/unapprove a string
@app.route('/approve_string/<int:id>', methods=['PUT'])
def approve_string(id):
    data = request.get_json()
    human_approved = data.get('approved', False)  # Manual approval/disapproval

    with sqlite3.connect('database.db') as conn:
        cursor = conn.cursor()
        cursor.execute(
            'UPDATE strings SET human_approved = ? WHERE id = ?', (human_approved, id))
        conn.commit()

    # Fetch the updated string to emit to the frontend
    cursor.execute('SELECT * FROM strings WHERE id = ?', (id,))
    row = cursor.fetchone()
    word_id = row[0]
    lower_string = row[1]
    approved_true_count = row[4]
    approved_false_count = row[5]
    count = row[3]

    # Emit word to the frontend based on human_approved status
    if human_approved:
        socketio.emit('new_word', {"id": word_id,
                      "string": lower_string, "count": count})
    else:
        # If manually disapproved, remove from the frontend
        socketio.emit('remove_word', {'id': id})

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

# Serve .js and .css files with dynamic placeholder replacement


@app.route('/dynamic-static/<path:filename>')
def serve_dynamic_static_file(filename):
    file_path = os.path.join('static', filename)

    # Only handle .js and .css files for dynamic content replacement
    if filename.endswith('.js') or filename.endswith('.css'):
        if os.path.exists(file_path):
            with open(file_path, 'r') as file:
                content = file.read()
                # Replace the {{ ip_address }} placeholder with the actual IP address
                content = content.replace('{{ ip_address }}', get_local_ip())
            # Create a response with appropriate headers
            response = make_response(render_template_string(content))
            response.headers['Content-Type'] = 'application/javascript' if filename.endswith(
                '.js') else 'text/css'
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
            return response
        else:
            return 'File not found', 404
    else:
        return send_from_directory('static', filename)


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
    socketio.run(app, debug=True, host='0.0.0.0', allow_unsafe_werkzeug=True)
