const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Transaction = require('../models/Transaction'); 
const Party = require('../models/Party');
const KhataGroup = require('../models/KhataGroup');
const User = require('../models/User');
const Parcha = require('../models/Parcha'); // ✅ NAYA: Parcha model import kiya
const Rokar = require('../models/Rokar'); // ✅ BUG FIX: Rokar import kiya
const fetchUser = require('../middleware/fetchUser');
const adminOnly = require('../middleware/adminOnly');

// ✅ BUG FIX: Pakistan Time ke mutabiq aaj ki tareekh helper
const getTodayDate = () => {
  const d = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Karachi"}));
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`; 
};

// 1. ADD KHATA — ✅ Admin only
router.post('/khatagroup/add', fetchUser, adminOnly, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Khata ka naam likhna zaroori hai!' });

    const newGroup = new KhataGroup({ name });
    await newGroup.save();
    
    res.status(201).json({ message: 'Naya Khata Section ban gaya!', data: newGroup });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Yeh Khata pehle se mojood hai.' });
    } else {
      res.status(500).json({ error: 'System mein masla aya, collection theek ki ja rahi hai.' });
    }
  }
});

// 2. GET ALL KHATA — ✅ OPEN

  // ✅ FIX: fetchUser laga kar isay secure kar diya
router.get('/khatagroup/all', fetchUser, async (req, res) => {
  try {
    const groups = await KhataGroup.find();
    res.status(200).json(groups);
  } catch (error) {
    res.status(500).json({ error: 'Groups load nahi ho sake.' });
  }
});

// 3. DELETE KHATA — ✅ Admin only
router.delete('/khatagroup/delete/:id', fetchUser, adminOnly, async (req, res) => {
  try {
    await KhataGroup.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Khata Delete Ho Gaya!' });
  } catch (error) {
    res.status(500).json({ error: 'Delete failed.' });
  }
});

// 4. PARCHI SAVE — ✅ Munshi bhi kar sakta hai (🔥 NAYA ERP FLOW)
router.post('/add', fetchUser, async (req, res) => {
  try {
    const { 
      transactionType, farmerName, cropType, 
      weight, rate, totalAmount, khataCategory,
      commission, mazdoori, dami, marketFee, details
    } = req.body;

    if (!transactionType || !khataCategory || !farmerName) {
        return res.status(400).json({ error: 'Zaroori maloomat missing hain!' });
    }

    // 1. Party (Khata) dhoondein ya naya banayen
    let party = await Party.findOne({ name: farmerName });
    if (!party) {
      party = new Party({ name: farmerName, partyType: khataCategory, currentBalance: 0 });
    }

    // Party ka balance update karein
    if (transactionType === 'Adaigi') {
      party.currentBalance -= Number(totalAmount);
    } else {
      party.currentBalance += Number(totalAmount);
    }
    party.balanceType = party.currentBalance >= 0 ? 'Jama' : 'Naam';
    await party.save(); 

    // 2. Sequential Parcha Number (Parcha table se)
    const lastParcha = await Parcha.findOne().sort({ _id: -1 });
    let nextNumber = 1001;
    if (lastParcha && lastParcha.parchaNo) {
      const parts = lastParcha.parchaNo.split('-');
      if (parts.length === 2 && !isNaN(parseInt(parts[1]))) {
        nextNumber = parseInt(parts[1]) + 1;
      }
    }
    const finalParchaNo = 'PRC-' + nextNumber;

    // 3. Parcha Table mein Fasal ka data save karein
    const newParcha = new Parcha({
      parchaNo: finalParchaNo,
      transactionType: transactionType,
      khataCategory: khataCategory, // 🔥 YEH LINE ADD HO GAYI HAI (Bug 9 Fix)
      partyId: party._id, 
      partyName: party.name,
      cropType: cropType || 'N/A',
      weight: Number(weight) || 0,
      rate: Number(rate) || 0,
      grossAmount: (Number(weight) || 0) * Number(rate || 0),
      commission: Number(commission) || 0,
      mazdoori: Number(mazdoori) || 0,
      dami: Number(dami) || 0,
      marketFee: Number(marketFee) || 0,
      details: details || '',
      netAmount: Number(totalAmount) || 0
    });
    await newParcha.save(); 

    // 4. Transaction (Ledger) Table mein automatically entry daalein
    const newTransaction = new Transaction({
        voucherNo: finalParchaNo, // Parcha number as reference
        date: Date.now(),
        transactionType: transactionType,
        khataCategory: khataCategory,
        partyId: party._id,
        partyName: party.name,
        // Adaigi hai toh Naam (Debit), warna fasal aayi hai toh Jama (Credit)
        debit: transactionType === 'Adaigi' ? Number(totalAmount) : 0,
        credit: transactionType !== 'Adaigi' ? Number(totalAmount) : 0,
        details: `Bill No: ${finalParchaNo} - ${cropType} (${weight} kg)`
    });
    await newTransaction.save();

    // ✅ BUG FIX #2: Parcha save hone par Rokar (Cash Book) bhi auto-update ho
    // =========================================================
    // Logic:
    // Adaigi = Hum ne party ko cash diya = Cash OUT = Rokar GHATEGA
    // Baaki sab (Wasooli, Khareed, Baich) = Cash IN = Rokar BADHEGA
    // =========================================================
    try {
      const todayDate = getTodayDate();
      let aajKiRokar = await Rokar.findOne({ date: todayDate });

      // Agar aaj ki Rokar exist nahi karti toh naya record banao
      if (!aajKiRokar) {
        const pichliRokar = await Rokar.findOne().sort({ createdAt: -1 });
        const pichlaBaqi = pichliRokar ? pichliRokar.closingBalance : 0;
        aajKiRokar = new Rokar({
          date: todayDate,
          openingBalance: pichlaBaqi,
          closingBalance: pichlaBaqi,
          isClosed: false
        });
      }

      // Balance update karo
      if (transactionType === 'Adaigi') {
        aajKiRokar.closingBalance -= Number(totalAmount); // Cash OUT
      } else {
        aajKiRokar.closingBalance += Number(totalAmount); // Cash IN
      }

      await aajKiRokar.save();
    } catch (rokarError) {
      // Rokar update fail hone par parcha save cancel nahi hoga
      // Sirf console mein error log hoga
      console.error('⚠️ Rokar update mein masla:', rokarError);
    }
    // =========================================================

    res.status(201).json({ message: 'Parchi aur Khata dono update ho gaye!', data: newParcha });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'System parchi save nahi kar saka.' });
  }
});

// 5. ROZNAMCHA ALL (Ab Parcha table se aayega)
router.get('/all', fetchUser, async (req, res) => {
  try {
    const { from, to, khataCategory } = req.query;
    let filter = {};

    if (from && to) {
      filter.date = { 
        $gte: new Date(from), 
        $lte: new Date(new Date(to).setHours(23, 59, 59, 999)) 
      };
    }
    // ✅ BUG 7 FIX: Filter uncomment kar diya taake kisan/kharidar alag alag show ho sakein
    if (khataCategory && khataCategory !== 'all') { 
        filter.khataCategory = khataCategory; 
    }

    const allParchas = await Parcha.find(filter).sort({ date: -1 });
    res.status(200).json(allParchas);
  } catch (error) {
    res.status(500).json({ error: 'Roznamcha load nahi ho saka.' });
  }
});

// 6. PARCHI DELETE (Parcha aur Transaction dono delete karega)
router.delete('/delete/:id', fetchUser, adminOnly, async (req, res) => {
  try {
    const parcha = await Parcha.findById(req.params.id);
    if (!parcha) return res.status(404).json({ error: 'Parchi nahi mili' });

    // 1. Party ka balance reverse karein
    if (parcha.partyId) {
      let party = await Party.findById(parcha.partyId);
      if (party) {
        if (parcha.transactionType === 'Adaigi') {
          party.currentBalance += (parcha.netAmount || 0); 
        } else {
          party.currentBalance -= (parcha.netAmount || 0); 
        }
        party.balanceType = party.currentBalance >= 0 ? 'Jama' : 'Naam';
        await party.save();
      }
    }

    // 2. Transaction (Ledger) se bhi is parchy ki entry urra dein
    await Transaction.findOneAndDelete({ voucherNo: parcha.parchaNo });

    // ✅ BUG FIX #2: Rokar balance bhi reverse karo
    try {
      const todayDate = getTodayDate();
      const aajKiRokar = await Rokar.findOne({ date: todayDate });
      if (aajKiRokar) {
        // Save mein jo kiya tha uska ulta karo
        if (parcha.transactionType === 'Adaigi') {
          aajKiRokar.closingBalance += (parcha.netAmount || 0); // Cash OUT tha, wapis add karo
        } else {
          aajKiRokar.closingBalance -= (parcha.netAmount || 0); // Cash IN tha, wapis ghatao
        }
        await aajKiRokar.save();
      }
    } catch (rokarError) {
      console.error('⚠️ Rokar reverse mein masla:', rokarError);
    }

    // 3. Aakhir mein Parcha delete karein
    await Parcha.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: 'Parchi Delete aur Khata Reverse ho gaya!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Delete failed.' });
  }
});

// 7. PAKKA KHATA
router.get('/party/:name', fetchUser, async (req, res) => {
  try {
    // ✅ BUG FIX #3: trim() - extra spaces hataao, case-insensitive search
    const searchName = req.params.name.trim();
    const party = await Party.findOne({ 
      name: { $regex: new RegExp('^\\s*' + searchName + '\\s*$', 'i') } 
    });
    if (!party) return res.status(404).json({ error: 'Is naam ki koi party nahi mili!' });
    res.status(200).json(party);
  } catch (error) {
    res.status(500).json({ error: 'Khata load nahi ho saka.' });
  }
});

// 8. SAARI PARTIES KI LIST
router.get('/parties/all', fetchUser, async (req, res) => {
  try {
    const parties = await Party.find()
      .select('name partyType currentBalance balanceType createdAt')
      .sort({ name: 1 });
    res.status(200).json(parties);
  } catch (error) {
    res.status(500).json({ error: 'Parties load nahi ho sakin.' });
  }
});

// 9. PASSWORD CHANGE
router.post('/update-password', fetchUser, adminOnly, async (req, res) => {
  try {
    const { role, newPassword } = req.body;
    const user = await User.findOne({ role });
    if (!user) return res.status(404).json({ error: 'User nahi mila.' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({ message: 'Password kamyabi se badal gaya!' });
  } catch (error) {
    res.status(500).json({ error: 'Password update nahi ho saka.' });
  }
});

// =========================================================
// 10. JOURNAL VOUCHER — Non-cash transfer between parties
// =========================================================
router.post('/journal/add', fetchUser, async (req, res) => {
  try {
    const { debitPartyName, creditPartyName, amount, details, khataCategory } = req.body;

    // Validation
    if (!debitPartyName || !creditPartyName || !amount || !details) {
      return res.status(400).json({ error: 'Tamam fields bharein! (Debit, Credit, Raqam, Tafseel)' });
    }
    if (Number(amount) <= 0) {
      return res.status(400).json({ error: 'Raqam sahi nahi hai!' });
    }
    if (debitPartyName.trim().toLowerCase() === creditPartyName.trim().toLowerCase()) {
      return res.status(400).json({ error: 'Debit aur Credit party alag honi chahiye!' });
    }

    // JV Number generate karo (JV-1001, JV-1002 ...)
    const lastJV = await Transaction.findOne({ voucherNo: /^JV-/ }).sort({ _id: -1 });
    let nextJVNum = 1001;
    if (lastJV?.voucherNo) {
      const parts = lastJV.voucherNo.split('-');
      if (parts.length === 2 && !isNaN(parseInt(parts[1]))) {
        nextJVNum = parseInt(parts[1]) + 1;
      }
    }
    const jvNo = 'JV-' + nextJVNum;
    const category = khataCategory || 'General';
    const narration = `JV: ${details} | Dr: ${debitPartyName.trim()} | Cr: ${creditPartyName.trim()}`;

    // --- DEBIT PARTY (balance GHATEGA - Naam) ---
    let debitParty = await Party.findOne({
      name: { $regex: new RegExp('^\\s*' + debitPartyName.trim() + '\\s*$', 'i') }
    });
    if (!debitParty) {
      debitParty = new Party({ name: debitPartyName.trim(), partyType: category, currentBalance: 0 });
    }
    debitParty.currentBalance -= Number(amount);
    debitParty.balanceType = debitParty.currentBalance >= 0 ? 'Jama' : 'Naam';
    await debitParty.save();

    // --- CREDIT PARTY (balance BADHEGA - Jama) ---
    let creditParty = await Party.findOne({
      name: { $regex: new RegExp('^\\s*' + creditPartyName.trim() + '\\s*$', 'i') }
    });
    if (!creditParty) {
      creditParty = new Party({ name: creditPartyName.trim(), partyType: category, currentBalance: 0 });
    }
    creditParty.currentBalance += Number(amount);
    creditParty.balanceType = creditParty.currentBalance >= 0 ? 'Jama' : 'Naam';
    await creditParty.save();

    // --- TRANSACTION 1: Debit Entry ---
    await new Transaction({
      voucherNo: jvNo,
      transactionType: 'Journal',
      khataCategory: category,
      partyId: debitParty._id,
      partyName: debitParty.name,
      debit: Number(amount),
      credit: 0,
      details: narration
    }).save();

    // --- TRANSACTION 2: Credit Entry ---
    await new Transaction({
      voucherNo: jvNo,
      transactionType: 'Journal',
      khataCategory: category,
      partyId: creditParty._id,
      partyName: creditParty.name,
      debit: 0,
      credit: Number(amount),
      details: narration
    }).save();

    // NOTE: Rokar affect NAHI hoga (yeh non-cash transaction hai)

    res.status(201).json({
      message: 'Journal Voucher kamyabi se save ho gaya!',
      voucherNo: jvNo,
      debitParty: debitParty.name,
      creditParty: creditParty.name,
      amount: Number(amount)
    });

  } catch (error) {
    console.error('Journal Voucher error:', error);
    res.status(500).json({ error: 'Journal Voucher save nahi ho saka.' });
  }
});

// 11. JOURNAL VOUCHER DELETE
router.delete('/journal/delete/:voucherNo', fetchUser, adminOnly, async (req, res) => {
  try {
    const { voucherNo } = req.params;

    // Is JV ki saari transactions dhoondo
    const entries = await Transaction.find({ voucherNo });
    if (!entries || entries.length === 0) {
      return res.status(404).json({ error: 'Yeh Journal Voucher nahi mila!' });
    }

    // Har entry ka balance reverse karo
    for (const entry of entries) {
      if (entry.partyName) {
        const party = await Party.findOne({ name: entry.partyName });
        if (party) {
          party.currentBalance -= entry.credit;  // Credit reverse
          party.currentBalance += entry.debit;   // Debit reverse
          party.balanceType = party.currentBalance >= 0 ? 'Jama' : 'Naam';
          await party.save();
        }
      }
    }

    // Transactions delete karo
    await Transaction.deleteMany({ voucherNo });

    res.status(200).json({ message: `Journal Voucher ${voucherNo} delete aur reverse ho gaya!` });
  } catch (error) {
    console.error('JV delete error:', error);
    res.status(500).json({ error: 'Journal Voucher delete nahi ho saka.' });
  }
});
// =========================================
// JOURNAL VOUCHER — Add
// =========================================
router.post('/journal/add', fetchUser, async (req, res) => {
  try {
    const { debitPartyName, creditPartyName, amount, details, khataCategory } = req.body;

    if (!debitPartyName) return res.status(400).json({ error: 'Debit party ka naam zaroori hai!' });
    if (!creditPartyName) return res.status(400).json({ error: 'Credit party ka naam zaroori hai!' });
    if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'Raqam zaroori hai!' });
    if (!details) return res.status(400).json({ error: 'Tafseel likhna zaroori hai!' });

    const voucherNo = 'JV-' + Date.now();
    const amt = Number(amount);

    // 1. DEBIT PARTY — balance ghatao
    let debitParty = await Party.findOne({ name: debitPartyName });
    if (!debitParty) {
      debitParty = new Party({ 
        name: debitPartyName, 
        partyType: khataCategory || 'General', 
        currentBalance: 0 
      });
    }
    debitParty.currentBalance -= amt;
    debitParty.balanceType = debitParty.currentBalance >= 0 ? 'Jama' : 'Naam';
    await debitParty.save();

    // 2. CREDIT PARTY — balance badhao
    let creditParty = await Party.findOne({ name: creditPartyName });
    if (!creditParty) {
      creditParty = new Party({ 
        name: creditPartyName, 
        partyType: khataCategory || 'General', 
        currentBalance: 0 
      });
    }
    creditParty.currentBalance += amt;
    creditParty.balanceType = creditParty.currentBalance >= 0 ? 'Jama' : 'Naam';
    await creditParty.save();

    // 3. DEBIT TRANSACTION
    await new Transaction({
      voucherNo: voucherNo,
      date: Date.now(),
      transactionType: 'Journal Voucher',
      khataCategory: khataCategory || 'General',
      partyId: debitParty._id,
      partyName: debitPartyName,
      debit: amt,
      credit: 0,
      details: `JV: ${details} (Cr: ${creditPartyName})`
    }).save();

    // 4. CREDIT TRANSACTION
    await new Transaction({
      voucherNo: voucherNo,
      date: Date.now(),
      transactionType: 'Journal Voucher',
      khataCategory: khataCategory || 'General',
      partyId: creditParty._id,
      partyName: creditPartyName,
      debit: 0,
      credit: amt,
      details: `JV: ${details} (Dr: ${debitPartyName})`
    }).save();

    res.status(201).json({
      message: 'Journal Voucher kamyabi se save ho gaya!',
      voucherNo,
      debitParty: debitPartyName,
      creditParty: creditPartyName,
      amount: amt
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Journal Voucher save nahi ho saka.' });
  }
});

// =========================================
// JOURNAL VOUCHER — Delete (Admin only)
// =========================================
router.delete('/journal/delete/:voucherNo', fetchUser, adminOnly, async (req, res) => {
  try {
    const { voucherNo } = req.params;

    // Is voucher ki saari transactions dhoondo
    const transactions = await Transaction.find({ voucherNo });
    if (!transactions || transactions.length === 0) {
      return res.status(404).json({ error: 'Is voucher ki koi entry nahi mili!' });
    }

    // Har transaction ka balance reverse karo
    for (const txn of transactions) {
      const party = await Party.findById(txn.partyId);
      if (party) {
        party.currentBalance -= txn.credit;  // Credit reverse
        party.currentBalance += txn.debit;   // Debit reverse
        party.balanceType = party.currentBalance >= 0 ? 'Jama' : 'Naam';
        await party.save();
      }
    }

    // Saari transactions delete karo
    await Transaction.deleteMany({ voucherNo });

    res.status(200).json({ message: `Journal Voucher ${voucherNo} delete aur balance reverse ho gaya!` });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Delete nahi ho saka.' });
  }
});

module.exports = router;
