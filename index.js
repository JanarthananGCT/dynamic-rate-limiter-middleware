const express = require('express');
const mongoose = require('mongoose');
const rateLimiter = require('./rateLimiter');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/apiHits', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Use the rate limiter middleware
app.use(rateLimiter);

// Sample route
app.get('/api/data', (req, res) => {
    res.json({ message: 'Data fetched successfully!' });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
