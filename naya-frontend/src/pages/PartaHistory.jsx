import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function PartaHistory() {
  const [bills, setBills] = useState([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchName, setSearchName] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [selectedBill, setSelectedBill] = useState(null);
  const [printType, setPrintType] = useState(''); 

  const navigate = useNavigate();
  const getToken = () => localStorage.getItem('token');
  const userRole = localStorage.getItem('role');

  const fetchBills = async () => {
    setLoading(true);
    try {
      let query = '?';
      if (fromDate) query += `from=${fromDate}&`;
      if (toDate) query += `to=${toDate}&`;
      if (searchName) query += `customerName=${searchName}`;

      const [partaRes, tradingRes] = await Promise.all([
        fetch(`/api/parta/all${query}`, { headers: { 'auth-token': getToken() } }),
        fetch(`/api/trading/all${query}`, { headers: { 'auth-token': getToken() } })
      ]);
      
      let partaData = [];
      let tradingData = [];

      if (partaRes.ok) partaData = await partaRes.json();
      if (tradingRes.ok) tradingData = await tradingRes.json();

      const combined = [
        ...partaData.map(b => ({ ...b, type: 'Parta', displayDate: b.createdAt })),
        ...tradingData.map(b => ({ ...b, type: 'Trading', displayDate: b.date }))
      ].sort((a, b) => new Date(b.displayDate) - new Date(a.displayDate));

      setBills(combined);
    } catch (error) {
      console.error("Bills fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  const handleDelete = async (id, type) => {
    const isConfirm = window.confirm(`⚠️ WARNING: Kya aap waqai yeh ${type} Bill delete karna chahte hain? Is se juray tamam khatay (Comm, Dami, Ledger) reverse ho jayenge!`);
    if (isConfirm) {
      try {
        const url = type === 'Parta' ? `/api/parta/delete/${id}` : `/api/trading/delete/${id}`;
        const response = await fetch(url, {
          method: 'DELETE',
          headers: { 'auth-token': getToken() }
        });
        if (response.ok) {
          alert("✅ Bill aur uska hisaab kamyabi se Reverse ho gaya!");
          fetchBills(); 
        } else {
          alert("❌ Delete karne mein masla aaya.");
        }
      } catch (error) {
        alert("❌ Network Error.");
      }
    }
  };

  const handlePrint = (bill) => {
    setSelectedBill(bill);
    setPrintType(bill.type);
    setTimeout(() => { window.print(); }, 200);
  };

  const formatRs = (num) => Number(num || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const getMaundKilo = (totalKg) => {
    if (!totalKg || isNaN(totalKg)) return "0 من 0 کلو";
    const maunds = Math.floor(totalKg / 40);
    const kgs = (totalKg % 40).toFixed(2);
    const displayKgs = kgs.endsWith('.00') ? kgs.split('.')[0] : kgs;
    return `${maunds} من ${displayKgs} کلو`;
  };

  return (
    <>
      <style>{`
        @media screen { .print-only { display: none !important; } } 
        @media print { 
            body * { visibility: hidden; } 
            .print-only, .print-only * { visibility: visible; } 
            .print-only { position: absolute; left: 0; top: 0; width: 100%; padding: 10px; } 
            .screen-only { display: none !important; } 
            @page { margin: 0.5cm; }
        }
      `}</style>
      
      <div className="screen-only" style={{ padding: '30px', fontFamily: 'Arial, sans-serif' }}>
        <h2 style={{ color: '#000080', borderBottom: '2px solid #000080', paddingBottom: '10px' }}>
          📜 Purane Bills History (Parta & Trading)
        </h2>

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
            <label style={{ fontWeight: 'bold' }}>Party Ka Naam:</label>
            <input type="text" placeholder="Naam likhein..." value={searchName} onChange={(e) => setSearchName(e.target.value)} style={inputStyle} />
          </div>
          <button onClick={fetchBills} style={{ padding: '10px 20px', backgroundColor: '#000080', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>🔍 Dhoondein</button>
          <button onClick={() => { setFromDate(''); setToDate(''); setSearchName(''); setTimeout(fetchBills, 100); }} style={{ padding: '10px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>🔄 Clear</button>
        </div>

        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#000080', color: 'white', textAlign: 'left' }}>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Bill No.</th>
                <th style={thStyle}>Party Name(s)</th>
                <th style={thStyle}>Khata Category</th>
                <th style={thStyle}>Items</th>
                <th style={thStyle}>Net Amount</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" style={{ padding: '20px', textAlign: 'center' }}>⏳ Bills dhoondh raha hai...</td></tr>
              ) : bills.length === 0 ? (
                <tr><td colSpan="8" style={{ padding: '20px', textAlign: 'center', fontWeight: 'bold' }}>Koi purana bill nahi mila.</td></tr>
              ) : (
                bills.map(bill => {
                  const isParta = bill.type === 'Parta';
                  
                  let billNo, cName, kCat, badgeText, badgeColor;

                  if (isParta) {
                    billNo = bill.partaNo;
                    cName = bill.customerName;
                    kCat = bill.khataCategory;
                    badgeText = 'پکا بل';
                    badgeColor = '#0d6efd';
                  } else {
                    if (bill.billType === 'Purchase') {
                      billNo = `TRD-PUR-${bill._id.slice(-5).toUpperCase()}`;
                      cName = bill.entries?.map(e => e.shopName).filter(Boolean).join(', ') || '---';
                      const uniqueCats = [...new Set(bill.entries?.map(e => e.khataCategory).filter(Boolean))];
                      kCat = uniqueCats.length > 0 ? uniqueCats.join(', ') : '---';
                      badgeText = 'Trading (Purchase)';
                      badgeColor = '#b45309'; 
                    } else {
                      billNo = `TRD-SAL-${bill._id.slice(-5).toUpperCase()}`;
                      cName = bill.clientName;
                      kCat = bill.clientCategory;
                      badgeText = 'Trading (Sale)';
                      badgeColor = '#198754'; 
                    }
                  }

                  const iCount = isParta ? bill.items.length : bill.entries.length;
                  const netAmt = isParta ? bill.netAmount : bill.totals?.finalNetCost;

                  return (
                    <tr key={bill._id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={tdStyle}>{new Date(bill.displayDate).toLocaleDateString('en-GB')}</td>
                      <td style={{ ...tdStyle, fontWeight: 'bold', color: badgeColor }}>{badgeText}</td>
                      <td style={{ ...tdStyle, color: '#000080', fontWeight: 'bold' }}>{billNo}</td>
                      <td style={{ ...tdStyle, fontWeight: 'bold' }}>{cName}</td>
                      <td style={tdStyle}>{kCat || '---'}</td>
                      <td style={tdStyle}>{iCount} Items</td>
                      <td style={{ ...tdStyle, color: '#198754', fontWeight: 'bold', fontSize: '16px' }}>Rs. {formatRs(netAmt)}</td>
                      <td style={{ ...tdStyle, display: 'flex', gap: '8px' }}>
                        
                        <button onClick={() => handlePrint(bill)} style={{ padding: '6px 12px', backgroundColor: '#0dcaf0', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>🖨️ Print</button>
                        
                        {/* 🔥 NAYA FIX: Edit Button (Only for Admin) */}
                        {userRole === 'Admin' && (
                          <>
                            <button 
                              onClick={() => navigate(`/${isParta ? 'parta-bill' : 'trading-bill'}?editId=${bill._id}`)} 
                              style={{ padding: '6px 12px', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                              ✏️ Edit
                            </button>

                            <button onClick={() => handleDelete(bill._id, bill.type)} style={{ padding: '6px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>🗑️ Delete</button>
                          </>
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

      {selectedBill && (
        <div className="print-only urdu-text" dir="rtl" style={{ backgroundColor: 'white', color: '#000' }}>
          
          <div className="d-flex justify-content-between align-items-center border-bottom border-dark pb-2 mb-2">
            <div style={{ width: '35%' }}><h2 className="mb-0 fw-bold" style={{ color: '#000080' }}>میاں علی محمد اینڈ سنز</h2><p className="mb-0 fw-bold">دوکان نمبر 74/G غلہ منڈی بورے والا</p></div>
            <div className="text-center" style={{ width: '30%' }}>
              <span style={{ fontSize: '30px', fontWeight:'bold', border:'2px solid black', padding:'5px 15px', borderRadius:'10px' }}>
                {printType === 'Parta' ? 'پکا بل' : (selectedBill.billType === 'Purchase' ? 'بل خریداری' : 'بل فروخت')}
              </span>
            </div>
            <div dir="ltr" style={{ width: '35%', textAlign: 'left' }}><h4 className="mb-0 fw-bold" style={{ color: '#000080', fontFamily: 'Arial' }}>Mian Ali Muhammad & Sons</h4><p className="mb-0 fw-bold" style={{ fontFamily: 'Arial' }}>74/G, Grain Market Burewala</p></div>
          </div>
          
          <div className="d-flex justify-content-between border-bottom border-dark pb-2 mb-3 fs-6">
            <div dir="ltr" style={{ fontFamily: 'Arial' }}><span className="urdu-text fw-bold me-2">میاں عبدالستار کلیم: </span><b>0336-7202647 / 0309-7032647</b></div>
            <div dir="ltr" style={{ fontFamily: 'Arial' }}><span className="urdu-text fw-bold me-2">میاں عثمان: </span><b>0300-6998470</b></div>
          </div>
          
          {printType === 'Parta' ? (
            <>
              <div className="d-flex justify-content-between mb-3 fs-5">
                <div><b>بل بنام:</b> <u style={{ fontFamily: 'Arial', marginRight: '10px' }}>{selectedBill.customerName} ({selectedBill.khataCategory})</u></div>
                <div dir="ltr"><span className="urdu-text fw-bold">پرتہ نمبر:</span> <b style={{ fontFamily: 'Arial' }}>{selectedBill.partaNo}</b></div>
                <div><b>تاریخ:</b> <u style={{ fontFamily: 'Arial', marginRight: '10px' }}>{new Date(selectedBill.createdAt).toLocaleDateString('en-GB')}</u></div>
              </div>
              <table className="table table-bordered border-dark border-2 text-center align-middle mb-0">
                <thead>
                  <tr className="fs-5">
                    <th className="border-dark">اجناس</th>
                    <th className="border-dark">وزن <span dir="ltr">(من - کلو)</span></th>
                    <th className="border-dark">در</th>
                    <th className="border-dark">روپے</th>
                  </tr>
                </thead>
                <tbody style={{ fontFamily: 'Arial', fontSize: '17px' }}>
                  {selectedBill.items.map((item, index) => {
                    const iKg = Number(item.weight) || 0;
                    const iMun = Math.floor(iKg / 40);
                    const iKilo = iKg % 40;
                    return (
                      <tr key={index}>
                        <td className="urdu-text border-dark">{item.cropType}</td>
                        <td className="border-dark fw-bold" dir="ltr">{iMun}-{iKilo}</td>
                        <td className="border-dark">{formatRs(item.rate)}</td>
                        <td className="border-dark">{formatRs(item.amount)}</td>
                      </tr>
                    );
                  })}
                  <tr>
                    <td colSpan="2" className="text-start urdu-text border-dark p-2" dir="rtl" style={{ lineHeight: '1.8' }}>
                      {selectedBill.commPercent > 0 && <span>کمیشن ({selectedBill.commPercent}%): <span dir="ltr">{selectedBill.commAmount?.toFixed(2)}</span><br /></span>}
                      {selectedBill.mazdooriAmount > 0 && <span>مزدوری: <span dir="ltr">{selectedBill.mazdooriAmount?.toFixed(2)}</span><br /></span>}
                      {selectedBill.marketFeeAmount > 0 && <span>مارکیٹ فیس: <span dir="ltr">{selectedBill.marketFeeAmount?.toFixed(2)}</span><br /></span>}
                      {selectedBill.damiPercent > 0 && <span>دامی({selectedBill.damiPercent}%): <span dir="ltr">{selectedBill.damiAmount?.toFixed(2)}</span></span>}
                    </td>
                    <td className="urdu-text fw-bold border-dark">{selectedBill.transactionType === 'Baich_Kharidar' ? 'کل خرچہ' : 'کل کٹوتی'}</td>
                    <td className="border-dark fw-bold" dir="ltr" style={{ color: selectedBill.transactionType === 'Baich_Kharidar' ? '#000080' : '#dc3545' }}>
                      {selectedBill.transactionType === 'Baich_Kharidar' ? '+' : '-'} {formatRs(selectedBill.totalDeductions || (selectedBill.commAmount + selectedBill.mazdooriAmount + selectedBill.marketFeeAmount + selectedBill.damiAmount))}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan="2" className="border-dark"></td>
                    <td className="urdu-text fw-bold border-dark fs-5">کل رقم</td>
                    <td className="border-dark fw-bold fs-5" dir="ltr">{formatRs(selectedBill.grossAmount)}</td>
                  </tr>
                  <tr style={{ backgroundColor: '#f0fff0' }}>
                    <td colSpan="3" className="text-start urdu-text fs-4 fw-bold border-dark">نیٹ صافی رقم:</td>
                    <td className="fs-4 fw-bold border-dark" dir="ltr" style={{ color: '#198754' }}>
                      {formatRs(selectedBill.netAmount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </>
          ) : (
            <>
              <div className="d-flex justify-content-between mb-3 fs-5">
                {selectedBill.billType === 'Purchase' ? (
                   <div><b>اسٹاک انٹری (خریداری)</b></div>
                ) : (
                   <div><b>خریدار (Client):</b> <u style={{ fontFamily: 'Arial', marginRight: '10px' }}>{selectedBill.clientName} ({selectedBill.clientCategory || '---'})</u></div>
                )}
                <div dir="ltr">
                  <span className="urdu-text fw-bold">جنس (Crop):</span> 
                  <b style={{ fontFamily: 'Arial' }}> {selectedBill.jins} {selectedBill.billType === 'Sale' && `(بھرتی: ${selectedBill.bharti} Kg)`}</b>
                </div>
                <div><b>تاریخ:</b> <u style={{ fontFamily: 'Arial', marginRight: '10px' }}>{new Date(selectedBill.date).toLocaleDateString('en-GB')}</u></div>
              </div>
              <table className="table table-bordered border-dark border-2 text-center align-middle mb-0">
                <thead>
                  <tr className="fs-5" style={{ backgroundColor: '#f2f2f2' }}>
                    <th className="border-dark">نمبر</th>
                    {selectedBill.billType === 'Purchase' && <th className="border-dark">دکان / آڑھتی کا نام</th>}
                    <th className="border-dark">بھرتی (Kg)</th>
                    <th className="border-dark">وزن (Kg)</th>
                    <th className="border-dark">من و کلو</th>
                    <th className="border-dark">ریٹ (من)</th>
                    {selectedBill.billType === 'Purchase' && <th className="border-dark">ڈامی (%)</th>}
                    <th className="border-dark">رقم</th>
                  </tr>
                </thead>
                <tbody style={{ fontFamily: 'Arial', fontSize: '17px' }}>
                  {selectedBill.entries.map((item, index) => (
                    <tr key={index}>
                      <td className="urdu-text border-dark">{index + 1}</td>
                      {selectedBill.billType === 'Purchase' && <td className="urdu-text border-dark text-end">{item.shopName || '---'}</td>}
                      <td className="border-dark fw-bold" dir="ltr">{selectedBill.billType === 'Purchase' ? item.bharti : selectedBill.bharti}</td>
                      <td className="border-dark fw-bold" dir="ltr">{item.weight}</td>
                      <td className="border-dark fw-bold urdu-text">{getMaundKilo(item.weight)}</td>
                      <td className="border-dark">{formatRs(item.rate)}</td>
                      {selectedBill.billType === 'Purchase' && <td className="border-dark">{item.damiPercent}%</td>}
                      <td className="border-dark" dir="ltr">{formatRs(item.rowTotal)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={selectedBill.billType === 'Purchase' ? "5" : "4"} className="text-start urdu-text border-dark p-2" dir="rtl" style={{ lineHeight: '1.8' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingRight: '20px', width: '70%' }}>
                        <span>کل وزن: <strong>{selectedBill.totals?.totalWeight?.toFixed(2)} Kg ({getMaundKilo(selectedBill.totals?.totalWeight)})</strong></span>
                        <span>کل نگ (بوریاں): <strong>{selectedBill.totals?.totalBags?.toFixed(2)}</strong></span>
                      </div>
                      <hr style={{ margin: '5px 0' }}/>
                      {selectedBill.totals?.totalDamiAmount > 0 && <div>دکانوں کی ڈامی: <span dir="ltr">{formatRs(selectedBill.totals.totalDamiAmount)}</span></div>}
                      {selectedBill.totals?.totalLabour > 0 && <div>مزدوری / لیبر: <span dir="ltr">{formatRs(selectedBill.totals.totalLabour)}</span></div>}
                      {selectedBill.totals?.totalFreight > 0 && <div>کرایہ / فریٹ: <span dir="ltr">{formatRs(selectedBill.totals.totalFreight)}</span></div>}
                      {selectedBill.totals?.totalMarketFee > 0 && <div>مارکیٹ فیس: <span dir="ltr">{formatRs(selectedBill.totals.totalMarketFee)}</span></div>}
                      {selectedBill.totals?.totalCommission > 0 && <div>کمیشن: <span dir="ltr">{formatRs(selectedBill.totals.totalCommission)}</span></div>}
                      {selectedBill.totals?.clientDamiAmount > 0 && <div>ڈامی (Client): <span dir="ltr">{formatRs(selectedBill.totals.clientDamiAmount)}</span></div>}
                    </td>
                    <td colSpan="2" className="urdu-text fw-bold border-dark fs-5 align-middle">کل اخراجات</td>
                    <td className="border-dark fw-bold fs-5 align-middle" dir="ltr" style={{ color: '#000080' }}>
                      + {formatRs(
                        (selectedBill.totals?.totalDamiAmount || 0) + (selectedBill.totals?.totalLabour || 0) + 
                        (selectedBill.totals?.totalFreight || 0) + (selectedBill.totals?.totalMarketFee || 0) + 
                        (selectedBill.totals?.totalCommission || 0) + (selectedBill.totals?.clientDamiAmount || 0)
                      )}
                    </td>
                  </tr>
                  {selectedBill.billType === 'Sale' && (
                  <tr>
                    <td colSpan="4" className="border-dark text-start p-2">
                       <strong>خرید دار کو فائنل پڑتا ریٹ: Rs {selectedBill.totals?.perMaundCost?.toFixed(2)} / من</strong>
                    </td>
                    <td colSpan="2" className="urdu-text fw-bold border-dark fs-5">خالص مال کی قیمت</td>
                    <td className="border-dark fw-bold fs-5" dir="ltr">{formatRs(selectedBill.totals?.totalPurchaseCost)}</td>
                  </tr>
                  )}
                  <tr style={{ backgroundColor: '#f0fff0' }}>
                    <td colSpan={selectedBill.billType === 'Purchase' ? "7" : "6"} className="text-start urdu-text fs-4 fw-bold border-dark">نیٹ صافی رقم (Grand Total):</td>
                    <td className="fs-4 fw-bold border-dark" dir="ltr" style={{ color: '#198754' }}>
                      {formatRs(selectedBill.totals?.finalNetCost)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </>
          )}

          <div className="d-flex justify-content-between mt-5 pt-4">
            <div className="fs-5"><span className="badge bg-dark rounded-pill py-2 px-3 fs-6">نوٹ</span><b className="ms-2">بھول چوک لین دین</b></div>
            <div className="text-center fs-5">____________________<br /><b>دستخط</b></div>
          </div>
        </div>
      )}
    </>
  );
}

const inputStyle = { padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '15px', minWidth: '150px' };
const thStyle = { padding: '12px', borderBottom: '2px solid #ddd' };
const tdStyle = { padding: '12px' };

export default PartaHistory;