const express = require('express');
const router = express.Router();
const mongoose = require('mongoose'); // ✅ Mongoose add kiya transactions ke liye
const bcrypt = require('bcryptjs');
const Transaction = require('../models/Transaction'); 
const Party = require('../models/Party');
const KhataGroup = require('../models/KhataGroup');
const User = require('../models/User');
const Parcha = require('../models/Parcha');
const Rokar = require('../models/Rokar');
const Inventory = require('../models/Inventory'); // ✅ NAYA: Inventory Model add kiya
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

// 1. ADD KHATA
router.post('/khatagroup/add', fetchUser, adminOnly, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Khata ka naam likhna zaroori hai!' });

    const newGroup = new KhataGroup({ name });
    await newGroup.save();
    res.status(201).json({ message: 'Naya Khata Section ban gaya!', data: newGroup });
  } catch (error) {
    if (error.code === 11000) res.status(400).json({ error: 'Yeh Khata pehle se mojood hai.' });
    else res.status(500).json({ error: 'System mein masla aya.' });
  }
});

// 2. GET ALL KHATA
router.get('/khatagroup/all', fetchUser, async (req, res) => {
  try {
    const groups = await KhataGroup.find();
    res.status(200).json(groups);
  } catch (error) {
    res.status(500).json({ error: 'Groups load nahi ho sake.' });
  }
});

// 3. DELETE KHATA
router.delete('/khatagroup/delete/:id', fetchUser, adminOnly, async (req, res) => {
  try {
    await KhataGroup.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Khata Delete Ho Gaya!' });
  } catch (error) {
    res.status(500).json({ error: 'Delete failed.' });
  }
});

// 4. PARCHI SAVE (✅ WITH TRANSACTION & INVENTORY UPDATE)
router.post('/add', fetchUser, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { 
      transactionType, farmerName, cropType, 
      weight, rate, totalAmount, khataCategory,
      commission, mazdoori, dami, marketFee, details
    } = req.body;

    if (!transactionType || !khataCategory || !farmerName) {
        throw new Error('Zaroori maloomat missing hain!');
    }
    if (Number(totalAmount) < 0 || Number(weight) < 0 || Number(rate) < 0) {
        throw new Error('❌ Raqam, Wazan ya Rate minus (-) mein nahi ho sakte!');
    }

    let party = await Party.findOne({ name: farmerName }).session(session);
    if (!party) {
      party = new Party({ name: farmerName, partyType: khataCategory, currentBalance: 0 });
    }

    if (transactionType === 'Adaigi') party.currentBalance -= Number(totalAmount);
    else party.currentBalance += Number(totalAmount);
    
    party.balanceType = party.currentBalance >= 0 ? 'Jama' : 'Naam';
    await party.save({ session }); 

    const nextSeq = await getNextSequenceValue('parcha'); 
    const finalParchaNo = `PRC-${nextSeq}`; 

    const newParcha = new Parcha({
      parchaNo: finalParchaNo, transactionType, khataCategory,
      partyId: party._id, partyName: party.name,
      cropType: cropType || 'N/A', weight: Number(weight) || 0,
      rate: Number(rate) || 0, grossAmount: (Number(weight) || 0) * Number(rate || 0),
      commission: Number(commission) || 0, mazdoori: Number(mazdoori) || 0,
      dami: Number(dami) || 0, marketFee: Number(marketFee) || 0,
      details: details || '', netAmount: Number(totalAmount) || 0
    });
    await newParcha.save({ session }); 

    await new Transaction({
        voucherNo: finalParchaNo, date: Date.now(),
        transactionType: transactionType, khataCategory: khataCategory,
        partyId: party._id, partyName: party.name,
        debit: transactionType === 'Adaigi' ? Number(totalAmount) : 0,
        credit: transactionType !== 'Adaigi' ? Number(totalAmount) : 0,
        details: `Bill No: ${finalParchaNo} - ${cropType} (${weight} kg)`
    }).save({ session });

    // ✅ NAYA: INVENTORY MEIN MAAL PLUS KAREIN
    if (cropType && Number(weight) > 0) {
      let inventory = await Inventory.findOne({ cropName: cropType }).session(session);
      if (!inventory) {
        inventory = new Inventory({ cropName: cropType, totalWeight: 0 });
      }
      inventory.totalWeight += Number(weight); // Stock barh gaya
      await inventory.save({ session });
    }

    const todayDate = getTodayDate();
    let aajKiRokar = await Rokar.findOne({ date: todayDate }).session(session);

    if (!aajKiRokar) {
      const pichliRokar = await Rokar.findOne().sort({ createdAt: -1 });
      const pichlaBaqi = pichliRokar ? pichliRokar.closingBalance : 0;
      aajKiRokar = new Rokar({
        date: todayDate, openingBalance: pichlaBaqi,
        closingBalance: pichlaBaqi, isClosed: false
      });
    }

    if (transactionType === 'Adaigi') aajKiRokar.closingBalance -= Number(totalAmount);
    else aajKiRokar.closingBalance += Number(totalAmount);
    await aajKiRokar.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ message: 'Parchi, Khata aur Stock update ho gaye!', data: newParcha });
    
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error(error);
    res.status(500).json({ error: error.message || 'System parchi save nahi kar saka.' });
  }
});

