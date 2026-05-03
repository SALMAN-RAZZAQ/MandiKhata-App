const express = require('express');
const router = express.Router();
const Rokar = require('../models/Rokar'); 
const Party = require('../models/Party');
const fetchUser = require('../middleware/fetchUser'); // Guard bhi majood hai

// ✅ NAYA JADOO: 100% Pakki Tareekh nikalne ka engine (Pakistan Time ke mutabiq)
const getTodayDate = () => {
  const d = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Karachi"}));
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`; // Result: "03/05/2026"
};

// Route 1: Aaj ki Rokar kholna ya check karna
router.get('/today', fetchUser, async (req, res) => {
  try {
    const todayDate = getTodayDate(); // Pakki tareekh uthai
    let aajKiRokar = await Rokar.findOne({ date: todayDate });

    if (!aajKiRokar) {
      const pichliRokar = await Rokar.findOne().sort({ createdAt: -1 });
      const pichlaBaqi = pichliRokar ? pichliRokar.closingBalance : 0;

      aajKiRokar = new Rokar({
        date: todayDate,
        openingBalance: pichlaBaqi,
        closingBalance: pichlaBaqi, 
        transactions: [],
        isClosed: false
      });
      await aajKiRokar.save();
    }
    res.json(aajKiRokar);
  } catch (error) {
    console.error("Rokar load karne mein masla:", error);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Route 2: Aaj ki Rokar mein nayi entry (Jama / Naam) daalna
router.post('/add-entry', fetchUser, async (req, res) => {
  try {
    const { partyName, description, amount, type, category } = req.body;
    const todayDate = getTodayDate(); // Pakki tareekh uthai

    const refId = 'ROK-' + Math.floor(100000 + Math.random() * 900000);

    let aajKiRokar = await Rokar.findOne({ date: todayDate });
    
    if (!aajKiRokar) {
      return res.status(400).json({ message: "Aaj ki Rokar abhi nahi khuli!" });
    }

    // 1. ROKAR KI ENTRY
    const newTransaction = { 
      referenceId: refId,
      partyName: partyName || 'Cash / General',
      description, 
      amount: Number(amount), 
      type, 
      category,
      time: new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Karachi' }) // Time bhi pakka
    };

    aajKiRokar.transactions.push(newTransaction);

    if (type === 'Jama') aajKiRokar.closingBalance += Number(amount);
    if (type === 'Naam') aajKiRokar.closingBalance -= Number(amount);

    await aajKiRokar.save(); 
    
    // 2. PAKKA KHATA (LEDGER) KI DOUBLE ENTRY
    if (partyName && partyName !== 'Cash / General') {
      let partyKhata = await Party.findOne({ name: partyName });
      if (partyKhata) {
        partyKhata.transactions.push({
          referenceId: refId,
          date: todayDate,
          description: description,
          amount: Number(amount),
          type: type 
        });

        if (type === 'Jama') partyKhata.currentBalance += Number(amount);
        if (type === 'Naam') partyKhata.currentBalance -= Number(amount);

        await partyKhata.save(); 
      }
    }

    res.json(aajKiRokar);

  } catch (error) {
    console.error("Entry add karne mein masla:", error);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Route 3: Frontend par kisi Party ka poora Pakka Khata bhejna
router.get('/khata/:name', fetchUser, async (req, res) => {
  try {
    const partyName = req.params.name;
    const party = await Party.findOne({ name: partyName });
    
    if (!party) {
      return res.status(404).json({ message: "Bhai jan, is naam ka koi khata nahi mila!" });
    }
    res.json(party);
  } catch (error) {
    console.error("Khata load karne mein masla:", error);
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;