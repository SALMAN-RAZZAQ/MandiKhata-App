const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Apna User model mangwaya

// JWT Secret Key (Asal software mein isko .env file mein chupate hain)
const JWT_SECRET = 'MandiKhata123!@#SuperSecretKey'; 

// -----------------------------------------------------
// Route 1: Naya User Banana (Register - Sirf 1 dafa zaroorat paregi)
// -----------------------------------------------------
router.post('/register', async (req, res) => {
  try {
    const { username, password, role } = req.body;

    // Check karein kya is naam ka user pehle se toh nahi hai?
    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ message: "Bhai jan, yeh user pehle se mojood hai!" });
    }

    // Password ko "Hash" (Scramble/Lock) karna
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Naya user database mein save karna (Hashed password ke sath)
    user = new User({
      username,
      password: hashedPassword,
      role: role || 'Munshi' // Agar role na batayen toh default Munshi hoga
    });

    await user.save();
    res.json({ message: "Naya User kamyabi se ban gaya!" });

  } catch (error) {
    console.error("Register mein masla:", error);
    res.status(500).json({ error: 'Server Error' });
  }
});

// -----------------------------------------------------
// Route 2: Login Karna (Rozana istemal hoga)
// -----------------------------------------------------
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1. User dhoondein
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ success: false, message: "Is naam ka koi user nahi mila!" });
    }

    // 2. Password match karein (User ka likha hua vs Database ka chupa hua)
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Password ghalat hai!" });
    }

    // 3. Password theek ho toh "Token" (Digital Chabi) banana
    const data = {
      user: { id: user.id, role: user.role, username: user.username }
    };
    
    const authToken = jwt.sign(data, JWT_SECRET);

    // Frontend ko chabi aur user ki detail bhej dena
    res.json({ 
      success: true, 
      authToken, 
      role: user.role, 
      username: user.username 
    });

  } catch (error) {
    console.error("Login mein masla:", error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

module.exports = router;