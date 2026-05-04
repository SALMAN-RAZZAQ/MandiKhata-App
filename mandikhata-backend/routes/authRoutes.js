const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET; // ✅ Fix #1

// Route 1: Register
router.post('/register', async (req, res) => {
  try {
    const { username, password, role } = req.body;

    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ message: "Bhai jan, yeh user pehle se mojood hai!" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({
      username,
      password: hashedPassword,
      role: role || 'Munshi'
    });

    await user.save();
    res.json({ message: "Naya User kamyabi se ban gaya!" });

  } catch (error) {
    console.error("Register mein masla:", error);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Route 2: Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ success: false, message: "Is naam ka koi user nahi mila!" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Password ghalat hai!" });
    }

    const data = {
      user: { id: user.id, role: user.role, username: user.username }
    };
    
    // ✅ Fix #4 — 8 ghante ki expiry
    const authToken = jwt.sign(data, JWT_SECRET, { expiresIn: '8h' });

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