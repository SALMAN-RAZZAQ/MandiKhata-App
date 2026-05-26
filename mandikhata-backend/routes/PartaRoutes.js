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

const getNextKhataIndex = async (session = null) => {
  let query = Party.findOne().sort({ khataIndex: -1 });
  if (session) {
    query = query.session(session); 
  }
  const lastParty = await query;
  return (lastParty && lastParty.khataIndex) ? lastParty.khataIndex + 1 : 1001;
};

// 🔥 100% Accurate Balance Calculator
async function updatePartyBalance(partyId, debitAmount, creditAmount, session) {
    const party = await Party.findById(partyId).session(session);
    if (!party) return;
    
    let balance = party.currentBalance || 0;
    let type = party.balanceType || 'Naam';

    let signedBalance = type === 'Jama' ? balance : -balance;

    signedBalance += creditAmount; 
    signedBalance -= debitAmount;  

    if (signedBalance > 0) {
        party.currentBalance = signedBalance;
        party.balanceType = 'Jama';
    } else if (signedBalance < 0) {
        party.currentBalance = Math.abs(signedBalance);
        party.balanceType = 'Naam';
    } else {
        party.currentBalance = 0;
        party.balanceType = 'Naam';
    }
    await party.save({ session });
}

// =========================================
// Route 1: Naya Parta Bill (Khareed & Baich)
// =========================================
router.post('/add', fetchUser, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      transactionType, customerName, khataCategory, items,
      commPercent, commAmount, mazdooriAmount,
      marketFeeAmount, damiPercent, damiAmount, details
    } = req.body;

    if (!transactionType) throw new Error('❌ Transaction Type select karna zaroori hai!');
    if (!customerName) throw new Error('❌ Customer ka naam zaroori hai!');
    if (!items || items.length === 0) throw new Error('❌ Kam az kam ek fasal zaroori hai!');

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
      const nextIndex = await getNextKhataIndex(session);
      party = new Party({ name: customerName, partyType: khataCategory || 'Kisan', khataIndex: nextIndex, currentBalance: 0, balanceType: 'Naam' });
      await party.save({ session });
    }

    const nextSeq = await getNextSequenceValue('parta');
    const finalPartaNo = 'PRT-' + nextSeq;

    const newBill = new PartaBill({
      partaNo: finalPartaNo, transactionType, customerName, khataCategory: khataCategory || 'Kisan',
      partyId: party._id, items, grossAmount, 
      commPercent: Number(commPercent) || 0, commAmount: Number(commAmount) || 0,
      mazdooriAmount: Number(mazdooriAmount) || 0, marketFeeAmount: Number(marketFeeAmount) || 0,
      damiPercent: Number(damiPercent) || 0, damiAmount: Number(damiAmount) || 0,
      totalDeductions: totalExpenses, netAmount, details: details || ''
    });
    await newBill.save({ session });

    const debitAmt = transactionType === 'Baich_Kharidar' ? netAmount : 0;
    const creditAmt = transactionType !== 'Baich_Kharidar' ? netAmount : 0;

    await new Transaction({
      voucherNo: finalPartaNo, date: Date.now(), transactionType,
      khataCategory: khataCategory || 'Kisan', partyId: party._id, partyName: customerName,
      debit: debitAmt, credit: creditAmt,
      details: `Parta Bill: ${finalPartaNo} — Items: ${items.length}`
    }).save({ session });

    await updatePartyBalance(party._id, debitAmt, creditAmt, session);

    // 🚀 EXPENSES & INCOME AUTO-TRANSFER LOGIC
    // 1. Mazdoori
    if (Number(mazdooriAmount) > 0) {
      let palledar = await Party.findOne({ name: 'Palledar Khata' }).session(session);
      if (!palledar) {
        const pNextIndex = await getNextKhataIndex(session);
        palledar = new Party({ name: 'Palledar Khata', partyType: 'Staff/Labour(لیبر)', khataIndex: pNextIndex, currentBalance: 0, balanceType: 'Jama' });
        await palledar.save({ session });
      }
      await new Transaction({
          voucherNo: finalPartaNo, date: Date.now(), transactionType: 'Mazdoori',
          khataCategory: palledar.partyType, partyId: palledar._id, partyName: palledar.name,
          debit: 0, credit: Number(mazdooriAmount), details: `Mazdoori Parta Bill: ${finalPartaNo}`
      }).save({ session });
      await updatePartyBalance(palledar._id, 0, Number(mazdooriAmount), session);
    }

    // 2. Market Fee
    if (Number(marketFeeAmount) > 0) {
      let feeParty = await Party.findOne({ name: 'Market Committee Khata' }).session(session);
      if (!feeParty) {
        const pNextIndex = await getNextKhataIndex(session);
        feeParty = new Party({ name: 'Market Committee Khata', partyType: 'Expense', khataIndex: pNextIndex, currentBalance: 0, balanceType: 'Jama' });
        await feeParty.save({ session });
      }
      await new Transaction({
          voucherNo: finalPartaNo, date: Date.now(), transactionType: 'Expense',
          khataCategory: feeParty.partyType, partyId: feeParty._id, partyName: feeParty.name,
          debit: 0, credit: Number(marketFeeAmount), details: `Market Fee Parta Bill: ${finalPartaNo}`
      }).save({ session });
      await updatePartyBalance(feeParty._id, 0, Number(marketFeeAmount), session);
    }

    // 3. Commission (Income)
    if (Number(commAmount) > 0) {
      let commParty = await Party.findOne({ name: 'Commission Khata' }).session(session);
      if (!commParty) {
        const pNextIndex = await getNextKhataIndex(session);
        commParty = new Party({ name: 'Commission Khata', partyType: 'Income (Kamai)', khataIndex: pNextIndex, currentBalance: 0, balanceType: 'Jama' });
        await commParty.save({ session });
      }
      await new Transaction({
          voucherNo: finalPartaNo, date: Date.now(), transactionType: 'Income',
          khataCategory: commParty.partyType, partyId: commParty._id, partyName: commParty.name,
          debit: 0, credit: Number(commAmount), details: `Commission Parta Bill: ${finalPartaNo}`
      }).save({ session });
      await updatePartyBalance(commParty._id, 0, Number(commAmount), session);
    }

    // 4. Dami (Income)
    if (Number(damiAmount) > 0) {
      let damiParty = await Party.findOne({ name: 'Dami Khata' }).session(session);
      if (!damiParty) {
        const pNextIndex = await getNextKhataIndex(session);
        damiParty = new Party({ name: 'Dami Khata', partyType: 'Income (Kamai)', khataIndex: pNextIndex, currentBalance: 0, balanceType: 'Jama' });
        await damiParty.save({ session });
      }
      await new Transaction({
          voucherNo: finalPartaNo, date: Date.now(), transactionType: 'Income',
          khataCategory: damiParty.partyType, partyId: damiParty._id, partyName: damiParty.name,
          debit: 0, credit: Number(damiAmount), details: `Dami Parta Bill: ${finalPartaNo}`
      }).save({ session });
      await updatePartyBalance(damiParty._id, 0, Number(damiAmount), session);
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

    const debitAmt = bill.transactionType === 'Baich_Kharidar' ? bill.netAmount : 0;
    const creditAmt = bill.transactionType !== 'Baich_Kharidar' ? bill.netAmount : 0;
    
    // Reverse Main Balance
    await updatePartyBalance(bill.partyId, creditAmt, debitAmt, session);

    // Reverse Expenses & Incomes
    if (bill.mazdooriAmount && bill.mazdooriAmount > 0) {
      let palledar = await Party.findOne({ name: 'Palledar Khata' }).session(session);
      if (palledar) await updatePartyBalance(palledar._id, bill.mazdooriAmount, 0, session);
    }
    if (bill.marketFeeAmount && bill.marketFeeAmount > 0) {
      let feeParty = await Party.findOne({ name: 'Market Committee Khata' }).session(session);
      if (feeParty) await updatePartyBalance(feeParty._id, bill.marketFeeAmount, 0, session);
    }
    if (bill.commAmount && bill.commAmount > 0) {
      let commParty = await Party.findOne({ name: 'Commission Khata' }).session(session);
      if (commParty) await updatePartyBalance(commParty._id, bill.commAmount, 0, session);
    }
    if (bill.damiAmount && bill.damiAmount > 0) {
      let damiParty = await Party.findOne({ name: 'Dami Khata' }).session(session);
      if (damiParty) await updatePartyBalance(damiParty._id, bill.damiAmount, 0, session);
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