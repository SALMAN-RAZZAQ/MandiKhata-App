const express = require('express');
const router = express.Router();
const Crop = require('../models/Crop');
const fetchUser = require('../middleware/fetchUser');
const adminOnly = require('../middleware/adminOnly');

// 1. Nayi Fasal Add Karna (Sirf Admin)
router.post('/add', fetchUser, adminOnly, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Fasal ka naam likhna zaroori hai!' });

    const newCrop = new Crop({ name: name.trim() });
    await newCrop.save();
    
    res.status(201).json({ message: 'Nayi Fasal add ho gayi!', data: newCrop });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Yeh Fasal pehle se mojood hai.' });
    } else {
      res.status(500).json({ error: 'System error.' });
    }
  }
});

// 2. Saari Faslein Dekhna (Admin + Munshi dono dekh sakte hain dropdown ke liye)
router.get('/all', fetchUser, async (req, res) => {
  try {
    const crops = await Crop.find().sort({ name: 1 }); // A-Z sort
    res.status(200).json(crops);
  } catch (error) {
    res.status(500).json({ error: 'Faslein load nahi ho sakin.' });
  }
});

// 3. Fasal Delete Karna (Sirf Admin)
router.delete('/delete/:id', fetchUser, adminOnly, async (req, res) => {
  try {
    await Crop.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Fasal Delete Ho Gayi!' });
  } catch (error) {
    res.status(500).json({ error: 'Delete failed.' });
  }
});

module.exports = router;