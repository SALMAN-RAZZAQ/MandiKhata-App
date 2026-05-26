import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function ChattaReport() {
  const [auditData, setAuditData] = useState([]);
  const [summary, setSummary] = useState({ totalParties: 0, totalMismatches: 0 });
  const [dates, setDates] = useState({ from: '', to: '' });
  const [loading, setLoading] = useState(false);
  
  // ✅ FIX: Text search ki jagah Dropdown State
  const [selectedParty, setSelectedParty] = useState('All');

  const navigate = useNavigate();
  const getToken = () => localStorage.getItem('token');

  const fetchAudit = async () => {
    setLoading(true);
    try {
      let url = '/api/reports/full-audit';
      if (dates.from && dates.to) {
        url += `?from=${dates.from}&to=${dates.to}`;
      }
      const res = await fetch(url, { headers: { 'auth-token': getToken() } });
      const data = await res.json();
      
      if (data.success) {
        setAuditData(data.report);
        setSummary({ totalParties: data.totalParties, totalMismatches: data.totalMismatches });
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudit(); 
  }, []);

  // Dropdown ke liye unique parties nikali hain
  const uniqueParties = [...new Set(auditData.map(item => item.partyName))].sort();

  // Filter Data (Dropdown ke hisaab se)
  const filteredData = auditData.filter(row => {
    if (selectedParty === 'All') return true;
    return row.partyName === selectedParty;
  });

  const inputStyle = { padding: '10px', borderRadius: '5px', border: '1px solid #ccc' };
  const thStyle = { padding: '12px', borderBottom: '2px solid #ddd', backgroundColor: '#000080', color: 'white' };
  const tdStyle = { padding: '12px', borderBottom: '1px solid #ddd' };

  const formatRs = (num) => Number(num || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  // Print Date Range
  const printDateRange = (dates.from && dates.to) 
      ? `${new Date(dates.from).toLocaleDateString('en-GB')} se ${new Date(dates.to).toLocaleDateString('en-GB')}`
      : 'شروع سے آج تک (All Time)';

  return (
    <>
      {/* ✅ FIX: PRINT CSS ADD KIYA GAYA HAI */}
      <style>{`
        @media screen { .print-only { display: none !important; } }
        @media print {
          body * { visibility: hidden; }
          .print-only, .print-only * { visibility: visible; }
          .print-only { position: absolute; left: 0; top: 0; width: 100%; padding: 10px; }
          .screen-only { display: none !important; }
          .table-bordered th, .table-bordered td { border: 1px solid #000 !important; }
        }
      `}</style>
      
      <div className="screen-only" style={{ padding: '30px', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #000080', paddingBottom: '10px', marginBottom: '20px' }}>
          <h2 style={{ color: '#000080', margin: 0 }}>⚖️ چھٹا رپورٹ (Master Audit & Reconciliation)</h2>
          <button onClick={() => window.print()} style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
            🖨️ Print Audit
          </button>
        </div>

        {/* DASHBOARD CARDS */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, backgroundColor: '#e8f4fd', padding: '20px', borderRadius: '8px', borderLeft: '5px solid #0d6efd' }}>
            <h4 style={{ margin: 0, color: '#555' }}>کل پارٹیاں (Total Accounts)</h4>
            <h2 style={{ margin: '10px 0 0 0', color: '#0d6efd' }}>{summary.totalParties}</h2>
          </div>
          <div style={{ flex: 1, backgroundColor: '#d1e7dd', padding: '20px', borderRadius: '8px', borderLeft: '5px solid #198754' }}>
            <h4 style={{ margin: 0, color: '#555' }}>درست کھاتے (100% OK)</h4>
            <h2 style={{ margin: '10px 0 0 0', color: '#198754' }}>{summary.totalParties - summary.totalMismatches}</h2>
          </div>
          <div style={{ flex: 1, backgroundColor: '#f8d7da', padding: '20px', borderRadius: '8px', borderLeft: '5px solid #dc3545' }}>
            <h4 style={{ margin: 0, color: '#555' }}>فرق والے کھاتے (Mismatches)</h4>
            <h2 style={{ margin: '10px 0 0 0', color: '#dc3545' }}>{summary.totalMismatches}</h2>
          </div>
        </div>

        {/* FILTERS */}
        <div style={{ display: 'flex', gap: '15px', backgroundColor: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ fontWeight: 'bold' }}>Kab Se:</label>
            <input type="date" value={dates.from} onChange={(e) => setDates({...dates, from: e.target.value})} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ fontWeight: 'bold' }}>Kab Tak:</label>
            <input type="date" value={dates.to} onChange={(e) => setDates({...dates, to: e.target.value})} style={inputStyle} />
          </div>
          <button onClick={fetchAudit} style={{ padding: '10px 20px', backgroundColor: '#000080', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
            🔄 Audit Run Karein
          </button>
          
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ fontWeight: 'bold', color: '#555' }}>🔍 Party Select:</label>
            {/* ✅ FIX: Dropdown add kar diya gaya hai */}
            <select 
              value={selectedParty} 
              onChange={(e) => setSelectedParty(e.target.value)} 
              style={{...inputStyle, width: '250px', backgroundColor: '#f8f9fa', fontWeight: 'bold'}}
            >
              <option value="All">-- Sab Parties (All) --</option>
              {uniqueParties.map((p, i) => <option key={i} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        {/* AUDIT TABLE */}
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr>
                <th style={thStyle}>Khata #</th>
                <th style={thStyle}>Party Name</th>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Ledger (Asli Hissab)</th>
                <th style={thStyle}>System (Saved Hissab)</th>
                <th style={thStyle}>Difference (فرق)</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ padding: '20px', textAlign: 'center', fontWeight: 'bold' }}>⏳ Audit ho raha hai...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan="7" style={{ padding: '20px', textAlign: 'center', fontWeight: 'bold' }}>Koi data nahi mila.</td></tr>
              ) : (
                filteredData.map((row, index) => {
                  
                  // Ledger Format
                  const ledgerText = row.ledgerBalance > 0 ? `+ Rs ${formatRs(row.ledgerBalance)} (Jama)` : (row.ledgerBalance < 0 ? `- Rs ${formatRs(Math.abs(row.ledgerBalance))} (Naam)` : '0 (Clear)');
                  const ledgerColor = row.ledgerBalance > 0 ? '#198754' : (row.ledgerBalance < 0 ? '#dc3545' : '#6c757d');

                  // System Format
                  const systemText = row.systemSavedBalance > 0 ? `+ Rs ${formatRs(row.systemSavedBalance)} (Jama)` : (row.systemSavedBalance < 0 ? `- Rs ${formatRs(Math.abs(row.systemSavedBalance))} (Naam)` : '0 (Clear)');
                  const systemColor = row.systemSavedBalance > 0 ? '#198754' : (row.systemSavedBalance < 0 ? '#dc3545' : '#6c757d');

                  return (
                    <tr key={index} style={{ backgroundColor: row.isMatch ? '#fff' : '#fff3cd' }}>
                      <td style={tdStyle}><b>{row.khataIndex}</b></td>
                      <td style={{...tdStyle, fontWeight: 'bold'}}>{row.partyName}</td>
                      <td style={tdStyle}>{row.partyType}</td>
                      <td style={{...tdStyle, color: ledgerColor, fontWeight: 'bold'}}>{ledgerText}</td>
                      <td style={{...tdStyle, color: systemColor, fontWeight: 'bold'}}>{systemText}</td>
                      <td style={{
                        ...tdStyle, 
                        color: row.isMatch ? '#198754' : '#dc3545', 
                        fontWeight: 'bold', 
                        fontSize: '16px'
                      }}>
                        {row.isMatch ? '0' : `Rs ${formatRs(row.difference)}`}
                      </td>
                      <td style={tdStyle}>
                        {row.isMatch ? (
                          <span style={{ backgroundColor: '#198754', color: 'white', padding: '5px 10px', borderRadius: '15px', fontSize: '12px' }}>✅ OK</span>
                        ) : (
                          <button onClick={() => navigate('/pakka-khata')} style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>⚠️ Ledger Dekhein</button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================== PRINT ONLY LAYOUT ==================== */}
      <div className="print-only urdu-text" dir="rtl" style={{ backgroundColor: 'white', color: '#000' }}>
        <div className="d-flex justify-content-between align-items-center border-bottom border-dark pb-2 mb-2">
          <div style={{ width: '40%' }}>
            <h2 className="mb-0 fw-bold" style={{ color: '#000080' }}>میاں علی محمد اینڈ سنز</h2>
            <p className="mb-0 fw-bold">دوکان نمبر 74/G غلہ منڈی بورے والا</p>
          </div>
          <div className="text-center" style={{ width: '20%' }}>
            <span style={{ fontSize: '24px', fontWeight: 'bold', border: '2px solid black', padding: '5px 15px', borderRadius: '10px' }}>
              چھٹا رپورٹ
            </span>
          </div>
          <div dir="ltr" style={{ width: '40%', textAlign: 'left' }}>
            <h4 className="mb-0 fw-bold" style={{ color: '#000080', fontFamily: 'Arial' }}>Mian Ali Muhammad & Sons</h4>
            <p className="mb-0 fw-bold" style={{ fontFamily: 'Arial' }}>74/G, Grain Market Burewala</p>
          </div>
        </div>

        <div className="d-flex justify-content-between border-bottom border-dark pb-2 mb-3 fs-6">
          <div dir="ltr" style={{ fontFamily: 'Arial' }}>
            <span className="urdu-text fw-bold me-2">میاں عبدالستار کلیم: </span><b>0336-7202647 / 0309-7032647</b>
          </div>
          <div dir="ltr" style={{ fontFamily: 'Arial' }}>
            <span className="urdu-text fw-bold me-2">تاریخ (Date): </span><b style={{ color: '#dc3545' }}>{printDateRange}</b>
          </div>
        </div>

        <h3 className="text-center fw-bold mt-2 mb-3" style={{ color: '#000080', textDecoration: 'underline' }}>
          آڈٹ اور چھٹا رپورٹ (Audit & Reconciliation)
        </h3>

        <table className="table table-bordered border-dark border-2 text-center align-middle mb-4">
          <thead style={{ backgroundColor: '#f8f9fa' }}>
            <tr className="fs-5">
              <th className="border-dark">نمبر (Sr)</th>
              <th className="border-dark">پارٹی کا نام</th>
              <th className="border-dark">کیٹیگری</th>
              <th className="border-dark">لیجر (Asli Hissab)</th>
              <th className="border-dark">سسٹم (Saved Hissab)</th>
              <th className="border-dark">فرق (Difference)</th>
            </tr>
          </thead>
          <tbody style={{ fontFamily: 'Arial', fontSize: '17px' }}>
            {filteredData.length === 0 ? (
              <tr><td colSpan="6" className="p-3">کوئی ڈیٹا نہیں ملا۔</td></tr>
            ) : (
              filteredData.map((row, index) => {
                // Formatting values for print
                const ledgerText = row.ledgerBalance > 0 ? `+ Rs ${formatRs(row.ledgerBalance)}` : (row.ledgerBalance < 0 ? `- Rs ${formatRs(Math.abs(row.ledgerBalance))}` : '0');
                const ledgerColor = row.ledgerBalance > 0 ? '#198754' : (row.ledgerBalance < 0 ? '#dc3545' : '#000');
                
                const systemText = row.systemSavedBalance > 0 ? `+ Rs ${formatRs(row.systemSavedBalance)}` : (row.systemSavedBalance < 0 ? `- Rs ${formatRs(Math.abs(row.systemSavedBalance))}` : '0');
                const systemColor = row.systemSavedBalance > 0 ? '#198754' : (row.systemSavedBalance < 0 ? '#dc3545' : '#000');

                return (
                  <tr key={index}>
                    <td className="border-dark">{index + 1}</td>
                    <td className="border-dark urdu-text fw-bold">{row.partyName}</td>
                    <td className="border-dark">{row.partyType}</td>
                    <td className="border-dark fw-bold" dir="ltr" style={{ color: ledgerColor }}>{ledgerText}</td>
                    <td className="border-dark fw-bold" dir="ltr" style={{ color: systemColor }}>{systemText}</td>
                    <td className="border-dark fw-bold" dir="ltr" style={{ color: row.isMatch ? '#198754' : '#dc3545', fontSize: '18px' }}>
                      {row.isMatch ? 'OK (0)' : `Rs ${formatRs(row.difference)}`}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        <div className="d-flex justify-content-around mt-4 fw-bold fs-5 border border-dark p-3 bg-light">
          <div style={{ color: '#000080' }}>کل پارٹیاں: <span dir="ltr">{summary.totalParties}</span></div>
          <div style={{ color: '#198754' }}>درست کھاتے: <span dir="ltr">{summary.totalParties - summary.totalMismatches}</span></div>
          <div style={{ color: '#dc3545' }}>فرق والے کھاتے: <span dir="ltr">{summary.totalMismatches}</span></div>
        </div>
      </div>

    </>
  );
}

export default ChattaReport;