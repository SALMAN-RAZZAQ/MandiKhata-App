import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

function Rokar() {
  const [rokar, setRokar] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Nayi Entry ke liye states
  const [entryForm, setEntryForm] = useState(null); 
  const [partyName, setPartyName] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [saving, setSaving] = useState(false);

  // Rokar Load Karna
  const fetchRokar = async () => {
    try {
      // 🔑 NAYA: Pocket se chabi nikali
      const token = localStorage.getItem('token');

      const response = await fetch('http://localhost:5000/api/rokar/today', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'auth-token': token // 🔑 Guard ko chabi dikhayi
        }
      });

      // Agar chabi expire ho gayi (401 Unauthorized)
      if (response.status === 401) {
        alert("Aapka session expire ho gaya hai. Dobara login karein!");
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        window.location.href = '/login';
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setRokar(data);
      } else {
        console.error("Backend ne data nahi bheja");
      }
    } catch (err) {
      console.error("Rokar lane mein masla:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRokar();
  }, []);

  // Form Submit Karna
  const handleAddEntry = async (e) => {
    e.preventDefault();
    if (!amount || !description) return alert('Bhai jan, Raqam aur Tafseel dono likhna zaroori hain!');
    
    setSaving(true);
    // 🔑 NAYA: Nayi entry save karne ke liye bhi chabi chahiye
    const token = localStorage.getItem('token'); 
    
    try {
      const response = await fetch('http://localhost:5000/api/rokar/add-entry', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'auth-token': token // 🔑 Guard ko yahan bhi chabi dikhayi
        },
        body: JSON.stringify({
          partyName,
          amount,
          description,
          type: entryForm,
          category
        })
      });

      // Agar chabi expire ho gayi (401 Unauthorized)
      if (response.status === 401) {
        alert("Aapka session expire ho gaya hai. Dobara login karein!");
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        window.location.href = '/login';
        return;
      }

      if (response.ok) {
        // Form clear karein
        setPartyName(''); 
        setAmount('');
        setDescription('');
        setCategory('General');
        setEntryForm(null);
        // Data refresh karein
        fetchRokar();
      } else {
        alert("Entry save karne mein masla aagaya.");
      }
    } catch (error) {
      alert("Network Error!");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <h2 className="text-center mt-5">⏳ آج کی روکڑ کھل رہی ہے... (Loading)</h2>;
  }

  if (!rokar) {
    return <h2 className="text-center mt-5 text-danger">❌ روکڑ کا نظام چل نہیں رہا۔ (Backend Error)</h2>;
  }

  const totalJama = rokar.transactions.filter(t => t.type === 'Jama').reduce((tot, t) => tot + t.amount, 0);
  const totalNaam = rokar.transactions.filter(t => t.type === 'Naam').reduce((tot, t) => tot + t.amount, 0);
  const aajKaGalla = rokar.openingBalance + totalJama - totalNaam;

  return (
    <div className="container mt-4" style={{ fontFamily: 'Arial, sans-serif' }}>
      
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-2">
        <h2 style={{ color: '#000080', fontWeight: 'bold' }}>💰 روزنامچہ / روکڑ (Daily Cashbook)</h2>
        <h4 className="badge bg-dark fs-5">تاریخ: {rokar.date}</h4>
      </div>

      {/* 4 Bare Dabbay */}
      <div className="row mb-4 text-center text-white">
        <div className="col-md-3">
          <div className="card bg-primary shadow">
            <div className="card-body">
              <h5 className="card-title">پچھلا باقی (Opening)</h5>
              <h3 className="card-text">Rs. {rokar.openingBalance.toLocaleString()}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-success shadow">
            <div className="card-body">
              <h5 className="card-title">آج کی جمع (Cash In)</h5>
              <h3 className="card-text">Rs. {totalJama.toLocaleString()}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-danger shadow">
            <div className="card-body">
              <h5 className="card-title">آج کا نام (Cash Out)</h5>
              <h3 className="card-text">Rs. {totalNaam.toLocaleString()}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow" style={{ backgroundColor: '#ffc107', color: '#000' }}>
            <div className="card-body">
              <h5 className="card-title fw-bold">آج کا گلہ (Galla)</h5>
              <h3 className="card-text fw-bold">Rs. {aajKaGalla.toLocaleString()}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="d-flex gap-3 mb-4">
        <button onClick={() => setEntryForm('Jama')} className="btn btn-success flex-fill fs-5 fw-bold shadow">
          ➕ رقم جمع کریں (Cash IN)
        </button>
        <button onClick={() => setEntryForm('Naam')} className="btn btn-danger flex-fill fs-5 fw-bold shadow">
          ➖ رقم ادا کریں (Cash OUT)
        </button>
      </div>

      {/* Nayi Entry Ka Form */}
      {entryForm && (
        <div className={`card shadow mb-4 border-${entryForm === 'Jama' ? 'success' : 'danger'}`}>
          <div className={`card-header text-white bg-${entryForm === 'Jama' ? 'success' : 'danger'} fw-bold fs-5`}>
            {entryForm === 'Jama' ? '🟢 نئی جمع درج کریں (New Cash IN)' : '🔴 نیا نام درج کریں (New Cash OUT)'}
          </div>
          <div className="card-body bg-light">
            <form onSubmit={handleAddEntry} className="d-flex gap-3 align-items-end flex-wrap">
              
              <div style={{ flex: '1 1 200px' }}>
                <label className="fw-bold">کھاتہ / پارٹی (Party):</label>
                <input type="text" className="form-control" value={partyName} onChange={(e) => setPartyName(e.target.value)} placeholder="Maslan: Mian Aslam" />
              </div>

              <div style={{ flex: '1 1 150px' }}>
                <label className="fw-bold">رقم (Amount):</label>
                <input type="number" className="form-control" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" required />
              </div>
              <div style={{ flex: '2 1 250px' }}>
                <label className="fw-bold">تفصیل (Description):</label>
                <input type="text" className="form-control" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="kis cheez ke paise hain?" required />
              </div>
              <div style={{ flex: '1 1 150px' }}>
                <label className="fw-bold">کیٹیگری (Category):</label>
                <select className="form-control" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="General">General</option>
                  <option value="Kisan/Beopari">Kisan / Beopari</option>
                  <option value="Mazdoori">Mazdoori</option>
                  <option value="Kharcha">Dukan Kharcha</option>
                </select>
              </div>
              <div>
                <button type="submit" className={`btn btn-${entryForm === 'Jama' ? 'success' : 'danger'} fw-bold px-4`} disabled={saving}>
                  {saving ? '⏳...' : 'Save ✅'}
                </button>
                <button type="button" onClick={() => setEntryForm(null)} className="btn btn-secondary ms-2 fw-bold">Cancel ❌</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <h4 className="mb-3 border-bottom pb-2" style={{ color: '#000080' }}>📝 آج کی تفصیلات (Today's Entries)</h4>
      <div className="table-responsive shadow-sm">
        <table className="table table-bordered table-striped text-center align-middle" dir="rtl">
          <thead className="table-dark">
            <tr>
              <th>حوالہ نمبر (Ref ID)</th>
              <th>وقت (Time)</th>
              <th>پارٹی (Party)</th>
              <th>تفصیل (Description)</th>
              <th>کیٹیگری (Category)</th>
              <th>جمع (IN)</th>
              <th>نام (OUT)</th>
            </tr>
          </thead>
          <tbody>
            {rokar.transactions.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center text-muted py-4">آج ابھی تک کوئی لین دین نہیں ہوا۔ (No entries yet)</td>
              </tr>
            ) : (
              [...rokar.transactions].reverse().map((t, index) => (
                <tr key={index}>
                  <td className="fw-bold text-primary" dir="ltr">{t.referenceId || 'N/A'}</td>
                  <td dir="ltr">{t.time}</td>
                  <td className="fw-bold">{t.partyName || 'Cash / General'}</td>
                  <td className="text-start">{t.description}</td>
                  <td>{t.category}</td>
                  <td className="text-success fw-bold">{t.type === 'Jama' ? `Rs. ${t.amount.toLocaleString()}` : '-'}</td>
                  <td className="text-danger fw-bold">{t.type === 'Naam' ? `Rs. ${t.amount.toLocaleString()}` : '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}

export default Rokar;