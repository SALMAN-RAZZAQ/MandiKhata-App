const express = require('express');
const router = express.Router();
const Party = require('../models/Party');
const Transaction = require('../models/Transaction');
const fetchUser = require('../middleware/fetchUser');
const adminOnly = require('../middleware/adminOnly');

// 1. Outstanding Balances (Baqaya Jat)
router.get('/balances', fetchUser, adminOnly, async (req, res) => {
  try {
    const parties = await Party.find({ currentBalance: { $ne: 0 } }).sort({ currentBalance: -1 });
    res.json(parties);
  } catch (error) {
    res.status(500).json({ error: 'Balances load nahi ho sake.' });
  }
});

// 2. Monthly Summary (Aggregation)
router.get('/monthly', fetchUser, adminOnly, async (req, res) => {
  try {
    const summary = await Transaction.aggregate([
      {
        $group: {
          _id: {
            month: { $month: "$date" },
            year: { $year: "$date" },
            type: "$transactionType"
          },
          totalCredit: { $sum: "$credit" },
          totalDebit: { $sum: "$debit" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } }
    ]);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: 'Monthly summary load nahi ho saki.' });
  }
});

// ==========================================
// 3. NAYA: Trial Balance Checker (Debit = Credit)
// ==========================================
router.get('/trial-balance', fetchUser, adminOnly, async (req, res) => {
  try {
    // Database ke andar hi saari entries ka sum kar lo
    const totals = await Transaction.aggregate([
      {
        $group: {
          _id: null,
          totalDebit: { $sum: "$debit" },
          totalCredit: { $sum: "$credit" }
        }
      }
    ]);
    
    // Agar koi entry nahi hai toh 0,0 bhej do
    const result = totals.length > 0 ? totals[0] : { totalDebit: 0, totalCredit: 0 };
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Trial balance check nahi ho saka.' });
  }
});

module.exports = router;