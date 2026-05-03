const mongoose = require('mongoose');

const khataGroupSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // Jaise: "Zati Khata", "Dukaan Expenses"
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('KhataGroup', khataGroupSchema);