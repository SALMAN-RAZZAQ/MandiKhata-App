const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Transaction = require('../models/Transaction'); 
const Party = require('../models/Party');
const KhataGroup = require('../models/KhataGroup');
const User = require('../models/User');
const fetchUser = require('../middleware/fetchUser');
const adminOnly = require('../middleware/adminOnly'); // ✅ Admin guard import

// 1. ADD KHATA — ✅ Admin only (Security waise hi hai)
router.post('/khatagroup/add', fetchUser, adminOnly, async (req, res) => {
  try {
    const { name } = req.body;
    
    // Agar naam khali aaye toh backend yahan rok lega
    if (!name) {
      return res.status(400).json({ error: 'Khata ka naam likhna zaroori hai!' });
    }

    const newGroup = new KhataGroup({ name });
    await newGroup.save();
    
    res.status(201).json({ message: 'Naya Khata Section ban gaya!', data: newGroup });
  } catch (error) {
    console.log("Database Error in Add Khata:", error); 
    
    // Asal Haqeeqat: Agar waqai duplicate entry ho toh error code 11000 aata hai
    if (error.code === 11000) {
      res.status(400).json({ error: 'Yeh Khata pehle se mojood hai.' });
    } else {
      res.status(500).json({ error: 'System mein masla aya, collection theek ki ja rahi hai.' });
    }
  }
});

// 2. GET ALL KHATA — ✅ OPEN (login page ko zaroorat hai)
router.get('/khatagroup/all', async (req, res) => {
  try {
    const groups = await KhataGroup.find();
    res.status(200).json(groups);
  } catch (error) {
    res.status(500).json({ error: 'Groups load nahi ho sake.' });
  }
});

// 3. DELETE KHATA — ✅ Admin only
router.delete('/khatagroup/delete/:id', fetchUser, adminOnly, async (req, res) => {
  try {
    await KhataGroup.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Khata Delete Ho Gaya!' });
  } catch (error) {
    res.status(500).json({ error: 'Delete failed.' });
  }
});

// 4. PARCHI SAVE — ✅ Munshi bhi kar sakta hai
router.post('/add', fetchUser, async (req, res) => {
  try {
    const { 
      transactionType, farmerName, cropType, 
      weight, rate, totalAmount, khataCategory,
      commission, mazdoori, dami, marketFee, details
    } = req.body;

    if (!transactionType) return res.status(400).json({ error: 'Parchi ki Qisam zaroori hai!' });
    if (!khataCategory) return res.status(400).json({ error: 'Khata Account zaroori hai!' });
    if (!farmerName) return res.status(400).json({ error: 'Party Name zaroori hai!' });

    let party = await Party.findOne({ name: farmerName });

    if (!party) {
      party = new Party({
        name: farmerName,
        partyType: khataCategory, 
        currentBalance: 0
      });
    }

    if (transactionType === 'Adaigi') {
      party.currentBalance -= Number(totalAmount);
    } else {
      party.currentBalance += Number(totalAmount);
    }
    await party.save(); 

    // ✅ Sequential Receipt Number
    const lastTransaction = await Transaction.findOne().sort({ _id: -1 });
    let nextNumber = 1001;
    if (lastTransaction && lastTransaction.receiptNo) {
      const parts = lastTransaction.receiptNo.split('-');
      if (parts.length === 2) {
        const lastNum = parseInt(parts[1]);
        if (!isNaN(lastNum)) nextNumber = lastNum + 1;
      }
    }
    const finalReceiptNo = 'RCP-' + nextNumber;

    const newTransaction = new Transaction({
      receiptNo: finalReceiptNo,
      transactionType: transactionType,
      khataCategory: khataCategory, 
      partyId: party._id, 
      partyName: party.name,
      cropType: cropType || 'N/A',
      weight: Number(weight) || 0,
      rate: Number(rate) || 0,
      grossAmount: (Number(weight) || 0) * Number(rate || 0),
      commission: Number(commission) || 0,
      mazdoori: Number(mazdoori) || 0,
      dami: Number(dami) || 0,
      marketFee: Number(marketFee) || 0,
      details: details || '',
      netAmount: Number(totalAmount) || 0
    });

    await newTransaction.save(); 
    res.status(201).json({ message: 'Parchi Save Ho Gayi!', data: newTransaction });
    
  } catch (error) {
    res.status(500).json({ error: 'System parchi save nahi kar saka.' });
  }
});

// 5. ROZNAMCHA ALL — ✅ Munshi bhi dekh sakta hai
router.get('/all', fetchUser, async (req, res) => {
  try {
    const { from, to, khataCategory } = req.query;
    let filter = {};

    if (from && to) {
      filter.date = { 
        $gte: new Date(from), 
        $lte: new Date(new Date(to).setHours(23, 59, 59, 999)) 
      };
    }

    if (khataCategory && khataCategory !== 'all') {
      filter.khataCategory = khataCategory;
    }

    const allTransactions = await Transaction.find(filter).sort({ date: -1 });
    res.status(200).json(allTransactions);
  } catch (error) {
    res.status(500).json({ error: 'Roznamcha load nahi ho saka.' });
  }
});

// 6. PARCHI DELETE — ✅ Admin only
router.delete('/delete/:id', fetchUser, adminOnly, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) return res.status(404).json({ error: 'Parchi nahi mili' });

    if (transaction.partyId) {
      let party = await Party.findById(transaction.partyId);
      if (party) {
        if (transaction.transactionType === 'Adaigi') {
          party.currentBalance += (transaction.netAmount || 0); 
        } else {
          party.currentBalance -= (transaction.netAmount || 0); 
        }
        await party.save();
      }
    }

    await Transaction.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Parchi Delete aur Khata Reverse ho gaya!' });

  } catch (error) {
    res.status(500).json({ error: 'Delete failed.' });
  }
});

// 7. PAKKA KHATA — ✅ Munshi bhi dekh sakta hai
router.get('/party/:name', fetchUser, async (req, res) => {
  try {
    const party = await Party.findOne({ 
      name: { $regex: new RegExp('^' + req.params.name + '$', 'i') } 
    });
    if (!party) {
      return res.status(404).json({ error: 'Is naam ki koi party nahi mili!' });
    }
    res.status(200).json(party);
  } catch (error) {
    res.status(500).json({ error: 'Khata load nahi ho saka.' });
  }
});

// 8. SAARI PARTIES KI LIST — ✅ Munshi bhi dekh sakta hai
router.get('/parties/all', fetchUser, async (req, res) => {
  try {
    const parties = await Party.find()
      .select('name partyType currentBalance createdAt')
      .sort({ name: 1 });
    res.status(200).json(parties);
  } catch (error) {
    res.status(500).json({ error: 'Parties load nahi ho sakin.' });
  }
});

// 9. PASSWORD CHANGE — ✅ Admin only
router.post('/update-password', fetchUser, adminOnly, async (req, res) => {
  try {
    const { role, newPassword } = req.body;
    const user = await User.findOne({ role });
    if (!user) return res.status(404).json({ error: 'User nahi mila.' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({ message: 'Password kamyabi se badal gaya!' });
  } catch (error) {
    res.status(500).json({ error: 'Password update nahi ho saka.' });
  }
});

module.exports = router;