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
  const sequenceDocument = await Counter.findOneAndUpdate({ name: sequenceName }, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return sequenceDocument.seq;
};

const getNextKhataIndex = async (session = null) => {
  let query = Party.findOne().sort({ khataIndex: -1 });
  if (session) query = query.session(session); 
  const lastParty = await query;
  return (lastParty && lastParty.khataIndex) ? lastParty.khataIndex + 1 : 1001;
};

async function updatePartyBalance(partyId, debitAmount, creditAmount, session) {
    const party = await Party.findById(partyId).session(session);
    if (!party) return;
    let balance = party.currentBalance || 0;
    let type = party.balanceType || 'Naam';
    let signedBalance = type === 'Jama' ? balance : -balance;

    signedBalance += creditAmount; 
    signedBalance -= debitAmount;  

    if (signedBalance > 0) { party.currentBalance = signedBalance; party.balanceType = 'Jama'; } 
    else if (signedBalance < 0) { party.currentBalance = Math.abs(signedBalance); party.balanceType = 'Naam'; } 
    else { party.currentBalance = 0; party.balanceType = 'Naam'; }
    
    await party.save({ session });
}

// 📦 1. مال خریدنے پر انوینٹری میں لاٹ (Lot) کا اضافہ
async function addStock(cropName, weight, rate, date, session = null) {
    let query = Inventory.findOne({ cropName });
    if (session) query = query.session(session);
    let inv = await query;

    if (!inv) inv = new Inventory({ cropName, totalWeight: 0, lots: [] });
    if (!inv.lots) inv.lots = [];

    inv.lots.push({ date: new Date(date || Date.now()), weight: Number(weight) || 0, rate: Number(rate) || 0 });
    inv.totalWeight += Number(weight) || 0;
    
    inv.markModified('lots');
    
    if (session) await inv.save({ session });
    else await inv.save();
}

// 📦 2. مال بیچنے پر پرانے مال میں سے کٹوتی اور منافع نکالنا
async function deductStock(cropName, weightToDeduct, session = null) {
    let query = Inventory.findOne({ cropName });
    if (session) query = query.session(session);
    let inv = await query;

    if (!inv) return 0;
    if (!inv.lots) inv.lots = [];

    let remaining = Number(weightToDeduct) || 0;
    inv.lots.sort((a, b) => new Date(a.date) - new Date(b.date)); 

    let totalCostDeducted = 0; 

    for (let i = 0; i < inv.lots.length; i++) {
        if (remaining <= 0) break;
        let lotWeight = Number(inv.lots[i].weight) || 0;
        let lotRate = Number(inv.lots[i].rate) || 0;

        if (lotWeight > 0) {
            if (lotWeight >= remaining) {
                totalCostDeducted += (remaining / 40) * lotRate;
                inv.lots[i].weight = lotWeight - remaining;
                remaining = 0;
            } else {
                totalCostDeducted += (lotWeight / 40) * lotRate;
                remaining -= lotWeight;
                inv.lots[i].weight = 0;
            }
        }
    }
    
    inv.lots = inv.lots.filter(lot => Number(lot.weight) > 0);
    inv.totalWeight -= Number(weightToDeduct) || 0;
    
    inv.markModified('lots');
    
    if (session) await inv.save({ session });
    else await inv.save();

    return totalCostDeducted; // Asal Cost return karega profit calculation ke liye
}

