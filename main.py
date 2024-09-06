from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
from collections import defaultdict

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///price_comparison.db'
db = SQLAlchemy(app)

class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    total_price = db.Column(db.Float, nullable=False)
    units = db.Column(db.Float, nullable=False)
    place = db.Column(db.String(100), nullable=False)
    date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

@app.route('/add_product', methods=['POST'])
def add_product():
    data = request.json
    new_product = Product(
        name=data['name'],
        total_price=data['total_price'],
        units=data['units'],
        place=data['place']
    )
    db.session.add(new_product)
    db.session.commit()
    return jsonify({"message": "Product added successfully"}), 201

@app.route('/compare/<product_name>', methods=['GET'])
def compare_product(product_name):
    products = Product.query.filter_by(name=product_name).order_by(Product.date.desc()).all()
    if not products:
        return jsonify({"message": "No products found"}), 404
    
    best_price_per_unit = min(products, key=lambda p: p.total_price / p.units)
    
    # Calculate price trend
    oldest_price = products[-1].total_price / products[-1].units
    newest_price = products[0].total_price / products[0].units
    price_change = ((newest_price - oldest_price) / oldest_price) * 100
    
    trend = 'up' if price_change > 0 else 'down' if price_change < 0 else 'stable'
    
    return jsonify({
        "product_name": product_name,
        "best_place": best_price_per_unit.place,
        "best_price_per_unit": best_price_per_unit.total_price / best_price_per_unit.units,
        "date": best_price_per_unit.date.strftime("%Y-%m-%d %H:%M:%S"),
        "price_trend": trend,
        "price_change": abs(price_change)
    })

@app.route('/price_history/<product_name>', methods=['GET'])
def price_history(product_name):
    start_date = request.args.get('start_date', (datetime.utcnow() - timedelta(days=30)).strftime('%Y-%m-%d'))
    end_date = request.args.get('end_date', datetime.utcnow().strftime('%Y-%m-%d'))

    products = Product.query.filter(
        Product.name == product_name,
        Product.date >= start_date,
        Product.date <= end_date
    ).order_by(Product.date).all()

    if not products:
        return jsonify({"message": "No price history found"}), 404
    
    history = [
        {
            "date": p.date.strftime("%Y-%m-%d %H:%M:%S"),
            "place": p.place,
            "price_per_unit": p.total_price / p.units
        } for p in products
    ]
    
    return jsonify(history)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_all_products', methods=['GET'])
def get_all_products():
    products = Product.query.order_by(Product.date.desc()).all()
    
    product_data = defaultdict(lambda: defaultdict(dict))
    places = set()

    for product in products:
        product_data[product.name][product.date.strftime("%Y-%m-%d")][product.place] = f"{product.total_price / product.units:.2f}"
        places.add(product.place)

    return jsonify({
        "products": product_data,
        "places": list(places)
    })

@app.route('/get_frequent_products', methods=['GET'])
def get_frequent_products():
    # Get the 5 most frequently added products
    frequent_products = db.session.query(Product.name, Product.place, 
                                         db.func.avg(Product.total_price).label('avg_price'), 
                                         db.func.avg(Product.units).label('avg_units'), 
                                         db.func.count(Product.id).label('count')) \
                        .group_by(Product.name) \
                        .order_by(db.desc('count')) \
                        .limit(5) \
                        .all()
    
    result = [
        {
            'name': product.name,
            'place': product.place,
            'total_price': round(product.avg_price, 2),
            'units': round(product.avg_units, 2)
        }
        for product in frequent_products
    ]
    
    return jsonify(result)

# Add this function to create the database tables
def create_tables():
    with app.app_context():
        db.create_all()

if __name__ == '__main__':
    create_tables()  # Call this function before running the app
    app.run(host='0.0.0.0', port=5000, debug=True)

@app.route('/static/<path:path>')
def send_static(path):
    return send_from_directory('static', path)
