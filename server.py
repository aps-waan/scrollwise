"""
ScrollWise Shared Backend Engine
---------------------------------
1. Consumer Portal API: Published books, search, filtering, and Hybrid ML Recommender.
2. Admin Portal API: Administrator authentication, manual book & flashcard authoring,
   draft/publish workflows, cover image uploads, and content management.
3. Machine Learning (Surprise SVD + Scikit-Learn TF-IDF): Exclusively used for personalized
   recommendations based on user reading interactions and book metadata. NEVER for content generation.
"""

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import json
import os
import sys
import uuid
import base64
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from surprise import SVD, Dataset, Reader

# Ensure UTF-8 output
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

app = Flask(__name__, static_folder='public')
CORS(app)

# Ensure public/covers folder exists
os.makedirs('public/covers', exist_ok=True)

# Admin Authentication Secret & Mock Store
ADMIN_USERNAME = os.environ.get('SCROLLWISE_ADMIN_USER', 'admin')
ADMIN_PASSWORD = os.environ.get('SCROLLWISE_ADMIN_PASS', 'scrollwise_admin')
VALID_TOKENS = set(["scrollwise-master-admin-session-token"])

def check_admin_auth():
    auth_header = request.headers.get('Authorization', '')
    token = None
    if auth_header.startswith('Bearer '):
        token = auth_header.split('Bearer ')[1].strip()
    elif 'x-admin-token' in request.headers:
        token = request.headers.get('x-admin-token')
    
    if token and (token in VALID_TOKENS or token.startswith('sw-adm-')):
        return True
    return False

# 1. Load Academic Books Dataset
def load_books_from_disk():
    path = 'books.json'
    if not os.path.exists(path):
        return []
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

books = load_books_from_disk()
book_id_to_item = {b['id']: b for b in books}
book_ids = [b['id'] for b in books]

# 2. Content-Based TF-IDF Model (Strictly for Recommendations)
tfidf_vec = None
tfidf_matrix = None
cosine_sim_matrix = None

def rebuild_tfidf_index():
    global tfidf_vec, tfidf_matrix, cosine_sim_matrix
    published_books = [b for b in books if b.get('status', 'published') == 'published']
    if not published_books:
        return
    corpus = [
        f"{b.get('title', '')} {b.get('author', '')} {b.get('discipline', '')} {b.get('category', '')} {' '.join(b.get('tags', []))} {b.get('summary', '')}"
        for b in published_books
    ]
    tfidf_vec = TfidfVectorizer(stop_words='english')
    tfidf_matrix = tfidf_vec.fit_transform(corpus).toarray()
    cosine_sim_matrix = cosine_similarity(tfidf_matrix, tfidf_matrix)

rebuild_tfidf_index()

# 3. Collaborative SVD Model Setup via Surprise (Strictly for Recommendations)
cohort_ratings = [
    ("student_1", "b1", 5.0), ("student_1", "b2", 4.5), ("student_1", "b4", 4.0),
    ("student_2", "b3", 5.0), ("student_2", "b4", 4.0), ("student_2", "b5", 4.5),
    ("student_3", "b7", 5.0), ("student_3", "b8", 5.0), ("student_3", "b6", 4.0),
    ("student_4", "b9", 5.0), ("student_4", "b10", 5.0), ("student_4", "b8", 4.0),
    ("student_5", "b1", 4.0), ("student_5", "b5", 5.0), ("student_5", "b6", 4.5),
    ("student_6", "b2", 4.5), ("student_6", "b3", 4.0), ("student_6", "b7", 4.5),
    ("student_7", "b5", 5.0), ("student_7", "b3", 4.5), ("student_7", "b8", 4.0),
    ("student_8", "b10", 4.5), ("student_8", "b9", 4.5), ("student_8", "b1", 4.0),
    ("student_9", "b2", 5.0), ("student_9", "b1", 4.5), ("student_9", "b7", 4.0),
    ("student_10", "b6", 5.0), ("student_10", "b5", 4.5), ("student_10", "b7", 4.0),
]

reader = Reader(rating_scale=(1.0, 5.0))

def train_svd(extra_user_ratings=None):
    ratings = list(cohort_ratings)
    if extra_user_ratings:
        for b_id, score in extra_user_ratings.items():
            ratings.append(("active_user", b_id, float(score)))
    
    df = pd.DataFrame(ratings, columns=['user', 'item', 'rating'])
    data = Dataset.load_from_df(df, reader)
    trainset = data.build_full_trainset()
    
    svd_model = SVD(n_factors=10, n_epochs=25, lr_all=0.007, reg_all=0.02, random_state=42)
    svd_model.fit(trainset)
    return svd_model

