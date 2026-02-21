const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Logistics API Running');
});

// Diagnostic endpoint
app.get('/diagnostic', (req, res) => {
    const routes = [];
    app._router.stack.forEach(middleware => {
        if (middleware.name === 'router') {
            routes.push({
                path: middleware.regexp.source,
                methods: middleware.handle.stack.length
            });
        }
    });
    res.json({ routes, message: 'Routes loaded' });
});

const ordersRoutes = require('./routes/ordersRoutes');
app.use('/api/orders', ordersRoutes);

const shipmentRoutes = require('./routes/shipmentRoutes');
app.use('/api/shipments', shipmentRoutes);

const branchRoutes = require('./routes/branchRoutes');
app.use('/api/branches', branchRoutes);

const truckRoutes = require('./routes/truckRoutes');
app.use('/api/trucks', truckRoutes);

const returnsRoutes = require('./routes/returnsRoutes');
app.use('/api/returns', returnsRoutes);

const productsRoutes = require('./routes/productsRoutes');
app.use('/api/products', productsRoutes);

console.log('Routes loaded:');
console.log('- /api/orders');
console.log('- /api/shipments');
console.log('- /api/branches');
console.log('- /api/trucks');
console.log('- /api/returns');
console.log('- /api/products');

app.listen(3000, () => {
    console.log('Server running on port 3000');
});