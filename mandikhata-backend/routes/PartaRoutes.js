const express = require('express');
const router = express.Router();
const PartaBill = require('../models/PartaBill');
const Party = require('../models/Party');
const Transaction = require('../models/Transaction');
const fetchUser = require('../middleware/fetchUser');
const adminOnly = require('../middleware/adminOnly');

// =========================================
// Route 1: Naya Parta Bill Banana
// =========================================
router.post('/add', fetchUser, async (req, res) => {
  try {
    const {
      customerName, khataCategory, items,
      commPercent, commAmount, mazdooriAmount,
      marketFeeAmount, adaigiAmount, details
    } = req.body;

    // Validation
    if (!customerName) return res.status(400).json({ error: 'Customer ka naam zaroori hai!' });
    if (!items || items.length === 0) return res.status(400).json({ error: 'Kam az kam ek fasal zaroori hai!' });

    // Gross Amount calculate karo (sab items ka total)
    const grossAmount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const totalDeductions = (Number(commAmount) || 0) + (Number(mazdooriAmount) || 0) + 
                           (Number(marketFeeAmount) || 0) + (Number(adaigiAmount) || 0);
    const netAmount = grossAmount - totalDeductions;

    // Party dhoondo ya banao
    let party = await Party.findOne({ name: customerName });
    if (!party) {
      party = new Party({ 
        name: customerName, 
        partyType: khataCategory || 'Kisan', 
        currentBalance: 0 
      });
    }

    // Balance update karo
    party.currentBalance += netAmount;
    party.balanceType = party.currentBalance >= 0 ? 'Jama' : 'Naam';
    await party.save();

    // Sequential Parta Number
    const lastBill = await PartaBill.findOne().sort({ _id: -1 });
    let nextNumber = 1001;
    if (lastBill && lastBill.partaNo) {
      const parts = lastBill.partaNo.split('-');
      if (parts.length === 2 && !isNaN(parseInt(parts[1]))) {
        nextNumber = parseInt(parts[1]) + 1;
      }
    }
    const finalPartaNo = 'PRT-' + nextNumber;

    // Parta Bill save karo
    const newBill = new PartaBill({
      partaNo: finalPartaNo,
      customerName,
      khataCategory: khataCategory || 'Kisan',
      partyId: party._id,
      items,
      grossAmount,
      commPercent: Number(commPercent) || 0,
      commAmount: Number(commAmount) || 0,
      mazdooriAmount: Number(mazdooriAmount) || 0,
      marketFeeAmount: Number(marketFeeAmount) || 0,
      adaigiAmount: Number(adaigiAmount) || 0,
      totalDeductions,
      netAmount,
      details: details || ''
    });
    await newBill.save();

    // Transaction (Ledger) mein entry dalo
    const newTransaction = new Transaction({
      voucherNo: finalPartaNo,
      date: Date.now(),
      transactionType: 'Parta Bill',
      khataCategory: khataCategory || 'Kisan',
      partyId: party._id,
      partyName: customerName,
      debit: 0,
      credit: netAmount,
      details: `Parta Bill: ${finalPartaNo} — Items: ${items.length}`
    });
    await newTransaction.save();

    res.status(201).json({ 
      message: 'Parta Bill kamyabi se ban gaya!', 
      data: newBill 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Parta Bill save nahi ho saka.' });
  }
});

// =========================================
// Route 2: Saare Parta Bills dekhna
// =========================================
router.get('/all', fetchUser, async (req, res) => {
  try {
    const { from, to, customerName } = req.query;
    let filter = {};

    if (from && to) {
      filter.createdAt = {
        $gte: new Date(from),
        $lte: new Date(new Date(to).setHours(23, 59, 59, 999))
      };
    }

    if (customerName) {
      filter.customerName = { $regex: new RegExp(customerName, 'i') };
    }

    const bills = await PartaBill.find(filter).sort({ createdAt: -1 });
    res.status(200).json(bills);
  } catch (error) {
    res.status(500).json({ error: 'Bills load nahi ho sake.' });
  }
});

// =========================================
// Route 3: Single Parta Bill dekhna
// =========================================
router.get('/:id', fetchUser, async (req, res) => {
  try {
    const bill = await PartaBill.findById(req.params.id);
    if (!bill) return res.status(404).json({ error: 'Bill nahi mila!' });
    res.status(200).json(bill);
  } catch (error) {
    res.status(500).json({ error: 'Bill load nahi ho saka.' });
  }
});

// =========================================
// Route 4: Parta Bill Delete (Admin only)
// =========================================
router.delete('/delete/:id', fetchUser, adminOnly, async (req, res) => {
  try {
    const bill = await PartaBill.findById(req.params.id);
    if (!bill) return res.status(404).json({ error: 'Bill nahi mila!' });

    // Party balance reverse karo
    const party = await Party.findById(bill.partyId);
    if (party) {
      party.currentBalance -= bill.netAmount;
      party.balanceType = party.currentBalance >= 0 ? 'Jama' : 'Naam';
      await party.save();
    }

    // Transaction delete karo
    await Transaction.findOneAndDelete({ voucherNo: bill.partaNo });

    // Bill delete karo
    await PartaBill.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: 'Parta Bill delete ho gaya aur balance reverse!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Delete failed.' });
  }
});

module.exports = router;