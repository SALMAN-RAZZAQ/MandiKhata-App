const mongoose = require('mongoose');

const CropSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true // Ek fasal ka naam dobara nahi aa sakta
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('Crop', CropSchema);