// Function to populate dropdowns with product names
async function populateProductDropdowns() {
    try {
        const response = await fetch('/get_all_products');
        const data = await response.json();
        const products = Object.keys(data.products);

        const compareDropdown = document.getElementById('compare_name');
        const historyDropdown = document.getElementById('history_name');

        // Clear existing options
        compareDropdown.innerHTML = '<option value="">Select a product</option>';
        historyDropdown.innerHTML = '<option value="">Select a product</option>';

        products.forEach(product => {
            const option = document.createElement('option');
            option.value = product;
            option.textContent = product;
            compareDropdown.appendChild(option.cloneNode(true));
            historyDropdown.appendChild(option);
        });

        console.log('Dropdowns populated with', products.length, 'products');
    } catch (error) {
        console.error('Error populating dropdowns:', error);
    }
}

// Function to fetch and display all products
async function fetchAndDisplayProducts() {
    const response = await fetch('/get_all_products');
    const data = await response.json();
    
    const tableHeader = document.getElementById('tableHeader');
    const tableBody = document.getElementById('tableBody');
    
    // Clear existing table content
    tableHeader.innerHTML = '<th>Product</th><th>Date</th>';
    tableBody.innerHTML = '';
    
    // Add place columns to the header
    data.places.forEach(place => {
        const th = document.createElement('th');
        th.textContent = place;
        tableHeader.appendChild(th);
    });
    
    // Add product rows
    for (const [product, dates] of Object.entries(data.products)) {
        for (const [date, prices] of Object.entries(dates)) {
            const row = tableBody.insertRow();
            row.insertCell().textContent = product;
            row.insertCell().textContent = date;
            
            data.places.forEach(place => {
                const cell = row.insertCell();
                cell.textContent = prices[place] ? `$${prices[place]}` : '-';
            });
        }
    }
}

// Call these functions when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    await populateProductDropdowns();
    await fetchAndDisplayProducts();
});

// Update dropdowns and table after adding a new product
document.getElementById('addProductForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = {
        name: document.getElementById('name').value.trim(),
        total_price: parseFloat(document.getElementById('total_price').value),
        units: parseFloat(document.getElementById('units').value),
        place: document.getElementById('place').value.trim()
    };

    if (!formData.name || !formData.place || isNaN(formData.total_price) || isNaN(formData.units)) {
        alert('Please fill all fields correctly');
        return;
    }

    try {
        const response = await fetch('/add_product', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(formData)
        });
        const result = await response.json();
        if (response.ok) {
            alert(result.message);
            document.getElementById('addProductForm').reset();
            await populateProductDropdowns();
            await fetchAndDisplayProducts();
            await populateProductSuggestions();
            await populateQuickAddButtons();  // Refresh quick add buttons
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        alert('Error adding product: ' + error.message);
    }
});

