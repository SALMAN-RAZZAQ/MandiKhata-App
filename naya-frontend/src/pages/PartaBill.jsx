import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CreatableSelect from 'react-select/creatable';

function PartaBill() {
  const [khatas, setKhatas] = useState([]);
  const [cropsList, setCropsList] = useState([]); 
  const [partyOptions, setPartyOptions] = useState([]);
  const [selectedParty, setSelectedParty] = useState(null);

  const [transactionType, setTransactionType] = useState('Baich_Kharidar'); 
  const [customerName, setCustomerName] = useState('');
  const [khataCategory, setKhataCategory] = useState('');
  const [status, setStatus] = useState('');
  
  // 🚀 EDIT MODE VARIABLES 🚀
  const [savedPartaNo, setSavedPartaNo] = useState('');
  const [savedDate, setSavedDate] = useState(null);

  const [items, setItems] = useState([{ cropType: '', weight: '', rate: '', amount: 0 }]);
  const [commPercent, setCommPercent] = useState('');
  const [mazdooriPercent, setMazdooriPercent] = useState('');
  const [marketFeeAmount, setMarketFeeAmount] = useState('');
  const [damiPercent, setDamiPercent] = useState('');
  const [details, setDetails] = useState('');

  const shouldPrint = useRef(false);
  const navigate = useNavigate();
  const getToken = () => localStorage.getItem('token');
  
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('editId');

  useEffect(() => {
    fetch('/api/parcha/khatagroup/all', { headers: { 'auth-token': getToken() } }).then(res => res.json()).then(data => { if (Array.isArray(data) && data.length > 0) { setKhatas(data); setKhataCategory(data[0].name); } });
    fetch('/api/crops/all', { headers: { 'auth-token': getToken() } }).then(res => res.json()).then(data => { if (Array.isArray(data)) setCropsList(data); });
    fetch('/api/parcha/parties/all', { headers: { 'auth-token': getToken() } }).then(res => res.json()).then(data => {
        if (Array.isArray(data)) setPartyOptions(data.map(p => ({ value: p.name, label: `${p.khataIndex || 'N/A'} - ${p.name}`, partyType: p.partyType })));
      });

    // ✅ Purana Bill Load aur ID mehfooz
    if (editId) {
      fetch(`/api/parta/${editId}`, { headers: { 'auth-token': getToken() } })
        .then(res => res.json())
        .then(data => {
          setTransactionType(data.transactionType);
          setCustomerName(data.customerName);
          setKhataCategory(data.khataCategory);
          setSelectedParty({ value: data.customerName, label: data.customerName });
          setItems(data.items);
          setCommPercent(data.commPercent || '');
          setMazdooriPercent(data.mazdooriAmount && data.grossAmount ? ((data.mazdooriAmount / data.grossAmount) * 100).toFixed(2) : '');
          setMarketFeeAmount(data.marketFeeAmount || '');
          setDamiPercent(data.damiPercent || '');
          setDetails(data.details || '');
          
          setSavedPartaNo(data.partaNo || '');  // Purana Number
          setSavedDate(data.createdAt || null); // Purani Date
        });
    }
  }, [editId]);

  const handlePartyChange = (newValue) => { setSelectedParty(newValue); if (newValue) { setCustomerName(newValue.value); if (newValue.partyType) setKhataCategory(newValue.partyType); } else setCustomerName(''); };
  const handleItemChange = (index, field, value) => { const updatedItems = [...items]; updatedItems[index][field] = value; if (field === 'weight' || field === 'rate') { const w = Number(updatedItems[index].weight) || 0; const r = Number(updatedItems[index].rate) || 0; updatedItems[index].amount = (w / 40) * r; } setItems(updatedItems); };
  const addItem = () => setItems([...items, { cropType: '', weight: '', rate: '', amount: 0 }]);
  const removeItem = (index) => { if (items.length > 1) setItems(items.filter((_, i) => i !== index)); };

  const grossAmount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const commAmount = grossAmount * ((Number(commPercent) || 0) / 100);
  const damiAmount = grossAmount * ((Number(damiPercent) || 0) / 100);
  const mazdooriAmount = grossAmount * ((Number(mazdooriPercent) || 0) / 100);
  const totalExpenses = commAmount + mazdooriAmount + (Number(marketFeeAmount) || 0) + damiAmount;
  const netAmount = transactionType === 'Baich_Kharidar' ? grossAmount + totalExpenses : grossAmount - totalExpenses;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if(!customerName) return setStatus('❌ Party ka naam zaroori hai!');
    for (let i = 0; i < items.length; i++) { if (!items[i].cropType || !items[i].weight || !items[i].rate) return setStatus(`❌ Item ${i + 1} mein tafseel zaroori hai!`); }

    try {
      if (editId) {
        setStatus('⏳ Purana hisaab reverse ho raha hai...');
        const delRes = await fetch(`/api/parta/delete/${editId}`, { method: 'DELETE', headers: { 'auth-token': getToken() } });
        if (!delRes.ok) return setStatus('❌ Purana bill reverse nahi ho saka!');
      }

      setStatus(editId ? '⏳ Naya hisaab update ho raha hai...' : '⏳ Parta Bill save ho raha hai...');

      const response = await fetch('/api/parta/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'auth-token': getToken() },
        body: JSON.stringify({
          existingPartaNo: savedPartaNo,  // 🚀 NAYA: Purana number bhej rahe hain
          existingDate: savedDate,        // 🚀 NAYA: Purani date bhej rahe hain
          transactionType, customerName, khataCategory,
          items: items.map(item => ({ cropType: item.cropType, weight: Number(item.weight), rate: Number(item.rate), amount: Number(item.amount) })),
          commPercent: Number(commPercent) || 0, commAmount, mazdooriAmount, marketFeeAmount: Number(marketFeeAmount) || 0,
          damiPercent: Number(damiPercent) || 0, damiAmount, details
        })
      });

      if (response.ok) {
        const responseData = await response.json();
        setSavedPartaNo(responseData.data?.partaNo || '');
        setStatus(editId ? '✅ Parta Bill kamyabi se Update ho gaya!' : '✅ Parta Bill kamyabi se ban gaya!');
        if (shouldPrint.current) { setTimeout(() => window.print(), 300); shouldPrint.current = false; }
        setTimeout(() => {
          if (editId) navigate('/parta-history'); 
          else window.location.reload();
        }, 2000);
      } else {
        const errorData = await response.json();
        setStatus('❌ ' + (errorData.error || 'Masla aagaya!'));
      }
    } catch (error) { setStatus('❌ Network Error!'); }
  };

  const currentDate = new Date().toLocaleDateString('en-GB');
  const isBaich = transactionType === 'Baich_Kharidar';
  const selectStyles = { control: (base) => ({ ...base, marginTop: '5px', padding: '2px', borderColor: '#ccc', boxShadow: 'none' }) };
  const inputStyle = { width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' };

  return (
    <>
      <style>{`@media screen { .print-only { display: none !important; } } @media print { body * { visibility: hidden; } .print-only, .print-only * { visibility: visible; } .print-only { position: absolute; left: 0; top: 0; width: 100%; padding: 10px; } .screen-only { display: none !important; } }`}</style>
      <div style={{ padding: '30px', fontFamily: 'Arial', maxWidth: '900px', margin: '0 auto' }}>
        <div className="screen-only">
          <h2 style={{ color: '#000080', borderBottom: '2px solid #000080', paddingBottom: '10px' }}>{editId ? '✏️ Parta Bill (Update)' : '📋 Naya Parta Bill'}</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
            
            <div style={{ display: 'flex', gap: '15px' }}>
              <div style={{ flex: 1 }}>
                <label><b>Bill Ki Qisam:</b></label>
                <select value={transactionType} onChange={(e) => setTransactionType(e.target.value)} style={inputStyle}>
                  <option value="Baich_Kharidar">Kharidar ko Baicha (Sales + Dami)</option>
                  <option value="Khareed_Kisan">Kisan Se Khareeda (Purchase - Comm)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px' }}>
              <div style={{ flex: 1 }}>
                <label><b>Party Ka Naam (Index ya Naam):</b></label>
                <CreatableSelect options={partyOptions} value={selectedParty} onChange={handlePartyChange} placeholder="1001 ya naam likhein..." styles={selectStyles} isClearable formatCreateLabel={(inputValue) => `Naya Khata: "${inputValue}"`} />
              </div>
              <div style={{ flex: 1 }}>
                <label><b>Khata Group:</b></label>
                <select value={khataCategory} onChange={(e) => setKhataCategory(e.target.value)} style={inputStyle} required>
                  <option value="">Khata Select Karein...</option>
                  {khatas.map(k => <option key={k._id} value={k.name}>{k.name}</option>)}
                </select>
              </div>
            </div>

            <div style={{ backgroundColor: '#e8f4fd', padding: '15px', borderRadius: '8px', border: '1px solid #b3d7ff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}><h4 style={{ margin: 0, color: '#000080' }}>🌾 Faslen (Items)</h4><button type="button" onClick={addItem} style={{ padding: '8px 15px', backgroundColor: '#198754', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>+ Fasal Add</button></div>
              {items.map((item, index) => {
                const iKg = Number(item.weight) || 0; const iMun = Math.floor(iKg / 40); const iKilo = iKg % 40;
                return (
                  <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px', backgroundColor: 'white', padding: '10px', borderRadius: '5px', alignItems: 'flex-start' }}>
                    <div style={{ flex: 2 }}><label><b>Jins:</b></label><select value={item.cropType} onChange={(e) => handleItemChange(index, 'cropType', e.target.value)} style={inputStyle} required><option value="">Fasal...</option>{cropsList.map(crop => <option key={crop._id} value={crop.name}>{crop.name}</option>)}</select></div>
                    <div style={{ flex: 1 }}><label><b>Wazan (Total KG):</b></label><input type="number" value={item.weight} onChange={(e) => handleItemChange(index, 'weight', e.target.value)} required style={inputStyle} />{iKg > 0 && <small style={{ display: 'block', color: '#000080', fontWeight: 'bold', marginTop: '2px' }}>{iMun} من {iKilo} کلو</small>}</div>
                    <div style={{ flex: 1 }}><label><b>Rate:</b></label><input type="number" value={item.rate} onChange={(e) => handleItemChange(index, 'rate', e.target.value)} required style={inputStyle} /></div>
                    <div style={{ flex: 1 }}><label><b>Amount:</b></label><input type="number" value={item.amount.toFixed(0)} readOnly style={{ ...inputStyle, backgroundColor: '#e9ecef', fontWeight: 'bold' }} /></div>
                    <div><button type="button" onClick={() => removeItem(index)} style={{ padding: '10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginTop: '30px' }}>🗑️</button></div>
                  </div>
                );
              })}
              <div style={{ textAlign: 'right', padding: '10px', fontWeight: 'bold', fontSize: '18px', color: '#000080' }}>Gross Total: Rs. {grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </div>
            
            <div style={{ backgroundColor: isBaich ? '#e2e3e5' : '#fff3cd', padding: '15px', borderRadius: '8px', border: `1px solid ${isBaich ? '#d6d8db' : '#ffeeba'}` }}>
              <h4 style={{ margin: '0 0 10px 0', color: isBaich ? '#383d41' : '#856404' }}>{isBaich ? '➕ Izafi Kharchay (Add to Bill)' : '➖ Katauti (Deduct from Bill)'}</h4>
              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1 }}><label><b>Commission (%):</b></label><input type="number" step="0.01" value={commPercent} onChange={(e) => setCommPercent(e.target.value)} style={inputStyle} /></div>
                <div style={{ flex: 1 }}><label><b>Mazdoori (%):</b></label><input type="number" step="0.01" value={mazdooriPercent} onChange={(e) => setMazdooriPercent(e.target.value)} style={inputStyle} /></div>
                <div style={{ flex: 1 }}><label><b>Market Fee (Rs.):</b></label><input type="number" value={marketFeeAmount} onChange={(e) => setMarketFeeAmount(e.target.value)} style={inputStyle} /></div>
                <div style={{ flex: 1 }}><label><b>Dami (%):</b></label><input type="number" step="0.01" value={damiPercent} onChange={(e) => setDamiPercent(e.target.value)} style={inputStyle} /></div>
              </div>
            </div>
            <div><label><b>Notes:</b></label><input type="text" value={details} onChange={(e) => setDetails(e.target.value)} style={inputStyle} /></div>
            
            <div style={{ backgroundColor: '#d1e7dd', padding: '15px', borderRadius: '8px', border: '2px solid #198754' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}><span>Gross Amount:</span><strong>Rs. {grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: isBaich ? '#0d6efd' : '#dc3545' }}><span>{isBaich ? 'Total Kharchay:' : 'Total Katauti:'}</span><strong>{isBaich ? '+' : '-'} Rs. {totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></div>
              <hr style={{ borderColor: '#198754' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '22px', color: '#198754' }}><span><b>NET SAFFA RAQAM:</b></span><span><b>Rs. {netAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</b></span></div>
            </div>
            
            <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
              <button type="submit" onClick={() => { shouldPrint.current = true; }} style={{ flex: 1, padding: '15px', backgroundColor: '#198754', color: 'white', border: 'none', borderRadius: '5px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}>
                {editId ? '💾 Update & Print 🖨️' : '💾 Save & Print 🖨️'}
              </button>
              <button type="submit" onClick={() => { shouldPrint.current = false; }} style={{ flex: 1, padding: '15px', backgroundColor: '#000080', color: 'white', border: 'none', borderRadius: '5px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}>
                {editId ? '💾 Sirf Update Karein' : '💾 Sirf Save Karein'}
              </button>
            </div>
            {status && <p style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '18px', color: status.includes('❌') ? 'red' : 'green' }}>{status}</p>}
          </form>
        </div>

        {/* PRINT VIEW */}
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
            <div><b>بل بنام:</b> <u style={{ fontFamily: 'Arial', marginRight: '10px' }}>{customerName} ({khataCategory})</u></div>
            <div dir="ltr"><span className="urdu-text fw-bold">پرتہ نمبر:</span> <b style={{ fontFamily: 'Arial' }}>{savedPartaNo || '......'}</b></div>
            <div><b>تاریخ:</b> <u style={{ fontFamily: 'Arial', marginRight: '10px' }}>{currentDate}</u></div>
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
              {items.map((item, index) => {
                const iKg = Number(item.weight) || 0; const iMun = Math.floor(iKg / 40); const iKilo = iKg % 40;
                return (
                  <tr key={index}>
                    <td className="urdu-text border-dark">{item.cropType}</td>
                    <td className="border-dark fw-bold" dir="ltr">{iMun}-{iKilo}</td>
                    <td className="border-dark">{Number(item.rate).toLocaleString()}</td>
                    <td className="border-dark">{Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                );
              })}
              <tr>
                <td colSpan="2" className="text-start urdu-text border-dark p-2" dir="rtl" style={{ lineHeight: '1.8' }}>
                  {commPercent > 0 && <span>کمیشن ({commPercent}%): <span dir="ltr">{commAmount.toFixed(2)}</span><br /></span>}
                  {mazdooriPercent > 0 && <span>مزدوری ({mazdooriPercent}%): <span dir="ltr">{mazdooriAmount.toFixed(2)}</span><br /></span>}
                  {marketFeeAmount > 0 && <span>مارکیٹ فیس: <span dir="ltr">{Number(marketFeeAmount).toFixed(2)}</span><br /></span>}
                  {damiPercent > 0 && <span>دامی({damiPercent}%): <span dir="ltr">{damiAmount.toFixed(2)}</span></span>}
                </td>
                <td className="urdu-text fw-bold border-dark">{isBaich ? 'کل خرچہ' : 'کل کٹوتی'}</td>
                <td className="border-dark fw-bold" dir="ltr" style={{ color: isBaich ? '#000080' : '#dc3545' }}>
                  {totalExpenses > 0 ? `${isBaich ? '+' : '-'} ${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                </td>
              </tr>
              <tr>
                <td colSpan="2" className="border-dark"></td>
                <td className="urdu-text fw-bold border-dark fs-5">کل رقم</td>
                <td className="border-dark fw-bold fs-5" dir="ltr">{grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr style={{ backgroundColor: '#f0fff0' }}>
                <td colSpan="3" className="text-start urdu-text fs-4 fw-bold border-dark">نیٹ صافی رقم:</td>
                <td className="fs-4 fw-bold border-dark" dir="ltr" style={{ color: '#198754' }}>
                  {netAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
          {details && <div className="mt-2 fs-6"><b>نوٹ: </b>{details}</div>}
          <div className="d-flex justify-content-between mt-5 pt-4">
            <div className="fs-5"><span className="badge bg-dark rounded-pill py-2 px-3 fs-6">نوٹ</span><b className="ms-2">بھول چوک لین دین</b></div>
            <div className="text-center fs-5">____________________<br /><b>دستخط</b></div>
          </div>
        </div>
      </div>
    </>
  );
}

export default PartaBill;