router.post('/add', fetchUser, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { transactionType, customerName, khataCategory, items, commPercent, commAmount, mazdooriAmount, marketFeeAmount, damiPercent, damiAmount, details, existingPartaNo, existingDate } = req.body;

    if (!transactionType || !customerName || !items || items.length === 0) throw new Error('Zaroori maloomat missing hain!');

    const billDate = existingDate ? new Date(existingDate) : Date.now();
    let totalCogs = 0; // Cost of Goods Sold track karne ke liye

    for (let item of items) {
      if (Number(item.weight) < 0 || Number(item.rate) < 0 || Number(item.amount) < 0) throw new Error("Wazan, Rate ya Amount minus (-) mein nahi ho sakte!");
      
      if (transactionType === 'Khareed_Kisan') {
          await addStock(item.cropType, item.weight, item.rate, billDate, session);
      } else {
          // Sale ke waqt asal cost nikal kar jama kar lenge
          totalCogs += await deductStock(item.cropType, item.weight, session);
      }
    }

    const grossAmount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const totalExpenses = (Number(commAmount) || 0) + (Number(mazdooriAmount) || 0) + (Number(marketFeeAmount) || 0) + (Number(damiAmount) || 0);
    const netAmount = transactionType === 'Baich_Kharidar' ? grossAmount + totalExpenses : grossAmount - totalExpenses; 

    let party = await Party.findOne({ name: customerName }).session(session);
    if (!party) {
      const nextIndex = await getNextKhataIndex(session);
      party = new Party({ name: customerName, partyType: khataCategory || 'Kisan', khataIndex: nextIndex, currentBalance: 0, balanceType: 'Naam' });
      await party.save({ session });
    }

    const finalPartaNo = existingPartaNo || ('PRT-' + await getNextSequenceValue('parta'));

    const newBill = new PartaBill({
      partaNo: finalPartaNo, transactionType, customerName, khataCategory: khataCategory || 'Kisan',
      partyId: party._id, items, grossAmount, commPercent: Number(commPercent) || 0, commAmount: Number(commAmount) || 0,
      mazdooriAmount: Number(mazdooriAmount) || 0, marketFeeAmount: Number(marketFeeAmount) || 0,
      damiPercent: Number(damiPercent) || 0, damiAmount: Number(damiAmount) || 0,
      totalDeductions: totalExpenses, netAmount, details: details || ''
    });
    newBill.createdAt = billDate;
    await newBill.save({ session });

    const debitAmt = transactionType === 'Baich_Kharidar' ? netAmount : 0;
    const creditAmt = transactionType !== 'Baich_Kharidar' ? netAmount : 0;

    await new Transaction({ voucherNo: finalPartaNo, date: billDate, transactionType, khataCategory: khataCategory || 'Kisan', partyId: party._id, partyName: customerName, debit: debitAmt, credit: creditAmt, details: `Parta Bill: ${finalPartaNo}` }).save({ session });
    await updatePartyBalance(party._id, debitAmt, creditAmt, session);

    // 🚀 FIXED: Parta Bill mein bhi Profit/Loss theek se manage hoga (No Cash Shortage!)
    if (transactionType === 'Baich_Kharidar') {
        const profit = Math.round(grossAmount - totalCogs); 
        
        if (profit > 0) {
            let profitParty = await Party.findOne({ name: 'Trading Profit and Loss' }).session(session);
            if (!profitParty) { const pNextIndex = await getNextKhataIndex(session); profitParty = new Party({ name: 'Trading Profit and Loss', partyType: 'Income (Kamai)', khataIndex: pNextIndex, currentBalance: 0, balanceType: 'Jama' }); await profitParty.save({ session }); }
            await new Transaction({ voucherNo: finalPartaNo, date: billDate, transactionType: 'Trading Profit', khataCategory: 'Income (Kamai)', partyId: profitParty._id, partyName: profitParty.name, debit: 0, credit: profit, details: `Parta Sale Profit` }).save({ session });
            await updatePartyBalance(profitParty._id, 0, profit, session);
        } else if (profit < 0) {
            const lossAmount = Math.abs(profit);
            let lossParty = await Party.findOne({ name: 'Trading Profit and Loss' }).session(session);
            if (!lossParty) { const pNextIndex = await getNextKhataIndex(session); lossParty = new Party({ name: 'Trading Profit and Loss', partyType: 'Income (Kamai)', khataIndex: pNextIndex, currentBalance: 0, balanceType: 'Jama' }); await lossParty.save({ session }); }
            await new Transaction({ voucherNo: finalPartaNo, date: billDate, transactionType: 'Trading Loss', khataCategory: 'Income (Kamai)', partyId: lossParty._id, partyName: lossParty.name, debit: lossAmount, credit: 0, details: `Parta Sale Loss` }).save({ session });
            await updatePartyBalance(lossParty._id, lossAmount, 0, session);
        }
    }

    if (Number(mazdooriAmount) > 0) {
      let palledar = await Party.findOne({ name: 'Palledar Khata' }).session(session);
      if (!palledar) { const pNextIndex = await getNextKhataIndex(session); palledar = new Party({ name: 'Palledar Khata', partyType: 'Staff/Labour(لیبر)', khataIndex: pNextIndex, currentBalance: 0, balanceType: 'Jama' }); await palledar.save({ session }); }
      await new Transaction({ voucherNo: finalPartaNo, date: billDate, transactionType: 'Mazdoori', khataCategory: palledar.partyType, partyId: palledar._id, partyName: palledar.name, debit: 0, credit: Number(mazdooriAmount), details: `Mazdoori Parta Bill: ${finalPartaNo}` }).save({ session });
      await updatePartyBalance(palledar._id, 0, Number(mazdooriAmount), session);
    }
    if (Number(marketFeeAmount) > 0) {
      let feeParty = await Party.findOne({ name: 'Market Committee Khata' }).session(session);
      if (!feeParty) { const pNextIndex = await getNextKhataIndex(session); feeParty = new Party({ name: 'Market Committee Khata', partyType: 'Expense', khataIndex: pNextIndex, currentBalance: 0, balanceType: 'Jama' }); await feeParty.save({ session }); }
      await new Transaction({ voucherNo: finalPartaNo, date: billDate, transactionType: 'Expense', khataCategory: feeParty.partyType, partyId: feeParty._id, partyName: feeParty.name, debit: 0, credit: Number(marketFeeAmount), details: `Market Fee Parta Bill: ${finalPartaNo}` }).save({ session });
      await updatePartyBalance(feeParty._id, 0, Number(marketFeeAmount), session);
    }
    if (Number(commAmount) > 0) {
      let commParty = await Party.findOne({ name: 'Commission Khata' }).session(session);
      if (!commParty) { const pNextIndex = await getNextKhataIndex(session); commParty = new Party({ name: 'Commission Khata', partyType: 'Income (Kamai)', khataIndex: pNextIndex, currentBalance: 0, balanceType: 'Jama' }); await commParty.save({ session }); }
      await new Transaction({ voucherNo: finalPartaNo, date: billDate, transactionType: 'Income', khataCategory: commParty.partyType, partyId: commParty._id, partyName: commParty.name, debit: 0, credit: Number(commAmount), details: `Commission Parta Bill: ${finalPartaNo}` }).save({ session });
      await updatePartyBalance(commParty._id, 0, Number(commAmount), session);
    }
    if (Number(damiAmount) > 0) {
      let damiParty = await Party.findOne({ name: 'Dami Khata' }).session(session);
      if (!damiParty) { const pNextIndex = await getNextKhataIndex(session); damiParty = new Party({ name: 'Dami Khata', partyType: 'Income (Kamai)', khataIndex: pNextIndex, currentBalance: 0, balanceType: 'Jama' }); await damiParty.save({ session }); }
      await new Transaction({ voucherNo: finalPartaNo, date: billDate, transactionType: 'Income', khataCategory: damiParty.partyType, partyId: damiParty._id, partyName: damiParty.name, debit: 0, credit: Number(damiAmount), details: `Dami Parta Bill: ${finalPartaNo}` }).save({ session });
      await updatePartyBalance(damiParty._id, 0, Number(damiAmount), session);
    }

    await session.commitTransaction();
    session.endSession();
    res.status(201).json({ message: 'Bill aur Stock update ho gaye!', data: newBill });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: error.message || 'Bill save nahi ho saka.' });
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

