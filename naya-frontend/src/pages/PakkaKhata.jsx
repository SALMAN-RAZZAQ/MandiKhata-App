import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select'; // ✅ NAYA: High-performance dropdown

function PakkaKhata() {
  const [partyData, setPartyData] = useState(null);
  const [partyOptions, setPartyOptions] = useState([]);
  const [selectedParty, setSelectedParty] = useState(null);
  const navigate = useNavigate();
  const getToken = () => localStorage.getItem('token');

  // ✅ NAYA: Partiyan load karna
  useEffect(() => {
    const fetchParties = async () => {
      try {
        const response = await fetch('/api/parcha/parties/all', {
          headers: { 'auth-token': getToken() }
        });
        if (response.ok) {
          const data = await response.json();
          // Dropdown ke liye format: "1001 - Gaffar"
          const formatted = data.map(p => ({
            value: p.name,
            label: `${p.khataIndex || 'N/A'} - ${p.name}`
          }));
          setPartyOptions(formatted);
        }
      } catch (error) {
        console.error("Parties load nahi huin:", error);
      }
    };
    fetchParties();
  }, []);

  // ✅ NAYA: Smart Search Function
  const searchKhata = async (selectedOption) => {
    if (!selectedOption) return;
    
    setSelectedParty(selectedOption);
    const partyName = selectedOption.value;
    
    try {
      const response = await fetch(`/api/rokar/khata/${encodeURIComponent(partyName)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'auth-token': getToken()
        }
      });

      if (response.status === 401) {
        alert("Aapka session expire ho gaya hai. Dobara login karein!");
        localStorage.clear();
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
      totalJama += (item.credit || 0); 
      totalNaam += (item.debit || 0);  
    });
  }

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

  // React Select Style
  const selectStyles = {
    control: (base) => ({
      ...base,
      padding: '8px',
      borderColor: '#000080',
      borderWidth: '2px',
      borderRadius: '5px',
      boxShadow: 'none',
      '&:hover': { borderColor: '#000080' }
    })
  };

  return (
    <div style={{ padding: '30px', fontFamily: 'Arial, sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', color: '#000080' }}>📒 Pakka Khata (سنگل پارٹی لیجر)</h2>
      <p style={{ textAlign: 'center', color: '#666' }}>Kisi bhi Kisan, Beopari ya Khate ka naam likh kar uski poori history dekhein.</p>

      {/* SEARCH BAR */}
      <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', borderTop: '4px solid #198754', marginBottom: '20px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
        <label style={{ fontWeight: 'bold', fontSize: '18px' }}>🔍 Party ka Naam Likhein:</label>
        <div style={{ marginTop: '10px' }}>
          <Select 
            options={partyOptions}
            value={selectedParty}
            onChange={searchKhata}
            placeholder="Misaal ke taur par: 1001 ya Gaffar..."
            styles={selectStyles}
            isSearchable
            isClearable
          />
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
                    <td style={tdStyle}>{new Date(item.date).toLocaleDateString('en-GB')}</td>
                    <td style={{...tdStyle, color: '#000080', fontWeight: 'bold'}}>{item.voucherNo || '-'}</td>
                    <td style={{...tdStyle, textAlign: 'left'}}>{item.details}</td>
                    
                    <td style={{ ...tdStyle, fontWeight: 'bold', color: '#198754' }}>
                      {item.credit > 0 ? `Rs. ${item.credit.toLocaleString()}` : '-'}
                    </td>
                    
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