import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function PartaHistory() {
  const [bills, setBills] = useState([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchName, setSearchName] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const getToken = () => localStorage.getItem('token');
  const userRole = localStorage.getItem('role');

  const fetchBills = async () => {
    setLoading(true);
    try {
      // Query parameters banayen (Date aur Name filter ke liye)
      let query = '?';
      if (fromDate) query += `from=${fromDate}&`;
      if (toDate) query += `to=${toDate}&`;
      if (searchName) query += `customerName=${searchName}`;

      const response = await fetch(`/api/parta/all${query}`, {
        headers: { 'auth-token': getToken() }
      });
      
      if (response.status === 401) {
        localStorage.clear();
        navigate('/login');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setBills(data);
      }
    } catch (error) {
      console.error("Bills fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Jab page khule toh automatically saare bills load ho jayen
  useEffect(() => {
    fetchBills();
  }, []);

  // Delete Bill (Sirf Admin ke liye)
  const handleDelete = async (id) => {
    const isConfirm = window.confirm("⚠️ Kya aap waqai yeh Parta Bill delete karna chahte hain? (Party ka balance aur Rokar reverse ho jayegi)");
    if (isConfirm) {
      try {
        const response = await fetch(`/api/parta/delete/${id}`, {
          method: 'DELETE',
          headers: { 'auth-token': getToken() }
        });
        if (response.ok) {
          alert("✅ Bill kamyabi se delete ho gaya!");
          fetchBills(); // List refresh karein
        } else {
          alert("❌ Delete karne mein masla aaya.");
        }
      } catch (error) {
        alert("❌ Network Error.");
      }
    }
  };

  return (
    <div style={{ padding: '30px', fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ color: '#000080', borderBottom: '2px solid #000080', paddingBottom: '10px' }}>
        📜 Purane Parta Bills (History)
      </h2>

      {/* FILTER SECTION */}
      <div style={{ display: 'flex', gap: '15px', backgroundColor: '#e8f4fd', padding: '15px', borderRadius: '8px', border: '1px solid #b3d7ff', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontWeight: 'bold' }}>Kab Se:</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={inputStyle} />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontWeight: 'bold' }}>Kab Tak:</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={inputStyle} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontWeight: 'bold' }}>Kisan/Party Ka Naam:</label>
          <input 
            type="text" 
            placeholder="Naam likhein..." 
            value={searchName} 
            onChange={(e) => setSearchName(e.target.value)} 
            style={inputStyle} 
          />
        </div>

        <button onClick={fetchBills} style={{ padding: '10px 20px', backgroundColor: '#000080', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
          🔍 Dhoondein
        </button>

        <button onClick={() => { setFromDate(''); setToDate(''); setSearchName(''); setTimeout(fetchBills, 100); }} style={{ padding: '10px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
          🔄 Clear
        </button>
      </div>

      {/* BILLS TABLE */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#000080', color: 'white', textAlign: 'left' }}>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Parta No.</th>
              <th style={thStyle}>Customer Name</th>
              <th style={thStyle}>Khata</th>
              <th style={thStyle}>Faslen (Items)</th>
              <th style={thStyle}>Net Amount</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ padding: '20px', textAlign: 'center' }}>⏳ Bills dhoondh raha hai...</td></tr>
            ) : bills.length === 0 ? (
              <tr><td colSpan="7" style={{ padding: '20px', textAlign: 'center', fontWeight: 'bold' }}>Koi purana bill nahi mila.</td></tr>
            ) : (
              bills.map(bill => (
                <tr key={bill._id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={tdStyle}>{new Date(bill.createdAt).toLocaleDateString('en-GB')}</td>
                  <td style={{ ...tdStyle, color: '#000080', fontWeight: 'bold' }}>{bill.partaNo}</td>
                  <td style={{ ...tdStyle, fontWeight: 'bold' }}>{bill.customerName}</td>
                  <td style={tdStyle}>{bill.khataCategory}</td>
                  <td style={tdStyle}>{bill.items.length} Items</td>
                  <td style={{ ...tdStyle, color: '#198754', fontWeight: 'bold', fontSize: '16px' }}>
                    Rs. {bill.netAmount.toLocaleString()}
                  </td>
                  <td style={{ ...tdStyle, display: 'flex', gap: '10px' }}>
                    <button onClick={() => window.print()} style={{ padding: '6px 12px', backgroundColor: '#0dcaf0', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                      🖨️ Print
                    </button>
                    {userRole === 'Admin' && (
                      <button onClick={() => handleDelete(bill._id)} style={{ padding: '6px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                        🗑️ Delete
                      </button>
                    )}
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

const inputStyle = { padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '15px', minWidth: '150px' };
const thStyle = { padding: '12px', borderBottom: '2px solid #ddd' };
const tdStyle = { padding: '12px' };

export default PartaHistory;