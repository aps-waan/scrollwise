"""
ScrollWise Hybrid Machine Learning Recommender Engine
------------------------------------------------------
Architecture:
1. Collaborative Layer: SVD Matrix Factorization via scikit-surprise
2. Content-based Layer: TF-IDF Vectorization + Cosine Similarity via scikit-learn
3. Hybrid Blend Layer: Dynamic weighted combination with cold-start resolution
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import sys
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from surprise import SVD, Dataset, Reader

# Ensure UTF-8 output in Windows PowerShell terminal
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

app = Flask(__name__)
CORS(app)

# 1. Load Academic Books Dataset
with open('books.json', 'r', encoding='utf-8') as f:
    books = json.load(f)

book_id_to_item = {b['id']: b for b in books}
book_ids = [b['id'] for b in books]

# 2. Content-Based TF-IDF Model
corpus = [
    f"{b['title']} {b['author']} {b['discipline']} {b['discipline']} {b['category']} {' '.join(b.get('tags', []))} {b['summary']}"
    for b in books
]
tfidf_vec = TfidfVectorizer(stop_words='english')
tfidf_matrix = tfidf_vec.fit_transform(corpus).toarray()
cosine_sim_matrix = cosine_similarity(tfidf_matrix, tfidf_matrix)

# 3. Collaborative SVD Model Setup via Surprise
# Simulated baseline student cohort interactions (12 students rating seminal books on 1-5 scale)
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

# Initial SVD train
svd_engine = train_svd()

print("\n" + "=" * 68, flush=True)
print("⚡ SCROLLWISE HYBRID MACHINE LEARNING RECOMMENDER ENGINE", flush=True)
print(f"📚 Dataset: {len(books)} Seminal Academic Books | Latent SVD Factors: 10", flush=True)
print("🔬 Layer 1: Collaborative Filtering (SVD Matrix Factorization via Surprise)", flush=True)
print("🔬 Layer 2: Content-Based Filtering (TF-IDF Vectorizer + Cosine Sim)", flush=True)
print("🔬 Layer 3: Weighted Hybrid Fusion [α * SVD + (1 - α) * Content]", flush=True)
print("=" * 68 + "\n", flush=True)

@app.route('/api/books', methods=['GET'])
def get_books():
    discipline = request.args.get('discipline')
    if discipline and discipline != 'all':
        return jsonify([b for b in books if b['discipline'].lower() == discipline.lower()])
    return jsonify(books)

@app.route('/api/recommend', methods=['POST'])
def recommend():
    try:
        body = request.get_json(force=True, silent=True) or {}
    except Exception:
        body = {}

    recent_ids = body.get('recent_book_ids') or body.get('user_history') or body.get('history') or []
    if not recent_ids and body.get('book_id'):
        recent_ids = [body.get('book_id')]
    if not recent_ids and len(books) > 0:
        recent_ids = [books[0]['id']] # Default baseline if empty

    user_ratings = body.get('user_ratings', {})
    alpha = float(body.get('alpha', 0.5)) # Weight between Collaborative (alpha) and Content (1 - alpha)

    # If user provided implicit or explicit ratings for recent books, ensure they are in user_ratings
    for r_id in recent_ids:
        if r_id not in user_ratings:
            user_ratings[r_id] = 4.8

    # Retrain SVD with active user's ratings
    active_svd = train_svd(user_ratings)

    # 1. Compute Content-Based Scores
    # Find average vector similarity to user's read items
    read_indices = [i for i, b in enumerate(books) if b['id'] in recent_ids]
    if read_indices:
        content_sims = np.mean(cosine_sim_matrix[read_indices], axis=0)
    else:
        content_sims = np.zeros(len(books))

    # 2. Compute Collaborative SVD Scores
    svd_preds = {}
    for b in books:
        pred = active_svd.predict("active_user", b['id'])
        # Normalize SVD prediction (scale 1.0 - 5.0) to 0.0 - 1.0
        normalized_svd = max(0.0, min(1.0, (pred.est - 1.0) / 4.0))
        svd_preds[b['id']] = normalized_svd

    # 3. Hybrid Fusion Calculation
    scored_items = []
    print("\n" + "-" * 68, flush=True)
    recent_titles = [book_id_to_item[i]['title'] for i in recent_ids if i in book_id_to_item]
    print(f"🎯 ML INFERENCE TRIGGERED: User History ({len(recent_ids)} books): {recent_titles}", flush=True)
    print(f"⚙️ Hybrid Blend Weight: α={alpha:.2f} (Collaborative SVD) | 1-α={1.0-alpha:.2f} (Content TF-IDF)", flush=True)
    print("-" * 68, flush=True)
    print(f"{'Rank':<5} {'Title':<30} {'SVD (Collab)':<14} {'TF-IDF (Content)':<16} {'Hybrid Match':<12}", flush=True)
    print("-" * 68, flush=True)

    for i, b in enumerate(books):
        b_id = b['id']
        c_score = float(content_sims[i])
        s_score = float(svd_preds[b_id])
        hybrid_score = (alpha * s_score) + ((1.0 - alpha) * c_score)
        hybrid_pct = round(hybrid_score * 100, 1)

        scored_items.append({
            **b,
            "collab_score": round(s_score * 100, 1),
            "content_score": round(c_score * 100, 1),
            "hybrid_score": hybrid_pct,
            "is_recently_read": b_id in recent_ids
        })

    # Sort descending by hybrid score
    scored_items.sort(key=lambda x: x['hybrid_score'], reverse=True)

    # Print top 6 to terminal for user visibility
    for rank, item in enumerate(scored_items[:6], 1):
        flag = " [READ]" if item['is_recently_read'] else ""
        print(f"#{rank:<4} {item['title'][:28]:<30} {item['collab_score']:>5.1f}%{'':<8} {item['content_score']:>5.1f}%{'':<10} {item['hybrid_score']:>5.1f}%{flag}", flush=True)
    print("-" * 68 + "\n", flush=True)

    # Filter out already read for recommended shelf (or keep with score if requested)
    recommendations = [item for item in scored_items if not item['is_recently_read']]
    if not recommendations:
        recommendations = scored_items

    # Return structured object containing both top recommendations and all ranked items
    return jsonify({
        "recommendations": recommendations[:6],
        "all_ranked": scored_items
    })

@app.route('/api/books/save', methods=['POST'])
def save_book():
    try:
        data = request.get_json(force=True, silent=True) or {}
        book_id = data.get('id')
        if not book_id:
            return jsonify({"error": "Missing book id"}), 400

        global books, book_id_to_item, book_ids
        existing_index = next((i for i, b in enumerate(books) if b['id'] == book_id), -1)
        if existing_index >= 0:
            books[existing_index].update(data)
        else:
            books.insert(0, data)
            book_ids.append(book_id)

        book_id_to_item[book_id] = data

        with open('books.json', 'w', encoding='utf-8') as f:
            json.dump(books, f, indent=2, ensure_ascii=False)
        try:
            with open('public/books.json', 'w', encoding='utf-8') as f:
                json.dump(books, f, indent=2, ensure_ascii=False)
        except Exception:
            pass

        return jsonify({"status": "success", "book": data, "count": len(books)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        "status": "healthy",
        "service": "ScrollWise Hybrid ML Recommender",
        "algorithms": {
            "collaborative": "SVD Matrix Factorization (Surprise)",
            "content": "TF-IDF + Cosine Similarity (Scikit-Learn)",
            "fusion": "Weighted Convex Linear Combination"
        },
        "books_count": len(books)
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
