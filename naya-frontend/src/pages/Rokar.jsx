import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import CreatableSelect from 'react-select/creatable';

function Rokar() {
  const [data, setData] = useState(null); 
  const [loading, setLoading] = useState(true);
  
  // Nayi Entry ke liye states
  const [entryForm, setEntryForm] = useState(null); 
  const [partyName, setPartyName] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  
  const [category, setCategory] = useState('General');
  const [saving, setSaving] = useState(false);

  const [khatas, setKhatas] = useState([]);
  const [partyOptions, setPartyOptions] = useState([]);
  const [selectedParty, setSelectedParty] = useState(null);

  const userRole = localStorage.getItem('role');
  const getToken = () => localStorage.getItem('token');

  // Rokar Load Karna
  const fetchRokar = async () => {
    try {
      const response = await fetch('/api/rokar/today', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'auth-token': getToken() }
      });

      if (response.status === 401) {
        alert("Aapka session expire ho gaya hai. Dobara login karein!");
        localStorage.clear();
        window.location.href = '/login';
        return;
      }

      if (response.ok) {
        const result = await response.json();
        setData(result); 
      }
    } catch (err) {
      console.error("Rokar lane mein masla:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInitialData = async () => {
    try {
      const khataRes = await fetch('/api/parcha/khatagroup/all', { headers: { 'auth-token': getToken() } });
      if (khataRes.ok) {
        const khataData = await khataRes.json();
        if (Array.isArray(khataData)) {
          setKhatas(khataData);
        }
      }

      const partyRes = await fetch('/api/parcha/parties/all', { headers: { 'auth-token': getToken() } });
      if (partyRes.ok) {
        const partyData = await partyRes.json();
        if (Array.isArray(partyData)) {
          const formatted = partyData.map(p => ({
            value: p.name,
            label: `${p.khataIndex || 'N/A'} - ${p.name}`,
            partyType: p.partyType
          }));
          setPartyOptions(formatted);
        }
      }
    } catch (error) {
      console.error("Master data load error:", error);
    }
  };

  useEffect(() => {
    fetchRokar();
    fetchInitialData();
  }, []);

  const handlePartyChange = (newValue) => {
    setSelectedParty(newValue);
    if (newValue) {
      setPartyName(newValue.value);
      if (newValue.partyType) {
        setCategory(newValue.partyType);
      }
    } else {
      setPartyName('');
      setCategory('General'); 
    }
  };

  const handleAddEntry = async (e) => {
    e.preventDefault();
    if (!amount || !description) return alert('Bhai jan, Raqam aur Tafseel dono likhna zaroori hain!');
    
    setSaving(true);
    
    try {
      const response = await fetch('/api/rokar/add-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'auth-token': getToken() },
        body: JSON.stringify({
          partyName, amount, description, type: entryForm, category
        })
      });

      if (response.status === 401) {
        localStorage.clear();
        window.location.href = '/login';
        return;
      }

      if (response.ok) {
        setPartyName(''); 
        setSelectedParty(null); 
        setAmount('');
        setDescription('');
        setCategory('General'); 
        setEntryForm(null);
        fetchRokar(); 
        fetchInitialData(); 
      } else {
        alert("Entry save karne mein masla aagaya.");
      }
    } catch (error) {
      alert("Network Error!");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (transactionId) => {
    const isConfirm = window.confirm("⚠️ Kya aap waqai yeh entry delete karna chahte hain? (Galla aur Party ka balance automatically reverse ho jayega)");
    
    if (isConfirm) {
      try {
        const response = await fetch(`/api/rokar/delete-entry/${data.rokar._id}/${transactionId}`, {
          method: 'DELETE',
          headers: { 'auth-token': getToken() }
        });

        if (response.ok) {
          alert("✅ Entry kamyabi se delete ho gayi aur balance theek ho gaya!");
          fetchRokar(); 
        } else {
          const errorData = await response.json();
          alert(`❌ Masla aaya: ${errorData.error}`);
        }
      } catch (error) {
        alert("❌ Network Error!");
      }
    }
  };

  const handleCloseRokar = async () => {
    const isConfirm = window.confirm("⚠️ KYA AAP WAQAI AAJ KI ROKAR BAND KARNA CHAHTE HAIN? Iske baad aaj ki tareekh mein koi nayi entry ya delete nahi ho sakega!");
    
    if (isConfirm) {
      try {
        const response = await fetch(`/api/rokar/close`, {
          method: 'PUT',
          headers: { 'auth-token': getToken() }
        });

        if (response.ok) {
          alert("🔒 Aaj ki Rokar band kar di gayi hai!");
          fetchRokar(); 
        } else {
          const err = await response.json();
          alert(`❌ Masla aaya: ${err.error}`);
        }
      } catch (error) {
        alert("❌ Network Error!");
      }
    }
  };

  if (loading) return <h2 className="text-center mt-5">⏳ آج کی روکڑ کھل رہی ہے... (Loading)</h2>;
  if (!data || !data.rokar) return <h2 className="text-center mt-5 text-danger">❌ روکڑ کا نظام چل نہیں رہا۔ (Backend Error)</h2>;

  const { rokar, transactions } = data;
  const isRokarClosed = rokar.isClosed;

  // 🚀 ✅ FIX: Frontend par filter lagaya gaya hai, ab sirf Cash (ROK-) wali entries dikhengi!
  const rokarTransactions = transactions.filter(t => t.voucherNo && t.voucherNo.startsWith('ROK-'));

  const totalJama = rokarTransactions.reduce((tot, t) => tot + (t.credit || 0), 0);
  const totalNaam = rokarTransactions.reduce((tot, t) => tot + (t.debit || 0), 0);
  const aajKaGalla = rokar.closingBalance; 

  const selectStyles = {
    control: (base) => ({
      ...base,
      minHeight: '38px', 
      borderColor: '#dee2e6',
      borderRadius: '0.375rem',
      boxShadow: 'none',
      '&:hover': { borderColor: '#86b7fe' }
    })
  };

  return (
    <div className="container mt-4" style={{ fontFamily: 'Arial, sans-serif' }}>
      
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-2 flex-wrap gap-2">
        <h2 style={{ color: '#000080', fontWeight: 'bold', margin: 0 }}>💰 روزنامچہ / روکڑ (Daily Cashbook)</h2>
        <div className="d-flex align-items-center gap-3">
          <h4 className="badge bg-dark fs-5 mb-0">تاریخ: {rokar.date}</h4>
          {userRole === 'Admin' && !isRokarClosed && (
            <button onClick={handleCloseRokar} className="btn btn-warning text-dark fw-bold shadow">
              🔒 روکڑ بند کریں (Lock)
            </button>
          )}
        </div>
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

      {isRokarClosed ? (
        <div className="alert alert-danger text-center fw-bold fs-5 shadow-sm py-3 mb-4">
          🔒 آج کی روکڑ بند (Lock) ہو چکی ہے۔ اب اس میں مزید کوئی انٹری یا تبدیلی نہیں کی جا سکتی!
        </div>
      ) : (
        <div className="d-flex gap-3 mb-4">
          <button onClick={() => setEntryForm('Jama')} className="btn btn-success flex-fill fs-5 fw-bold shadow">
            ➕ رقم جمع کریں (Cash IN)
          </button>
          <button onClick={() => setEntryForm('Naam')} className="btn btn-danger flex-fill fs-5 fw-bold shadow">
            ➖ رقم ادا کریں (Cash OUT)
          </button>
        </div>
      )}

      {/* Entry Form */}
      {entryForm && !isRokarClosed && (
        <div className={`card shadow mb-4 border-${entryForm === 'Jama' ? 'success' : 'danger'}`}>
          <div className={`card-header text-white bg-${entryForm === 'Jama' ? 'success' : 'danger'} fw-bold fs-5`}>
            {entryForm === 'Jama' ? '🟢 نئی جمع درج کریں (New Cash IN)' : '🔴 نیا نام درج کریں (New Cash OUT)'}
          </div>
          <div className="card-body bg-light">
            <form onSubmit={handleAddEntry}>
              <div className="row g-3 align-items-end">
                
                <div className="col-md-3">
                  <label className="form-label fw-bold text-secondary small mb-1">کھاتہ / پارٹی (Party):</label>
                  <CreatableSelect 
                    options={partyOptions}
                    value={selectedParty}
                    onChange={handlePartyChange}
                    placeholder="1001 ya naam likhein..."
                    styles={selectStyles}
                    isClearable
                    formatCreateLabel={(inputValue) => `Naya Khata: "${inputValue}"`}
                  />
                </div>

                <div className="col-md-2">
                  <label className="form-label fw-bold text-secondary small mb-1">رقم (Amount):</label>
                  <input type="number" className="form-control" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" required />
                </div>
                
                <div className="col-md-4">
                  <label className="form-label fw-bold text-secondary small mb-1">تفصیل (Description):</label>
                  <input type="text" className="form-control" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="kis cheez ke paise hain?" required />
                </div>
                
                <div className="col-md-3">
                  <label className="form-label fw-bold text-secondary small mb-1">کیٹیگری (Category):</label>
                  <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)} required>
                    <option value="General">General (جنرل)</option>
                    {khatas.map(k => (
                      <option key={k._id} value={k.name}>{k.name}</option>
                    ))}
                  </select>
                </div>

              </div>

              <div className="row mt-4">
                <div className="col-12 text-end">
                  <button type="button" onClick={() => setEntryForm(null)} className="btn btn-outline-secondary fw-bold px-4 me-2 shadow-sm">
                    Cancel ❌
                  </button>
                  <button type="submit" className={`btn btn-${entryForm === 'Jama' ? 'success' : 'danger'} fw-bold px-5 shadow-sm`} disabled={saving}>
                    {saving ? '⏳...' : 'Save ✅'}
                  </button>
                </div>
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
              {userRole === 'Admin' && !isRokarClosed && <th>ایکشن (Action)</th>}
            </tr>
          </thead>
          <tbody>
            {rokarTransactions.length === 0 ? (
              <tr>
                <td colSpan={userRole === 'Admin' && !isRokarClosed ? "8" : "7"} className="text-center text-muted py-4">آج ابھی تک گلے کا کوئی لین دین نہیں ہوا۔</td>
              </tr>
            ) : (
              [...rokarTransactions].map((t, index) => (
                <tr key={index}>
                  <td className="fw-bold text-primary" dir="ltr">{t.voucherNo || 'N/A'}</td>
                  <td dir="ltr">{new Date(t.date).toLocaleTimeString()}</td>
                  <td className="fw-bold">{t.partyName || 'Cash / General'}</td>
                  <td className="text-start">{t.details}</td>
                  <td>{t.transactionType}</td>
                  <td className="text-success fw-bold">{t.credit > 0 ? `Rs. ${t.credit.toLocaleString()}` : '-'}</td>
                  <td className="text-danger fw-bold">{t.debit > 0 ? `Rs. ${t.debit.toLocaleString()}` : '-'}</td>
                  
                  {userRole === 'Admin' && !isRokarClosed && (
                    <td>
                      <button 
                        onClick={() => handleDeleteEntry(t._id)}
                        className="btn btn-sm btn-danger fw-bold"
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  )}
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