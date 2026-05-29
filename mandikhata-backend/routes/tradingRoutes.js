const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const TradingBill = require('../models/TradingBill');
const Transaction = require('../models/Transaction');
const Party = require('../models/Party');
const Inventory = require('../models/Inventory'); 
const fetchUser = require('../middleware/fetchUser');
const adminOnly = require('../middleware/adminOnly');

async function findOrCreateParty(partyName, partyType) {
    let party = await Party.findOne({ name: { $regex: new RegExp(`^\\s*${partyName}\\s*$`, 'i') } });
    if (!party) {
        const lastParty = await Party.findOne().sort({ khataIndex: -1 });
        const nextIndex = (lastParty && lastParty.khataIndex) ? lastParty.khataIndex + 1 : 1001;
        party = new Party({ khataIndex: nextIndex, name: partyName, partyType: partyType || 'General', currentBalance: 0, balanceType: 'Naam' });
        await party.save();
    }
    return party;
}

async function updatePartyBalance(partyId, debitAmount, creditAmount) {
    const party = await Party.findById(partyId);
    if (!party) return;
    let balance = party.currentBalance || 0;
    let type = party.balanceType || 'Naam';
    let signedBalance = type === 'Jama' ? balance : -balance;

    signedBalance += Number(creditAmount || 0);  
    signedBalance -= Number(debitAmount || 0); 

    if (signedBalance > 0) { party.currentBalance = signedBalance; party.balanceType = 'Jama'; } 
    else if (signedBalance < 0) { party.currentBalance = Math.abs(signedBalance); party.balanceType = 'Naam'; } 
    else { party.currentBalance = 0; party.balanceType = 'Naam'; }
    await party.save();
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

    return totalCostDeducted; 
}

router.get('/get-bill/:id', fetchUser, async (req, res) => {
    try {
        const bill = await TradingBill.findById(req.params.id);
        if (!bill) return res.status(404).json({ error: 'Bill nahi mila!' });
        res.status(200).json(bill);
    } catch (error) { res.status(500).json({ error: 'Bill load nahi ho saka.' }); }
});

