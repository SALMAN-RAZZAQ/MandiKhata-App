const express = require('express');
const router = express.Router();
const Rokar = require('../models/Rokar'); 
const Party = require('../models/Party');
const fetchUser = require('../middleware/fetchUser');
const adminOnly = require('../middleware/adminOnly'); // ✅ Admin guard import

// Pakistan Time ke mutabiq aaj ki tareekh
const getTodayDate = () => {
  const d = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Karachi"}));
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

// Route 1: Aaj ki Rokar kholna ya check karna — ✅ Munshi bhi dekh sakta hai
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

// Route 2: Nayi entry daalna — ✅ Munshi bhi kar sakta hai
router.post('/add-entry', fetchUser, async (req, res) => {
  try {
    const { partyName, description, amount, type, category } = req.body;
    const todayDate = getTodayDate();
    const refId = 'ROK-' + Math.floor(100000 + Math.random() * 900000);

    let aajKiRokar = await Rokar.findOne({ date: todayDate });
    if (!aajKiRokar) {
      return res.status(400).json({ message: "Aaj ki Rokar abhi nahi khuli!" });
    }

    const newTransaction = { 
      referenceId: refId,
      partyName: partyName || 'Cash / General',
      description, 
      amount: Number(amount), 
      type, 
      category,
      time: new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Karachi' })
    };

    aajKiRokar.transactions.push(newTransaction);

    if (type === 'Jama') aajKiRokar.closingBalance += Number(amount);
    if (type === 'Naam') aajKiRokar.closingBalance -= Number(amount);

    await aajKiRokar.save(); 
    
    // Party ledger double entry
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

// Route 3: Party ka Pakka Khata — ✅ Munshi bhi dekh sakta hai
router.get('/khata/:name', fetchUser, async (req, res) => {
  try {
    const party = await Party.findOne({ name: req.params.name });
    if (!party) {
      return res.status(404).json({ message: "Is naam ka koi khata nahi mila!" });
    }
    res.json(party);
  } catch (error) {
    console.error("Khata load karne mein masla:", error);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Route 4: Entry Delete — ✅ Admin only
router.delete('/delete-entry/:rokarId/:entryId', fetchUser, adminOnly, async (req, res) => {
  try {
    const { rokarId, entryId } = req.params;

    const rokar = await Rokar.findById(rokarId);
    if (!rokar) return res.status(404).json({ error: 'Rokar nahi mili!' });

    const entry = rokar.transactions.id(entryId);
    if (!entry) return res.status(404).json({ error: 'Entry nahi mili!' });

    // Balance reverse karo
    if (entry.type === 'Jama') {
      rokar.closingBalance -= entry.amount;
    } else if (entry.type === 'Naam') {
      rokar.closingBalance += entry.amount;
    }

    // Party balance bhi reverse karo
    if (entry.partyName && entry.partyName !== 'Cash / General') {
      const party = await Party.findOne({ name: entry.partyName });
      if (party) {
        if (entry.type === 'Jama') party.currentBalance -= entry.amount;
        if (entry.type === 'Naam') party.currentBalance += entry.amount;
        await party.save();
      }
    }

    entry.deleteOne();
    await rokar.save();

    res.status(200).json({ 
      message: 'Entry delete aur balance reverse ho gaya!', 
      data: rokar 
    });
  } catch (error) {
    console.error("Entry delete mein masla:", error);
    res.status(500).json({ error: 'Entry delete nahi ho saki.' });
  }
});

module.exports = router;