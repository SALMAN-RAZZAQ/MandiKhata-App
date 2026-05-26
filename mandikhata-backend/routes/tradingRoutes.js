const express = require('express');
const router = express.Router();

const TradingBill = require('../models/TradingBill');
const Transaction = require('../models/Transaction');
const Party = require('../models/Party');
const Inventory = require('../models/Inventory'); 
const fetchUser = require('../middleware/fetchUser');
const adminOnly = require('../middleware/adminOnly');

// Helper: Party dhoondhne ya nayi banane ke liye
async function findOrCreateParty(partyName, partyType) {
    let party = await Party.findOne({ name: { $regex: new RegExp(`^\\s*${partyName}\\s*$`, 'i') } });
    if (!party) {
        const lastParty = await Party.findOne().sort({ khataIndex: -1 });
        const nextIndex = (lastParty && lastParty.khataIndex) ? lastParty.khataIndex + 1 : 1001;
        party = new Party({ 
            khataIndex: nextIndex, 
            name: partyName, 
            partyType: partyType || 'General', 
            currentBalance: 0, 
            balanceType: 'Naam' 
        });
        await party.save();
    }
    return party;
}

// Helper: 100% Accurate Balance Updater
async function updatePartyBalance(partyId, debitAmount, creditAmount) {
    const party = await Party.findById(partyId);
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
    await party.save();
}

// 🚀 1A. SAVE PURCHASE (دکانوں سے مال خریدنا)
router.post('/save-purchase', fetchUser, async (req, res) => {
    try {
        const billData = req.body;

        if (!billData.jins) throw new Error("Fasal (Jins) select karna zaroori hai!");
        for (let i = 0; i < billData.entries.length; i++) {
            if (!billData.entries[i].shopName) {
                throw new Error(`Entry No ${i+1} mein Dukan/Arhti ka naam select nahi kiya gaya!`);
            }
        }

        const newBill = new TradingBill({ ...billData, billType: 'Purchase' });
        await newBill.save();
        
        const billDate = billData.date;
        const vNo = `TRD-PUR-${Date.now().toString().slice(-6)}`; 

        let totalPurchasedWeight = 0;
        for (let i = 0; i < billData.entries.length; i++) {
            const entry = billData.entries[i];
            const shopParty = await findOrCreateParty(entry.shopName, billData.shopCategory || 'Shop');
            const shopTx = new Transaction({ voucherNo: `${vNo}-S${i+1}`, date: billDate, transactionType: 'Trading Purchase', khataCategory: billData.shopCategory || 'Shop', partyId: shopParty._id, partyName: shopParty.name, debit: 0, credit: entry.rowTotal, details: `Trading Purchase - ${entry.weight}Kg` });
            await shopTx.save();
            await updatePartyBalance(shopParty._id, 0, entry.rowTotal);
            totalPurchasedWeight += Number(entry.weight);
        }

        // Inventory (Stock) mein jama (+)
        let inventory = await Inventory.findOne({ cropName: billData.jins });
        if (!inventory) inventory = new Inventory({ cropName: billData.jins, totalWeight: 0 });
        inventory.totalWeight += totalPurchasedWeight;
        await inventory.save();

        res.status(201).json({ success: true, message: 'Trading Purchase Bill Saved!' });
    } catch (error) { 
        res.status(500).json({ success: false, message: error.message }); 
    }
});

// 🚀 1B. SAVE SALE (خریدار کو مال بیچنا)
router.post('/save-sale', fetchUser, async (req, res) => {
    try {
        const billData = req.body;

        if (!billData.clientName) throw new Error("Khareedar ka naam zaroori hai!");
        if (!billData.jins) throw new Error("Fasal (Jins) select karna zaroori hai!");

        const newBill = new TradingBill({ ...billData, billType: 'Sale' });
        await newBill.save();
        
        const billDate = billData.date;
        const vNo = `TRD-SAL-${Date.now().toString().slice(-6)}`; 

        // Client ko Debit (Naam) karna
        const clientParty = await findOrCreateParty(billData.clientName, billData.clientCategory || 'Kharidar');
        const clientTx = new Transaction({ voucherNo: vNo, date: billDate, transactionType: 'Trading Sale', khataCategory: billData.clientCategory || 'Kharidar', partyId: clientParty._id, partyName: clientParty.name, debit: billData.totals.finalNetCost, credit: 0, details: `Trading Sale - ${billData.jins}` });
        await clientTx.save();
        await updatePartyBalance(clientParty._id, billData.totals.finalNetCost, 0);

        // Expenses (Mazdoori aur Market Fee)
        if (billData.totals.totalLabour > 0) {
            const labourParty = await findOrCreateParty('Palledar Khata', 'Staff/Labour(لیبر)');
            await new Transaction({ voucherNo: vNo, date: billDate, transactionType: 'Trading Expense', khataCategory: 'Staff/Labour(لیبر)', partyId: labourParty._id, partyName: labourParty.name, debit: 0, credit: billData.totals.totalLabour, details: `Trading Mazdoori` }).save();
            await updatePartyBalance(labourParty._id, 0, billData.totals.totalLabour);
        }
        if (billData.totals.totalMarketFee > 0) {
            const feeParty = await findOrCreateParty('Market Committee Khata', 'Expense');
            await new Transaction({ voucherNo: vNo, date: billDate, transactionType: 'Trading Expense', khataCategory: 'Expense', partyId: feeParty._id, partyName: feeParty.name, debit: 0, credit: billData.totals.totalMarketFee, details: `Trading Market Fee` }).save();
            await updatePartyBalance(feeParty._id, 0, billData.totals.totalMarketFee);
        }

        // 🔥 NAYA FIX: Commission aur Dami ko bhi auto-khate mein bhejna
        if (billData.totals.totalCommission > 0) {
            const commParty = await findOrCreateParty('Commission Khata', 'Income (Kamai)');
            await new Transaction({ voucherNo: vNo, date: billDate, transactionType: 'Trading Income', khataCategory: 'Income (Kamai)', partyId: commParty._id, partyName: commParty.name, debit: 0, credit: billData.totals.totalCommission, details: `Trading Commission` }).save();
            await updatePartyBalance(commParty._id, 0, billData.totals.totalCommission);
        }
        if (billData.totals.clientDamiAmount > 0) {
            const damiParty = await findOrCreateParty('Dami Khata', 'Income (Kamai)');
            await new Transaction({ voucherNo: vNo, date: billDate, transactionType: 'Trading Income', khataCategory: 'Income (Kamai)', partyId: damiParty._id, partyName: damiParty.name, debit: 0, credit: billData.totals.clientDamiAmount, details: `Trading Dami (Wusool)` }).save();
            await updatePartyBalance(damiParty._id, 0, billData.totals.clientDamiAmount);
        }

        // Inventory (Stock) se minus (-)
        let inventory = await Inventory.findOne({ cropName: billData.jins });
        if (inventory) {
            inventory.totalWeight -= Number(billData.totals.totalWeight);
            await inventory.save();
        }

        res.status(201).json({ success: true, message: 'Trading Sale Bill Saved!' });
    } catch (error) { 
        res.status(500).json({ success: false, message: error.message }); 
    }
});

// 2. GET ALL BILLS
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

// 3. DELETE BILL
router.delete('/delete/:id', fetchUser, adminOnly, async (req, res) => {
    try {
        await TradingBill.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) { res.status(500).json({ message: "Error deleting" }); }
});

module.exports = router;