router.delete('/delete/:id', fetchUser, adminOnly, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const bill = await PartaBill.findById(req.params.id).session(session);
    if (!bill) throw new Error('Bill nahi mila!');

    const debitAmt = bill.transactionType === 'Baich_Kharidar' ? bill.netAmount : 0;
    const creditAmt = bill.transactionType !== 'Baich_Kharidar' ? bill.netAmount : 0;
    await updatePartyBalance(bill.partyId, creditAmt, debitAmt, session);

    let profitAmt = 0;
    let lossAmt = 0;

    // 🚀 FIXED: Delete hone par Nafa/Nuqsan theek se reverse ho
    if (bill.transactionType === 'Baich_Kharidar') {
        const profitTx = await Transaction.findOne({ voucherNo: bill.partaNo, transactionType: 'Trading Profit' }).session(session);
        if (profitTx) { 
            profitAmt = profitTx.credit; 
            if (profitTx.partyId) await updatePartyBalance(profitTx.partyId, profitAmt, 0, session); 
        }

        const lossTx = await Transaction.findOne({ voucherNo: bill.partaNo, transactionType: 'Trading Loss' }).session(session);
        if (lossTx) { 
            lossAmt = lossTx.debit; 
            if (lossTx.partyId) await updatePartyBalance(lossTx.partyId, 0, lossAmt, session); 
        }
    }

    if (bill.mazdooriAmount > 0) { let p = await Party.findOne({ name: 'Palledar Khata' }).session(session); if (p) await updatePartyBalance(p._id, bill.mazdooriAmount, 0, session); }
    if (bill.marketFeeAmount > 0) { let f = await Party.findOne({ name: 'Market Committee Khata' }).session(session); if (f) await updatePartyBalance(f._id, bill.marketFeeAmount, 0, session); }
    if (bill.commAmount > 0) { let c = await Party.findOne({ name: 'Commission Khata' }).session(session); if (c) await updatePartyBalance(c._id, bill.commAmount, 0, session); }
    if (bill.damiAmount > 0) { let d = await Party.findOne({ name: 'Dami Khata' }).session(session); if (d) await updatePartyBalance(d._id, bill.damiAmount, 0, session); }

    // 🚀 FIXED: Delete par Stock aur Rate bilkul theek wapas jaye ga
    let originalCogs = bill.grossAmount - profitAmt + lossAmt; // Asal Godam ki khareed nikal li

    for (let item of bill.items) {
      if (bill.transactionType === 'Baich_Kharidar') {
          // Sale reverse: Godam mein maal asal (cost) rate par wapas dalna hai
          let itemProportion = Number(item.amount) / bill.grossAmount;
          let itemOriginalCogs = originalCogs * itemProportion;
          let originalRate = itemOriginalCogs / (Number(item.weight) / 40);
          
          await addStock(item.cropType, item.weight, originalRate || 0, new Date(), session);
      } else {
          // Purchase reverse: Godam se maal nikalna hai
          await deductStock(item.cropType, item.weight, session);
      }
    }

    await Transaction.deleteMany({ voucherNo: bill.partaNo }, { session });
    await PartaBill.findByIdAndDelete(req.params.id, { session });
    await session.commitTransaction();
    session.endSession();
    res.status(200).json({ message: 'Parta Bill delete/reverse ho gaya!' });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;