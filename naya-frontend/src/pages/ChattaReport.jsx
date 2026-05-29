import React, { useState, useEffect } from 'react';

function ChattaReport() {
  const [parties, setParties] = useState([]);
  const [inventory, setInventory] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  // 📅 Date Filter States
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const getToken = () => localStorage.getItem('token');

  const fetchAuditData = () => {
    setLoading(true);
    let queryParams = '';
    if (fromDate && toDate) {
        queryParams = `?from=${fromDate}&to=${toDate}`;
    }

    Promise.all([
      fetch(`/api/parcha/parties/all${queryParams}`, { headers: { 'auth-token': getToken() } }).then(res => res.json()),
      fetch(`/api/inventory/all${queryParams}`, { headers: { 'auth-token': getToken() } }).then(res => res.json())
    ])
      .then(([partiesData, inventoryData]) => {
        if (Array.isArray(partiesData)) setParties(partiesData);
        if (Array.isArray(inventoryData)) setInventory(inventoryData);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAuditData();
  }, []);

  const handleFilter = () => {
      fetchAuditData();
  };

  const clearFilter = () => {
      setFromDate('');
      setToDate('');
      setTimeout(() => fetchAuditData(), 100);
  };

  const validParties = parties.filter(p => 
      p.name !== 'Main Purchase Khata' && p.name !== 'Main Sales Khata'
  );

  const naamParties = validParties.filter(p => p.balanceType === 'Naam' && p.currentBalance > 0);
  const jamaParties = validParties.filter(p => p.balanceType === 'Jama' && p.currentBalance > 0);

  const baseJamaTotal = jamaParties.reduce((sum, p) => sum + p.currentBalance, 0);
  const baseNaamTotal = naamParties.reduce((sum, p) => sum + p.currentBalance, 0);

  const totalStockValue = inventory.reduce((totalVal, crop) => {
    if (!crop.lots || crop.lots.length === 0) return totalVal;
    const cropValue = crop.lots.reduce((sum, lot) => sum + ((Number(lot.weight) / 40) * Number(lot.rate)), 0);
    return totalVal + cropValue;
  }, 0);

  let displayNaam = [...naamParties];
  let displayJama = [...jamaParties];

  // 🌾 Godam Ka Maal (Asset)
  if (totalStockValue > 0) {
      displayNaam.push({
          name: '🌾 گودام کا مال (Unsold Stock)',
          partyType: 'Asset (اثاثہ)',
          currentBalance: totalStockValue,
          isStock: true
      });
  }

  // 💰 Cash in Hand (Rokar) - Iske baghair Trial Balance barabar nahi ho sakta
  const difference = baseJamaTotal - (baseNaamTotal + totalStockValue);

  if (difference > 0) {
      displayNaam.push({
          name: '💰 گلے کی روکڑ (Cash in Hand)',
          partyType: 'Cash Asset',
          currentBalance: difference,
          isRokar: true
      });
  } else if (difference < 0) {
      displayJama.push({
          name: '⚠️ گلے میں کمی (Cash Shortage)',
          partyType: 'Liability',
          currentBalance: Math.abs(difference),
          isRokar: true
      });
  }

  // Ab Dono Sides Ka Grand Total 100% Barabar Hoga
  const grandTotal = Math.max(baseJamaTotal, baseNaamTotal + totalStockValue);

  const formatRs = (num) => Number(num || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const thStyle = { padding: '12px', borderBottom: '2px solid #ddd', backgroundColor: '#000080', color: 'white', textAlign: 'left' };
  const tdStyle = { padding: '10px', borderBottom: '1px solid #ddd', fontSize: '16px' };
  const highlightStyle = { backgroundColor: '#eef8f5', fontWeight: 'bold', borderTop: '2px solid #555' };
  const rokarStyle = { backgroundColor: '#fff3cd', fontWeight: 'bold', color: '#856404', borderTop: '2px solid #000' };

  return (
    <>
      <style>{`
        @media screen { .print-only { display: none !important; } }
        @media print {
          body * { visibility: hidden; }
          .print-only, .print-only * { visibility: visible; }
          .print-only { position: absolute; left: 0; top: 0; width: 100%; padding: 10px; }
          .screen-only { display: none !important; }
        }
      `}</style>
      
      <div className="screen-only" style={{ padding: '30px', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #000080', paddingBottom: '10px', marginBottom: '20px' }}>
          <h2 style={{ color: '#000080', margin: 0 }}>⚖️ چھٹہ / فنانشل میزان (Trial Balance)</h2>
          <button onClick={() => window.print()} style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>
            🖨️ Print Chatta
          </button>
        </div>

        {/* 📅 DATE FILTER SECTION */}
        <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #ddd', alignItems: 'flex-end' }}>
            <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>From Date:</label>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            </div>
            <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>To Date:</label>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            </div>
            <button onClick={handleFilter} style={{ padding: '9px 20px', backgroundColor: '#000080', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                🔍 Filter
            </button>
            <button onClick={clearFilter} style={{ padding: '9px 20px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                ✖ Clear
            </button>
        </div>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
          
          {/* LEFT SIDE: JAMA KHATAY */}
          <div style={{ flex: 1, backgroundColor: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ color: '#198754', borderBottom: '2px solid #198754', paddingBottom: '10px', marginTop: 0 }}>جمع کھاتے (Total Credits)</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{...thStyle, backgroundColor: '#198754'}}>Party / Khata</th>
                  <th style={{...thStyle, backgroundColor: '#198754'}}>Category</th>
                  <th style={{...thStyle, backgroundColor: '#198754', textAlign: 'right'}}>Amount (Rs)</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan="3" style={tdStyle}>Loading...</td></tr> : displayJama.map((p, i) => (
                  <tr key={i} style={p.isRokar ? rokarStyle : {}}>
                    <td style={{...tdStyle, fontWeight: 'bold', color: p.isRokar ? '#856404' : '#333'}}>{p.name}</td>
                    <td style={tdStyle}>{p.partyType}</td>
                    <td style={{...tdStyle, color: p.isRokar ? '#856404' : '#198754', fontWeight: 'bold', textAlign: 'right'}} dir="ltr">{formatRs(p.currentBalance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="2" style={{ padding: '15px 10px', fontWeight: 'bold', fontSize: '20px', borderTop: '3px solid #000' }}>TOTAL JAMA:</td>
                  <td style={{ padding: '15px 10px', fontWeight: 'bold', fontSize: '20px', color: '#198754', textAlign: 'right', borderTop: '3px solid #000' }} dir="ltr">Rs {formatRs(grandTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* RIGHT SIDE: NAAM KHATAY */}
          <div style={{ flex: 1, backgroundColor: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ color: '#dc3545', borderBottom: '2px solid #dc3545', paddingBottom: '10px', marginTop: 0 }}>بنام کھاتے (Total Debits)</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{...thStyle, backgroundColor: '#dc3545'}}>Party / Khata</th>
                  <th style={{...thStyle, backgroundColor: '#dc3545'}}>Category</th>
                  <th style={{...thStyle, backgroundColor: '#dc3545', textAlign: 'right'}}>Amount (Rs)</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan="3" style={tdStyle}>Loading...</td></tr> : displayNaam.map((p, i) => (
                  <tr key={i} style={p.isStock ? highlightStyle : (p.isRokar ? rokarStyle : {})}>
                    <td style={{...tdStyle, fontWeight: 'bold', color: p.isStock ? '#000' : (p.isRokar ? '#856404' : '#333')}}>{p.name}</td>
                    <td style={tdStyle}>{p.partyType}</td>
                    <td style={{...tdStyle, color: p.isRokar ? '#856404' : '#dc3545', fontWeight: 'bold', textAlign: 'right'}} dir="ltr">{formatRs(p.currentBalance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="2" style={{ padding: '15px 10px', fontWeight: 'bold', fontSize: '20px', borderTop: '3px solid #000' }}>TOTAL NAAM:</td>
                  <td style={{ padding: '15px 10px', fontWeight: 'bold', fontSize: '20px', color: '#dc3545', textAlign: 'right', borderTop: '3px solid #000' }} dir="ltr">Rs {formatRs(grandTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* PRINT VIEW */}
      <div className="print-only urdu-text" dir="rtl" style={{ backgroundColor: 'white', color: '#000' }}>
         <div className="d-flex justify-content-between align-items-center border-bottom border-dark pb-2 mb-4">
            <div><h2 className="mb-0 fw-bold">میاں علی محمد اینڈ سنز</h2><p className="mb-0 fw-bold">دوکان نمبر 74/G غلہ منڈی بورے والا</p></div>
            <div className="text-center">
                <span style={{ fontSize: '26px', fontWeight:'bold', border:'2px solid black', padding:'5px 15px', borderRadius:'10px' }}>چھٹہ / میزان</span>
                {fromDate && toDate && <div style={{ fontSize: '14px', marginTop: '10px' }}>تاریخ: {fromDate} سے {toDate}</div>}
            </div>
        </div>
        <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
            <div style={{ flex: 1 }}>
                <h4 style={{ borderBottom: '2px solid #000', paddingBottom: '5px' }}>جمع کھاتے (Credits)</h4>
                <table className="table table-bordered border-dark text-center">
                    <thead><tr><th>پارٹی</th><th>رقم</th></tr></thead>
                    <tbody>
                        {displayJama.map((p,i) => <tr key={i} style={(p.isRokar) ? {backgroundColor: '#fff3cd'} : {}}><td className="fw-bold">{p.name}</td><td dir="ltr">{formatRs(p.currentBalance)}</td></tr>)}
                        <tr><td className="fw-bold fs-5">کل جمع:</td><td className="fw-bold fs-5" dir="ltr">{formatRs(grandTotal)}</td></tr>
                    </tbody>
                </table>
            </div>
            <div style={{ flex: 1 }}>
                <h4 style={{ borderBottom: '2px solid #000', paddingBottom: '5px' }}>بنام کھاتے (Debits)</h4>
                <table className="table table-bordered border-dark text-center">
                    <thead><tr><th>پارٹی</th><th>رقم</th></tr></thead>
                    <tbody>
                        {displayNaam.map((p,i) => <tr key={i} style={p.isStock ? {backgroundColor: '#eef8f5'} : (p.isRokar ? {backgroundColor: '#fff3cd'} : {})}><td className="fw-bold">{p.name}</td><td dir="ltr">{formatRs(p.currentBalance)}</td></tr>)}
                        <tr><td className="fw-bold fs-5">کل بنام:</td><td className="fw-bold fs-5" dir="ltr">{formatRs(grandTotal)}</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </>
  );
}

export default ChattaReport;