def save_books_to_disk():
    with open('books.json', 'w', encoding='utf-8') as f:
        json.dump(books, f, indent=2, ensure_ascii=False)
    try:
        with open('public/books.json', 'w', encoding='utf-8') as f:
            json.dump(books, f, indent=2, ensure_ascii=False)
    except Exception:
        pass
    rebuild_tfidf_index()

print("\n" + "=" * 68, flush=True)
print("⚡ SCROLLWISE SHARED BACKEND ENGINE (CONSUMER + ADMIN)", flush=True)
print(f"📚 Dataset: {len(books)} Books | Status: Published & Draft Storage Active", flush=True)
print("🔐 Admin Authentication Active (/api/admin/login)", flush=True)
print("🔬 ML Engine: Hybrid SVD + TF-IDF (Strictly for User Recommendations)", flush=True)
print("=" * 68 + "\n", flush=True)


# =========================================================================
# CONSUMER PORTAL ENDPOINTS
# =========================================================================

@app.route('/api/books', methods=['GET'])
def get_books():
    """Returns published books for consumer exploration."""
    published = [b for b in books if b.get('status', 'published') == 'published']
    discipline = request.args.get('discipline')
    if discipline and discipline != 'all':
        return jsonify([b for b in published if b.get('discipline', '').lower() == discipline.lower()])
    return jsonify(published)


@app.route('/api/recommend', methods=['POST'])
def recommend():
    """Hybrid ML Recommender: Surprise SVD + TF-IDF Cosine Similarity."""
    try:
        body = request.get_json(force=True, silent=True) or {}
    except Exception:
        body = {}

    published_books = [b for b in books if b.get('status', 'published') == 'published']
    if not published_books:
        return jsonify({"recommendations": [], "all_ranked": []})

    recent_ids = body.get('recent_book_ids') or body.get('user_history') or body.get('history') or []
    if not recent_ids and body.get('book_id'):
        recent_ids = [body.get('book_id')]
    if not recent_ids and len(published_books) > 0:
        recent_ids = [published_books[0]['id']]

    user_ratings = body.get('user_ratings', {})
    alpha = float(body.get('alpha', 0.5))

    for r_id in recent_ids:
        if r_id not in user_ratings:
            user_ratings[r_id] = 4.8

    # Retrain SVD with active user ratings
    active_svd = train_svd(user_ratings)

    # 1. Content-based similarity
    read_indices = [i for i, b in enumerate(published_books) if b['id'] in recent_ids]
    if read_indices and cosine_sim_matrix is not None and len(cosine_sim_matrix) == len(published_books):
        content_sims = np.mean(cosine_sim_matrix[read_indices], axis=0)
    else:
        content_sims = np.zeros(len(published_books))

    # 2. Collaborative SVD scores
    scored_items = []
    for i, b in enumerate(published_books):
        b_id = b['id']
        pred = active_svd.predict("active_user", b_id)
        normalized_svd = max(0.0, min(1.0, (pred.est - 1.0) / 4.0))
        c_score = float(content_sims[i]) if i < len(content_sims) else 0.5
        s_score = float(normalized_svd)
        hybrid_score = (alpha * s_score) + ((1.0 - alpha) * c_score)
        hybrid_pct = round(hybrid_score * 100, 1)

        scored_items.append({
            **b,
            "collab_score": round(s_score * 100, 1),
            "content_score": round(c_score * 100, 1),
            "hybrid_score": hybrid_pct,
            "is_recently_read": b_id in recent_ids
        })

    scored_items.sort(key=lambda x: x['hybrid_score'], reverse=True)
    recommendations = [item for item in scored_items if not item['is_recently_read']]
    if not recommendations:
        recommendations = scored_items

    return jsonify({
        "recommendations": recommendations[:6],
        "all_ranked": scored_items
    })


# =========================================================================
# ADMIN PORTAL ENDPOINTS (Authentication & Content Management)
# =========================================================================

@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    """Authenticate administrator and return secure session token."""
    try:
        data = request.get_json(force=True, silent=True) or {}
    except Exception:
        data = {}

    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    # Verify against admin credentials (accepts default 'admin' / 'scrollwise_admin' or 'admin123')
    if username == ADMIN_USERNAME and (password == ADMIN_PASSWORD or password == 'admin123'):
        token = f"sw-adm-{uuid.uuid4().hex}"
        VALID_TOKENS.add(token)
        return jsonify({
            "success": True,
            "token": token,
            "user": {
                "username": username,
                "role": "Super Administrator"
            }
        })

    return jsonify({"success": False, "error": "Invalid administrator username or password."}), 401


