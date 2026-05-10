const express = require('express');
const router = express.Router();
const mongoose = require('mongoose'); // ✅ FIX: Mongoose import kiya
const Rokar = require('../models/Rokar'); 
const Party = require('../models/Party');
const Transaction = require('../models/Transaction'); 
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

// Route 2: Nayi entry daalna (✅ SECURED WITH TRANSACTION)
router.post('/add-entry', fetchUser, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { partyName, description, amount, type, category } = req.body;
    
    // ✅ FIX: Minus (-) ya Zero (0) amount ko block kiya
    if (Number(amount) <= 0) {
      throw new Error("❌ Raqam hamesha zero (0) se badi honi chahiye!");
    }

    const todayDate = getTodayDate();
    
    const nextSeq = await getNextSequenceValue('rokar');
    const refId = 'ROK-' + nextSeq;

    let aajKiRokar = await Rokar.findOne({ date: todayDate }).session(session);
    if (!aajKiRokar || aajKiRokar.isClosed) {
      throw new Error("Aaj ki Rokar abhi khuli nahi hai ya band ho chuki hai!");
    }

    const newTransaction = new Transaction({
        voucherNo: refId,
        date: Date.now(), 
        transactionType: category || 'General',
        partyName: partyName || 'Cash / General',
        debit: type === 'Naam' ? Number(amount) : 0,
        credit: type === 'Jama' ? Number(amount) : 0,
        details: description
    });
    
    if (partyName && partyName !== 'Cash / General') {
        const partyKhata = await Party.findOne({ name: partyName }).session(session);
        if(partyKhata) {
            newTransaction.partyId = partyKhata._id;
            newTransaction.khataCategory = partyKhata.partyType;
            
            if (type === 'Jama') partyKhata.currentBalance += Number(amount);
            if (type === 'Naam') partyKhata.currentBalance -= Number(amount);
            partyKhata.balanceType = partyKhata.currentBalance >= 0 ? 'Jama' : 'Naam';

            await partyKhata.save({ session }); 
        }
    }

    await newTransaction.save({ session }); 

    if (type === 'Jama') aajKiRokar.closingBalance += Number(amount);
    if (type === 'Naam') aajKiRokar.closingBalance -= Number(amount);
    await aajKiRokar.save({ session }); 

    await session.commitTransaction();
    session.endSession();

    res.json({ message: "Entry successfully add ho gayi", transaction: newTransaction });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Entry add karne mein masla:", error);
    res.status(500).json({ error: error.message || 'Server Error' });
  }
});

// Route 3: Party ka Pakka Khata
router.get('/khata/:name', fetchUser, async (req, res) => {
  try {
    const searchName = req.params.name.trim();
    const regexQuery = { $regex: new RegExp('^\\s*' + searchName + '\\s*$', 'i') };

    const party = await Party.findOne({ name: regexQuery });
    if (!party) return res.status(404).json({ message: "Is naam ka koi khata nahi mila!" });

    const history = await Transaction.find({ partyName: party.name }).sort({ createdAt: -1 });
    const partyData = party.toObject();
    partyData.transactions = history;
    
    res.json(partyData);
  } catch (error) {
    console.error("Khata load karne mein masla:", error);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Route 4: Entry Delete (✅ SECURED WITH TRANSACTION)
router.delete('/delete-entry/:rokarId/:transactionId', fetchUser, adminOnly, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { rokarId, transactionId } = req.params;

    const rokar = await Rokar.findById(rokarId).session(session);
    if (!rokar) throw new Error('Rokar nahi mili!');

    const entry = await Transaction.findById(transactionId).session(session);
    if (!entry) throw new Error('Entry nahi mili!');

    const type = entry.credit > 0 ? 'Jama' : 'Naam';
    const amount = entry.credit > 0 ? entry.credit : entry.debit;

    if (type === 'Jama') rokar.closingBalance -= amount;
    else if (type === 'Naam') rokar.closingBalance += amount;
    await rokar.save({ session });

    if (entry.partyName && entry.partyName !== 'Cash / General') {
      const party = await Party.findOne({ name: entry.partyName }).session(session);
      if (party) {
        if (type === 'Jama') party.currentBalance -= amount;
        if (type === 'Naam') party.currentBalance += amount;
        party.balanceType = party.currentBalance >= 0 ? 'Jama' : 'Naam'; 
        await party.save({ session });
      }
    }

    await entry.deleteOne({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: 'Entry delete aur balance reverse ho gaya!' });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Entry delete mein masla:", error);
    res.status(500).json({ error: error.message || 'Entry delete nahi ho saki.' });
  }
});

module.exports = router;