const express = require('express');
const router = express.Router();
const Party = require('../models/Party');
const Transaction = require('../models/Transaction');
const Parcha = require('../models/Parcha'); 
const PartaBill = require('../models/PartaBill'); 
const TradingBill = require('../models/TradingBill'); 
const fetchUser = require('../middleware/fetchUser');
const adminOnly = require('../middleware/adminOnly');

// 1. Outstanding Balances
router.get('/balances', fetchUser, adminOnly, async (req, res) => {
  try {
    const parties = await Party.find({ currentBalance: { $ne: 0 } }).sort({ currentBalance: -1 });
    res.json(parties);
  } catch (error) { res.status(500).json({ error: 'Balances load nahi ho sake.' }); }
});

// 2. Monthly Summary
router.get('/monthly', fetchUser, adminOnly, async (req, res) => {
  try {
    const summary = await Transaction.aggregate([
      { $group: { _id: { month: { $month: "$date" }, year: { $year: "$date" }, type: "$transactionType" }, totalCredit: { $sum: "$credit" }, totalDebit: { $sum: "$debit" }, count: { $sum: 1 } } },
      { $sort: { "_id.year": -1, "_id.month": -1 } }
    ]);
    res.json(summary);
  } catch (error) { res.status(500).json({ error: 'Monthly summary load nahi ho saki.' }); }
});

// 3. Trial Balance
router.get('/trial-balance', fetchUser, adminOnly, async (req, res) => {
  try {
    const totals = await Transaction.aggregate([{ $group: { _id: null, totalDebit: { $sum: "$debit" }, totalCredit: { $sum: "$credit" } } }]);
    const result = totals.length > 0 ? totals[0] : { totalDebit: 0, totalCredit: 0 };
    res.json(result);
  } catch (error) { res.status(500).json({ error: 'Trial balance check nahi ho saka.' }); }
});

// 4. INCOME ROUTE (🔥 NAYA FIX: Dami Di Gayi ab minus nahi hogi 🔥)
router.get('/income', fetchUser, adminOnly, async (req, res) => {
  try {
    const parchaIncome = await Parcha.aggregate([{ $group: { _id: null, commission: { $sum: "$commission" }, mazdoori: { $sum: "$mazdoori" }, marketFee: { $sum: "$marketFee" }, dami: { $sum: "$dami" } } }]);
    const partaIncome = await PartaBill.aggregate([{ $group: { _id: null, commission: { $sum: "$commAmount" }, mazdoori: { $sum: "$mazdooriAmount" }, marketFee: { $sum: "$marketFeeAmount" }, dami: { $sum: "$damiAmount" } } }]);
    
    const tradingIncome = await TradingBill.aggregate([{ 
      $group: { 
        _id: null, 
        commission: { $sum: "$totals.totalCommission" }, 
        mazdoori: { $sum: "$totals.totalLabour" }, 
        marketFee: { $sum: "$totals.totalMarketFee" }, 
        damiPaid: { $sum: "$totals.totalDamiAmount" },        // Purchase wali dami (Info ke liye)
        damiReceived: { $sum: "$totals.clientDamiAmount" }    // Sale wali dami (Income)
      } 
    }]);

    const prc = parchaIncome[0] || { commission: 0, mazdoori: 0, marketFee: 0, dami: 0 };
    const prt = partaIncome[0] || { commission: 0, mazdoori: 0, marketFee: 0, dami: 0 };
    const trd = tradingIncome[0] || { commission: 0, mazdoori: 0, marketFee: 0, damiPaid: 0, damiReceived: 0 };

    // Sab Commissions ko jama karna
    const totalCommission = (prc.commission || 0) + (prt.commission || 0) + (trd.commission || 0);
    const totalMazdoori = (prc.mazdoori || 0) + (prt.mazdoori || 0) + (trd.mazdoori || 0);
    const totalMarketFee = (prc.marketFee || 0) + (prt.marketFee || 0) + (trd.marketFee || 0);
    
    // Trading Sale ki dami bhi wusooli mein jama hogi
    const totalDamiIncome = (prc.dami || 0) + (prt.dami || 0) + (trd.damiReceived || 0);
    
    // Yeh sirf dikhane ke liye Frontend par bheji jayegi (Minus nahi hogi)
    const totalTradingDamiPaid = (trd.damiPaid || 0);
    
    // ✅ FIX: Grand Total = Sirf Commission aur Dami (Wusool) ko jama karega. 
    // Isme se ab humne 'totalTradingDamiPaid' ki koti (Minus) khatam kar di hai!
    const grandTotal = totalCommission + totalDamiIncome;

    res.json({ totalCommission, totalMazdoori, totalMarketFee, totalDamiIncome, totalTradingDamiPaid, grandTotal });
  } catch (error) { res.status(500).json({ error: 'Income load nahi ho saki.' }); }
});