router.post('/save-purchase', fetchUser, async (req, res) => {
    try {
        const billData = req.body;
        if (!billData.jins) throw new Error("Fasal (Jins) select karna zaroori hai!");

        const billId = billData.existingId ? new mongoose.Types.ObjectId(billData.existingId) : new mongoose.Types.ObjectId();
        const newBill = new TradingBill({ _id: billId, ...billData, billType: 'Purchase' });
        await newBill.save();
        
        const billDate = billData.date; 
        const vNo = `TRD-PUR-${billId.toString().slice(-5).toUpperCase()}`; 
        
        let totalPurchaseDamiNaam = 0; 
        let totalPurchaseDamiJama = 0; 

        for (let i = 0; i < billData.entries.length; i++) {
            const entry = billData.entries[i];
            const shopParty = await findOrCreateParty(entry.shopName, billData.shopCategory || 'Shop');
            await new Transaction({ voucherNo: `${vNo}-S${i+1}`, date: billDate, transactionType: 'Trading Purchase', khataCategory: billData.shopCategory || 'Shop', partyId: shopParty._id, partyName: shopParty.name, debit: 0, credit: Number(entry.rowTotal) || 0, details: `Trading Purchase - ${entry.weight}Kg` }).save();
            await updatePartyBalance(shopParty._id, 0, Number(entry.rowTotal) || 0);
            
            const pureStockValue = (Number(entry.weight) / 40) * Number(entry.rate);
            const diff = Number(entry.rowTotal) - pureStockValue;
            
            if (diff > 0) totalPurchaseDamiNaam += diff; 
            else if (diff < 0) totalPurchaseDamiJama += Math.abs(diff);

            await addStock(billData.jins, entry.weight, entry.rate, billDate, null);
        }

        if (totalPurchaseDamiNaam > 0) {
            const damiParty = await findOrCreateParty('Dami Khata', 'Income (Kamai)');
            await new Transaction({ voucherNo: vNo, date: billDate, transactionType: 'Purchase Advance Dami', khataCategory: 'Income (Kamai)', partyId: damiParty._id, partyName: damiParty.name, debit: totalPurchaseDamiNaam, credit: 0, details: `Purchase Dami (Di Gayi)` }).save();
            await updatePartyBalance(damiParty._id, totalPurchaseDamiNaam, 0);
        }
        
        if (totalPurchaseDamiJama > 0) {
            const damiParty = await findOrCreateParty('Dami Khata', 'Income (Kamai)');
            await new Transaction({ voucherNo: vNo, date: billDate, transactionType: 'Purchase Discount/Kauti', khataCategory: 'Income (Kamai)', partyId: damiParty._id, partyName: damiParty.name, debit: 0, credit: totalPurchaseDamiJama, details: `Purchase Kauti (Wusool/Income)` }).save();
            await updatePartyBalance(damiParty._id, 0, totalPurchaseDamiJama);
        }

        res.status(201).json({ success: true, message: 'Trading Purchase Bill Saved!' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/save-sale', fetchUser, async (req, res) => {
    try {
        const billData = req.body;
        if (!billData.clientName) throw new Error("Khareedar ka naam zaroori hai!");

        const billId = billData.existingId ? new mongoose.Types.ObjectId(billData.existingId) : new mongoose.Types.ObjectId();
        const newBill = new TradingBill({ _id: billId, ...billData, billType: 'Sale' });
        await newBill.save();
        
        const billDate = billData.date; 
        const vNo = `TRD-SAL-${billId.toString().slice(-5).toUpperCase()}`; 

        const clientParty = await findOrCreateParty(billData.clientName, billData.clientCategory || 'Kharidar');
        await new Transaction({ voucherNo: vNo, date: billDate, transactionType: 'Trading Sale', khataCategory: billData.clientCategory || 'Kharidar', partyId: clientParty._id, partyName: clientParty.name, debit: Number(billData.totals.finalNetCost) || 0, credit: 0, details: `Trading Sale - ${billData.jins}` }).save();
        await updatePartyBalance(clientParty._id, Number(billData.totals.finalNetCost) || 0, 0);

        // 🚀 FIXED: Robust calculation for Profit and Loss (Handling NaN/Null)
        const weightToDeduct = Number(billData.totals?.totalWeight) || 0;
        const cogs = await deductStock(billData.jins, weightToDeduct, null); 
        const saleCropValue = Number(billData.totals?.totalPurchaseCost) || 0; 
        const profit = Math.round(saleCropValue - cogs); // Math.round se point (decimal) ka masla theek hoga
        
        console.log(`Sale Gross: ${saleCropValue}, COGS: ${cogs}, Total Profit: ${profit}`); // Server par check karne ke liye

        // 🚀 DOUBLE ENTRY FOR PROFIT / LOSS
        if (profit > 0) {
            const profitParty = await findOrCreateParty('Trading Profit and Loss', 'Income (Kamai)');
            await new Transaction({ voucherNo: vNo, date: billDate, transactionType: 'Trading Profit', khataCategory: 'Income (Kamai)', partyId: profitParty._id, partyName: profitParty.name, debit: 0, credit: profit, details: `Trading Sale Profit` }).save();
            await updatePartyBalance(profitParty._id, 0, profit);
        } else if (profit < 0) {
            const lossAmount = Math.abs(profit);
            const lossParty = await findOrCreateParty('Trading Profit and Loss', 'Income (Kamai)');
            await new Transaction({ voucherNo: vNo, date: billDate, transactionType: 'Trading Loss', khataCategory: 'Income (Kamai)', partyId: lossParty._id, partyName: lossParty.name, debit: lossAmount, credit: 0, details: `Trading Sale Loss` }).save();
            await updatePartyBalance(lossParty._id, lossAmount, 0);
        }

        if (Number(billData.totals.totalLabour) > 0) {
            const labourParty = await findOrCreateParty('Palledar Khata', 'Staff/Labour(لیبر)');
            await new Transaction({ voucherNo: vNo, date: billDate, transactionType: 'Trading Expense', khataCategory: 'Staff/Labour(لیبر)', partyId: labourParty._id, partyName: labourParty.name, debit: 0, credit: Number(billData.totals.totalLabour), details: `Trading Mazdoori` }).save();
            await updatePartyBalance(labourParty._id, 0, Number(billData.totals.totalLabour));
        }
        if (Number(billData.totals.totalMarketFee) > 0) {
            const feeParty = await findOrCreateParty('Market Committee Khata', 'Expense');
            await new Transaction({ voucherNo: vNo, date: billDate, transactionType: 'Trading Expense', khataCategory: 'Expense', partyId: feeParty._id, partyName: feeParty.name, debit: 0, credit: Number(billData.totals.totalMarketFee), details: `Trading Market Fee` }).save();
            await updatePartyBalance(feeParty._id, 0, Number(billData.totals.totalMarketFee));
        }
        if (Number(billData.totals.totalCommission) > 0) {
            const commParty = await findOrCreateParty('Commission Khata', 'Income (Kamai)');
            await new Transaction({ voucherNo: vNo, date: billDate, transactionType: 'Trading Income', khataCategory: 'Income (Kamai)', partyId: commParty._id, partyName: commParty.name, debit: 0, credit: Number(billData.totals.totalCommission), details: `Trading Commission` }).save();
            await updatePartyBalance(commParty._id, 0, Number(billData.totals.totalCommission));
        }
        if (Number(billData.totals.clientDamiAmount) > 0) {
            const damiParty = await findOrCreateParty('Dami Khata', 'Income (Kamai)');
            await new Transaction({ voucherNo: vNo, date: billDate, transactionType: 'Trading Income', khataCategory: 'Income (Kamai)', partyId: damiParty._id, partyName: damiParty.name, debit: 0, credit: Number(billData.totals.clientDamiAmount), details: `Trading Dami (Wusool)` }).save();
            await updatePartyBalance(damiParty._id, 0, Number(billData.totals.clientDamiAmount));
        }

        res.status(201).json({ success: true, message: 'Trading Sale Bill Saved!' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.get('/all', fetchUser, async (req, res) => {
    try {
        const { from, to, customerName } = req.query;
        let query = {};
        if (from && to) query.date = { $gte: new Date(from), $lte: new Date(to) };
        if (customerName) query.$or = [{ clientName: { $regex: customerName, $options: 'i' } }, { "entries.shopName": { $regex: customerName, $options: 'i' } }];
        const bills = await TradingBill.find(query).sort({ date: -1 });
        res.json(bills);
    } catch (error) { res.status(500).json({ message: "Error fetching" }); }
});

router.delete('/delete/:id', fetchUser, adminOnly, async (req, res) => {
    try {
        const bill = await TradingBill.findById(req.params.id);
        if (!bill) return res.status(404).json({ success: false, message: "Bill nahi mila!" });

        const finalNetCost = Number(bill.totals?.finalNetCost) || 0;
        const totalLabour = Number(bill.totals?.totalLabour) || 0;
        const totalMarketFee = Number(bill.totals?.totalMarketFee) || 0;
        const totalCommission = Number(bill.totals?.totalCommission) || 0;
        const clientDamiAmount = Number(bill.totals?.clientDamiAmount) || 0;

        let originalRateForReversal = 0; 

        if (bill.billType === 'Sale') {
            if (bill.clientName) { const clientParty = await Party.findOne({ name: bill.clientName }); if (clientParty) await updatePartyBalance(clientParty._id, 0, finalNetCost); }
            
            const vNoSuffix = bill._id.toString().slice(-5).toUpperCase();
            let profitAmt = 0;
            let lossAmt = 0;
            
            const profitTx = await Transaction.findOne({ voucherNo: { $regex: vNoSuffix }, transactionType: 'Trading Profit' });
            if (profitTx) {
                profitAmt = profitTx.credit;
                if (profitTx.partyId) await updatePartyBalance(profitTx.partyId, profitAmt, 0); 
            }
            
            const lossTx = await Transaction.findOne({ voucherNo: { $regex: vNoSuffix }, transactionType: 'Trading Loss' });
            if (lossTx) {
                lossAmt = lossTx.debit;
                if (lossTx.partyId) await updatePartyBalance(lossTx.partyId, 0, lossAmt);
            }

            const w = Number(bill.totals?.totalWeight) || 0;
            const soldValue = Number(bill.totals?.totalPurchaseCost) || 0;
            if (w > 0) {
                const originalCogs = soldValue - profitAmt + lossAmt;
                originalRateForReversal = originalCogs / (w / 40);
            }

        } else {
            let totalPurchaseDamiNaam = 0;
            let totalPurchaseDamiJama = 0;
            
            if (bill.entries && bill.entries.length > 0) {
                for (let entry of bill.entries) {
                    if (entry.shopName) { const shopParty = await Party.findOne({ name: entry.shopName }); if (shopParty) await updatePartyBalance(shopParty._id, Number(entry.rowTotal) || 0, 0); }
                    
                    const pureStockValue = (Number(entry.weight) / 40) * Number(entry.rate);
                    const diff = Number(entry.rowTotal) - pureStockValue;
                    if (diff > 0) totalPurchaseDamiNaam += diff;
                    else if (diff < 0) totalPurchaseDamiJama += Math.abs(diff);
                }
            }
            
            if (totalPurchaseDamiNaam > 0) {
                let damiParty = await Party.findOne({ name: 'Dami Khata' });
                if (damiParty) await updatePartyBalance(damiParty._id, 0, totalPurchaseDamiNaam);
            }
            if (totalPurchaseDamiJama > 0) {
                let damiParty = await Party.findOne({ name: 'Dami Khata' });
                if (damiParty) await updatePartyBalance(damiParty._id, totalPurchaseDamiJama, 0);
            }
        }

        if (totalLabour > 0) { let p = await Party.findOne({ name: 'Palledar Khata' }); if (p) await updatePartyBalance(p._id, totalLabour, 0); }
        if (totalMarketFee > 0) { let f = await Party.findOne({ name: 'Market Committee Khata' }); if (f) await updatePartyBalance(f._id, totalMarketFee, 0); }
        if (totalCommission > 0) { let c = await Party.findOne({ name: 'Commission Khata' }); if (c) await updatePartyBalance(c._id, totalCommission, 0); }
        if (clientDamiAmount > 0) { let d = await Party.findOne({ name: 'Dami Khata' }); if (d) await updatePartyBalance(d._id, clientDamiAmount, 0); }

        // 🚀 FIXED: Delete Stock Logic (100% Accurate per entry)
        if (bill.jins) {
            if (bill.billType === 'Sale') {
                const w = Number(bill.totals?.totalWeight) || 0;
                if (w > 0) await addStock(bill.jins, w, originalRateForReversal, new Date(), null);
            } else {
                // Khareedari delete hone par har entry ka wazan accurately minus hoga
                if (bill.entries && bill.entries.length > 0) {
                    for (let entry of bill.entries) {
                        const w = Number(entry.weight) || 0;
                        if (w > 0) await deductStock(bill.jins, w, null);
                    }
                }
            }
        }

        const vNoSuffix = bill._id.toString().slice(-5).toUpperCase();
        await Transaction.deleteMany({ voucherNo: { $regex: vNoSuffix } });

        await TradingBill.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "✅ Trading Bill successfully reversed!" });
    } catch (error) { res.status(500).json({ success: false, message: "Error deleting: " + error.message }); }
});

module.exports = router;