import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

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

  // ✅ NAYA: User ka role check karne ke liye taake Delete button sirf Admin ko dikhe
  const userRole = localStorage.getItem('role');

  // Rokar Load Karna
  const fetchRokar = async () => {
    try {
      const token = localStorage.getItem('token');

      const response = await fetch('/api/rokar/today', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'auth-token': token 
        }
      });

      if (response.status === 401) {
        alert("Aapka session expire ho gaya hai. Dobara login karein!");
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        window.location.href = '/login';
        return;
      }

      if (response.ok) {
        const result = await response.json();
        setData(result); 
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
    const token = localStorage.getItem('token'); 
    
    try {
      const response = await fetch('/api/rokar/add-entry', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'auth-token': token 
        },
        body: JSON.stringify({
          partyName,
          amount,
          description,
          type: entryForm,
          category
        })
      });

      if (response.status === 401) {
        alert("Aapka session expire ho gaya hai. Dobara login karein!");
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        window.location.href = '/login';
        return;
      }

      if (response.ok) {
        setPartyName(''); 
        setAmount('');
        setDescription('');
        setCategory('General');
        setEntryForm(null);
        fetchRokar(); // Data wapis taaza karo
      } else {
        alert("Entry save karne mein masla aagaya.");
      }
    } catch (error) {
      alert("Network Error!");
    } finally {
      setSaving(false);
    }
  };

  // Entry Delete karne ka function
  const handleDeleteEntry = async (transactionId) => {
    const isConfirm = window.confirm("⚠️ Kya aap waqai yeh entry delete karna chahte hain? (Galla aur Party ka balance automatically reverse ho jayega)");
    
    if (isConfirm) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/rokar/delete-entry/${data.rokar._id}/${transactionId}`, {
          method: 'DELETE',
          headers: {
            'auth-token': token
          }
        });

        if (response.status === 401) {
          alert("Aapka session expire ho gaya hai. Dobara login karein!");
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          window.location.href = '/login';
          return;
        }

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

  // Rokar Lock karne ka function
  const handleCloseRokar = async () => {
    const isConfirm = window.confirm("⚠️ KYA AAP WAQAI AAJ KI ROKAR BAND KARNA CHAHTE HAIN? Iske baad aaj ki tareekh mein koi nayi entry ya delete nahi ho sakega!");
    
    if (isConfirm) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/rokar/close`, {
          method: 'PUT',
          headers: {
            'auth-token': token
          }
        });

        if (response.ok) {
          alert("🔒 Aaj ki Rokar band kar di gayi hai!");
          fetchRokar(); // Page refresh karo taake button gayab ho jayen
        } else {
          const err = await response.json();
          alert(`❌ Masla aaya: ${err.error}`);
        }
      } catch (error) {
        alert("❌ Network Error!");
      }
    }
  };

  if (loading) {
    return <h2 className="text-center mt-5">⏳ آج کی روکڑ کھل رہی ہے... (Loading)</h2>;
  }

  if (!data || !data.rokar) {
    return <h2 className="text-center mt-5 text-danger">❌ روکڑ کا نظام چل نہیں رہا۔ (Backend Error)</h2>;
  }

  const { rokar, transactions } = data;
  const isRokarClosed = rokar.isClosed;

  const totalJama = transactions.reduce((tot, t) => tot + (t.credit || 0), 0);
  const totalNaam = transactions.reduce((tot, t) => tot + (t.debit || 0), 0);
  const aajKaGalla = rokar.closingBalance; 

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

      {/* Nayi Entry Ka Form */}
      {entryForm && !isRokarClosed && (
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
                  <option value="Wasoli">Wasoli</option>
                  <option value="Adaigi">Adaigi</option>
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
              {userRole === 'Admin' && !isRokarClosed && <th>ایکشن (Action)</th>}
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={userRole === 'Admin' && !isRokarClosed ? "8" : "7"} className="text-center text-muted py-4">آج ابھی تک کوئی لین دین نہیں ہوا۔ (No entries yet)</td>
              </tr>
            ) : (
              [...transactions].map((t, index) => (
                <tr key={index}>
                  <td className="fw-bold text-primary" dir="ltr">{t.voucherNo || 'N/A'}</td>
                  <td dir="ltr">{new Date(t.date).toLocaleTimeString()}</td>
                  <td className="fw-bold">{t.partyName || 'Cash / General'}</td>
                  <td className="text-start">{t.details}</td>
                  <td>{t.transactionType}</td>
                  <td className="text-success fw-bold">{t.credit > 0 ? `Rs. ${t.credit.toLocaleString()}` : '-'}</td>
                  <td className="text-danger fw-bold">{t.debit > 0 ? `Rs. ${t.debit.toLocaleString()}` : '-'}</td>
                  
                  {/* ✅ NAYA: Delete Button sirf Seth (Admin) ko dikhega, aur sirf ROK- entries par */}
                  {userRole === 'Admin' && !isRokarClosed && (
                    <td>
                      {t.voucherNo && t.voucherNo.startsWith('ROK-') ? (
                        <button 
                          onClick={() => handleDeleteEntry(t._id)}
                          className="btn btn-sm btn-danger fw-bold"
                        >
                          🗑️ Delete
                        </button>
                      ) : (
                        <span className="badge bg-secondary text-light">🔒 History se Delete karein</span>
                      )}
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