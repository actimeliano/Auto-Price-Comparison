# Price Comparison App

A web application that allows users to track and compare product prices across different stores over time.

## Features

- Add products with their prices, units, and purchase locations
- Compare prices of a specific product across different stores
- View price history for products with interactive charts
- Quick add functionality for frequently added products
- Barcode scanning support (placeholder for future implementation)
- Responsive design for mobile and desktop use

## Technologies Used

- Backend: Python with Flask framework
- Database: SQLite with SQLAlchemy ORM
- Frontend: HTML, CSS, JavaScript
- UI Framework: Bootstrap 5
- Charts: Highcharts

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/price-comparison-app.git
   cd price-comparison-app
   ```

2. Create a virtual environment and activate it:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
   ```

3. Install the required packages:
   ```
   pip install -r requirements.txt
   ```

4. Initialize the database:
   ```
   python
   >>> from main import app, db
   >>> with app.app_context():
   ...     db.create_all()
   >>> exit()
   ```

5. Run the application:
   ```
   python main.py
   ```

6. Open a web browser and navigate to `http://localhost:5000`

## Usage

1. Add Product: Enter product details and click "Add Product" or use the Quick Add buttons for frequently added items.
2. Compare Prices: Select a product from the dropdown to see the best price and where to find it.
3. View Price History: Choose a product and date range to see price trends over time, visualized in a chart.
4. Price Table: View a comprehensive table of all product prices across different stores and dates.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- [Flask](https://flask.palletsprojects.com/)
- [SQLAlchemy](https://www.sqlalchemy.org/)
- [Bootstrap](https://getbootstrap.com/)
- [Highcharts](https://www.highcharts.com/)

## Future Improvements

- Implement barcode scanning functionality
- Add user authentication and personal price lists
- Integrate with online price comparison APIs
- Implement data export functionality
- Add price alerts for desired products