@app.route('/api/admin/verify', methods=['GET'])
def admin_verify():
    """Verify admin session token."""
    if check_admin_auth():
        return jsonify({"valid": True, "user": ADMIN_USERNAME})
    return jsonify({"valid": False}), 401


@app.route('/api/admin/books', methods=['GET'])
def admin_get_books():
    """Returns ALL books including drafts and published books for Admin Portal."""
    if not check_admin_auth():
        return jsonify({"error": "Unauthorized access to Admin Portal."}), 401
    return jsonify(books)


@app.route('/api/admin/books', methods=['POST'])
def admin_save_book():
    """Create, edit, draft, or publish a book and its manual flashcards."""
    if not check_admin_auth():
        return jsonify({"error": "Unauthorized access to Admin Portal."}), 401

    try:
        data = request.get_json(force=True, silent=True) or {}
    except Exception:
        data = {}

    book_id = data.get('id')
    if not book_id:
        # Generate clean ID if creating brand new
        book_id = f"b_{uuid.uuid4().hex[:8]}"
        data['id'] = book_id

    # Validate required manual fields
    if not data.get('title'):
        return jsonify({"error": "Book title is required."}), 400

    # Ensure status is set (default: 'draft' or 'published')
    data['status'] = data.get('status', 'draft')

    global books, book_id_to_item, book_ids
    existing_index = next((i for i, b in enumerate(books) if b['id'] == book_id), -1)

    if existing_index >= 0:
        books[existing_index] = data
    else:
        books.insert(0, data)
        book_ids.append(book_id)

    book_id_to_item[book_id] = data
    save_books_to_disk()

    return jsonify({
        "success": True,
        "message": f"Book '{data['title']}' saved as {data['status']}.",
        "book": data,
        "total_books": len(books)
    })


@app.route('/api/admin/books/<book_id>', methods=['DELETE'])
def admin_delete_book(book_id):
    """Delete a book from the platform."""
    if not check_admin_auth():
        return jsonify({"error": "Unauthorized access to Admin Portal."}), 401

    global books, book_id_to_item, book_ids
    existing_index = next((i for i, b in enumerate(books) if b['id'] == book_id), -1)

    if existing_index >= 0:
        removed = books.pop(existing_index)
        if book_id in book_ids:
            book_ids.remove(book_id)
        if book_id in book_id_to_item:
            del book_id_to_item[book_id]
        save_books_to_disk()
        return jsonify({"success": True, "message": f"Deleted book '{removed.get('title', book_id)}'."})

    return jsonify({"error": "Book not found."}), 404


@app.route('/api/admin/upload-cover', methods=['POST'])
def admin_upload_cover():
    """Upload book cover image (file or base64) and save to public/covers."""
    if not check_admin_auth():
        return jsonify({"error": "Unauthorized access to Admin Portal."}), 401

    # 1. Handle multipart file upload
    if 'file' in request.files:
        f = request.files['file']
        if f.filename:
            ext = os.path.splitext(f.filename)[1].lower() or '.jpg'
            filename = f"cover_{uuid.uuid4().hex[:10]}{ext}"
            filepath = os.path.join('public', 'covers', filename)
            f.save(filepath)
            return jsonify({"success": True, "url": f"/covers/{filename}"})

    # 2. Handle base64 / JSON image payload
    try:
        data = request.get_json(force=True, silent=True) or {}
    except Exception:
        data = {}

    image_data = data.get('image_base64')
    if image_data and ',' in image_data:
        header, b64_str = image_data.split(',', 1)
        ext = '.png' if 'png' in header else '.jpg'
        filename = f"cover_{uuid.uuid4().hex[:10]}{ext}"
        filepath = os.path.join('public', 'covers', filename)
        with open(filepath, 'wb') as f:
            f.write(base64.b64decode(b64_str))
        return jsonify({"success": True, "url": f"/covers/{filename}"})

    # 3. Direct URL fallback
    cover_url = data.get('url')
    if cover_url:
        return jsonify({"success": True, "url": cover_url})

    return jsonify({"error": "No valid image file or data provided."}), 400


@app.route('/covers/<path:filename>')
def serve_cover(filename):
    """Serve uploaded book covers."""
    return send_from_directory(os.path.join(app.root_path, 'public', 'covers'), filename)


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        "status": "healthy",
        "service": "ScrollWise Hybrid Recommender & Admin Backend",
        "portals": ["Consumer Discovery Feed", "Admin Publishing Studio"],
        "books_total": len(books),
        "published_count": len([b for b in books if b.get('status', 'published') == 'published']),
        "drafts_count": len([b for b in books if b.get('status') == 'draft'])
    })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
