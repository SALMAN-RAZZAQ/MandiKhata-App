const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true // Ek naam ke 2 user nahi ho sakte
  },
  password: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    enum: ['Admin', 'Munshi'], // Dukan mein 2 hi role hain
    default: 'Munshi' 
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);