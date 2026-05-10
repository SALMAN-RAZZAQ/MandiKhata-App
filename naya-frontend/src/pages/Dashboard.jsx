import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const [ledger, setLedger] = useState([]);
  const [categories, setCategories] = useState([]);
  
  // Default section 'All' kar diya hai taake khulte hi sab nazar aaye
  const [selectedSection, setSelectedSection] = useState('All'); 
  
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  
  const navigate = useNavigate();
  const getToken = () => localStorage.getItem('token');
  const userRole = localStorage.getItem('role'); 

  const handleSessionExpire = () => {
    alert("Aapka session expire ho gaya hai. Dobara login karein!");
    localStorage.clear();
    navigate('/login');
  };

  const fetchLedger = () => {
    fetch('/api/parcha/all', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'auth-token': getToken() 
      }
    })
      .then(res => {
        if (res.status === 401) throw new Error('Unauthorized');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setLedger(data);
        } else {
          setLedger([]);
        }
      })
      .catch(err => {
        if (err.message === 'Unauthorized') handleSessionExpire();
        else setLedger([]);
      });
  };

  useEffect(() => {
    fetchLedger();
    
    fetch('/api/parcha/khatagroup/all', {
      headers: { 'auth-token': getToken() }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCategories(data);
        } else {
          setCategories([]);
        }
      })
      .catch(err => setCategories([]));
  }, []);

  const filteredLedger = ledger.filter(entry => {
    const matchSection = selectedSection === 'All' ? true : entry.khataCategory === selectedSection;
    
    let matchDate = true;
    const entryDate = new Date(entry.date);
    entryDate.setHours(0, 0, 0, 0); 

    if (fromDate) {
      const fDate = new Date(fromDate);
      fDate.setHours(0, 0, 0, 0);
      if (entryDate < fDate) matchDate = false;
    }
    
    if (toDate) {
      const tDate = new Date(toDate);
      tDate.setHours(23, 59, 59, 999); 
      if (entryDate > tDate) matchDate = false;
    }

    return matchSection && matchDate;
  });

  return (
    <div style={{ padding: '30px', fontFamily: 'Arial, sans-serif' }}>
      <h2>📊 Master Roznamcha (روزنامچہ)</h2>
      <p style={{ color: 'gray' }}>Yahan dukan ki saari entries (Parcha, Parta, Rokar, Journal) nazar aati hain.</p>

      {/* DATE FILTER BAR */}
      <div style={{ display: 'flex', gap: '20px', backgroundColor: '#e8f4fd', padding: '15px', borderRadius: '8px', border: '1px solid #b3d7ff', marginBottom: '20px', alignItems: 'center' }}>
        <h4 style={{ margin: 0, color: '#000080' }}>📅 Tareekh Se Dhoondein:</h4>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontWeight: 'bold' }}>Kab Se (From):</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={inputStyle} />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontWeight: 'bold' }}>Kab Tak (To):</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={inputStyle} />
        </div>

        <button onClick={() => { setFromDate(''); setToDate(''); }} style={{ padding: '10px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
          🔄 Clear Filters
        </button>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button onClick={() => setSelectedSection('All')} style={tabStyle(selectedSection === 'All')}>
          Sab Mix (All)
        </button>
        <button onClick={() => setSelectedSection('Kisan')} style={tabStyle(selectedSection === 'Kisan')}>
          🌾 Kisan
        </button>
        {categories.map(cat => (
          <button key={cat._id} onClick={() => setSelectedSection(cat.name)} style={tabStyle(selectedSection === cat.name)}>
            📁 {cat.name}
          </button>
        ))}
      </div>

      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
        <h3>Showing: {selectedSection} {fromDate || toDate ? '(Filtered by Date)' : ''}</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#000080', color: 'white', textAlign: 'left' }}>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Voucher No</th>
              <th style={thStyle}>Party Name</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Details</th>
              <th style={thStyle}>Jama (Credit)</th>
              <th style={thStyle}>Naam (Debit)</th>
            </tr>
          </thead>
          <tbody>
            {filteredLedger.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ padding: '20px', textAlign: 'center', fontWeight: 'bold' }}>
                  Is filter mein abhi tak koi entry nahi mili.
                </td>
              </tr>
            ) : (
              filteredLedger.map(item => (
                <tr key={item._id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={tdStyle}>{new Date(item.date).toLocaleDateString('en-GB')}</td>
                  <td style={{ ...tdStyle, color: '#0d6efd', fontWeight: 'bold' }}>{item.voucherNo}</td>
                  <td style={{ ...tdStyle, fontWeight: 'bold' }}>{item.partyName}</td>
                  <td style={tdStyle}>
                    <span style={typeBadge(item.transactionType)}>
                      {item.transactionType}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, fontSize: '14px', color: '#555' }}>{item.details}</td>
                  <td style={{ ...tdStyle, color: '#198754', fontWeight: 'bold' }}>
                    {item.credit > 0 ? `Rs. ${item.credit.toLocaleString()}` : '-'}
                  </td>
                  <td style={{ ...tdStyle, color: '#dc3545', fontWeight: 'bold' }}>
                    {item.debit > 0 ? `Rs. ${item.debit.toLocaleString()}` : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const inputStyle = { padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px' };
const tabStyle = (isActive) => ({ padding: '10px 20px', backgroundColor: isActive ? '#000080' : '#e0e0e0', color: isActive ? 'white' : 'black', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' });
const thStyle = { padding: '12px', borderBottom: '2px solid #ddd' };
const tdStyle = { padding: '12px' };
const typeBadge = (type) => {
  let bgColor = '#6c757d';
  if (type === 'Adaigi' || type === 'Naam') bgColor = '#dc3545';
  else if (type === 'Wasooli' || type === 'Jama') bgColor = '#198754';
  else if (type === 'Journal') bgColor = '#0d6efd';
  else if (type === 'Parta Bill') bgColor = '#ffc107'; 
  
  return { padding: '5px 10px', borderRadius: '15px', color: type === 'Parta Bill' ? 'black' : 'white', fontSize: '12px', fontWeight: 'bold', backgroundColor: bgColor };
};

export default Dashboard;