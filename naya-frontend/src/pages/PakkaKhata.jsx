import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function PakkaKhata() {
  const [searchName, setSearchName] = useState('');
  const [partyData, setPartyData] = useState(null);
  const navigate = useNavigate();

  // NAYA: Search button dabane par backend se Party ka data mangwana
  const searchKhata = async () => {
    // ✅ BUG FIX #3: trim() - user ke type kiye extra spaces hataao
    const trimmedName = searchName.trim();
    if (!trimmedName) return alert("Pehle party ka naam likhein!");
    
    try {
      const token = localStorage.getItem('token');
      
      // ✅ trimmedName bhejo - raw searchName nahi
      const response = await fetch(`/api/rokar/khata/${encodeURIComponent(trimmedName)}`, {
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
        navigate('/login');
        return;
      }

      if (!response.ok) throw new Error("Khata nahi mila");

      const data = await response.json();
      setPartyData(data);
    } catch (err) {
      alert("❌ Is naam ka koi khata database mein nahi mila!");
      setPartyData(null);
    }
  };

  // Hisaab Kitab (Totals)
  let totalJama = 0;    
  let totalNaam = 0; 

  if (partyData && partyData.transactions) {
    partyData.transactions.forEach(item => {
      // ✅ FIX: Naye backend fields use kiye hain
      totalJama += (item.credit || 0); 
      totalNaam += (item.debit || 0);  
    });
  }

  // ✅ FIX: Asal Database wala currentBalance aur balanceType use kiya hai
  const netBalance = partyData ? partyData.currentBalance : 0;
  let balanceStatus = "";
  let balanceColor = "";

  if (partyData && partyData.currentBalance !== 0) {
    if (partyData.balanceType === 'Jama') {
      balanceStatus = "Aapne Dene Hain (Payable)";
      balanceColor = "#dc3545"; // Laal rang
    } else {
      balanceStatus = "Aapne Lene Hain (Receivable)";
      balanceColor = "#198754"; // Sabz rang
    }
  } else {
    balanceStatus = "Hisaab Nil (Barabar)";
    balanceColor = "#000080"; // Neela rang
  }

  return (
    <div style={{ padding: '30px', fontFamily: 'Arial, sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', color: '#000080' }}>📒 Pakka Khata (سنگل پارٹی لیجر)</h2>
      <p style={{ textAlign: 'center', color: '#666' }}>Kisi bhi Kisan, Beopari ya Khate ka naam likh kar uski poori history dekhein.</p>

      {/* SEARCH BAR */}
      <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', borderTop: '4px solid #198754', marginBottom: '20px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
        <label style={{ fontWeight: 'bold', fontSize: '18px' }}>🔍 Party ka Naam Likhein:</label>
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <input 
            type="text" 
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            placeholder="Misaal ke taur par: Arham" 
            style={{ flex: 1, padding: '15px', fontSize: '18px', borderRadius: '5px', border: '2px solid #000080' }}
          />
          <button 
            onClick={searchKhata} 
            style={{ backgroundColor: '#000080', color: 'white', padding: '0 30px', fontSize: '18px', fontWeight: 'bold', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          >
            تلاش کریں (Search)
          </button>
        </div>
      </div>

      {/* RESULTS TABLE */}
      {partyData && (
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
          <h3 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Khata: <strong style={{ color: '#000080' }}>{partyData.name}</strong></span>
            <span style={{ fontSize: '16px', color: '#666' }}>Type: {partyData.partyType}</span>
          </h3>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', textAlign: 'center' }}>
            <thead>
              <tr style={{ backgroundColor: '#000080', color: 'white' }}>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>حوالہ نمبر (Ref)</th>
                <th style={thStyle}>تفصیل (Details)</th>
                <th style={thStyle}>جمع (IN)</th>
                <th style={thStyle}>نام (OUT)</th>
              </tr>
            </thead>
            <tbody>
              {(!partyData.transactions || partyData.transactions.length === 0) ? (
                <tr><td colSpan="5" style={{ padding: '20px' }}>Khata bilkul naya hai, koi record nahi mila.</td></tr>
              ) : (
                partyData.transactions.map((item, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #ddd' }}>
                    {/* ✅ FIX: Date aur Naye Fields ko theek kiya */}
                    <td style={tdStyle}>{new Date(item.date).toLocaleDateString('en-GB')}</td>
                    <td style={{...tdStyle, color: '#000080', fontWeight: 'bold'}}>{item.voucherNo || '-'}</td>
                    <td style={{...tdStyle, textAlign: 'left'}}>{item.details}</td>
                    
                    {/* Jama ka column (Credit) */}
                    <td style={{ ...tdStyle, fontWeight: 'bold', color: '#198754' }}>
                      {item.credit > 0 ? `Rs. ${item.credit.toLocaleString()}` : '-'}
                    </td>
                    
                    {/* Naam ka column (Debit) */}
                    <td style={{ ...tdStyle, fontWeight: 'bold', color: '#dc3545' }}>
                      {item.debit > 0 ? `Rs. ${item.debit.toLocaleString()}` : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* TOTALS BOX */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', padding: '15px', backgroundColor: '#e8f4fd', borderRadius: '5px', border: '1px solid #b3d7ff' }}>
            <div style={{ fontSize: '18px' }}><strong>Total Jama (In):</strong> <span style={{ color: '#198754' }}>Rs. {totalJama.toLocaleString()}</span></div>
            <div style={{ fontSize: '18px' }}><strong>Total Naam/Adaigi (Out):</strong> <span style={{ color: '#dc3545' }}>Rs. {totalNaam.toLocaleString()}</span></div>
          </div>

          {/* BAQAYA BALANCE KA BARA DABBA */}
          <div style={{ marginTop: '15px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: `3px solid ${balanceColor}`, textAlign: 'center', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#666' }}>صافی بقایا (Net Balance)</h3>
            <h1 style={{ margin: '0', fontSize: '36px', color: balanceColor }}>
              Rs. {Math.abs(netBalance).toLocaleString()}
            </h1>
            <h2 style={{ margin: '10px 0 0 0', color: balanceColor, backgroundColor: balanceColor + '1A', display: 'inline-block', padding: '5px 15px', borderRadius: '20px' }}>
              {balanceStatus}
            </h2>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle = { padding: '12px', borderBottom: '2px solid #ddd' };
const tdStyle = { padding: '12px' };

export default PakkaKhata;

