const express = require('express');
const router = express.Router();
const Rokar = require('../models/Rokar'); 
const Party = require('../models/Party');
const Transaction = require('../models/Transaction'); 
const fetchUser = require('../middleware/fetchUser');
const adminOnly = require('../middleware/adminOnly');

// Pakistan Time ke mutabiq aaj ki tareekh (Format: DD/MM/YYYY)
const getTodayDate = () => {
  const d = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Karachi"}));
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`; 
};

// Route 1: Aaj ki Rokar kholna ya check karna
router.get('/today', fetchUser, async (req, res) => {
  try {
    const todayDate = getTodayDate();
    let aajKiRokar = await Rokar.findOne({ date: todayDate });

    if (!aajKiRokar) {
      const pichliRokar = await Rokar.findOne().sort({ createdAt: -1 });
      const pichlaBaqi = pichliRokar ? pichliRokar.closingBalance : 0;

      aajKiRokar = new Rokar({
        date: todayDate,
        openingBalance: pichlaBaqi,
        closingBalance: pichlaBaqi, 
        isClosed: false
      });
      await aajKiRokar.save();
    }
    
    // BUG FIX: Transaction table se data uthane ke liye Date Range (Kyunke wahan Date object save hota hai)
    const d = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Karachi"}));
    const startOfDay = new Date(d.setHours(0, 0, 0, 0));
    const endOfDay = new Date(d.setHours(23, 59, 59, 999));

    const aajKiTransactions = await Transaction.find({ 
        date: { $gte: startOfDay, $lte: endOfDay } 
    });

    res.json({ rokar: aajKiRokar, transactions: aajKiTransactions });

  } catch (error) {
    console.error("Rokar load karne mein masla:", error);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Route 2: Nayi entry daalna (Sirf Transaction table mein)
router.post('/add-entry', fetchUser, async (req, res) => {
  try {
    const { partyName, description, amount, type, category } = req.body;
    const todayDate = getTodayDate();
    const refId = 'ROK-' + Math.floor(100000 + Math.random() * 900000);

    let aajKiRokar = await Rokar.findOne({ date: todayDate });
    if (!aajKiRokar || aajKiRokar.isClosed) {
      return res.status(400).json({ message: "Aaj ki Rokar abhi khuli nahi hai ya band ho chuki hai!" });
    }

    // Sirf ek Transaction banayen!
    const newTransaction = new Transaction({
        voucherNo: refId,
        date: Date.now(), // BUG FIX: Yahan Date.now() aayega taake standard waqt save ho
        transactionType: category || 'General',
        partyName: partyName || 'Cash / General',
        debit: type === 'Naam' ? Number(amount) : 0,
        credit: type === 'Jama' ? Number(amount) : 0,
        details: description
    });
    
    // Agar party hai toh uski ID bhi dhond kar dalen
    if (partyName && partyName !== 'Cash / General') {
        const partyKhata = await Party.findOne({ name: partyName });
        if(partyKhata) {
            newTransaction.partyId = partyKhata._id;
            newTransaction.khataCategory = partyKhata.partyType;
            
            // Party ka balance update
    if (type === 'Jama') partyKhata.currentBalance += Number(amount);
    if (type === 'Naam') partyKhata.currentBalance -= Number(amount);
             partyKhata.balanceType = partyKhata.currentBalance >= 0 ? 'Jama' : 'Naam';

              await partyKhata.save(); 
        }
    }

    await newTransaction.save(); // Parchi save ho gayi!

    // Rokar ka balance update
    if (type === 'Jama') aajKiRokar.closingBalance += Number(amount);
    if (type === 'Naam') aajKiRokar.closingBalance -= Number(amount);
    await aajKiRokar.save(); 

    res.json({ message: "Entry successfully add ho gayi", transaction: newTransaction });
  } catch (error) {
    console.error("Entry add karne mein masla:", error);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Route 3: Party ka Pakka Khata
router.get('/khata/:name', fetchUser, async (req, res) => {
  try {
    // ✅ BUG FIX #3: trim() lagao aur case-insensitive regex use karo
    const searchName = req.params.name.trim();
    const regexQuery = { $regex: new RegExp('^\\s*' + searchName + '\\s*$', 'i') };

    const party = await Party.findOne({ name: regexQuery });
    if (!party) {
      return res.status(404).json({ message: "Is naam ka koi khata nahi mila!" });
    }

    // ✅ BUG FIX #3: Transaction search bhi party ke exact saved name se karo
    // (Database mein jo naam save hai, usi se dhoondein - search input se nahi)
    const history = await Transaction.find({ 
      partyName: party.name  // party.name = database ka sahi naam
    }).sort({ createdAt: -1 });
    
    const partyData = party.toObject();
    partyData.transactions = history;
    
    res.json(partyData);
  } catch (error) {
    console.error("Khata load karne mein masla:", error);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Route 4: Entry Delete
router.delete('/delete-entry/:rokarId/:transactionId', fetchUser, adminOnly, async (req, res) => {
  try {
    const { rokarId, transactionId } = req.params;

    const rokar = await Rokar.findById(rokarId);
    if (!rokar) return res.status(404).json({ error: 'Rokar nahi mili!' });

    const entry = await Transaction.findById(transactionId);
    if (!entry) return res.status(404).json({ error: 'Entry nahi mili!' });

    const type = entry.credit > 0 ? 'Jama' : 'Naam';
    const amount = entry.credit > 0 ? entry.credit : entry.debit;

    // ✅ Sirf Rokar balance reverse karo — party wali line hatayi
    if (type === 'Jama') rokar.closingBalance -= amount;
    else if (type === 'Naam') rokar.closingBalance += amount;
    await rokar.save();

    // ✅ Party balance reverse karo — sahi jagah par
    if (entry.partyName && entry.partyName !== 'Cash / General') {
      const party = await Party.findOne({ name: entry.partyName });
      if (party) {
        if (type === 'Jama') party.currentBalance -= amount;
        if (type === 'Naam') party.currentBalance += amount;
        party.balanceType = party.currentBalance >= 0 ? 'Jama' : 'Naam'; // ✅ Sahi jagah
        await party.save();
      }
    }

    await entry.deleteOne();
    res.status(200).json({ message: 'Entry delete aur balance reverse ho gaya!' });

  } catch (error) {
    console.error("Entry delete mein masla:", error);
    res.status(500).json({ error: 'Entry delete nahi ho saki.' });
  }
});

module.exports = router;

