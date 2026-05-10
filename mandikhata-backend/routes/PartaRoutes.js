const express = require('express');
const router = express.Router();
const mongoose = require('mongoose'); 
const PartaBill = require('../models/PartaBill');
const Party = require('../models/Party');
const Transaction = require('../models/Transaction');
const Inventory = require('../models/Inventory'); // ✅ NAYA: Inventory Model add kiya
const fetchUser = require('../middleware/fetchUser');
const adminOnly = require('../middleware/adminOnly');

const Counter = require('../models/Counter');

const getNextSequenceValue = async (sequenceName) => {
  const sequenceDocument = await Counter.findOneAndUpdate(
    { name: sequenceName },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return sequenceDocument.seq;
};

// =========================================
// Route 1: Naya Parta Bill Banana (✅ INVENTORY UPDATE)
// =========================================
router.post('/add', fetchUser, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      customerName, khataCategory, items,
      commPercent, commAmount, mazdooriAmount,
      marketFeeAmount, damiPercent, damiAmount, details
    } = req.body;

    if (!customerName) throw new Error('Customer ka naam zaroori hai!');
    if (!items || items.length === 0) throw new Error('Kam az kam ek fasal zaroori hai!');

    for (let item of items) {
      if (Number(item.weight) < 0 || Number(item.rate) < 0 || Number(item.amount) < 0) {
         throw new Error("❌ Wazan, Rate ya Amount minus (-) mein nahi ho sakte!");
      }
      
      // ✅ NAYA: Har fasal par Inventory mein se maal Minus (-) karein
      let inventory = await Inventory.findOne({ cropName: item.cropType }).session(session);
      if (!inventory) {
        inventory = new Inventory({ cropName: item.cropType, totalWeight: 0 }); 
      }
      inventory.totalWeight -= Number(item.weight); // Stock minus ho raha hai
      await inventory.save({ session });
    }

    const grossAmount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const totalDeductions = (Number(commAmount) || 0) + (Number(mazdooriAmount) || 0) + 
                           (Number(marketFeeAmount) || 0) + (Number(damiAmount) || 0);
    const netAmount = grossAmount - totalDeductions;

    let party = await Party.findOne({ name: customerName }).session(session);
    if (!party) {
      party = new Party({ name: customerName, partyType: khataCategory || 'Kisan', currentBalance: 0 });
    }

    party.currentBalance += netAmount;
    party.balanceType = party.currentBalance >= 0 ? 'Jama' : 'Naam';
    await party.save({ session });

    const nextSeq = await getNextSequenceValue('parta');
    const finalPartaNo = 'PRT-' + nextSeq;

    const newBill = new PartaBill({
      partaNo: finalPartaNo, customerName, khataCategory: khataCategory || 'Kisan',
      partyId: party._id, items, grossAmount,
      commPercent: Number(commPercent) || 0, commAmount: Number(commAmount) || 0,
      mazdooriAmount: Number(mazdooriAmount) || 0, marketFeeAmount: Number(marketFeeAmount) || 0,
      damiPercent: Number(damiPercent) || 0, damiAmount: Number(damiAmount) || 0,
      totalDeductions, netAmount, details: details || ''
    });
    await newBill.save({ session });

    await new Transaction({
      voucherNo: finalPartaNo, date: Date.now(),
      transactionType: 'Parta Bill', khataCategory: khataCategory || 'Kisan',
      partyId: party._id, partyName: customerName,
      debit: 0, credit: netAmount,
      details: `Parta Bill: ${finalPartaNo} — Items: ${items.length}`
    }).save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ message: 'Parta Bill aur Stock kamyabi se update ho gaye!', data: newBill });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error(error);
    res.status(500).json({ error: error.message || 'Parta Bill save nahi ho saka.' });
  }
});

// =========================================
// Route 2: Saare Parta Bills dekhna
// =========================================
router.get('/all', fetchUser, async (req, res) => {
  try {
    const { from, to, customerName } = req.query;
    let filter = {};
    if (from && to) filter.createdAt = { $gte: new Date(from), $lte: new Date(new Date(to).setHours(23, 59, 59, 999)) };
    if (customerName) filter.customerName = { $regex: new RegExp(customerName, 'i') };

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
// Route 4: Parta Bill Delete (✅ INVENTORY REVERSE)
// =========================================
router.delete('/delete/:id', fetchUser, adminOnly, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const bill = await PartaBill.findById(req.params.id).session(session);
    if (!bill) throw new Error('Bill nahi mila!');

    const party = await Party.findById(bill.partyId).session(session);
    if (party) {
      party.currentBalance -= bill.netAmount;
      party.balanceType = party.currentBalance >= 0 ? 'Jama' : 'Naam';
      await party.save({ session });
    }

    // ✅ NAYA: Bill delete hua, toh Stock wapis aayega (Plus)
    for (let item of bill.items) {
      let inventory = await Inventory.findOne({ cropName: item.cropType }).session(session);
      if (inventory) {
        inventory.totalWeight += Number(item.weight); // Stock wapis godown mein aa gaya
        await inventory.save({ session });
      }
    }

    await Transaction.findOneAndDelete({ voucherNo: bill.partaNo }, { session });
    await PartaBill.findByIdAndDelete(req.params.id, { session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: 'Parta Bill delete ho gaya aur Stock wapis aa gaya!' });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error(error);
    res.status(500).json({ error: error.message || 'Delete failed.' });
  }
});

module.exports = router;