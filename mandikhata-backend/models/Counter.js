const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true 
  }, // Jaise 'parcha', 'parta', 'rokar'
  seq: { 
    type: Number, 
    default: 1000 
  } // Number kahan se shuru karna hai (e.g., 1000)
});

module.exports = mongoose.model('Counter', counterSchema);