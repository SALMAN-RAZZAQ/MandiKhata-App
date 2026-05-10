import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Inventory() {
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const navigate = useNavigate();
  const getToken = () => localStorage.getItem('token');

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const response = await fetch('/api/inventory/all', {
          headers: { 'auth-token': getToken() }
        });

        if (response.status === 401) {
          localStorage.clear();
          navigate('/login');
          return;
        }

        if (response.ok) {
          const data = await response.json();
          setStock(data);
        }
      } catch (error) {
        console.error("Inventory fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, [navigate]);

  return (
    <div style={{ padding: '30px', fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ color: '#000080', borderBottom: '2px solid #000080', paddingBottom: '10px' }}>
        🌾 Godown Ka Maal (Stock Inventory)
      </h2>
      <p style={{ color: 'gray' }}>Yahan dukan par mojood physical faslon (boriyan/wazan) ka hisaab hai.</p>

      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '250px', backgroundColor: '#e8f4fd', padding: '20px', borderRadius: '8px', borderLeft: '5px solid #0d6efd' }}>
          <h4 style={{ margin: 0, color: '#555' }}>Total Fasal Qisam</h4>
          <h2 style={{ margin: '10px 0 0 0', color: '#0d6efd' }}>{stock.length} Items</h2>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#000080', color: 'white', textAlign: 'left' }}>
              <th style={thStyle}>Sr #</th>
              <th style={thStyle}>Fasal Ka Naam (Crop)</th>
              <th style={thStyle}>Mojooda Stock (Wazan)</th>
              <th style={thStyle}>Aakhri Update</th>
              <th style={thStyle}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center' }}>⏳ Stock load ho raha hai...</td></tr>
            ) : stock.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', fontWeight: 'bold' }}>Godown mein koi maal nahi hai.</td></tr>
            ) : (
              stock.map((item, index) => (
                <tr key={item._id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={tdStyle}>{index + 1}</td>
                  <td style={{ ...tdStyle, fontWeight: 'bold', fontSize: '18px' }}>{item.cropName}</td>
                  <td style={{ ...tdStyle, color: item.totalWeight > 0 ? '#198754' : '#dc3545', fontWeight: 'bold', fontSize: '18px' }}>
                    {item.totalWeight.toLocaleString()} <span style={{ fontSize: '14px', color: 'gray' }}>(Man/KG)</span>
                  </td>
                  <td style={tdStyle}>{new Date(item.lastUpdated).toLocaleString('en-GB')}</td>
                  <td style={tdStyle}>
                    <span style={{ 
                      padding: '5px 10px', borderRadius: '15px', color: 'white', fontSize: '12px', fontWeight: 'bold', 
                      backgroundColor: item.totalWeight > 0 ? '#198754' : '#dc3545' 
                    }}>
                      {item.totalWeight > 0 ? 'In Stock' : 'Out of Stock'}
                    </span>
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

export default Inventory;