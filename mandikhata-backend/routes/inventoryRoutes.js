const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');
const fetchUser = require('../middleware/fetchUser');

// 1. تمام اسٹاک (Crops) منگوانے کا روٹ (🔥 DATE FILTER WALA 🔥)
router.get('/all', fetchUser, async (req, res) => {
    try {
        const { from, to } = req.query;
        let inventory = await Inventory.find().lean();

        if (from && to) {
            const fromDate = new Date(from);
            const toDate = new Date(new Date(to).setHours(23, 59, 59, 999));

            inventory = inventory.map(item => {
                if (item.lots) {
                    item.lots = item.lots.filter(lot => {
                        const lotDate = new Date(lot.date);
                        return lotDate >= fromDate && lotDate <= toDate;
                    });
                }
                return item;
            });
        }
        
        res.json(inventory);
    } catch (error) {
        res.status(500).json({ error: "Server Error" });
    }
});

// 2. نئی فصل (Crop) کا نام ایڈ کرنے کا روٹ
router.post('/add', fetchUser, async (req, res) => {
    try {
        const { cropName } = req.body;
        if (!cropName) return res.status(400).json({ error: "Fasal ka naam zaroori hai" });

        let existing = await Inventory.findOne({ cropName });
        if (existing) return res.status(400).json({ error: "Yeh fasal pehle se mojood hai" });

        // 🚀 NAYA: نئی فصل بناتے وقت lots کو خالی ایریے [] کے طور پر سیو کریں
        const newCrop = new Inventory({ 
            cropName, 
            totalWeight: 0, 
            lots: [] 
        });
        
        await newCrop.save();
        res.json({ success: true, message: "Nayi fasal add ho gayi", crop: newCrop });
    } catch (error) {
        res.status(500).json({ error: "Server Error" });
    }
});

module.exports = router;