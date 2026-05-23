const express = require('express');
const router = express.Router();
const mongoose = require('mongoose'); 
const PartaBill = require('../models/PartaBill');
const Party = require('../models/Party');
const Transaction = require('../models/Transaction');
const Inventory = require('../models/Inventory'); 
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

// 🚀 ✅ NAYA HELPER: Session (Locker) support ke sath
const getNextKhataIndex = async (session = null) => {
  let query = Party.findOne().sort({ khataIndex: -1 });
  if (session) {
    query = query.session(session); // Transaction locker mein check karega
  }
  const lastParty = await query;
  return (lastParty && lastParty.khataIndex) ? lastParty.khataIndex + 1 : 1001;
};

// =========================================
// Route 1: Naya Parta Bill (Khareed & Baich Logic + Mazdoori Transfer)
// =========================================
router.post('/add', fetchUser, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      transactionType, 
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

      let inventory = await Inventory.findOne({ cropName: item.cropType }).session(session);
      if (!inventory) inventory = new Inventory({ cropName: item.cropType, totalWeight: 0 }); 
      
      if (transactionType === 'Khareed_Kisan') inventory.totalWeight += Number(item.weight); 
      else inventory.totalWeight -= Number(item.weight); 
      
      await inventory.save({ session });
    }

    const grossAmount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const totalExpenses = (Number(commAmount) || 0) + (Number(mazdooriAmount) || 0) + 
                           (Number(marketFeeAmount) || 0) + (Number(damiAmount) || 0);
    
    let netAmount = 0;
    if (transactionType === 'Baich_Kharidar') netAmount = grossAmount + totalExpenses; 
    else netAmount = grossAmount - totalExpenses; 

    let party = await Party.findOne({ name: customerName }).session(session);
    if (!party) {
      // ✅ FIX: brackets mein 'session' likha gaya hai
      const nextIndex = await getNextKhataIndex(session);
      party = new Party({ name: customerName, partyType: khataCategory || 'Kisan', khataIndex: nextIndex, currentBalance: 0 });
    }

    if (transactionType === 'Baich_Kharidar') party.currentBalance -= netAmount; 
    else party.currentBalance += netAmount; 
    
    party.balanceType = party.currentBalance >= 0 ? 'Jama' : 'Naam';
    await party.save({ session });

    const nextSeq = await getNextSequenceValue('parta');
    const finalPartaNo = 'PRT-' + nextSeq;

    const newBill = new PartaBill({
      partaNo: finalPartaNo, transactionType, customerName, khataCategory: khataCategory || 'Kisan',
      partyId: party._id, items, grossAmount, commPercent: Number(commPercent) || 0, commAmount: Number(commAmount) || 0,
      mazdooriAmount: Number(mazdooriAmount) || 0, marketFeeAmount: Number(marketFeeAmount) || 0,
      damiPercent: Number(damiPercent) || 0, damiAmount: Number(damiAmount) || 0,
      totalDeductions: totalExpenses, netAmount, details: details || ''
    });
    await newBill.save({ session });

    await new Transaction({
      voucherNo: finalPartaNo, date: Date.now(), transactionType: transactionType || 'Parta Bill',
      khataCategory: khataCategory || 'Kisan', partyId: party._id, partyName: customerName,
      debit: transactionType === 'Baich_Kharidar' ? netAmount : 0,
      credit: transactionType !== 'Baich_Kharidar' ? netAmount : 0,
      details: `Parta Bill: ${finalPartaNo} — Items: ${items.length}`
    }).save({ session });

    // 🚀 ✅ MAZDOORI AUTO-TRANSFER LOGIC (Fixed Category Name)
    if (Number(mazdooriAmount) > 0) {
      let palledar = await Party.findOne({ name: 'Palledar Khata' }).session(session);
      if (!palledar) {
        // ✅ FIX: brackets mein 'session' likha gaya hai
        const pNextIndex = await getNextKhataIndex(session);
        palledar = new Party({ name: 'Palledar Khata', partyType: 'Staff/Labour(لیبر)', khataIndex: pNextIndex, currentBalance: 0 });
      }
      palledar.currentBalance += Number(mazdooriAmount); 
      palledar.balanceType = palledar.currentBalance >= 0 ? 'Jama' : 'Naam';
      await palledar.save({ session });

      await new Transaction({
          voucherNo: finalPartaNo, date: Date.now(), transactionType: 'Mazdoori',
          khataCategory: palledar.partyType, partyId: palledar._id, partyName: palledar.name,
          debit: 0, credit: Number(mazdooriAmount), 
          details: `Mazdoori Parta Bill: ${finalPartaNo}`
      }).save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ message: 'Parta Bill aur Stock kamyabi se update ho gaye!', data: newBill });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: error.message || 'Parta Bill save nahi ho saka.' });
  }
});

router.get('/all', fetchUser, async (req, res) => {
  try {
    const { from, to, customerName } = req.query;
    let filter = {};
    if (from && to) filter.createdAt = { $gte: new Date(from), $lte: new Date(new Date(to).setHours(23, 59, 59, 999)) };
    if (customerName) filter.customerName = { $regex: new RegExp(customerName, 'i') };
    const bills = await PartaBill.find(filter).sort({ createdAt: -1 });
    res.status(200).json(bills);
  } catch (error) { res.status(500).json({ error: 'Bills load nahi ho sake.' }); }
});

router.get('/:id', fetchUser, async (req, res) => {
  try {
    const bill = await PartaBill.findById(req.params.id);
    if (!bill) return res.status(404).json({ error: 'Bill nahi mila!' });
    res.status(200).json(bill);
  } catch (error) { res.status(500).json({ error: 'Bill load nahi ho saka.' }); }
});

// =========================================
// Route 4: Parta Bill Delete (Reverse Logic)
// =========================================
router.delete('/delete/:id', fetchUser, adminOnly, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const bill = await PartaBill.findById(req.params.id).session(session);
    if (!bill) throw new Error('Bill nahi mila!');

    const party = await Party.findById(bill.partyId).session(session);
    if (party) {
      if (bill.transactionType === 'Baich_Kharidar') party.currentBalance += bill.netAmount; 
      else party.currentBalance -= bill.netAmount; 
      party.balanceType = party.currentBalance >= 0 ? 'Jama' : 'Naam';
      await party.save({ session });
    }

    if (bill.mazdooriAmount && bill.mazdooriAmount > 0) {
      let palledar = await Party.findOne({ name: 'Palledar Khata' }).session(session);
      if (palledar) {
        palledar.currentBalance -= bill.mazdooriAmount; 
        palledar.balanceType = palledar.currentBalance >= 0 ? 'Jama' : 'Naam';
        await palledar.save({ session });
      }
    }

    for (let item of bill.items) {
      let inventory = await Inventory.findOne({ cropName: item.cropType }).session(session);
      if (inventory) {
        if (bill.transactionType === 'Baich_Kharidar') inventory.totalWeight += Number(item.weight); 
        else inventory.totalWeight -= Number(item.weight); 
        await inventory.save({ session });
      }
    }

    await Transaction.deleteMany({ voucherNo: bill.partaNo }, { session });
    await PartaBill.findByIdAndDelete(req.params.id, { session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: 'Parta Bill delete ho gaya aur hisaab theek ho gaya!' });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: error.message || 'Delete failed.' });
  }
});

module.exports = router;