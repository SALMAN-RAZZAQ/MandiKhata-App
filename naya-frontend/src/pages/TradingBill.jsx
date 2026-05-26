import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CreatableSelect from 'react-select/creatable';

function TradingBill() {
  const navigate = useNavigate();
  const shouldPrint = useRef(false);
  const getToken = () => localStorage.getItem('token');

  const [billType, setBillType] = useState('Sale'); 

  const [khatas, setKhatas] = useState([]);
  const [partyOptions, setPartyOptions] = useState([]);
  const [cropsList, setCropsList] = useState([]);

  const [selectedClient, setSelectedClient] = useState(null);
  
  // ✅ FIX: shopCategory aur clientCategory ko khali chhora hai taake validation pakar sake
  const [billMeta, setBillMeta] = useState({
    clientName: '', clientCategory: '', shopCategory: '', jins: '', date: new Date().toISOString().split('T')[0], bharti: '60'
  });

  const [entries, setEntries] = useState([{ id: 1, shopName: '', selectedShop: null, bharti: '60', weight: '', rate: '', damiPercent: '' }]);

  const [expenses, setExpenses] = useState({
    labourPerBag: '', freightRate: '', freightType: 'per_maund', commissionPercent: '', clientDamiPercent: '', marketFeeRate: '2' 
  });
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetch('/api/parcha/khatagroup/all', { headers: { 'auth-token': getToken() } }).then(res => res.json()).then(data => { if (Array.isArray(data)) setKhatas(data); }).catch(console.error);
    fetch('/api/parcha/parties/all', { headers: { 'auth-token': getToken() } }).then(res => res.json()).then(data => { if (Array.isArray(data)) setPartyOptions(data.map(p => ({ value: p.name, label: `${p.khataIndex || 'N/A'} - ${p.name}`, partyType: p.partyType }))); }).catch(console.error);
    fetch('/api/crops/all', { headers: { 'auth-token': getToken() } }).then(res => res.json()).then(data => { if (Array.isArray(data)) setCropsList(data); }).catch(console.error);
  }, []);

  const handleClientChange = (newValue) => {
    setSelectedClient(newValue);
    setBillMeta(prev => ({ ...prev, clientName: newValue ? newValue.value : '', clientCategory: newValue?.partyType || prev.clientCategory }));
  };

  const handleShopChange = (index, newValue) => {
    const updated = [...entries];
    updated[index].shopName = newValue ? newValue.value : '';
    updated[index].selectedShop = newValue;
    setEntries(updated);
  };

  const addRow = () => setEntries([...entries, { id: Date.now(), shopName: '', selectedShop: null, bharti: '60', weight: '', rate: '', damiPercent: '' }]);
  const removeRow = (id) => { if (entries.length > 1) setEntries(entries.filter(entry => entry.id !== id)); };
  const handleEntryChange = (id, field, value) => setEntries(entries.map(entry => entry.id === id ? { ...entry, [field]: value } : entry));

  const getMaundKilo = (totalKg) => {
    if (!totalKg || isNaN(totalKg)) return "0 من 0 کلو";
    const maunds = Math.floor(totalKg / 40);
    const kgs = (totalKg % 40).toFixed(2);
    return `${maunds} من ${kgs.endsWith('.00') ? kgs.split('.')[0] : kgs} کلو`;
  };

  // --- CALCULATIONS ---
  let totalWeight = 0; let totalBags = 0; let totalPurchaseCost = 0; let totalDamiAmount = 0;

  entries.forEach(e => {
    const w = parseFloat(e.weight) || 0;
    const r = parseFloat(e.rate) || 0;
    const d = parseFloat(e.damiPercent) || 0;
    const b = billType === 'Purchase' ? (parseFloat(e.bharti) || 1) : (parseFloat(billMeta.bharti) || 1);
    
    const baseAmount = (w / 40) * r; 
    const damiAmount = billType === 'Purchase' ? baseAmount * (d / 100) : 0; 
    
    totalWeight += w;
    if(w > 0) totalBags += (w / b); 
    totalPurchaseCost += baseAmount;
    totalDamiAmount += damiAmount;
  });

  const totalLabour = billType === 'Sale' ? totalBags * (parseFloat(expenses.labourPerBag) || 0) : 0;
  const fRate = parseFloat(expenses.freightRate) || 0;
  const totalFreight = billType === 'Sale' ? (expenses.freightType === 'per_bag' ? (totalBags * fRate) : ((totalWeight / 40) * fRate)) : 0;
  const totalCommission = billType === 'Sale' ? totalPurchaseCost * ((parseFloat(expenses.commissionPercent) || 0) / 100) : 0;
  const totalMarketFee = billType === 'Sale' ? (totalWeight / 100) * (parseFloat(expenses.marketFeeRate) || 0) : 0;
  const clientDamiAmount = billType === 'Sale' ? totalPurchaseCost * ((parseFloat(expenses.clientDamiPercent) || 0) / 100) : 0; 

  const finalNetCost = billType === 'Purchase' 
        ? totalPurchaseCost + totalDamiAmount 
        : totalPurchaseCost + totalLabour + totalFreight + totalCommission + totalMarketFee + clientDamiAmount;
        
  // --- SUBMIT WITH STRICT VALIDATION ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 🛑 1. STRICT FRONTEND VALIDATION
    if (billType === 'Sale') {
      if (!billMeta.clientName) return setStatus('❌ Khareedar (Client) ka naam likhna zaroori hai!');
      if (!billMeta.clientCategory) return setStatus('❌ Khareedar ka Khata Group select karein!');
    } else {
      if (!billMeta.shopCategory) return setStatus('❌ Dukan ka Khata Group select karna zaroori hai!');
      for (let i = 0; i < entries.length; i++) {
        if (!entries[i].shopName) {
          return setStatus(`❌ Entry No ${i + 1}: Dukan / Arhti ka naam likhna zaroori hai!`);
        }
      }
    }
    if (!billMeta.jins) return setStatus('❌ Jins (Crop) select karna zaroori hai!');

    setStatus('⏳ Saving Bill...');

    const endpoint = billType === 'Purchase' ? '/api/trading/save-purchase' : '/api/trading/save-sale';

    const billPayload = {
      ...billMeta,
      entries: entries.map(entry => {
         const w = parseFloat(entry.weight) || 0; const r = parseFloat(entry.rate) || 0; const d = parseFloat(entry.damiPercent) || 0;
         const base = (w / 40) * r;
         return { ...entry, rowTotal: billType === 'Purchase' ? base + (base * (d / 100)) : base };
      }),
      expenses: billType === 'Sale' ? expenses : {},
      totals: { totalWeight, totalBags, totalPurchaseCost, totalDamiAmount, clientDamiAmount, totalLabour, totalFreight, totalMarketFee, totalCommission, finalNetCost }
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'auth-token': getToken() },
        body: JSON.stringify(billPayload)
      });
      const data = await response.json();
      if (data.success) {
        setStatus(`✅ Trading ${billType} Bill Saved!`);
        if (shouldPrint.current) { setTimeout(() => window.print(), 300); shouldPrint.current = false; }
      } else setStatus("❌ Error: " + data.message);
    } catch (error) { setStatus("❌ Network Error."); }
  };

  const inputStyle = { width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' };
  const selectStyles = { control: (base) => ({ ...base, marginTop: '5px', padding: '2px', borderColor: '#ccc', boxShadow: 'none' }) };
  const formatRs = (num) => num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <>
      <style>{`@media screen { .print-only { display: none !important; } } @media print { body * { visibility: hidden; } .print-only, .print-only * { visibility: visible; } .print-only { position: absolute; left: 0; top: 0; width: 100%; padding: 10px; } .screen-only { display: none !important; } }`}</style>
      
      <div style={{ padding: '30px', fontFamily: 'Arial', maxWidth: '1100px', margin: '0 auto', direction: 'ltr' }}>
        <div className="screen-only">
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #000080', paddingBottom: '10px', marginBottom: '20px' }}>
            <h2 style={{ color: '#000080', margin: 0 }}>📋 Trading Bill (بیوپار)</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={() => setBillType('Purchase')} style={{ padding: '10px 20px', fontSize: '18px', fontWeight: 'bold', borderRadius: '5px', border: 'none', cursor: 'pointer', backgroundColor: billType === 'Purchase' ? '#0d6efd' : '#e9ecef', color: billType === 'Purchase' ? 'white' : 'black' }}>🛒 مال خریدیں (Purchase)</button>
              <button type="button" onClick={() => setBillType('Sale')} style={{ padding: '10px 20px', fontSize: '18px', fontWeight: 'bold', borderRadius: '5px', border: 'none', cursor: 'pointer', backgroundColor: billType === 'Sale' ? '#198754' : '#e9ecef', color: billType === 'Sale' ? 'white' : 'black' }}>📦 مال بیچیں (Sale)</button>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
            
            {/* ✅ SALE MODE: Client Khata Group */}
            {billType === 'Sale' && (
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', backgroundColor: '#e2f0d9', padding: '15px', borderRadius: '5px' }}>
                <div style={{ flex: 2, minWidth: '250px' }}><label><b>Client Name (خریدار کا نام):</b></label><CreatableSelect options={partyOptions} value={selectedClient} onChange={handleClientChange} styles={selectStyles} isClearable /></div>
                <div style={{ flex: 1, minWidth: '150px' }}><label><b>Khata Group:</b></label><select value={billMeta.clientCategory} onChange={(e) => setBillMeta({...billMeta, clientCategory: e.target.value})} style={inputStyle}><option value="">Select...</option>{khatas.map(k => <option key={k._id} value={k.name}>{k.name}</option>)}</select></div>
              </div>
            )}

            {/* ✅ PURCHASE MODE: Shop Khata Group */}
            {billType === 'Purchase' && (
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', backgroundColor: '#e8f4fd', padding: '15px', borderRadius: '5px' }}>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <label><b>Khata Group (دکانوں کی کیٹیگری):</b></label>
                  <select value={billMeta.shopCategory} onChange={(e) => setBillMeta({...billMeta, shopCategory: e.target.value})} style={inputStyle}>
                    <option value="">Select...</option>
                    {khatas.map(k => <option key={k._id} value={k.name}>{k.name}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '150px' }}><label><b>Jins (Crop):</b></label><select value={billMeta.jins} onChange={(e) => setBillMeta({...billMeta, jins: e.target.value})} style={inputStyle}><option value="">Select Crop...</option>{cropsList.map(crop => <option key={crop._id} value={crop.name}>{crop.name}</option>)}</select></div>
              {billType === 'Sale' && (
                <div style={{ flex: 1, minWidth: '150px' }}><label><b>Bharti (KG/Bori):</b></label><input type="number" value={billMeta.bharti} onChange={(e) => setBillMeta({...billMeta, bharti: e.target.value})} style={inputStyle} required /></div>
              )}
              <div style={{ flex: 1, minWidth: '150px' }}><label><b>Date:</b></label><input type="date" value={billMeta.date} onChange={(e) => setBillMeta({...billMeta, date: e.target.value})} style={inputStyle} required /></div>
            </div>

            <div style={{ padding: '15px', borderRadius: '8px', marginTop: '10px', backgroundColor: billType === 'Purchase' ? '#e8f4fd' : '#fff3cd' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h4 style={{ margin: 0, color: billType === 'Purchase' ? '#0d6efd' : '#b45309' }}>{billType === 'Purchase' ? '🏪 دکانوں کی تفصیل (Shop Purchases)' : '📦 بیچے گئے مال کی تفصیل (Lots Sold)'}</h4>
                <button type="button" onClick={addRow} style={{ padding: '8px 15px', backgroundColor: '#198754', color: 'white', border: 'none', borderRadius: '5px' }}>+ Add Row</button>
              </div>

              {entries.map((entry, index) => {
                 const w = parseFloat(entry.weight) || 0; const r = parseFloat(entry.rate) || 0; const d = parseFloat(entry.damiPercent) || 0;
                 const base = (w / 40) * r;
                 const rowTotal = billType === 'Purchase' ? base + (base * (d / 100)) : base;

                 return (
                  <div key={entry.id} style={{ display: 'flex', gap: '10px', marginBottom: '10px', backgroundColor: 'white', padding: '10px', borderRadius: '5px', flexWrap: 'wrap' }}>
                    <div style={{ paddingTop: '12px', fontWeight: 'bold' }}>{index + 1}.</div>
                    {billType === 'Purchase' && (<div style={{ flex: 2, minWidth: '180px' }}><label><b>Shop / Arhti Name:</b></label><CreatableSelect options={partyOptions} value={entry.selectedShop} onChange={(val) => handleShopChange(index, val)} styles={selectStyles} isClearable /></div>)}
                    {billType === 'Purchase' && (<div style={{ flex: 1, minWidth: '80px' }}><label><b>Bharti (Kg):</b></label><input type="number" value={entry.bharti} onChange={(e) => handleEntryChange(entry.id, 'bharti', e.target.value)} required style={inputStyle} /></div>)}
                    <div style={{ flex: 1, minWidth: '120px' }}><label><b>Wazan (KG):</b></label><input type="number" value={entry.weight} onChange={(e) => handleEntryChange(entry.id, 'weight', e.target.value)} required style={inputStyle} />{w > 0 && <small style={{ color: '#198754', fontWeight: 'bold' }}>{getMaundKilo(w)}</small>}</div>
                    <div style={{ flex: 1, minWidth: '100px' }}><label><b>Rate (/40kg):</b></label><input type="number" value={entry.rate} onChange={(e) => handleEntryChange(entry.id, 'rate', e.target.value)} required style={inputStyle} /></div>
                    {billType === 'Purchase' && (<div style={{ flex: 1, minWidth: '80px' }}><label><b>Dami (%):</b></label><input type="number" value={entry.damiPercent} onChange={(e) => handleEntryChange(entry.id, 'damiPercent', e.target.value)} style={inputStyle} /></div>)}
                    <div style={{ flex: 1, minWidth: '100px' }}><label><b>Amount:</b></label><input type="text" value={rowTotal.toFixed(0)} readOnly style={{ ...inputStyle, backgroundColor: '#e9ecef', fontWeight: 'bold' }} /></div>
                    <div><button type="button" onClick={() => removeRow(entry.id)} style={{ padding: '10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', marginTop: '28px' }}>🗑️</button></div>
                  </div>
                )
              })}
              <div style={{ textAlign: 'right', padding: '10px', fontWeight: 'bold', fontSize: '18px' }}>Total Amount: Rs. {formatRs(totalPurchaseCost)}</div>
            </div>

            {billType === 'Sale' && (
              <div style={{ backgroundColor: '#e2e3e5', padding: '15px', borderRadius: '8px' }}>
                <h4>➕ Izafi Kharchay (Client Expenses)</h4>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}><label>Mazdoori (/bori):</label><input type="number" value={expenses.labourPerBag} onChange={(e) => setExpenses({...expenses, labourPerBag: e.target.value})} style={inputStyle} /></div>
                  <div style={{ flex: 1 }}><label>Commission (%):</label><input type="number" step="0.01" value={expenses.commissionPercent} onChange={(e) => setExpenses({...expenses, commissionPercent: e.target.value})} style={inputStyle} /></div>
                  <div style={{ flex: 1 }}><label>Dami (%):</label><input type="number" step="0.01" value={expenses.clientDamiPercent} onChange={(e) => setExpenses({...expenses, clientDamiPercent: e.target.value})} style={inputStyle} /></div>
                  <div style={{ flex: 1 }}><label>Shipping Calc:</label><select value={expenses.freightType} onChange={(e) => setExpenses({...expenses, freightType: e.target.value})} style={inputStyle}><option value="per_maund">Per Maund</option><option value="per_bag">Per Bag</option></select></div>
                  <div style={{ flex: 1 }}><label>Shipping Cost:</label><input type="number" value={expenses.freightRate} onChange={(e) => setExpenses({...expenses, freightRate: e.target.value})} style={inputStyle} /></div>
                  <div style={{ flex: 1 }}><label>Market Fee (/100Kg):</label><input type="number" value={expenses.marketFeeRate} onChange={(e) => setExpenses({...expenses, marketFeeRate: e.target.value})} style={inputStyle} /></div>
                </div>
              </div>
            )}

            <div style={{ backgroundColor: '#042e12', color: '#fff', padding: '25px', borderRadius: '8px', direction: 'rtl' }}>
              <h3 style={{ color: '#d4af37' }}>فائنل بل کی تفصیل ({billType === 'Purchase' ? 'خریداری' : 'فروخت'})</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span>کل وزن:</span><span dir="ltr">{totalWeight.toFixed(2)} Kg ({getMaundKilo(totalWeight)})</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span>کل نگ (بوریاں):</span><span dir="ltr">{totalBags.toFixed(2)} بوری</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span>خالص مال کی قیمت:</span><span dir="ltr">Rs {formatRs(totalPurchaseCost)}</span></div>
              
              {billType === 'Purchase' && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>دکانوں کی ڈامی:</span><span dir="ltr">Rs {formatRs(totalDamiAmount)}</span></div>}
              {billType === 'Sale' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>مزدوری / لیبر:</span><span dir="ltr">Rs {formatRs(totalLabour)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>کرایہ / فریٹ:</span><span dir="ltr">Rs {formatRs(totalFreight)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>مارکیٹ فیس:</span><span dir="ltr">Rs {formatRs(totalMarketFee)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>کمیشن:</span><span dir="ltr">Rs {formatRs(totalCommission)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ffc107', fontWeight: 'bold' }}><span>ڈامی (Client):</span><span dir="ltr">Rs {formatRs(clientDamiAmount)}</span></div>
                </>
              )}
              <hr style={{ borderColor: '#475569' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h2 style={{ margin: 0, color: '#fff' }}>کل رقم (Total):</h2><h2 style={{ margin: 0, color: '#10b981' }} dir="ltr">Rs {formatRs(finalNetCost)}</h2></div>
            </div>

            <div style={{ display: 'flex', gap: '15px' }}>
              <button type="submit" onClick={() => { shouldPrint.current = true; }} style={{ flex: 1, padding: '15px', backgroundColor: '#198754', color: 'white', border: 'none', borderRadius: '5px', fontSize: '18px', fontWeight: 'bold' }}>💾 Save & Print 🖨️</button>
              <button type="submit" onClick={() => { shouldPrint.current = false; }} style={{ flex: 1, padding: '15px', backgroundColor: '#000080', color: 'white', border: 'none', borderRadius: '5px', fontSize: '18px', fontWeight: 'bold' }}>💾 Sirf Save Karein</button>
            </div>
            {status && <p style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '18px', color: status.includes('❌') ? 'red' : 'green' }}>{status}</p>}
          </form>
        </div>

        {/* PRINT LAYOUT */}
        <div className="print-only urdu-text" dir="rtl" style={{ backgroundColor: 'white', color: '#000' }}>
          <div className="d-flex justify-content-between align-items-center border-bottom border-dark pb-2 mb-2">
            <div style={{ width: '40%' }}><h2 className="mb-0 fw-bold" style={{ color: '#000080' }}>میاں علی محمد اینڈ سنز</h2><p className="mb-0 fw-bold">دوکان نمبر 74/G غلہ منڈی بورے والا</p></div>
            <div className="text-center" style={{ width: '20%' }}><span style={{ fontSize: '30px', fontWeight:'bold', border:'2px solid black', padding:'5px 15px', borderRadius:'10px' }}>{billType === 'Purchase' ? 'بل خریداری' : 'بل فروخت'}</span></div>
            <div dir="ltr" style={{ width: '40%', textAlign: 'left' }}><h4 className="mb-0 fw-bold" style={{ color: '#000080', fontFamily: 'Arial' }}>Mian Ali Muhammad & Sons</h4><p className="mb-0 fw-bold" style={{ fontFamily: 'Arial' }}>74/G, Grain Market Burewala</p></div>
          </div>
          
          <div className="d-flex justify-content-between mb-3 fs-5">
            {billType === 'Sale' ? <div><b>خریدار (Client):</b> <u style={{ fontFamily: 'Arial', marginRight: '10px' }}>{billMeta.clientName}</u></div> : <div><b>اسٹاک انٹری</b></div>}
            <div dir="ltr"><span className="urdu-text fw-bold">جنس (Crop):</span> <b style={{ fontFamily: 'Arial' }}>{billMeta.jins}</b></div>
            <div><b>تاریخ:</b> <u style={{ fontFamily: 'Arial', marginRight: '10px' }}>{billMeta.date}</u></div>
          </div>

          <table className="table table-bordered border-dark border-2 text-center align-middle mb-0">
            <thead>
              <tr className="fs-5" style={{ backgroundColor: '#f2f2f2' }}>
                <th className="border-dark">نمبر</th>
                {billType === 'Purchase' && <th className="border-dark">دکان کا نام</th>}
                <th className="border-dark">بھرتی (Kg)</th>
                <th className="border-dark">وزن (Kg)</th>
                <th className="border-dark">من و کلو</th>
                <th className="border-dark">ریٹ (من)</th>
                {billType === 'Purchase' && <th className="border-dark">ڈامی (%)</th>}
                <th className="border-dark">رقم</th>
              </tr>
            </thead>
            <tbody style={{ fontFamily: 'Arial', fontSize: '17px' }}>
              {entries.map((item, index) => {
                const w = parseFloat(item.weight) || 0; const r = parseFloat(item.rate) || 0; const d = parseFloat(item.damiPercent) || 0;
                const base = (w / 40) * r;
                const rowTotal = billType === 'Purchase' ? base + (base * (d / 100)) : base;

                return (
                  <tr key={index}>
                    <td className="urdu-text border-dark">{index + 1}</td>
                    {billType === 'Purchase' && <td className="urdu-text border-dark text-end">{item.shopName || '---'}</td>}
                    <td className="border-dark fw-bold" dir="ltr">{billType === 'Purchase' ? item.bharti : billMeta.bharti}</td>
                    <td className="border-dark fw-bold" dir="ltr">{w}</td>
                    <td className="border-dark fw-bold urdu-text">{getMaundKilo(w)}</td>
                    <td className="border-dark">{r.toLocaleString()}</td>
                    {billType === 'Purchase' && <td className="border-dark">{d}%</td>}
                    <td className="border-dark" dir="ltr">{rowTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                );
              })}
              
              <tr>
                <td colSpan={billType === 'Purchase' ? "5" : "3"} className="text-start urdu-text border-dark p-2" dir="rtl">
                  <div>کل وزن: <strong>{totalWeight.toFixed(2)} Kg ({getMaundKilo(totalWeight)})</strong> | کل نگ: <strong>{totalBags.toFixed(2)}</strong></div>
                  <hr style={{ margin: '5px 0' }}/>
                  {totalDamiAmount > 0 && <div>دکانوں کی ڈامی: <span dir="ltr">{totalDamiAmount.toFixed(2)}</span></div>}
                  {totalLabour > 0 && <div>مزدوری / لیبر: <span dir="ltr">{totalLabour.toFixed(2)}</span></div>}
                  {totalFreight > 0 && <div>کرایہ / فریٹ: <span dir="ltr">{totalFreight.toFixed(2)}</span></div>}
                  {totalMarketFee > 0 && <div>مارکیٹ فیس: <span dir="ltr">{totalMarketFee.toFixed(2)}</span></div>}
                  {totalCommission > 0 && <div>کمیشن: <span dir="ltr">{totalCommission.toFixed(2)}</span></div>}
                  {clientDamiAmount > 0 && <div>ڈامی (Client): <span dir="ltr">{clientDamiAmount.toFixed(2)}</span></div>}
                </td>
                <td colSpan="2" className="urdu-text fw-bold border-dark fs-5 align-middle">کل اخراجات</td>
                <td className="border-dark fw-bold fs-5 align-middle" dir="ltr">
                  + {(totalDamiAmount + totalLabour + totalFreight + totalMarketFee + totalCommission + clientDamiAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>
              
              <tr style={{ backgroundColor: '#f0fff0' }}>
                <td colSpan={billType === 'Purchase' ? "7" : "6"} className="text-start urdu-text fs-4 fw-bold border-dark">نیٹ صافی رقم (Grand Total):</td>
                <td className="fs-4 fw-bold border-dark" dir="ltr" style={{ color: '#198754' }}>{finalNetCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </>
  );
}

export default TradingBill;