// 5. DATABASE REPAIR
router.post('/fix-database-balances', fetchUser, adminOnly, async (req, res) => {
  try {
    const parties = await Party.find();
    let fixedCount = 0;

    for (let party of parties) {
      const transactions = await Transaction.find({ partyId: party._id });
      let totalJama = 0;
      let totalNaam = 0;

      transactions.forEach(tx => {
        totalJama += (tx.credit || 0);
        totalNaam += (tx.debit || 0);
      });

      const diff = totalJama - totalNaam;

      if (diff > 0) {
        party.currentBalance = diff;
        party.balanceType = 'Jama';
      } else if (diff < 0) {
        party.currentBalance = Math.abs(diff);
        party.balanceType = 'Naam';
      } else {
        party.currentBalance = 0;
        party.balanceType = 'Naam';
      }
      await party.save();
      fixedCount++;
    }
    
    res.json({ success: true, message: `✅ ${fixedCount} Khatay Database mein theek kar diye gaye hain!` });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Database fix nahi ho saki: ' + error.message });
  }
});
// ==========================================================
// 🚀 6. MASTER AUDIT REPORT (CHATTA) - The Heart of ERP
// ==========================================================
router.get('/full-audit', fetchUser, adminOnly, async (req, res) => {
  try {
    const { from, to } = req.query;
    let query = {};

    if (from && to) {
      query.date = {
        $gte: new Date(from),
        $lte: new Date(new Date(to).setHours(23, 59, 59, 999))
      };
    }

    // 1. Asli Hissab (Transaction Table se)
    const ledgerBalances = await Transaction.aggregate([
      { $match: query },
      { $group: {
          _id: "$partyId",
          totalDebit: { $sum: "$debit" },
          totalCredit: { $sum: "$credit" }
      }}
    ]);

    // 2. System Hissab (Party Table se)
    const parties = await Party.find();

    let report = [];
    let totalMismatches = 0;

    for (let party of parties) {
      const ledger = ledgerBalances.find(l => l._id && l._id.toString() === party._id.toString());

      // Ledger Balance (Transaction: Credit = Jama, Debit = Naam)
      let ledgerBalance = 0;
      if (ledger) {
        ledgerBalance = (ledger.totalCredit || 0) - (ledger.totalDebit || 0);
      }

      // System Saved Balance (Party: Jama = Plus, Naam = Minus)
      let systemSavedBalance = party.balanceType === 'Jama' ? party.currentBalance : -Math.abs(party.currentBalance);

      // Fark (Difference)
      let difference = Math.round(ledgerBalance) - Math.round(systemSavedBalance);

      // Agar 1 rupay ka bhi farq hai, toh flag karo
      if (Math.abs(difference) > 0) totalMismatches++;

      report.push({
        partyId: party._id,
        khataIndex: party.khataIndex || '---',
        partyName: party.name,
        partyType: party.partyType,
        ledgerBalance: Math.round(ledgerBalance),
        systemSavedBalance: Math.round(systemSavedBalance),
        difference: difference,
        isMatch: difference === 0
      });
    }

    // Sort: Farq (Mismatch) wali parties sab se ooper nazar aayein
    report.sort((a, b) => {
      if (!a.isMatch && b.isMatch) return -1;
      if (a.isMatch && !b.isMatch) return 1;
      return a.partyName.localeCompare(b.partyName);
    });

    res.json({
      success: true,
      totalParties: parties.length,
      totalMismatches,
      report
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Audit report load nahi ho saki.' });
  }
});

module.exports = router;