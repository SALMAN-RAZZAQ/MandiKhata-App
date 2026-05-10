import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function ParchaHistory() {
  const [parchay, setParchay] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const getToken = () => localStorage.getItem('token');
  const userRole = localStorage.getItem('role');

  const fetchParchay = async () => {
    setLoading(true);
    try {
      let url = '/api/parcha/history';
      if (searchQuery) {
        url += `?search=${searchQuery}`;
      }

      const response = await fetch(url, {
        headers: { 'auth-token': getToken() }
      });
      
      if (response.status === 401) {
        localStorage.clear();
        navigate('/login');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setParchay(data);
      }
    } catch (error) {
      console.error("Parcha fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParchay();
  }, []);

  const handleDelete = async (id) => {
    const isConfirm = window.confirm("⚠️ Kya aap waqai yeh Parchi delete karna chahte hain? (Balance reverse ho jayega)");
    if (isConfirm) {
      try {
        const response = await fetch(`/api/parcha/delete/${id}`, {
          method: 'DELETE',
          headers: { 'auth-token': getToken() }
        });
        if (response.ok) {
          alert("✅ Parchi delete ho gayi!");
          fetchParchay();
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
        📝 Purane Katchay Parchay (Auction History)
      </h2>

      {/* FILTER SECTION */}
      <div style={{ display: 'flex', gap: '15px', backgroundColor: '#e8f4fd', padding: '15px', borderRadius: '8px', border: '1px solid #b3d7ff', marginBottom: '20px', alignItems: 'center' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
          <label style={{ fontWeight: 'bold' }}>Dhoondein (Naam ya Parcha No):</label>
          <input 
            type="text" 
            placeholder="Misal: PRC-1005 ya Ali..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '15px', width: '100%' }} 
          />
        </div>

        <button onClick={fetchParchay} style={{ padding: '10px 20px', backgroundColor: '#000080', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
          🔍 Search
        </button>

        <button onClick={() => { setSearchQuery(''); setTimeout(fetchParchay, 100); }} style={{ padding: '10px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
          🔄 Clear
        </button>
      </div>

      {/* TABLE SECTION */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#000080', color: 'white', textAlign: 'left' }}>
              <th style={thStyle}>Parcha No.</th>
              <th style={thStyle}>Kisan / Party</th>
              <th style={thStyle}>Qisam</th>
              <th style={thStyle}>Fasal (Wazan)</th>
              <th style={thStyle}>Rate</th>
              <th style={thStyle}>Net Amount</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ padding: '20px', textAlign: 'center' }}>⏳ Parchay dhoondh raha hai...</td></tr>
            ) : parchay.length === 0 ? (
              <tr><td colSpan="7" style={{ padding: '20px', textAlign: 'center', fontWeight: 'bold' }}>Koi Parcha nahi mila.</td></tr>
            ) : (
              parchay.map(p => (
                <tr key={p._id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ ...tdStyle, color: '#000080', fontWeight: 'bold' }}>{p.parchaNo}</td>
                  <td style={{ ...tdStyle, fontWeight: 'bold' }}>{p.partyName} <br/><small style={{color:'gray'}}>{p.khataCategory}</small></td>
                  <td style={tdStyle}>
                    <span style={{ padding: '5px 10px', borderRadius: '15px', color: 'white', fontSize: '12px', fontWeight: 'bold', backgroundColor: p.transactionType === 'Adaigi' ? '#dc3545' : '#198754' }}>
                      {p.transactionType}
                    </span>
                  </td>
                  <td style={tdStyle}>{p.cropType} <br/><b>({p.weight} KG)</b></td>
                  <td style={tdStyle}>Rs. {p.rate}</td>
                  <td style={{ ...tdStyle, color: '#000', fontWeight: 'bold', fontSize: '16px' }}>
                    Rs. {p.netAmount.toLocaleString()}
                  </td>
                  <td style={{ ...tdStyle, display: 'flex', gap: '10px' }}>
                    <button onClick={() => window.print()} style={{ padding: '6px 12px', backgroundColor: '#0dcaf0', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                      🖨️ Print
                    </button>
                    {userRole === 'Admin' && (
                      <button onClick={() => handleDelete(p._id)} style={{ padding: '6px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
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

const thStyle = { padding: '12px', borderBottom: '2px solid #ddd' };
const tdStyle = { padding: '12px' };

export default ParchaHistory;