import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// ✅ NAYA: Searchable aur Creatable Dropdown ke liye
import CreatableSelect from 'react-select/creatable';

function JournalVoucher() {
  const [debitParty, setDebitParty]   = useState('');
  const [creditParty, setCreditParty] = useState('');
  const [amount, setAmount]           = useState('');
  const [details, setDetails]         = useState('');
  // ✅ FIX: Default Category hamesha "General" rahay gi
  const [khataCategory, setKhataCategory] = useState('General');
  const [status, setStatus]           = useState('');
  const [lastVoucher, setLastVoucher] = useState(null);
  const [loading, setLoading]         = useState(false);

  // ✅ NAYA: Parties aur Khatas ki states
  const [khatas, setKhatas] = useState([]);
  const [partyOptions, setPartyOptions] = useState([]);
  const [selectedDebitParty, setSelectedDebitParty] = useState(null);
  const [selectedCreditParty, setSelectedCreditParty] = useState(null);

  const navigate  = useNavigate();
  const getToken  = () => localStorage.getItem('token');
  const userRole  = localStorage.getItem('role');

  const handleSessionExpire = () => {
    alert("Aapka session expire ho gaya hai. Dobara login karein!");
    localStorage.clear();
    navigate('/login');
  };

  // ✅ NAYA: Database se Khata Settings aur Parties load karna
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // 1. Fetch Khata Categories (Sirf list mein dikhane ke liye)
        const khataRes = await fetch('/api/parcha/khatagroup/all', { headers: { 'auth-token': getToken() } });
        if (khataRes.ok) {
          const khataData = await khataRes.json();
          if (Array.isArray(khataData)) {
            setKhatas(khataData);
          }
        }

        // 2. Fetch Parties for Smart Dropdown
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
    fetchInitialData();
  }, []);

  // ✅ NAYA: Debit aur Credit party change handlers
  const handleDebitChange = (newValue) => {
    setSelectedDebitParty(newValue);
    setDebitParty(newValue ? newValue.value : '');
    // Note: Yahan category auto-update nahi ki gayi taake by default "General" hi rahay
  };

  const handleCreditChange = (newValue) => {
    setSelectedCreditParty(newValue);
    setCreditParty(newValue ? newValue.value : '');
    // Note: Yahan bhi category auto-update nahi ki gayi
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!debitParty || !creditParty) {
      setStatus('❌ Debit aur Credit party dono ka muntakhib hona zaroori hai!');
      return;
    }

    setLoading(true);
    setStatus('');

    try {
      const response = await fetch('/api/parcha/journal/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'auth-token': getToken()
        },
        body: JSON.stringify({
          debitPartyName: debitParty,
          creditPartyName: creditParty,
          amount,
          details,
          khataCategory
        })
      });

      if (response.status === 401) return handleSessionExpire();

      const data = await response.json();

      if (response.ok) {
        setStatus('✅ ' + data.message + ' | Voucher: ' + data.voucherNo);
        setLastVoucher(data);
        // Form reset
        setDebitParty('');
        setCreditParty('');
        setSelectedDebitParty(null);
        setSelectedCreditParty(null);
        setAmount('');
        setDetails('');
        setKhataCategory('General'); // Reset honay par phir se General
      } else {
        setStatus('❌ ' + (data.error || 'Masla aagaya!'));
      }
    } catch (err) {
      setStatus('❌ Network Error!');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (voucherNo) => {
    if (!window.confirm(`⚠️ Kya aap ${voucherNo} delete karna chahte hain? Dono party balances reverse ho jayenge.`)) return;

    try {
      const response = await fetch(`/api/parcha/journal/delete/${voucherNo}`, {
        method: 'DELETE',
        headers: { 'auth-token': getToken() }
      });

      if (response.status === 401) return handleSessionExpire();

      const data = await response.json();
      if (response.ok) {
        alert('✅ ' + data.message);
        setLastVoucher(null);
        setStatus('');
      } else {
        alert('❌ ' + (data.error || 'Delete nahi ho saka.'));
      }
    } catch (err) {
      alert('❌ Network Error!');
    }
  };

  // React Select Styling
  const selectStyles = {
    control: (base) => ({
      ...base,
      padding: '4px',
      borderRadius: '5px',
      borderColor: '#ccc',
      boxShadow: 'none',
      fontSize: '15px',
      '&:hover': { borderColor: '#6f42c1' }
    })
  };

  return (
    <div style={{ padding: '30px', fontFamily: 'Arial', maxWidth: '750px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ borderBottom: '3px solid #6f42c1', paddingBottom: '12px', marginBottom: '25px' }}>
        <h2 style={{ color: '#6f42c1', margin: 0 }}>📒 Journal Voucher (جرنل واؤچر)</h2>
        <p style={{ color: '#666', margin: '5px 0 0 0', fontSize: '14px' }}>
          Non-cash transfer — Ek party se doosri party ka hisaab lagao (Rokar affect nahi hoga)
        </p>
      </div>

      {/* Explanation Box */}
      <div style={{ backgroundColor: '#f3e8ff', border: '1px solid #c084fc', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '14px' }}>
        <b>📌 Kab use karein?</b>
        <ul style={{ margin: '6px 0 0 0', paddingLeft: '20px' }}>
          <li>Kharidar ne Kisan ko seedha pay kiya — hum dono ka record update karein</li>
          <li>Ek party ka balance doosri party ko transfer karna ho</li>
          <li>Adjustment entry — koi galti theek karni ho</li>
        </ul>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ backgroundColor: '#f8f9fa', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>

        {/* Debit & Credit Parties */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>

          {/* DEBIT (Naam) */}
          <div style={{ flex: 1, backgroundColor: '#fff5f5', border: '2px solid #dc3545', borderRadius: '8px', padding: '15px' }}>
            <label style={{ fontWeight: 'bold', color: '#dc3545', display: 'block', marginBottom: '8px' }}>
              🔴 Naam / Debit Party
            </label>
            <small style={{ color: '#666', display: 'block', marginBottom: '8px' }}>
              Jis party ka balance GHATEGA
            </small>
            <CreatableSelect 
              options={partyOptions}
              value={selectedDebitParty}
              onChange={handleDebitChange}
              placeholder="1001 ya naam likhein..."
              styles={selectStyles}
              isClearable
              formatCreateLabel={(inputValue) => `Naya Khata: "${inputValue}"`}
            />
          </div>

          {/* Arrow */}
          <div style={{ display: 'flex', alignItems: 'center', fontSize: '28px', color: '#6f42c1', fontWeight: 'bold' }}>
            →
          </div>

          {/* CREDIT (Jama) */}
          <div style={{ flex: 1, backgroundColor: '#f0fff4', border: '2px solid #198754', borderRadius: '8px', padding: '15px' }}>
            <label style={{ fontWeight: 'bold', color: '#198754', display: 'block', marginBottom: '8px' }}>
              🟢 Jama / Credit Party
            </label>
            <small style={{ color: '#666', display: 'block', marginBottom: '8px' }}>
              Jis party ka balance BADHEGA
            </small>
            <CreatableSelect 
              options={partyOptions}
              value={selectedCreditParty}
              onChange={handleCreditChange}
              placeholder="1001 ya naam likhein..."
              styles={selectStyles}
              isClearable
              formatCreateLabel={(inputValue) => `Naya Khata: "${inputValue}"`}
            />
          </div>
        </div>

        {/* Amount & Category */}
        <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
              💰 Raqam (Amount):
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              required
              min="1"
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
              📁 Khata Category:
            </label>
            <select
              value={khataCategory}
              onChange={(e) => setKhataCategory(e.target.value)}
              style={inputStyle}
            >
              <option value="General">General</option>
              {khatas.map(k => (
                <option key={k._id} value={k.name}>{k.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Details/Narration */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
            📝 Tafseel / Narration (Kyu transfer ho raha hai?):
          </label>
          <input
            type="text"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Misal: Gandum ki payment ka hisaab..."
            required
            style={inputStyle}
          />
        </div>

        {/* Preview Box */}
        {debitParty && creditParty && amount > 0 && (
          <div style={{ backgroundColor: '#e8d5ff', border: '1px solid #6f42c1', borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
            <h5 style={{ margin: '0 0 10px 0', color: '#6f42c1' }}>📋 Entry Preview:</h5>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
              <div>
                <span style={{ color: '#dc3545', fontWeight: 'bold' }}>Dr. {debitParty}</span>
                <span style={{ color: '#999', margin: '0 10px' }}>→</span>
                <span style={{ color: '#198754', fontWeight: 'bold' }}>Cr. {creditParty}</span>
              </div>
              <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#6f42c1' }}>
                Rs. {Number(amount).toLocaleString()}
              </div>
            </div>
            <div style={{ marginTop: '5px', color: '#555', fontSize: '13px' }}>
              🔒 Rokar (Cash Book) affect nahi hoga
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '15px', backgroundColor: loading ? '#999' : '#6f42c1', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? '⏳ Save ho raha hai...' : '💾 Journal Voucher Save Karein'}
        </button>

        {status && (
          <p style={{ marginTop: '15px', textAlign: 'center', fontWeight: 'bold', fontSize: '16px', color: status.includes('❌') ? '#dc3545' : '#198754' }}>
            {status}
          </p>
        )}
      </form>

      {/* Last Saved Voucher */}
      {lastVoucher && (
        <div style={{ marginTop: '25px', backgroundColor: '#e8f4fd', border: '2px solid #0d6efd', borderRadius: '10px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, color: '#0d6efd' }}>✅ Aakhri Journal Voucher</h4>
            <span style={{ backgroundColor: '#0d6efd', color: 'white', padding: '5px 12px', borderRadius: '20px', fontWeight: 'bold' }}>
              {lastVoucher.voucherNo}
            </span>
          </div>
          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
            <div>
              <span style={{ color: '#dc3545', fontWeight: 'bold' }}>Dr. {lastVoucher.debitParty}</span>
              <span style={{ color: '#999', margin: '0 8px' }}>→</span>
              <span style={{ color: '#198754', fontWeight: 'bold' }}>Cr. {lastVoucher.creditParty}</span>
            </div>
            <div style={{ fontWeight: 'bold', fontSize: '18px' }}>
              Rs. {Number(lastVoucher.amount).toLocaleString()}
            </div>
          </div>
          {/* Delete sirf Admin kar sakta hai */}
          {userRole === 'Admin' && (
            <button
              onClick={() => handleDelete(lastVoucher.voucherNo)}
              style={{ marginTop: '12px', padding: '8px 18px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              🗑️ Is Voucher ko Delete Karein
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '10px',
  borderRadius: '5px',
  border: '1px solid #ccc',
  fontSize: '15px',
  boxSizing: 'border-box'
};

export default JournalVoucher;