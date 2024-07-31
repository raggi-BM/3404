import functions_framework
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize Firestore DB
cred = credentials.ApplicationDefault()
firebase_admin.initialize_app(cred)
db = firestore.client()

# Route to accept and store string inputs
@app.route('/store_string', methods=['POST'])
def store_string():
    string = request.json.get('string')
    if not string:
        return jsonify({"error": "String is required"}), 400

    doc_ref = db.collection('strings').document()
    doc_ref.set({
        'string': string
    })

    return jsonify({"message": "String stored successfully"}), 201

# Route to retrieve paginated stored strings
@app.route('/strings', methods=['GET'])
def get_strings():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    offset = (page - 1) * per_page

    strings_ref = db.collection('strings').limit(per_page).offset(offset)
    docs = strings_ref.stream()
    strings = [{"id": doc.id, "string": doc.to_dict().get('string')} for doc in docs]

    total_ref = db.collection('strings').get()
    total = len(total_ref)

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

# Flask entry point for Firebase Functions
@functions_framework.http
def main(request):
    return app(request)

if __name__ == '__main__':
    app.run(debug=True)
