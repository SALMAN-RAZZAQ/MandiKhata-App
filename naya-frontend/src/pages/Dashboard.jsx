import React, { useState, useEffect } from 'react';

function Dashboard() {
  const [ledger, setLedger] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedSection, setSelectedSection] = useState('All');
  
  // NAYA: Date filter ke liye state variables
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchLedger = () => {
    fetch('http://localhost:5000/api/parcha/all')
      .then(res => res.json())
      .then(data => setLedger(data));
  };

  useEffect(() => {
    fetchLedger();
    fetch('http://localhost:5000/api/parcha/khatagroup/all')
      .then(res => res.json())
      .then(data => setCategories(data));
  }, []);

  const handleDelete = async (id) => {
    const isConfirm = window.confirm("⚠️ Kya aap waqai yeh Parchi delete karna chahte hain? (Party ka balance khud theek ho jayega)");
    if (isConfirm) {
      try {
        const response = await fetch(`http://localhost:5000/api/parcha/delete/${id}`, { method: 'DELETE' });
        if (response.ok) {
          alert("✅ Parchi kamyabi se delete ho gayi!");
          fetchLedger(); 
        } else {
          alert("❌ Delete karne mein masla aaya.");
        }
      } catch (error) { alert("❌ Network error."); }
    }
  };

  // NAYA: Khata Section aur Date dono se filter karne ki Logic
  const filteredLedger = ledger.filter(entry => {
    // 1. Check karein ke Khata Section match hota hai ya nahi
    const matchSection = selectedSection === 'All' ? true : entry.khataCategory === selectedSection;
    
    // 2. Check karein ke Date match hoti hai ya nahi
    let matchDate = true;
    const entryDate = new Date(entry.date);
    entryDate.setHours(0, 0, 0, 0); // Time ko ignore karne ke liye

    if (fromDate) {
      const fDate = new Date(fromDate);
      fDate.setHours(0, 0, 0, 0);
      if (entryDate < fDate) matchDate = false;
    }
    
    if (toDate) {
      const tDate = new Date(toDate);
      tDate.setHours(23, 59, 59, 999); // Us din ke aakhir tak
      if (entryDate > tDate) matchDate = false;
    }

    return matchSection && matchDate;
  });

  return (
    <div style={{ padding: '30px', fontFamily: 'Arial, sans-serif' }}>
      <h2>📊 Organized Roznamcha (روزنامچہ)</h2>

      {/* NAYA: DATE FILTER BAR */}
      <div style={{ display: 'flex', gap: '20px', backgroundColor: '#e8f4fd', padding: '15px', borderRadius: '8px', border: '1px solid #b3d7ff', marginBottom: '20px', alignItems: 'center' }}>
        <h4 style={{ margin: 0, color: '#000080' }}>📅 Tareekh Se Dhoondein:</h4>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontWeight: 'bold' }}>Kab Se (From):</label>
          <input 
            type="date" 
            value={fromDate} 
            onChange={(e) => setFromDate(e.target.value)} 
            style={inputStyle} 
          />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontWeight: 'bold' }}>Kab Tak (To):</label>
          <input 
            type="date" 
            value={toDate} 
            onChange={(e) => setToDate(e.target.value)} 
            style={inputStyle} 
          />
        </div>

        <button 
          onClick={() => { setFromDate(''); setToDate(''); }} 
          style={{ padding: '10px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
          🔄 Clear Filters
        </button>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button onClick={() => setSelectedSection('All')} style={tabStyle(selectedSection === 'All')}>
          Sab Mix (All)
        </button>
        <button onClick={() => setSelectedSection('Kisan / Beopari (Default)')} style={tabStyle(selectedSection === 'Kisan / Beopari (Default)')}>
          🌾 Kisan / Beopari
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
              <th style={thStyle}>Party Name</th>
              <th style={thStyle}>Khata Section</th>
              <th style={thStyle}>Type (Qisam)</th>
              <th style={thStyle}>Amount</th>
              <th style={thStyle}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredLedger.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '20px', textAlign: 'center', fontWeight: 'bold' }}>
                  Is filter mein abhi tak koi entry nahi mili.
                </td>
              </tr>
            ) : (
              filteredLedger.map(item => (
                <tr key={item._id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={tdStyle}>{new Date(item.date).toLocaleDateString('en-GB')}</td>
                  <td style={{ ...tdStyle, fontWeight: 'bold' }}>{item.partyName}</td>
                  <td style={tdStyle}>{item.khataCategory || 'N/A'}</td> 
                  <td style={tdStyle}>
                    <span style={typeBadge(item.transactionType)}>
                      {item.transactionType}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, color: item.transactionType === 'Adaigi' ? '#dc3545' : '#198754', fontWeight: 'bold' }}>
                    Rs. {item.netAmount.toLocaleString()}
                  </td>
                  <td style={tdStyle}>
                    <button 
                      onClick={() => handleDelete(item._id)} 
                      style={{ padding: '8px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                      🗑️ Delete
                    </button>
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

// Styles
const inputStyle = { padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px' };
const tabStyle = (isActive) => ({ padding: '10px 20px', backgroundColor: isActive ? '#000080' : '#e0e0e0', color: isActive ? 'white' : 'black', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' });
const thStyle = { padding: '12px', borderBottom: '2px solid #ddd' };
const tdStyle = { padding: '12px' };
const typeBadge = (type) => ({ padding: '5px 10px', borderRadius: '15px', color: 'white', fontSize: '12px', fontWeight: 'bold', backgroundColor: type === 'Adaigi' ? '#dc3545' : (type === 'Wasooli' ? '#198754' : '#0d6efd') });

export default Dashboard;