// Update the compare product result display
document.getElementById('compareProductForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const selectedProducts = Array.from(document.getElementById('compare_name').selectedOptions).map(option => option.value);
    if (selectedProducts.length === 0) {
        alert('Please select at least one product to compare');
        return;
    }

    const results = await Promise.all(selectedProducts.map(async (name) => {
        const response = await fetch(`/compare/${name}`);
        return await response.json();
    }));

    let comparisonHtml = `
        <div class="card mt-3">
            <div class="card-body">
                <h5 class="card-title">Product Comparison</h5>
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Best Price</th>
                                <th>Store</th>
                                <th>Date</th>
                                <th>Price Trend</th>
                            </tr>
                        </thead>
                        <tbody>
    `;

    for (const result of results) {
        const trendIcon = result.price_trend === 'up' ? '↑' : result.price_trend === 'down' ? '↓' : '→';
        const trendColor = result.price_trend === 'up' ? 'text-danger' : result.price_trend === 'down' ? 'text-success' : 'text-secondary';
        
        comparisonHtml += `
            <tr>
                <td>${result.product_name}</td>
                <td>$${result.best_price_per_unit.toFixed(2)}</td>
                <td>${result.best_place}</td>
                <td>${result.date}</td>
                <td class="${trendColor}">${trendIcon} ${result.price_change.toFixed(2)}%</td>
            </tr>
        `;
    }

    comparisonHtml += `
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    // Add a bar chart for visual comparison
    comparisonHtml += `<div id="priceComparisonChart" style="height: 300px; margin-top: 20px;"></div>`;

    document.getElementById('result').innerHTML = comparisonHtml;

    // Initialize the bar chart
    Highcharts.chart('priceComparisonChart', {
        chart: { type: 'bar' },
        title: { text: 'Price Comparison' },
        xAxis: { categories: results.map(r => r.product_name) },
        yAxis: { title: { text: 'Price per unit' } },
        series: [{
            name: 'Best Price',
            data: results.map(r => r.best_price_per_unit)
        }]
    });
});

// Update the price history display
document.getElementById('priceHistoryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('history_name').value;
    const startDate = document.getElementById('start_date').value;
    const endDate = document.getElementById('end_date').value;
    if (!name) {
        alert('Please select a product to view price history');
        return;
    }
    const response = await fetch(`/price_history/${name}?start_date=${startDate}&end_date=${endDate}`);
    const history = await response.json();
    
    // Calculate statistics
    const prices = history.map(item => item.price_per_unit);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const trend = prices[prices.length - 1] > prices[0] ? 'Increasing' : 'Decreasing';

    // Group by place
    const groupedByPlace = history.reduce((acc, item) => {
        if (!acc[item.place]) acc[item.place] = [];
        acc[item.place].push(item);
        return acc;
    }, {});

    // Prepare data for chart
    const chartData = Object.entries(groupedByPlace).map(([place, items]) => ({
        name: place,
        data: items.map(item => [new Date(item.date).getTime(), item.price_per_unit])
    }));

    // Render statistics
    let statsHtml = `
        <div class="card mb-3">
            <div class="card-body">
                <h5 class="card-title">Price Statistics for ${name}</h5>
                <p><strong>Average Price:</strong> $${avgPrice.toFixed(2)}</p>
                <p><strong>Lowest Price:</strong> $${minPrice.toFixed(2)}</p>
                <p><strong>Highest Price:</strong> $${maxPrice.toFixed(2)}</p>
                <p><strong>Price Trend:</strong> ${trend}</p>
            </div>
        </div>
    `;

    // Render chart
    let chartHtml = `
        <div id="priceChart" style="height: 400px;"></div>
    `;

    // Render table
    let tableHtml = `
        <table class="table table-striped">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Place</th>
                    <th>Price per unit</th>
                </tr>
            </thead>
            <tbody>
                ${history.map(item => `
                    <tr>
                        <td>${item.date}</td>
                        <td>${item.place}</td>
                        <td>$${item.price_per_unit.toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    document.getElementById('history-result').innerHTML = statsHtml + chartHtml + tableHtml;

    // Initialize chart
    Highcharts.chart('priceChart', {
        title: { text: `Price History for ${name}` },
        xAxis: { type: 'datetime' },
        yAxis: { title: { text: 'Price per unit' } },
        series: chartData
    });
});

// Function to populate product suggestions
async function populateProductSuggestions() {
    const response = await fetch('/get_all_products');
    const data = await response.json();
    const products = Object.keys(data.products);
    const datalist = document.getElementById('productSuggestions');
    datalist.innerHTML = '';
    products.forEach(product => {
        const option = document.createElement('option');
        option.value = product;
        datalist.appendChild(option);
    });
}

// Function to populate quick add buttons
async function populateQuickAddButtons() {
    try {
        const response = await fetch('/get_frequent_products');
        const frequentProducts = await response.json();
        const quickAddButtons = document.getElementById('quickAddButtons');
        quickAddButtons.innerHTML = '';
        frequentProducts.forEach(product => {
            const button = document.createElement('button');
            button.textContent = product.name;
            button.className = 'btn btn-outline-primary me-2 mb-2';
            button.addEventListener('click', () => quickAddProduct(product));
            quickAddButtons.appendChild(button);
        });
    } catch (error) {
        console.error('Error populating quick add buttons:', error);
    }
}

// Function to handle quick add
function quickAddProduct(product) {
    document.getElementById('name').value = product.name;
    document.getElementById('place').value = product.place;
    document.getElementById('total_price').value = product.total_price;
    document.getElementById('units').value = product.units;
}

// Function to handle barcode scanning
function scanBarcode() {
    // Implement barcode scanning logic here
    // This could involve using a library like QuaggaJS for browser-based scanning
    // or integrating with a mobile app for native scanning capabilities
    alert('Barcode scanning feature not implemented yet');
}

// Initialize barcode scanning button
document.getElementById('scanBarcode').addEventListener('click', scanBarcode);

// Call these functions when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    await populateProductDropdowns();
    await fetchAndDisplayProducts();
    await populateProductSuggestions();
    await populateQuickAddButtons();
});