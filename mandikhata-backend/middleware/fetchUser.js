const jwt = require('jsonwebtoken');

// Wahi same secret key jo authRoutes.js mein rakhi thi
const JWT_SECRET = process.env.JWT_SECRET;
const fetchUser = (req, res, next) => {
  // 1. Guard check karega ke request ke "header" mein 'auth-token' (chabi) hai ya nahi?
  const token = req.header('auth-token');
  
  if (!token) {
    return res.status(401).json({ error: "Bhai jan! Bina chabi (token) ke andar aana mana hai!" });
  }

  try {
    // 2. Agar chabi hai, toh Guard check karega ke asli hai ya nakli
    const data = jwt.verify(token, JWT_SECRET);
    
    // 3. Chabi theek hone par, Guard user ki detail nikal kar aage bhej dega
    req.user = data.user;
    next(); // Iska matlab hai "Theek hai, darwaza khol do"

  } catch (error) {
    res.status(401).json({ error: "Chabi ghalat hai ya purani ho chuki hai!" });
  }
};

module.exports = fetchUser;