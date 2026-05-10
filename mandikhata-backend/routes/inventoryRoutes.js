const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');
const fetchUser = require('../middleware/fetchUser');

// GET: Godown ka saara stock dekhein
router.get('/all', fetchUser, async (req, res) => {
  try {
    const stock = await Inventory.find().sort({ cropName: 1 });
    res.json(stock);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Stock load nahi ho saka.' });
  }
});

module.exports = router;