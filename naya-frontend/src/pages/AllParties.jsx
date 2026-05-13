import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const DUKAN_INFO = {
  nameUrdu: "میاں علی محمد اینڈ سنز",
  nameEng: "Mian Ali Muhammad & Sons",
  addressUrdu: "دوکان نمبر 74/G غلہ منڈی بورے والا",
  addressEng: "74/G, Grain Market Burewala",
  phone1Urdu: "میاں عبدالستار کلیم: 03367202647/03097032647",
  phone2Urdu: "میاں عثمان: 03006998470"
};

function AllParties() {
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  
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
  
  // 💻 SCREEN KE LIYE: Saari parties rakhein
  let processedParties = [...parties];

  if (searchQuery) {
    processedParties = processedParties.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  if (filterType !== 'All') {
    processedParties = processedParties.filter(p => p.balanceType === filterType);
  }

  if (sortOrder === 'Highest') {
    processedParties.sort((a, b) => Math.abs(b.currentBalance) - Math.abs(a.currentBalance));
  } else if (sortOrder === 'Lowest') {
    processedParties.sort((a, b) => Math.abs(a.currentBalance) - Math.abs(b.currentBalance));
  }

  // 🧮 Summary Totals (Point wali values ko round off karke total karna)
  const totalJama = processedParties.filter(p => p.balanceType === 'Jama').reduce((acc, p) => acc + Math.round(Math.abs(p.currentBalance || 0)), 0);
  const totalNaam = processedParties.filter(p => p.balanceType === 'Naam').reduce((acc, p) => acc + Math.round(Math.abs(p.currentBalance || 0)), 0);

  // 🛑 🖨️ BUG FIX (BULLETPROOF PRINT FILTER): 
  // Agar kisi ka balance 1 Rupaye se kam hai (0.001 waghera), toh usay lazmi nikal do!
  const partiesToPrint = processedParties.filter(p => {
    const bal = Math.abs(parseFloat(p.currentBalance || 0));
    return bal >= 1; // <-- YAHAN HAI ASAL JADOO (Kam az kam 1 Rs hona zaroori hai)
  });

  const currentDate = new Date().toLocaleDateString('en-GB');

  return (
    <>
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

      {/* ================================================ */}
      {/* 💻 SCREEN VIEW */}
      {/* ================================================ */}
      <div className="screen-only" style={{ padding: '30px', fontFamily: 'Arial, sans-serif' }}>
        <h2 style={{ color: '#000080', borderBottom: '2px solid #000080', paddingBottom: '10px' }}>
          👥 Saari Parties Ka Hissab (All Parties List)
        </h2>

        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '250px', backgroundColor: '#e8f4fd', padding: '20px', borderRadius: '8px', borderLeft: '5px solid #0d6efd' }}>
            <h4 style={{ margin: 0, color: '#555' }}>Total Parties (Screen)</h4>
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

        <div style={{ display: 'flex', gap: '15px', backgroundColor: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>🔍 Naam Se Dhoondein:</label>
            <input type="text" placeholder="Party ka naam..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={inputStyle} />
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
                processedParties.map((party, index) => {
                  
                  // Screen calculation: 1 rupaye se kam ko strictly 0 dikhao
                  const rawBal = Math.abs(parseFloat(party.currentBalance || 0));
                  const displayBal = rawBal < 1 ? 0 : Math.round(rawBal);
                  const isZero = displayBal === 0;

                  return (
                    <tr key={party._id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={tdStyle}>{index + 1}</td>
                      <td style={{ ...tdStyle, fontWeight: 'bold', fontSize: '16px' }}>{party.name}</td>
                      <td style={tdStyle}>{party.partyType}</td>
                      <td style={tdStyle}>
                        <span style={{ 
                          padding: '5px 10px', borderRadius: '15px', color: 'white', fontSize: '12px', fontWeight: 'bold', 
                          backgroundColor: isZero ? '#6c757d' : (party.balanceType === 'Jama' ? '#198754' : '#dc3545') 
                        }}>
                          {isZero ? 'Clear (Zero)' : (party.balanceType === 'Jama' ? 'Jama (Advance)' : 'Naam (Udhaar)')}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, color: isZero ? '#6c757d' : (party.balanceType === 'Jama' ? '#198754' : '#dc3545'), fontWeight: 'bold', fontSize: '16px' }}>
                        Rs. {displayBal.toLocaleString()}
                      </td>
                      <td style={tdStyle}>
                        <button onClick={() => navigate('/pakka-khata')} style={{ padding: '6px 12px', backgroundColor: '#0dcaf0', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                          👁️ Khata Dekhein
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================================================ */}
      {/* 🖨️ PRINT VIEW */}
      {/* ================================================ */}
      <div className="print-only urdu-text" dir="rtl" style={{ backgroundColor: 'white', color: '#000' }}>
        <div className="d-flex justify-content-between align-items-center border-bottom border-dark pb-2 mb-2">
          <div style={{ width: '40%' }}><h2 className="mb-0 fw-bold" style={{ color: '#000080' }}>{DUKAN_INFO.nameUrdu}</h2><p className="mb-0 fw-bold">{DUKAN_INFO.addressUrdu}</p></div>
          <div className="text-center" style={{ width: '20%' }}><span style={{ fontSize: '30px' }}>🌾</span></div>
          <div dir="ltr" style={{ width: '40%', textAlign: 'left' }}><h4 className="mb-0 fw-bold" style={{ color: '#000080', fontFamily: 'Arial' }}>{DUKAN_INFO.nameEng}</h4><p className="mb-0 fw-bold" style={{ fontFamily: 'Arial' }}>{DUKAN_INFO.addressEng}</p></div>
        </div>

        <div className="d-flex justify-content-between border-bottom border-dark pb-2 mb-3 fs-6">
          <div dir="ltr" style={{ fontFamily: 'Arial' }}><span className="urdu-text fw-bold me-2">{DUKAN_INFO.phone1Urdu}</span></div>
          <div dir="ltr" style={{ fontFamily: 'Arial' }}><span className="urdu-text fw-bold me-2">تاریخ: </span><b>{currentDate}</b></div>
        </div>

        <h3 className="text-center fw-bold mt-2 mb-3" style={{ color: '#000080', textDecoration: 'underline' }}>ساری پارٹیوں کا حساب (صرف بقایا جات)</h3>

        <table className="table table-bordered border-dark border-2 text-center align-middle mb-4">
          <thead style={{ backgroundColor: '#f8f9fa' }}>
            <tr className="fs-5">
              <th className="border-dark">نمبر (Sr)</th>
              <th className="border-dark">پارٹی کا نام</th>
              <th className="border-dark">کیٹیگری</th>
              <th className="border-dark">تفصیل</th>
              <th className="border-dark">رقم (Amount)</th>
            </tr>
          </thead>
          <tbody style={{ fontFamily: 'Arial', fontSize: '17px' }}>
            {partiesToPrint.length === 0 ? (
              <tr><td colSpan="5" className="p-3">کوئی بقایا کھاتہ نہیں ہے۔ تمام حساب کلیئر ہیں۔</td></tr>
            ) : (
              partiesToPrint.map((party, index) => {
                const printBal = Math.round(Math.abs(parseFloat(party.currentBalance || 0)));
                
                return (
                  <tr key={party._id}>
                    <td className="border-dark">{index + 1}</td>
                    <td className="border-dark urdu-text fw-bold">{party.name}</td>
                    <td className="border-dark">{party.partyType}</td>
                    <td className="border-dark urdu-text">{party.balanceType === 'Jama' ? 'جمع (دینے ہیں)' : 'نام (لینے ہیں)'}</td>
                    <td className="border-dark fw-bold" dir="ltr" style={{ color: party.balanceType === 'Jama' ? '#198754' : '#dc3545' }}>
                      Rs. {printBal.toLocaleString()}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        <div className="d-flex justify-content-around mt-4 fw-bold fs-5 border border-dark p-3 bg-light">
          <div style={{ color: '#198754' }}>ٹوٹل جمع (Dene Hain): <span dir="ltr">Rs. {totalJama.toLocaleString()}</span></div>
          <div style={{ color: '#dc3545' }}>ٹوٹل نام (Lene Hain): <span dir="ltr">Rs. {totalNaam.toLocaleString()}</span></div>
        </div>
      </div>
    </>
  );
}

const inputStyle = { width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '15px', boxSizing: 'border-box' };
const thStyle = { padding: '12px', borderBottom: '2px solid #ddd' };
const tdStyle = { padding: '12px' };

export default AllParties;