// 5. ROZNAMCHA ALL 
router.get('/all', fetchUser, async (req, res) => {
  try {
    const { from, to, khataCategory } = req.query;
    let filter = {};
    if (from && to) {
      filter.date = { $gte: new Date(from), $lte: new Date(new Date(to).setHours(23, 59, 59, 999)) };
    }
    if (khataCategory && khataCategory !== 'all') filter.khataCategory = khataCategory; 

    const allTransactions = await Transaction.find(filter).sort({ date: -1 });
    res.status(200).json(allTransactions);
  } catch (error) {
    res.status(500).json({ error: 'Roznamcha load nahi ho saka.' });
  }
});

// 6. PARCHI DELETE (✅ WITH TRANSACTION & INVENTORY REVERSE)
router.delete('/delete/:id', fetchUser, adminOnly, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const parcha = await Parcha.findById(req.params.id).session(session);
    if (!parcha) throw new Error('Parchi nahi mili');

    if (parcha.partyId) {
      let party = await Party.findById(parcha.partyId).session(session);
      if (party) {
        if (parcha.transactionType === 'Adaigi') party.currentBalance += (parcha.netAmount || 0); 
        else party.currentBalance -= (parcha.netAmount || 0); 
        party.balanceType = party.currentBalance >= 0 ? 'Jama' : 'Naam';
        await party.save({ session });
      }
    }

    await Transaction.findOneAndDelete({ voucherNo: parcha.parchaNo }, { session });

    // ✅ NAYA: INVENTORY REVERSE KAREIN (Parchi delete hui, toh stock minus karo)
    if (parcha.cropType && Number(parcha.weight) > 0) {
      let inventory = await Inventory.findOne({ cropName: parcha.cropType }).session(session);
      if (inventory) {
        inventory.totalWeight -= Number(parcha.weight); // Parcha delete, stock wapis reverse
        await inventory.save({ session });
      }
    }

    const todayDate = getTodayDate();
    const aajKiRokar = await Rokar.findOne({ date: todayDate }).session(session);
    if (aajKiRokar) {
      if (parcha.transactionType === 'Adaigi') aajKiRokar.closingBalance += (parcha.netAmount || 0);
      else aajKiRokar.closingBalance -= (parcha.netAmount || 0);
      await aajKiRokar.save({ session });
    }

    await Parcha.findByIdAndDelete(req.params.id, { session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: 'Parchi Delete, Khata aur Stock Reverse ho gaya!' });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error(error);
    res.status(500).json({ error: error.message || 'Delete failed.' });
  }
});

// 7. PAKKA KHATA
router.get('/party/:name', fetchUser, async (req, res) => {
  try {
    const searchName = req.params.name.trim();
    const party = await Party.findOne({ name: { $regex: new RegExp('^\\s*' + searchName + '\\s*$', 'i') } });
    if (!party) return res.status(404).json({ error: 'Is naam ki koi party nahi mili!' });
    res.status(200).json(party);
  } catch (error) {
    res.status(500).json({ error: 'Khata load nahi ho saka.' });
  }
});

// 8. SAARI PARTIES KI LIST
router.get('/parties/all', fetchUser, async (req, res) => {
  try {
    const parties = await Party.find().select('name partyType currentBalance balanceType createdAt').sort({ name: 1 });
    res.status(200).json(parties);
  } catch (error) {
    res.status(500).json({ error: 'Parties load nahi ho sakin.' });
  }
});

