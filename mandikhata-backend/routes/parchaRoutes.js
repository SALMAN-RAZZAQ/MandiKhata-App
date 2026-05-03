const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction'); 
const Party = require('../models/Party');
const KhataGroup = require('../models/KhataGroup'); 
const User = require('../models/User');

// 1. ADD KHATA
router.post('/khatagroup/add', async (req, res) => {
  try {
    const { name } = req.body;
    const newGroup = new KhataGroup({ name });
    await newGroup.save();
    res.status(201).json({ message: 'Naya Khata Section ban gaya!', data: newGroup });
  } catch (error) {
    res.status(500).json({ error: 'Yeh section shayad pehle se mojood hai.' });
  }
});

// 2. GET ALL KHATA
router.get('/khatagroup/all', async (req, res) => {
  try {
    const groups = await KhataGroup.find();
    res.status(200).json(groups);
  } catch (error) {
    res.status(500).json({ error: 'Groups load nahi ho sake.' });
  }
});

// 3. DELETE KHATA (Database Se Khata Mitane Ka Route)
router.delete('/khatagroup/delete/:id', async (req, res) => {
  try {
    await KhataGroup.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Khata Delete Ho Gaya!' });
  } catch (error) {
    res.status(500).json({ error: 'Delete failed.' });
  }
});

// 4. PARCHI SAVE KARNE KA ROUTE
router.post('/add', async (req, res) => {
  try {
    const { transactionType, farmerName, cropType, weight, rate, totalAmount, khataCategory } = req.body;

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

    const receiptNo = Math.floor(1000 + Math.random() * 9000).toString();

    const newTransaction = new Transaction({
      receiptNo: receiptNo,
      transactionType: transactionType,
      khataCategory: khataCategory, 
      partyId: party._id, 
      partyName: party.name,
      cropType: cropType || 'N/A',
      weight: Number(weight) || 0,
      rate: Number(rate) || 0,
      grossAmount: (Number(weight) || 0) * Number(rate || 0),
      netAmount: Number(totalAmount) || 0
    });

    await newTransaction.save(); 
    res.status(201).json({ message: 'Parchi Save Ho Gayi!', data: newTransaction });
    
  } catch (error) {
    res.status(500).json({ error: 'System parchi save nahi kar saka.' });
  }
});

// 5. ROZNAMCHA ALL
router.get('/all', async (req, res) => {
  try {
    const allTransactions = await Transaction.find().sort({ date: -1 });
    res.status(200).json(allTransactions);
  } catch (error) {
    res.status(500).json({ error: 'Roznamcha load nahi ho saka.' });
  }
});

// 6. SMART DELETE PARCHI (Balance Reverse ke sath)
router.delete('/delete/:id', async (req, res) => {
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

// 7. LOGIN ROUTE
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });
    if (user) {
      res.status(200).json({ role: user.role, username: user.username });
    } else {
      res.status(401).json({ error: 'Ghalat Username ya Password!' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 8. PASSWORD CHANGE ROUTE
router.post('/update-password', async (req, res) => {
  try {
    const { role, newPassword } = req.body;
    await User.findOneAndUpdate({ role }, { password: newPassword });
    res.status(200).json({ message: 'Password kamyabi se badal gaya!' });
  } catch (error) {
    res.status(500).json({ error: 'Password update nahi ho saka.' });
  }
});

// 9. SETUP USERS
router.get('/setup-users', async (req, res) => {
  try {
    await User.deleteMany({}); 
    await User.create([
      { username: 'seth', password: 'seth786', role: 'Admin' },
      { username: 'munshi', password: 'munshi123', role: 'Munshi' }
    ]);
    res.send("Admin aur Munshi ke accounts MongoDB mein ban gaye hain!");
  } catch (e) { res.send("Error"); }
});

module.exports = router;