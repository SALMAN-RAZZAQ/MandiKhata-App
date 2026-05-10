import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function AllParties() {
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters aur Sorting ke states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All'); 
  const [sortOrder, setSortOrder] = useState('Default'); 

  const navigate = useNavigate();
  const getToken = () => localStorage.getItem('token');

  useEffect(() => {
    const fetchParties = async () => {
      try {
        const response = await fetch('/api/parcha/parties/all', {
          headers: { 'auth-token': getToken() }
        });

        if (response.status === 401) {
          localStorage.clear();
          navigate('/login');
          return;
        }

        if (response.ok) {
          const data = await response.json();
          setParties(data);
        }
      } catch (error) {
        console.error("Parties fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchParties();
  }, [navigate]);

  // ==========================================
  // FILTER AUR SORTING KI LOGIC
  // ==========================================
  let processedParties = [...parties];

  // 1. Naam se dhoondein (Search)
  if (searchQuery) {
    processedParties = processedParties.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  // 2. Qisam se Filter (Jama ya Naam)
  if (filterType !== 'All') {
    processedParties = processedParties.filter(p => p.balanceType === filterType);
  }

  // 3. Raqam ke hisaab se Tarteeb (Sorting)
  if (sortOrder === 'Highest') {
    processedParties.sort((a, b) => Math.abs(b.currentBalance) - Math.abs(a.currentBalance));
  } else if (sortOrder === 'Lowest') {
    processedParties.sort((a, b) => Math.abs(a.currentBalance) - Math.abs(b.currentBalance));
  }

  // Summary Calculations
  const totalJama = processedParties.filter(p => p.balanceType === 'Jama').reduce((acc, p) => acc + Math.abs(p.currentBalance), 0);
  const totalNaam = processedParties.filter(p => p.balanceType === 'Naam').reduce((acc, p) => acc + Math.abs(p.currentBalance), 0);

  return (
    <div style={{ padding: '30px', fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ color: '#000080', borderBottom: '2px solid #000080', paddingBottom: '10px' }}>
        👥 Saari Parties Ka Hissab (All Parties List)
      </h2>

      {/* SUMMARY CARDS */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '250px', backgroundColor: '#e8f4fd', padding: '20px', borderRadius: '8px', borderLeft: '5px solid #0d6efd' }}>
          <h4 style={{ margin: 0, color: '#555' }}>Total Parties</h4>
          <h2 style={{ margin: '10px 0 0 0', color: '#0d6efd' }}>{processedParties.length}</h2>
        </div>
        <div style={{ flex: 1, minWidth: '250px', backgroundColor: '#d1e7dd', padding: '20px', borderRadius: '8px', borderLeft: '5px solid #198754' }}>
          <h4 style={{ margin: 0, color: '#555' }}>Total Jama (Dene Hain)</h4>
          <h2 style={{ margin: '10px 0 0 0', color: '#198754' }}>Rs. {totalJama.toLocaleString()}</h2>
        </div>
        <div style={{ flex: 1, minWidth: '250px', backgroundColor: '#f8d7da', padding: '20px', borderRadius: '8px', borderLeft: '5px solid #dc3545' }}>
          <h4 style={{ margin: 0, color: '#555' }}>Total Naam (Lene Hain)</h4>
          <h2 style={{ margin: '10px 0 0 0', color: '#dc3545' }}>Rs. {totalNaam.toLocaleString()}</h2>
        </div>
      </div>

      {/* FILTER & SORT SECTION */}
      <div style={{ display: 'flex', gap: '15px', backgroundColor: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>🔍 Naam Se Dhoondein:</label>
          <input 
            type="text" 
            placeholder="Party ka naam..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            style={inputStyle} 
          />
        </div>

        <div style={{ flex: 1, minWidth: '150px' }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>📌 Qisam (Filter):</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={inputStyle}>
            <option value="All">Sab Dikhayen (All)</option>
            <option value="Jama">Sirf Jama (Dene Hain)</option>
            <option value="Naam">Sirf Naam (Lene Hain)</option>
          </select>
        </div>

        <div style={{ flex: 1, minWidth: '150px' }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>📶 Tarteeb (Sort):</label>
          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} style={inputStyle}>
            <option value="Default">Naam ke Hisaab se (A-Z)</option>
            <option value="Highest">Sab se Ziada Raqam Oopar</option>
            <option value="Lowest">Sab se Kam Raqam Oopar</option>
          </select>
        </div>

        <button onClick={() => window.print()} style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', marginTop: '25px', height: '42px' }}>
          🖨️ Print List
        </button>

      </div>

      {/* TABLE SECTION */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#000080', color: 'white', textAlign: 'left' }}>
              <th style={thStyle}>Sr #</th>
              <th style={thStyle}>Party Name</th>
              <th style={thStyle}>Khata Category</th>
              <th style={thStyle}>Balance Type</th>
              <th style={thStyle}>Amount (Rs.)</th>
              <th style={thStyle}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center' }}>⏳ Parties load ho rahi hain...</td></tr>
            ) : processedParties.length === 0 ? (
              <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center', fontWeight: 'bold' }}>Koi party nahi mili.</td></tr>
            ) : (
              processedParties.map((party, index) => (
                <tr key={party._id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={tdStyle}>{index + 1}</td>
                  <td style={{ ...tdStyle, fontWeight: 'bold', fontSize: '16px' }}>{party.name}</td>
                  <td style={tdStyle}>{party.partyType}</td>
                  <td style={tdStyle}>
                    <span style={{ 
                      padding: '5px 10px', borderRadius: '15px', color: 'white', fontSize: '12px', fontWeight: 'bold', 
                      backgroundColor: party.balanceType === 'Jama' ? '#198754' : (party.balanceType === 'Naam' ? '#dc3545' : '#6c757d') 
                    }}>
                      {party.balanceType === 'Jama' ? 'Jama (Advance)' : (party.balanceType === 'Naam' ? 'Naam (Udhaar)' : 'Clear')}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, color: party.balanceType === 'Jama' ? '#198754' : '#dc3545', fontWeight: 'bold', fontSize: '16px' }}>
                    Rs. {Math.abs(party.currentBalance).toLocaleString()}
                  </td>
                  <td style={tdStyle}>
                    <button onClick={() => navigate('/pakka-khata')} style={{ padding: '6px 12px', backgroundColor: '#0dcaf0', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                      👁️ Khata Dekhein
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

const inputStyle = { width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '15px', boxSizing: 'border-box' };
const thStyle = { padding: '12px', borderBottom: '2px solid #ddd' };
const tdStyle = { padding: '12px' };

export default AllParties;