// 9. PASSWORD CHANGE
router.post('/update-password', fetchUser, adminOnly, async (req, res) => {
  try {
    const { newPassword } = req.body; 
    const user = await User.findById(req.user.id); 
    if (!user) return res.status(404).json({ error: 'User nahi mila.' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    res.status(200).json({ message: 'Aapka Password kamyabi se badal gaya hai!' });
  } catch (error) {
    res.status(500).json({ error: 'Password update nahi ho saka.' });
  }
});

// 10. JOURNAL VOUCHER
router.post('/journal/add', fetchUser, async (req, res) => {
  try {
    const { debitPartyName, creditPartyName, amount, details, khataCategory } = req.body;
    if (!debitPartyName || !creditPartyName || !amount || !details) return res.status(400).json({ error: 'Tamam fields bharein!' });
    if (Number(amount) <= 0) return res.status(400).json({ error: 'Raqam sahi nahi hai!' });
    if (debitPartyName.trim().toLowerCase() === creditPartyName.trim().toLowerCase()) return res.status(400).json({ error: 'Debit aur Credit party alag honi chahiye!' });

    const nextJVNum = await getNextSequenceValue('journal');
    const jvNo = 'JV-' + nextJVNum;
    const category = khataCategory || 'General';
    const narration = `JV: ${details} | Dr: ${debitPartyName.trim()} | Cr: ${creditPartyName.trim()}`;

    let debitParty = await Party.findOne({ name: { $regex: new RegExp('^\\s*' + debitPartyName.trim() + '\\s*$', 'i') } });
    if (!debitParty) debitParty = new Party({ name: debitPartyName.trim(), partyType: category, currentBalance: 0 });
    debitParty.currentBalance -= Number(amount);
    debitParty.balanceType = debitParty.currentBalance >= 0 ? 'Jama' : 'Naam';
    await debitParty.save();

    let creditParty = await Party.findOne({ name: { $regex: new RegExp('^\\s*' + creditPartyName.trim() + '\\s*$', 'i') } });
    if (!creditParty) creditParty = new Party({ name: creditPartyName.trim(), partyType: category, currentBalance: 0 });
    creditParty.currentBalance += Number(amount);
    creditParty.balanceType = creditParty.currentBalance >= 0 ? 'Jama' : 'Naam';
    await creditParty.save();

    await new Transaction({ voucherNo: jvNo, transactionType: 'Journal', khataCategory: category, partyId: debitParty._id, partyName: debitParty.name, debit: Number(amount), credit: 0, details: narration }).save();
    await new Transaction({ voucherNo: jvNo, transactionType: 'Journal', khataCategory: category, partyId: creditParty._id, partyName: creditParty.name, debit: 0, credit: Number(amount), details: narration }).save();

    res.status(201).json({ message: 'Journal Voucher kamyabi se save ho gaya!', voucherNo: jvNo, debitParty: debitParty.name, creditParty: creditParty.name, amount: Number(amount) });
  } catch (error) {
    res.status(500).json({ error: 'Journal Voucher save nahi ho saka.' });
  }
});

// 11. JOURNAL VOUCHER DELETE
router.delete('/journal/delete/:voucherNo', fetchUser, adminOnly, async (req, res) => {
  try {
    const { voucherNo } = req.params;
    const entries = await Transaction.find({ voucherNo });
    if (!entries || entries.length === 0) return res.status(404).json({ error: 'Yeh Journal Voucher nahi mila!' });

    for (const entry of entries) {
      if (entry.partyName) {
        const party = await Party.findOne({ name: entry.partyName });
        if (party) {
          party.currentBalance -= entry.credit;
          party.currentBalance += entry.debit;
          party.balanceType = party.currentBalance >= 0 ? 'Jama' : 'Naam';
          await party.save();
        }
      }
    }
    await Transaction.deleteMany({ voucherNo });
    res.status(200).json({ message: `Journal Voucher ${voucherNo} delete aur reverse ho gaya!` });
  } catch (error) {
    res.status(500).json({ error: 'Journal Voucher delete nahi ho saka.' });
  }
});

// 12. PARCHA HISTORY
router.get('/history', fetchUser, async (req, res) => {
  try {
    const { search } = req.query;
    let filter = {};
    if (search) {
      filter.$or = [{ partyName: { $regex: new RegExp(search, 'i') } }, { parchaNo: { $regex: new RegExp(search, 'i') } }];
    }
    const parchay = await Parcha.find(filter).sort({ _id: -1 });
    res.status(200).json(parchay);
  } catch (error) {
    res.status(500).json({ error: 'Parcha history load nahi ho saki.' });
  }
});

module.exports = router;