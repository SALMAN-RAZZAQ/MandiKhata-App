import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CreatableSelect from 'react-select/creatable';

function TradingBill() {
  const navigate = useNavigate();
  const shouldPrint = useRef(false);
  const getToken = () => localStorage.getItem('token');

  // --- STATES FOR DROPDOWNS ---
  const [khatas, setKhatas] = useState([]);
  const [partyOptions, setPartyOptions] = useState([]);
  const [cropsList, setCropsList] = useState([]); // ✅ NAYA: Crops ki list ke liye

  // --- 1. MASTER BILL DETAILS ---
  const [selectedClient, setSelectedClient] = useState(null);
  const [billMeta, setBillMeta] = useState({
    clientName: '',
    clientCategory: '', 
    shopCategory: '',   
    jins: '',
    date: new Date().toISOString().split('T')[0],
    bharti: 60 
  });

  // --- 2. DYNAMIC SHOP ENTRIES ---
  const [entries, setEntries] = useState([
    { id: 1, shopName: '', selectedShop: null, weight: '', rate: '', damiPercent: '' }
  ]);

  // --- 3. CLIENT EXPENSES ---
  const [expenses, setExpenses] = useState({
    labourPerBag: '',
    freightRate: '', // Backend ke liye same rakha hai taake error na aaye
    freightType: 'per_maund', 
    commissionPercent: '',
    marketFeeRate: '2' 
  });

  const [status, setStatus] = useState('');

  // --- FETCH DATA ON MOUNT ---
  useEffect(() => {
    // Fetch Khata Groups
    fetch('/api/parcha/khatagroup/all', { headers: { 'auth-token': getToken() } })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setKhatas(data);
          setBillMeta(prev => ({ ...prev, clientCategory: 'Kharidar', shopCategory: 'Shop' })); 
        }
      }).catch(err => console.error('Khata error:', err));

    // Fetch Parties
    fetch('/api/parcha/parties/all', { headers: { 'auth-token': getToken() } })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const formatted = data.map(p => ({
            value: p.name,
            label: `${p.khataIndex || 'N/A'} - ${p.name}`,
            partyType: p.partyType
          }));
          setPartyOptions(formatted);
        }
      })
      .catch(err => console.error("Parties error:", err));

    // ✅ NAYA: Fetch Crops
    fetch('/api/crops/all', { headers: { 'auth-token': getToken() } })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setCropsList(data);
      })
      .catch(err => console.error('Crops error:', err));
  }, []);

  // --- HANDLERS ---
  const handleClientChange = (newValue) => {
    setSelectedClient(newValue);
    setBillMeta(prev => ({
      ...prev,
      clientName: newValue ? newValue.value : '',
      clientCategory: newValue && newValue.partyType ? newValue.partyType : prev.clientCategory
    }));
  };

  const handleShopChange = (index, newValue) => {
    const updated = [...entries];
    updated[index].shopName = newValue ? newValue.value : '';
    updated[index].selectedShop = newValue;
    setEntries(updated);
  };

  const addRow = () => {
    setEntries([...entries, { id: Date.now(), shopName: '', selectedShop: null, weight: '', rate: '', damiPercent: '' }]);
  };

  const removeRow = (id) => {
    if (entries.length > 1) {
      setEntries(entries.filter(entry => entry.id !== id));
    }
  };

  const handleEntryChange = (id, field, value) => {
    const updatedEntries = entries.map(entry => 
      entry.id === id ? { ...entry, [field]: value } : entry
    );
    setEntries(updatedEntries);
  };

  const getMaundKilo = (totalKg) => {
    if (!totalKg || isNaN(totalKg)) return "0 من 0 کلو";
    const maunds = Math.floor(totalKg / 40);
    const kgs = (totalKg % 40).toFixed(2);
    const displayKgs = kgs.endsWith('.00') ? kgs.split('.')[0] : kgs;
    return `${maunds} من ${displayKgs} کلو`;
  };

  // --- CALCULATIONS ---
  const bharti = parseFloat(billMeta.bharti) || 1; 
  let totalWeight = 0;
  let totalPurchaseCost = 0;
  let totalDamiAmount = 0;

  entries.forEach(e => {
    const w = parseFloat(e.weight) || 0;
    const r = parseFloat(e.rate) || 0;
    const d = parseFloat(e.damiPercent) || 0;
    const baseAmount = (w / 40) * r; 
    const damiAmount = baseAmount * (d / 100);
    
    totalWeight += w;
    totalPurchaseCost += baseAmount;
    totalDamiAmount += damiAmount;
  });

  const totalBags = totalWeight > 0 ? (totalWeight / bharti) : 0;
  const totalLabour = totalBags * (parseFloat(expenses.labourPerBag) || 0);
  
  const fRate = parseFloat(expenses.freightRate) || 0;
  const totalFreight = expenses.freightType === 'per_bag' ? (totalBags * fRate) : ((totalWeight / 40) * fRate);

  const totalCommission = totalPurchaseCost * ((parseFloat(expenses.commissionPercent) || 0) / 100);
  const totalMarketFee = (totalWeight / 100) * (parseFloat(expenses.marketFeeRate) || 0);

  const finalNetCost = totalPurchaseCost + totalDamiAmount + totalLabour + totalFreight + totalCommission + totalMarketFee;
  const perMaundCost = totalWeight > 0 ? (finalNetCost / (totalWeight / 40)) : 0;

  // --- SUBMIT ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!billMeta.clientName) return setStatus('❌ Client Name is required!');
    setStatus('⏳ Saving Bill...');

    const billPayload = {
      ...billMeta,
      entries: entries.map(entry => {
         const w = parseFloat(entry.weight) || 0;
         const r = parseFloat(entry.rate) || 0;
         const d = parseFloat(entry.damiPercent) || 0;
         const base = (w / 40) * r;
         return { ...entry, rowTotal: base + (base * (d / 100)) };
      }),
      expenses,
      totals: {
        totalWeight, totalBags, totalPurchaseCost, totalDamiAmount,
        totalLabour, totalFreight, totalMarketFee, totalCommission,
        finalNetCost, perMaundCost
      }
    };

    try {
      const response = await fetch('/api/trading/save-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'auth-token': getToken() },
        body: JSON.stringify(billPayload)
      });

      const data = await response.json();
      
      if (data.success) {
        setStatus("✅ Trading Bill Saved Successfully!");
        if (shouldPrint.current) {
          setTimeout(() => window.print(), 300);
          shouldPrint.current = false;
        }
      } else {
        setStatus("❌ Error: " + data.message);
      }
    } catch (error) {
      setStatus("❌ Network Error. Cannot connect to server.");
    }
  };

  const inputStyle = { width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' };
  const selectStyles = { control: (base) => ({ ...base, marginTop: '5px', padding: '2px', borderColor: '#ccc', boxShadow: 'none', '&:hover': { borderColor: '#000080' } }) };

  const formatRs = (num) => num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <>
      <style>{`@media screen { .print-only { display: none !important; } } @media print { body * { visibility: hidden; } .print-only, .print-only * { visibility: visible; } .print-only { position: absolute; left: 0; top: 0; width: 100%; padding: 10px; } .screen-only { display: none !important; } }`}</style>
      
      <div style={{ padding: '30px', fontFamily: 'Arial', maxWidth: '1000px', margin: '0 auto', direction: 'ltr' }}>
        
        <div className="screen-only">
          <h2 style={{ color: '#000080', borderBottom: '2px solid #000080', paddingBottom: '10px' }}>📋 Trading / Beopar Master Bill</h2>
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
            
            {/* --- SECTION 1: CLIENT INFO --- */}
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              <div style={{ flex: 2, minWidth: '250px' }}>
                <label style={{ whiteSpace: 'nowrap' }}><b>Client Name (Kharidar):</b></label>
                <CreatableSelect 
                  options={partyOptions} value={selectedClient} onChange={handleClientChange}
                  placeholder="Index ya naam likhein..." styles={selectStyles} isClearable
                  formatCreateLabel={(val) => `Naya Khata: "${val}"`}
                />
              </div>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ whiteSpace: 'nowrap' }}><b>Khata Group (Client):</b></label>
                <select value={billMeta.clientCategory} onChange={(e) => setBillMeta({...billMeta, clientCategory: e.target.value})} style={inputStyle}>
                  <option value="">Select Group...</option>
                  {khatas.map(k => <option key={k._id} value={k.name}>{k.name}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              {/* ✅ FIX: Jins is now a dropdown mapped to API */}
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ whiteSpace: 'nowrap' }}><b>Jins (Crop):</b></label>
                <select value={billMeta.jins} onChange={(e) => setBillMeta({...billMeta, jins: e.target.value})} style={inputStyle} required>
                  <option value="">Select Crop...</option>
                  {cropsList.map(crop => <option key={crop._id} value={crop.name}>{crop.name}</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ whiteSpace: 'nowrap' }}><b>Bharti (KG per Bori):</b></label>
                <input type="number" value={billMeta.bharti} onChange={(e) => setBillMeta({...billMeta, bharti: e.target.value})} style={{...inputStyle, fontWeight: 'bold'}} required />
              </div>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ whiteSpace: 'nowrap' }}><b>Date:</b></label>
                <input type="date" value={billMeta.date} onChange={(e) => setBillMeta({...billMeta, date: e.target.value})} style={inputStyle} required />
              </div>
            </div>

            {/* --- SECTION 2: DYNAMIC SHOP ENTRIES --- */}
            <div style={{ backgroundColor: '#e8f4fd', padding: '15px', borderRadius: '8px', border: '1px solid #b3d7ff', marginTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                <h4 style={{ margin: 0, color: '#000080' }}>🏪 Dukano Ki Tafseel (Shop Purchases)</h4>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label style={{ margin: 0, fontWeight: 'bold', color: '#000080' }}>Khata Group (Shops):</label>
                  <select value={billMeta.shopCategory} onChange={(e) => setBillMeta({...billMeta, shopCategory: e.target.value})} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <option value="">Select Group...</option>
                    {khatas.map(k => <option key={k._id} value={k.name}>{k.name}</option>)}
                  </select>
                  <button type="button" onClick={addRow} style={{ padding: '8px 15px', backgroundColor: '#198754', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>+ Add Shop</button>
                </div>
              </div>

              {entries.map((entry, index) => {
                 const w = parseFloat(entry.weight) || 0;
                 const r = parseFloat(entry.rate) || 0;
                 const d = parseFloat(entry.damiPercent) || 0;
                 const base = (w / 40) * r;
                 const rowTotal = base + (base * (d / 100));

                 return (
                  <div key={entry.id} style={{ display: 'flex', gap: '10px', marginBottom: '10px', backgroundColor: 'white', padding: '10px', borderRadius: '5px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ paddingTop: '12px', fontWeight: 'bold', color: '#000080', width: '20px' }}>{index + 1}.</div>
                    
                    <div style={{ flex: 2, minWidth: '180px' }}>
                      <label style={{ whiteSpace: 'nowrap' }}><b>Shop / Arhti Name:</b></label>
                      <CreatableSelect 
                        options={partyOptions} value={entry.selectedShop} onChange={(val) => handleShopChange(index, val)}
                        placeholder="Search name..." styles={selectStyles} isClearable
                        formatCreateLabel={(val) => `Naya Khata: "${val}"`}
                      />
                    </div>
                    
                    {/* ✅ FIX: minWidth badha di aur whiteSpace nowrap taake label na toote */}
                    <div style={{ flex: 1, minWidth: '150px' }}>
                      <label style={{ whiteSpace: 'nowrap' }}><b>Wazan (Total KG):</b></label>
                      <input type="number" value={entry.weight} onChange={(e) => handleEntryChange(entry.id, 'weight', e.target.value)} required style={inputStyle} />
                      {w > 0 && <small style={{ display: 'block', color: '#000080', fontWeight: 'bold', marginTop: '4px', direction: 'rtl' }}>{getMaundKilo(w)}</small>}
                    </div>
                    
                    <div style={{ flex: 1, minWidth: '100px' }}>
                      <label style={{ whiteSpace: 'nowrap' }}><b>Rate (/40kg):</b></label>
                      <input type="number" value={entry.rate} onChange={(e) => handleEntryChange(entry.id, 'rate', e.target.value)} required style={inputStyle} />
                    </div>
                    
                    <div style={{ flex: 1, minWidth: '80px' }}>
                      <label style={{ whiteSpace: 'nowrap' }}><b>Dami (%):</b></label>
                      <input type="number" value={entry.damiPercent} onChange={(e) => handleEntryChange(entry.id, 'damiPercent', e.target.value)} style={inputStyle} />
                    </div>

                    <div style={{ flex: 1, minWidth: '100px' }}>
                      <label style={{ whiteSpace: 'nowrap' }}><b>Amount:</b></label>
                      <input type="text" value={rowTotal.toFixed(0)} readOnly style={{ ...inputStyle, backgroundColor: '#e9ecef', fontWeight: 'bold' }} />
                    </div>
                    
                    <div>
                      <button type="button" onClick={() => removeRow(entry.id)} style={{ padding: '10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginTop: '28px' }}>🗑️</button>
                    </div>
                  </div>
                )
              })}
              <div style={{ textAlign: 'right', padding: '10px', fontWeight: 'bold', fontSize: '18px', color: '#000080' }}>
                Gross Amount: Rs. {formatRs(totalPurchaseCost)}
              </div>
            </div>

            {/* --- SECTION 3: EXPENSES --- */}
            <div style={{ backgroundColor: '#e2e3e5', padding: '15px', borderRadius: '8px', border: '1px solid #d6d8db' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#383d41' }}>➕ Izafi Kharchay (Client Expenses)</h4>
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '120px' }}>
                  <label style={{ whiteSpace: 'nowrap' }}><b>Mazdoori (per bori):</b></label>
                  <input type="number" value={expenses.labourPerBag} onChange={(e) => setExpenses({...expenses, labourPerBag: e.target.value})} style={inputStyle} />
                </div>
                <div style={{ flex: 1, minWidth: '120px' }}>
                  <label style={{ whiteSpace: 'nowrap' }}><b>Commission (%):</b></label>
                  <input type="number" step="0.01" value={expenses.commissionPercent} onChange={(e) => setExpenses({...expenses, commissionPercent: e.target.value})} style={inputStyle} />
                </div>
                
                {/* ✅ FIX: Labels updated to Shipping */}
                <div style={{ flex: 1, minWidth: '120px' }}>
                  <label style={{ whiteSpace: 'nowrap' }}><b>Shipping Calc:</b></label>
                  <select value={expenses.freightType} onChange={(e) => setExpenses({...expenses, freightType: e.target.value})} style={inputStyle}>
                    <option value="per_maund">Per Maund</option>
                    <option value="per_bag">Per Bag</option>
                  </select>
                </div>
                
                <div style={{ flex: 1, minWidth: '120px' }}>
                  <label style={{ whiteSpace: 'nowrap' }}><b>Shipping Cost:</b></label>
                  <input type="number" value={expenses.freightRate} onChange={(e) => setExpenses({...expenses, freightRate: e.target.value})} style={inputStyle} />
                </div>
                
                <div style={{ flex: 1, minWidth: '120px' }}>
                  <label style={{ whiteSpace: 'nowrap' }}><b>Market Fee (/100Kg):</b></label>
                  <input type="number" value={expenses.marketFeeRate} onChange={(e) => setExpenses({...expenses, marketFeeRate: e.target.value})} style={inputStyle} />
                </div>
              </div>
            </div>

            {/* --- SECTION 4: FINAL TOTALS (DARK GREEN CARD IN URDU - KEEPING RTL) --- */}
            <div style={{ backgroundColor: '#042e12', color: '#fff', padding: '25px', borderRadius: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', marginTop: '10px', direction: 'rtl' }}>
              <h3 style={{ borderBottom: '1px solid #475569', paddingBottom: '10px', margin: '0 0 20px 0', color: '#d4af37' }}>فائنل بل کی تفصیل</h3>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#cbd5e1' }}>
                <span style={{fontSize: '16px'}}>کل وزن:</span>
                <span style={{fontSize: '16px'}} dir="ltr">{totalWeight.toFixed(2)} Kg <strong style={{color: '#f59e0b'}}>({getMaundKilo(totalWeight)})</strong></span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#cbd5e1' }}>
                <span style={{fontSize: '16px'}}>کل نگ (بوریاں):</span>
                <span style={{fontSize: '16px'}} dir="ltr">{totalBags.toFixed(2)} بوری</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', marginTop: '15px' }}>
                <span style={{fontSize: '16px'}}>خالص مال کی قیمت:</span>
                <span style={{fontSize: '16px'}} dir="ltr">Rs {formatRs(totalPurchaseCost)}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{fontSize: '16px'}}>دکانوں کی ڈامی:</span>
                <span style={{fontSize: '16px'}} dir="ltr">Rs {formatRs(totalDamiAmount)}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{fontSize: '16px'}}>مزدوری / لیبر:</span>
                <span style={{fontSize: '16px'}} dir="ltr">Rs {formatRs(totalLabour)}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{fontSize: '16px'}}>کرایہ / فریٹ:</span>
                <span style={{fontSize: '16px'}} dir="ltr">Rs {formatRs(totalFreight)}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{fontSize: '16px'}}>مارکیٹ فیس:</span>
                <span style={{fontSize: '16px'}} dir="ltr">Rs {formatRs(totalMarketFee)}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{fontSize: '16px'}}>آپ کا کمیشن:</span>
                <span style={{fontSize: '16px'}} dir="ltr">Rs {formatRs(totalCommission)}</span>
              </div>

              <hr style={{ borderColor: '#475569', margin: '20px 0' }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: '0', color: '#fff', fontSize: '26px' }}>کل رقم (Total):</h2>
                <h2 style={{ margin: '0', color: '#10b981', fontSize: '32px' }} dir="ltr">Rs {formatRs(finalNetCost)}</h2>
              </div>
              
              <div style={{ textAlign: 'left', marginTop: '20px' }}>
                <span style={{ backgroundColor: '#b45309', padding: '8px 15px', borderRadius: '4px', color: '#fff', fontWeight: 'bold', fontSize: '15px' }}>
                  خرید دار کو پڑتا (Net Cost): Rs {perMaundCost.toFixed(2)} / من
                </span>
              </div>
            </div>

            {/* --- BUTTONS --- */}
            <div style={{ display: 'flex', gap: '15px', marginTop: '10px', direction: 'ltr' }}>
              <button type="submit" onClick={() => { shouldPrint.current = true; }} style={{ flex: 1, padding: '15px', backgroundColor: '#198754', color: 'white', border: 'none', borderRadius: '5px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}>💾 Save & Print 🖨️</button>
              <button type="submit" onClick={() => { shouldPrint.current = false; }} style={{ flex: 1, padding: '15px', backgroundColor: '#000080', color: 'white', border: 'none', borderRadius: '5px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}>💾 Sirf Save Karein</button>
            </div>
            
            {status && <p style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '18px', color: status.includes('❌') ? 'red' : 'green' }}>{status}</p>}
          </form>
        </div>


        {/* ========================================================
            PRINT ONLY AREA (KEEPS RTL & URDU)
            ======================================================== */}
        <div className="print-only urdu-text" dir="rtl" style={{ backgroundColor: 'white', color: '#000' }}>
          
          <div className="d-flex justify-content-between align-items-center border-bottom border-dark pb-2 mb-2">
            <div style={{ width: '40%' }}><h2 className="mb-0 fw-bold" style={{ color: '#000080' }}>میاں علی محمد اینڈ سنز</h2><p className="mb-0 fw-bold">دوکان نمبر 74/G غلہ منڈی بورے والا</p></div>
            <div className="text-center" style={{ width: '20%' }}><span style={{ fontSize: '30px' }}>🌾</span></div>
            <div dir="ltr" style={{ width: '40%', textAlign: 'left' }}><h4 className="mb-0 fw-bold" style={{ color: '#000080', fontFamily: 'Arial' }}>Mian Ali Muhammad & Sons</h4><p className="mb-0 fw-bold" style={{ fontFamily: 'Arial' }}>74/G, Grain Market Burewala</p></div>
          </div>
          
          <div className="d-flex justify-content-between border-bottom border-dark pb-2 mb-3 fs-6">
            <div dir="ltr" style={{ fontFamily: 'Arial' }}><span className="urdu-text fw-bold me-2">میاں عبدالستار کلیم: </span><b>0336-7202647 / 0309-7032647</b></div>
            <div dir="ltr" style={{ fontFamily: 'Arial' }}><span className="urdu-text fw-bold me-2">میاں عثمان: </span><b>0300-6998470</b></div>
          </div>
          
          <div className="d-flex justify-content-between mb-3 fs-5">
            <div><b>خریدار (Client):</b> <u style={{ fontFamily: 'Arial', marginRight: '10px' }}>{billMeta.clientName} ({billMeta.clientCategory || '---'})</u></div>
            <div dir="ltr"><span className="urdu-text fw-bold">جنس (Crop):</span> <b style={{ fontFamily: 'Arial' }}>{billMeta.jins} (بھرتی: {billMeta.bharti} Kg)</b></div>
            <div><b>تاریخ:</b> <u style={{ fontFamily: 'Arial', marginRight: '10px' }}>{billMeta.date}</u></div>
          </div>

          <table className="table table-bordered border-dark border-2 text-center align-middle mb-0">
            <thead>
              <tr className="fs-5" style={{ backgroundColor: '#f2f2f2' }}>
                <th className="border-dark">نمبر</th>
                <th className="border-dark">دکان / آڑھتی کا نام</th>
                <th className="border-dark">وزن (Kg)</th>
                <th className="border-dark">من و کلو</th>
                <th className="border-dark">ریٹ (من)</th>
                <th className="border-dark">ڈامی (%)</th>
                <th className="border-dark">رقم</th>
              </tr>
            </thead>
            <tbody style={{ fontFamily: 'Arial', fontSize: '17px' }}>
              {entries.map((item, index) => {
                const w = parseFloat(item.weight) || 0;
                const r = parseFloat(item.rate) || 0;
                const d = parseFloat(item.damiPercent) || 0;
                const base = (w / 40) * r;
                const rowTotal = base + (base * (d / 100));

                return (
                  <tr key={index}>
                    <td className="urdu-text border-dark">{index + 1}</td>
                    <td className="urdu-text border-dark text-end">{item.shopName || '---'}</td>
                    <td className="border-dark fw-bold" dir="ltr">{w}</td>
                    <td className="border-dark fw-bold urdu-text">{getMaundKilo(w)}</td>
                    <td className="border-dark">{r.toLocaleString()}</td>
                    <td className="border-dark">{d}%</td>
                    <td className="border-dark" dir="ltr">{rowTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                );
              })}
              
              <tr>
                <td colSpan="4" className="text-start urdu-text border-dark p-2" dir="rtl" style={{ lineHeight: '1.8' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingRight: '20px', width: '70%' }}>
                    <span>کل وزن: <strong>{totalWeight.toFixed(2)} Kg ({getMaundKilo(totalWeight)})</strong></span>
                    <span>کل نگ (بوریاں): <strong>{totalBags.toFixed(2)}</strong></span>
                  </div>
                  <hr style={{ margin: '5px 0' }}/>
                  {totalDamiAmount > 0 && <div>دکانوں کی ڈامی: <span dir="ltr">{totalDamiAmount.toFixed(2)}</span></div>}
                  {totalLabour > 0 && <div>مزدوری / لیبر: <span dir="ltr">{totalLabour.toFixed(2)}</span></div>}
                  {totalFreight > 0 && <div>کرایہ / فریٹ: <span dir="ltr">{totalFreight.toFixed(2)}</span></div>}
                  {totalMarketFee > 0 && <div>مارکیٹ فیس: <span dir="ltr">{totalMarketFee.toFixed(2)}</span></div>}
                  {totalCommission > 0 && <div>آپ کا کمیشن: <span dir="ltr">{totalCommission.toFixed(2)}</span></div>}
                </td>
                <td colSpan="2" className="urdu-text fw-bold border-dark fs-5 align-middle">کل اخراجات</td>
                <td className="border-dark fw-bold fs-5 align-middle" dir="ltr" style={{ color: '#000080' }}>
                  + {(totalDamiAmount + totalLabour + totalFreight + totalMarketFee + totalCommission).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>
              
              <tr>
                <td colSpan="4" className="border-dark text-start p-2">
                   <strong>خرید دار کو فائنل پڑتا ریٹ: Rs {perMaundCost.toFixed(2)} / من</strong>
                </td>
                <td colSpan="2" className="urdu-text fw-bold border-dark fs-5">خالص مال کی قیمت</td>
                <td className="border-dark fw-bold fs-5" dir="ltr">{totalPurchaseCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              
              <tr style={{ backgroundColor: '#f0fff0' }}>
                <td colSpan="6" className="text-start urdu-text fs-4 fw-bold border-dark">نیٹ صافی رقم (Grand Total):</td>
                <td className="fs-4 fw-bold border-dark" dir="ltr" style={{ color: '#198754' }}>
                  {finalNetCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
          
          <div className="d-flex justify-content-between mt-5 pt-4">
            <div className="fs-5"><span className="badge bg-dark rounded-pill py-2 px-3 fs-6">نوٹ</span><b className="ms-2">بھول چوک لین دین</b></div>
            <div className="text-center fs-5">____________________<br /><b>دستخط</b></div>
          </div>
        </div>

      </div>
    </>
  );
}

export default TradingBill;