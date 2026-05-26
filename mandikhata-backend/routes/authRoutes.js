const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const fetchUser = require('../middleware/fetchUser');
const adminOnly = require('../middleware/adminOnly');

const JWT_SECRET = process.env.JWT_SECRET;

// ✅ FIX: Register route ab sirf Admin kar sakta hai
// Pehle koi bhi /api/auth/register call karke Admin account bana sakta tha — SECURITY BUG tha
router.post('/register', fetchUser, adminOnly, async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username aur Password dono zaroori hain!" });
    }

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

// Route 2: Login — yeh open rahega (koi auth nahi chahiye)
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Username aur Password dono likhein!" });
    }

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
    
    // 8 ghante ki expiry
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