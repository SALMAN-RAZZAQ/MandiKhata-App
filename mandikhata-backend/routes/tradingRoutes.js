const express = require('express');
const router = express.Router();

const TradingBill = require('../models/TradingBill');
const Transaction = require('../models/Transaction');
const Party = require('../models/Party');

async function findOrCreateParty(partyName, partyType) {
    let party = await Party.findOne({ name: { $regex: new RegExp(`^${partyName}$`, 'i') } });
    if (!party) {
        const lastParty = await Party.findOne().sort('-khataIndex');
        const nextIndex = (lastParty && lastParty.khataIndex) ? lastParty.khataIndex + 1 : 1;
        party = new Party({ 
            khataIndex: nextIndex, 
            name: partyName, 
            partyType: partyType, 
            currentBalance: 0, 
            balanceType: 'Naam' 
        });
        await party.save();
    }
    return party;
}

async function updatePartyBalance(partyId, debitAmount, creditAmount) {
    const party = await Party.findById(partyId);
    if (!party) return;
    let balance = party.currentBalance || 0;
    let type = party.balanceType || 'Naam';
    let signedBalance = type === 'Naam' ? balance : -balance;

    signedBalance += debitAmount;  
    signedBalance -= creditAmount; 

    if (signedBalance > 0) {
        party.currentBalance = signedBalance;
        party.balanceType = 'Naam';
    } else if (signedBalance < 0) {
        party.currentBalance = Math.abs(signedBalance);
        party.balanceType = 'Jama';
    } else {
        party.currentBalance = 0;
        party.balanceType = 'Naam';
    }
    await party.save();
}

// 1. SAVE BILL
router.post('/save-bill', async (req, res) => {
    try {
        const billData = req.body;
        const newBill = new TradingBill(billData);
        await newBill.save();
        
        const billDate = billData.date;
        const vNo = `TRD-${Date.now().toString().slice(-6)}`; 

        // Client Debit
        const clientParty = await findOrCreateParty(billData.clientName, billData.clientCategory || 'Kharidar');
        const clientTx = new Transaction({ voucherNo: vNo, date: billDate, transactionType: 'Trading Sale', khataCategory: billData.clientCategory || 'Kharidar', partyId: clientParty._id, partyName: clientParty.name, debit: billData.totals.finalNetCost, credit: 0, details: `Trading Bill - ${billData.jins}` });
        await clientTx.save();
        await updatePartyBalance(clientParty._id, billData.totals.finalNetCost, 0);

        // Shop Credit
        for (let i = 0; i < billData.entries.length; i++) {
            const entry = billData.entries[i];
            const shopParty = await findOrCreateParty(entry.shopName, billData.shopCategory || 'Shop');
            const shopTx = new Transaction({ voucherNo: `${vNo}-S${i+1}`, date: billDate, transactionType: 'Trading Purchase', khataCategory: billData.shopCategory || 'Shop', partyId: shopParty._id, partyName: shopParty.name, debit: 0, credit: entry.rowTotal, details: `Trading Purchase - ${entry.weight}Kg` });
            await shopTx.save();
            await updatePartyBalance(shopParty._id, 0, entry.rowTotal);
        }

        // Mazdoori Credit
        if (billData.totals.totalLabour > 0) {
            const labourParty = await findOrCreateParty('Palledar Khata', 'Expense');
            const labourTx = new Transaction({ voucherNo: vNo, date: billDate, transactionType: 'Trading Expense', khataCategory: 'Expense', partyId: labourParty._id, partyName: labourParty.name, debit: 0, credit: billData.totals.totalLabour, details: `Trading Mazdoori` });
            await labourTx.save();
            await updatePartyBalance(labourParty._id, 0, billData.totals.totalLabour);
        }

        // Market Fee Credit
        if (billData.totals.totalMarketFee > 0) {
            const feeParty = await findOrCreateParty('Market Committee Khata', 'Expense');
            const feeTx = new Transaction({ voucherNo: vNo, date: billDate, transactionType: 'Trading Expense', khataCategory: 'Expense', partyId: feeParty._id, partyName: feeParty.name, debit: 0, credit: billData.totals.totalMarketFee, details: `Trading Market Fee` });
            await feeTx.save();
            await updatePartyBalance(feeParty._id, 0, billData.totals.totalMarketFee);
        }

        res.status(201).json({ success: true, message: 'Bill saved!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

// 2. GET ALL BILLS
router.get('/all', async (req, res) => {
    try {
        const { from, to, customerName } = req.query;
        let query = {};
        if (from && to) query.date = { $gte: new Date(from), $lte: new Date(to) };
        if (customerName) query.clientName = { $regex: customerName, $options: 'i' };

        const bills = await TradingBill.find(query).sort({ date: -1 });
        res.json(bills);
    } catch (error) {
        res.status(500).json({ message: "Error fetching" });
    }
});

// 3. DELETE BILL
router.delete('/delete/:id', async (req, res) => {
    try {
        await TradingBill.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: "Error deleting" });
    }
});

module.exports = router;