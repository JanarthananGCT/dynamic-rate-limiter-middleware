const mongoose = require('mongoose');

const hitSchema = new mongoose.Schema({
    endpoint: String,
    hits: Number,
    lastHit: Date,
});

module.exports = mongoose.model('Hit', hitSchema);
