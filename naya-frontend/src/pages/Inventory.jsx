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

  // 🚀 NAYA LOGIC: Fasal ke andar se saare bills (lots) nikal kar alag alag rows mein convert karna
  const allBills = stock.flatMap((item) => {
    if (item.lots && item.lots.length > 0) {
      return item.lots.map((lot, index) => {
        const lotWeight = Number(lot.weight) || 0;
        const lotRate = Number(lot.rate) || 0;
        return {
          id: lot._id || `${item._id}-${index}`, // Unique key ke liye
          cropName: item.cropName,
          weight: lotWeight,
          value: (lotWeight / 40) * lotRate, // Formula: (Wazan / 40) * Rate
          lastUpdated: lot.date || item.lastUpdated
        };
      });
    } else if (item.totalWeight > 0) {
      // Agar kisi purane record mein lots nahi hain lekin wazan hai (fallback)
      return [{
        id: item._id,
        cropName: item.cropName,
        weight: item.totalWeight,
        value: 0,
        lastUpdated: item.lastUpdated
      }];
    }
    return []; // Empty array return karega agar wazan 0 hai
  });

  // 🚀 Total Godown Value aur Items Calculation
  const totalGodownValue = allBills.reduce((total, bill) => total + bill.value, 0);
  const totalEntriesCount = allBills.length; // Ab yeh total bills/entries batayega

  return (
    <div style={{ padding: '30px', fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ color: '#000080', borderBottom: '2px solid #000080', paddingBottom: '10px' }}>
        🌾 Godown Ka Maal (Stock Inventory)
      </h2>
      <p style={{ color: 'gray' }}>Yahan dukan par mojood physical faslon (boriyan/wazan) aur un ki maliyat ka hisaab hai.</p>

      {/* DASHBOARD CARDS */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '250px', backgroundColor: '#e8f4fd', padding: '20px', borderRadius: '8px', borderLeft: '5px solid #0d6efd' }}>
          <h4 style={{ margin: 0, color: '#555' }}>Total Fasal Entries</h4>
          <h2 style={{ margin: '10px 0 0 0', color: '#0d6efd' }}>{totalEntriesCount} Bills</h2>
        </div>
        
        <div style={{ flex: 1, minWidth: '250px', backgroundColor: '#fff3cd', padding: '20px', borderRadius: '8px', borderLeft: '5px solid #ffc107' }}>
          <h4 style={{ margin: 0, color: '#856404' }}>گودام کی کل مالیت (Total Value)</h4>
          <h2 style={{ margin: '10px 0 0 0', color: '#856404' }} dir="ltr">
            Rs. {totalGodownValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </h2>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#000080', color: 'white', textAlign: 'left' }}>
              <th style={thStyle}>Sr #</th>
              <th style={thStyle}>Fasal Ka Naam (Crop)</th>
              <th style={thStyle}>Mojooda Stock (Wazan)</th>
              <th style={thStyle}>اسٹاک کی مالیت (Value)</th>
              <th style={thStyle}>Aakhri Update</th>
              <th style={thStyle}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center' }}>⏳ Stock load ho raha hai...</td></tr>
            ) : allBills.length === 0 ? (
              <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center', fontWeight: 'bold' }}>Godown mein koi maal nahi hai.</td></tr>
            ) : (
              // 🚀 Ab hum stock.map ki jagah allBills.map chala rahe hain taqe har bill ki alag line banay
              allBills.map((bill, index) => (
                <tr key={bill.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={tdStyle}>{index + 1}</td>
                  <td style={{ ...tdStyle, fontWeight: 'bold', fontSize: '18px' }}>{bill.cropName}</td>
                  <td style={{ ...tdStyle, color: bill.weight > 0 ? '#198754' : '#dc3545', fontWeight: 'bold', fontSize: '18px' }}>
                    {bill.weight.toLocaleString()} <span style={{ fontSize: '14px', color: 'gray' }}>(Man/KG)</span>
                  </td>
                  
                  <td style={{ ...tdStyle, fontWeight: 'bold', color: '#000080', fontSize: '18px' }} dir="ltr">
                    Rs. {bill.value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </td>

                  <td style={tdStyle}>{new Date(bill.lastUpdated).toLocaleString('en-GB')}</td>
                  <td style={tdStyle}>
                    <span style={{ 
                      padding: '5px 10px', borderRadius: '15px', color: 'white', fontSize: '12px', fontWeight: 'bold', 
                      backgroundColor: bill.weight > 0 ? '#198754' : '#dc3545' 
                    }}>
                      {bill.weight > 0 ? 'In Stock' : 'Out of Stock'}
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