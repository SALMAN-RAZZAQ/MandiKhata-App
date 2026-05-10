const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema({
  cropName: { 
    type: String, 
    required: true, 
    unique: true // Ek fasal ka ek hi record hoga (misal ke taur par: Gandum)
  },
  totalWeight: { 
    type: Number, 
    default: 0 // Shuru mein stock zero hoga (Man / KG mein)
  },
  lastUpdated: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('Inventory', InventorySchema);