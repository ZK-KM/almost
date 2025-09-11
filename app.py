from flask import Flask, render_template, jsonify, request, session, redirect, url_for, send_file
import json, os, uuid, random, string
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from io import BytesIO
from captcha.image import ImageCaptcha
import zipfile

# ------------------ CONFIG ------------------
app = Flask(__name__)
app.secret_key = "a9f3b7c1d8e2f4a6b5c0d7e1f9a3b2c8"

app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SECURE=True,
    SESSION_COOKIE_SAMESITE='Lax'
)

UPLOAD_FOLDER = os.path.join("static", "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

DATA_FILE = os.path.join("static", "products.json")

ADMIN_USERNAME = "admin"
ADMIN_PASSWORD_HASH = generate_password_hash("password123")

limiter = Limiter(key_func=get_remote_address, default_limits=["200 per day", "50 per hour"])
limiter.init_app(app)

# ------------------ UTILS ------------------
def load_data():
    if not os.path.exists(DATA_FILE):
        return {"brands": []}
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def login_required(f):
    def wrapper(*args, **kwargs):
        if not session.get("admin_logged_in"):
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    wrapper.__name__ = f.__name__
    return wrapper

# ------------------ PUBLIC PAGES ------------------
@app.route("/")
def index(): return render_template("index.html")
@app.route("/brands") 
def brands(): return render_template("brands.html")

# ------------------ CAPTCHA ------------------
def generate_captcha_text(length=5):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

@app.route("/captcha")
def get_captcha():
    text = generate_captcha_text()
    session["captcha_text"] = text
    image = ImageCaptcha(width=160, height=60)
    data = image.generate(text)
    return send_file(BytesIO(data.read()), mimetype='image/png')

# ------------------ LOGIN ------------------
@app.route("/login", methods=["GET", "POST"])
@limiter.limit("5 per minute")
def login():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        captcha_input = request.form.get("captcha", "")
        if captcha_input.upper() != session.get("captcha_text", ""):
            return "Invalid CAPTCHA", 400
        if username == ADMIN_USERNAME and check_password_hash(ADMIN_PASSWORD_HASH, password):
            session["admin_logged_in"] = True
            return redirect(url_for("dashboard"))
        return "Invalid credentials", 401
    return """
        <form method="POST">
            <input name="username" placeholder="Username"><br>
            <input name="password" type="password" placeholder="Password"><br>
            <img src="/captcha"><br>
            <input name="captcha" placeholder="Enter CAPTCHA"><br>
            <button type="submit">Login</button>
        </form>
    """

@app.route("/logout")
def logout():
    session.pop("admin_logged_in", None)
    return redirect(url_for("login"))

# ------------------ DASHBOARD ------------------
@app.route("/dashboard")
@login_required
def dashboard():
    data = load_data()
    return render_template("dashboard.html", data=data)

# ------------------ PRODUCTS ------------------
@app.route("/products/<brand_id>/<category_id>", methods=["GET"])
@login_required
def get_products(brand_id, category_id):
    data = load_data()
    brand = next((b for b in data["brands"] if b["id"] == brand_id), None)
    if not brand: return jsonify([])
    category = next((c for c in brand["categories"] if c["id"] == category_id), None)
    if not category: return jsonify([])
    return jsonify(category["products"])

@app.route("/products/<brand_id>/<category_id>", methods=["POST"])
@login_required
def add_product(brand_id, category_id):
    data = load_data()
    brand = next((b for b in data["brands"] if b["id"] == brand_id), None)
    if not brand: return jsonify({"error": "Brand not found"}), 404
    category = next((c for c in brand["categories"] if c["id"] == category_id), None)
    if not category: return jsonify({"error": "Category not found"}), 404

    product_id = uuid.uuid4().hex
    title = request.form.get("title", "")
    name = request.form.get("name", "")
    description = request.form.get("description", "")

    image_path = ""
    if "image" in request.files:
        file = request.files["image"]
        if file.filename:
            filename = secure_filename(file.filename)
            save_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
            file.save(save_path)
            image_path = f"uploads/{filename}"

    product = {"id": product_id, "title": title, "name": name,
               "description": description, "image": image_path, "active": True}

    category["products"].append(product)
    save_data(data)
    return jsonify({"message": "Product added", "product": product})

@app.route("/products/<brand_id>/<category_id>/<product_id>", methods=["PUT"])
@login_required
def update_product(brand_id, category_id, product_id):
    data = load_data()
    brand = next((b for b in data["brands"] if b["id"] == brand_id), None)
    if not brand: return jsonify({"error": "Brand not found"}), 404
    category = next((c for c in brand["categories"] if c["id"] == category_id), None)
    if not category: return jsonify({"error": "Category not found"}), 404
    product = next((p for p in category["products"] if p["id"] == product_id), None)
    if not product: return jsonify({"error": "Product not found"}), 404

    updates = request.form or request.json or {}
    if "title" in updates: product["title"] = updates["title"]
    if "name" in updates: product["name"] = updates["name"]
    if "description" in updates: product["description"] = updates["description"]

    if "image" in request.files:
        file = request.files["image"]
        if file.filename:
            if product.get("image"):
                old_image_path = os.path.join("static", product["image"])
                if os.path.exists(old_image_path):
                    os.remove(old_image_path)
            filename = secure_filename(file.filename)
            save_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
            file.save(save_path)
            product["image"] = f"uploads/{filename}"

    save_data(data)
    return jsonify({"message": "Product updated", "product": product})

@app.route("/products/<brand_id>/<category_id>/<product_id>", methods=["DELETE"])
@login_required
def delete_product(brand_id, category_id, product_id):
    data = load_data()
    brand = next((b for b in data["brands"] if b["id"] == brand_id), None)
    if not brand: return jsonify({"error": "Brand not found"}), 404
    category = next((c for c in brand["categories"] if c["id"] == category_id), None)
    if not category: return jsonify({"error": "Category not found"}), 404
    product_to_delete = next((p for p in category["products"] if p["id"] == product_id), None)
    if not product_to_delete: return jsonify({"error": "Product not found"}), 404

    if product_to_delete.get("image"):
        image_path = os.path.join("static", product_to_delete["image"])
        if os.path.exists(image_path):
            os.remove(image_path)

    category["products"] = [p for p in category["products"] if p["id"] != product_id]
    save_data(data)
    return jsonify({"message": "Product deleted"})

@app.route("/products/<brand_id>/<category_id>/<product_id>/toggle", methods=["PATCH"])
@login_required
def toggle_product(brand_id, category_id, product_id):
    data = load_data()
    brand = next((b for b in data["brands"] if b["id"] == brand_id), None)
    if not brand: return jsonify({"error": "Brand not found"}), 404
    category = next((c for c in brand["categories"] if c["id"] == category_id), None)
    if not category: return jsonify({"error": "Category not found"}), 404
    product = next((p for p in category["products"] if p["id"] == product_id), None)
    if not product: return jsonify({"error": "Product not found"}), 404

    product["active"] = not product["active"]
    save_data(data)
    return jsonify({"message": "Status toggled", "active": product["active"]})

# ------------------ ADD CATEGORY ------------------
@app.route("/categories/<brand_id>", methods=["POST"])
@login_required
def add_category(brand_id):
    data = load_data()
    brand = next((b for b in data["brands"] if b["id"] == brand_id), None)
    if not brand: return jsonify({"error": "Brand not found"}), 404

    category_name = request.form.get("name", "").strip()
    if not category_name:
        return jsonify({"error": "Category name cannot be empty"}), 400

    category_id = uuid.uuid4().hex
    new_category = {"id": category_id, "name": category_name, "products": []}
    brand["categories"].append(new_category)
    save_data(data)
    return jsonify({"message": "Category added", "category": new_category})

# ------------------ DOWNLOAD / UPLOAD ZIP ------------------
@app.route("/download")
@login_required
def download_zip():
    memory_file = BytesIO()
    with zipfile.ZipFile(memory_file, 'w') as zf:
        zf.write(DATA_FILE, arcname="products.json")
        for root, dirs, files in os.walk(app.config["UPLOAD_FOLDER"]):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, start="static")
                zf.write(file_path, arcname=arcname)
    memory_file.seek(0)
    return send_file(memory_file, download_name="backup.zip", as_attachment=True)

@app.route("/upload", methods=["POST"])
@login_required
def upload_zip():
    if "file" not in request.files:
        return "No file uploaded", 400
    file = request.files["file"]
    if not file.filename.endswith(".zip"):
        return "Invalid file type", 400

    zip_data = BytesIO(file.read())
    with zipfile.ZipFile(zip_data, 'r') as zf:
        for member in zf.namelist():
            if member == "products.json":
                zf.extract(member, "static")
                os.replace("static/products.json", DATA_FILE)
            elif member.startswith("uploads/"):
                zf.extract(member, "static")

    return redirect(url_for("dashboard"))

# ------------------ RUN ------------------
if __name__ == "__main__":
    app.run(debug=True)
