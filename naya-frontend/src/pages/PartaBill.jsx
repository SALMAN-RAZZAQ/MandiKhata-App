import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

function PartaBill() {
  const [khatas, setKhatas] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [khataCategory, setKhataCategory] = useState('');
  const [status, setStatus] = useState('');
  const [savedPartaNo, setSavedPartaNo] = useState('');

  // ✅ Multiple Items (Faslen)
  const [items, setItems] = useState([
    { cropType: '', weight: '', rate: '', amount: 0 }
  ]);

  // Deductions
  const [commPercent, setCommPercent] = useState('');
  const [mazdooriAmount, setMazdooriAmount] = useState('');
  const [marketFeeAmount, setMarketFeeAmount] = useState('');
  const [damiPercent, setDamiPercent] = useState('');
  const [details, setDetails] = useState('');

  const shouldPrint = useRef(false);
  const navigate = useNavigate();
  const getToken = () => localStorage.getItem('token');

  const handleSessionExpire = () => {
    alert("Aapka session expire ho gaya hai. Dobara login karein!");
    localStorage.clear();
    navigate('/login');
  };

  // Khata Groups load karo
  useEffect(() => {
    fetch('/api/parcha/khatagroup/all', {
      headers: { 'auth-token': getToken() }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setKhatas(data);
          setKhataCategory(data[0].name);
        }
      })
      .catch(err => console.error('Khata load error:', err));
  }, []);

  // =========================================
  // ITEM MANAGEMENT (Add/Remove/Update)
  // =========================================
  const handleItemChange = (index, field, value) => {
    const updatedItems = [...items];
    updatedItems[index][field] = value;

    // Amount auto-calculate karo
    if (field === 'weight' || field === 'rate') {
      const w = Number(updatedItems[index].weight) || 0;
      const r = Number(updatedItems[index].rate) || 0;
      updatedItems[index].amount = w * r;
    }
    setItems(updatedItems);
  };

  const addItem = () => {
    setItems([...items, { cropType: '', weight: '', rate: '', amount: 0 }]);
  };

  const removeItem = (index) => {
    if (items.length === 1) return alert('Kam az kam ek fasal zaroori hai!');
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
  };

  // =========================================
  // CALCULATIONS
  // =========================================
  const grossAmount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const commAmount = grossAmount * ((Number(commPercent) || 0) / 100);
  const damiAmount = grossAmount * ((Number(damiPercent) || 0) / 100);
  const totalDeductions = commAmount +
    (Number(mazdooriAmount) || 0) +
    (Number(marketFeeAmount) || 0) +
    damiAmount;
  const netAmount = grossAmount - totalDeductions;

  // =========================================
  // FORM SUBMIT
  // =========================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('⏳ Parta Bill save ho raha hai...');

    // Items validate karo
    for (let i = 0; i < items.length; i++) {
      if (!items[i].cropType || !items[i].weight || !items[i].rate) {
        return setStatus(`❌ Item ${i + 1} mein cropType, weight aur rate zaroori hain!`);
      }
    }

    try {
      const response = await fetch('/api/parta/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'auth-token': getToken()
        },
        body: JSON.stringify({
          customerName,
          khataCategory,
          items: items.map(item => ({
            cropType: item.cropType,
            weight: Number(item.weight),
            rate: Number(item.rate),
            amount: Number(item.amount)
          })),
          commPercent: Number(commPercent) || 0,
          commAmount,
          mazdooriAmount: Number(mazdooriAmount) || 0,
          marketFeeAmount: Number(marketFeeAmount) || 0,
          // ✅ FIX: adaigiAmount ko nikal kar damiPercent aur damiAmount backend ko bhej diya
          damiPercent: Number(damiPercent) || 0,
          damiAmount: damiAmount,
          details
        })
      });

      if (response.status === 401) return handleSessionExpire();

      if (response.ok) {
        const responseData = await response.json();
        setSavedPartaNo(responseData.data?.partaNo || '');
        setStatus('✅ Parta Bill kamyabi se ban gaya!');

        if (shouldPrint.current) {
          setTimeout(() => window.print(), 300);
          shouldPrint.current = false;
        }

        // Reset form
        setTimeout(() => {
          setCustomerName('');
          setKhataCategory(khatas.length > 0 ? khatas[0].name : '');
          setItems([{ cropType: '', weight: '', rate: '', amount: 0 }]);
          setCommPercent('');
          setMazdooriAmount('');
          setMarketFeeAmount('');
          setDamiPercent(''); // ✅ FIX: setAdaigiAmount('') ko setDamiPercent('') se badal diya
          setDetails('');
          setStatus('');
          setSavedPartaNo('');
        }, 2000);

      } else {
        const errorData = await response.json();
        setStatus('❌ ' + (errorData.error || 'Masla aagaya!'));
      }
    } catch (error) {
      setStatus('❌ Network Error!');
    }
  };

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
        }
      `}</style>

      <div style={{ padding: '30px', fontFamily: 'Arial', maxWidth: '900px', margin: '0 auto' }}>

        {/* ================================================ */}
        {/* 💻 SCREEN VIEW */}
        {/* ================================================ */}
        <div className="screen-only">
          <h2 style={{ color: '#000080', borderBottom: '2px solid #000080', paddingBottom: '10px' }}>
            📋 Naya Parta Bill
          </h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>

            {/* Customer Info */}
            <div style={{ display: 'flex', gap: '15px' }}>
              <div style={{ flex: 1 }}>
                <label><b>Customer Ka Naam:</b></label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                  placeholder="Customer ka naam likhein..."
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label><b>Khata Group:</b></label>
                <select value={khataCategory} onChange={(e) => setKhataCategory(e.target.value)} style={inputStyle} required>
                  <option value="">Khata Select Karein...</option>
                  {khatas.map(k => <option key={k._id} value={k.name}>{k.name}</option>)}
                </select>
              </div>
            </div>

            {/* ================================================ */}
            {/* ITEMS TABLE — Multiple Faslen */}
            {/* ================================================ */}
            <div style={{ backgroundColor: '#e8f4fd', padding: '15px', borderRadius: '8px', border: '1px solid #b3d7ff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ margin: 0, color: '#000080' }}>🌾 Faslen (Items)</h4>
                <button type="button" onClick={addItem} style={{ padding: '8px 15px', backgroundColor: '#198754', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                  + Fasal Add Karein
                </button>
              </div>

              {items.map((item, index) => (
                <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px', backgroundColor: 'white', padding: '10px', borderRadius: '5px', alignItems: 'flex-end' }}>
                  <div style={{ flex: 2 }}>
                    <label><b>Jins:</b></label>
                    <select value={item.cropType} onChange={(e) => handleItemChange(index, 'cropType', e.target.value)} style={inputStyle} required>
                      <option value="">Fasal...</option>
                      <option value="گندم">Gandum (گندم)</option>
                      <option value="کپاس">Kapas (کپاس)</option>
                      <option value="مکئی">Makai (مکئی)</option>
                      <option value="چاول">Chawal (چاول)</option>
                      <option value="سرسوں">Sarson (سرسوں)</option>
                      <option value="چنا">Chana (چنا)</option>
                      <option value="گڑ">Gurr (گڑ)</option>
                      <option value="شکر">Shakar (شکر)</option>
                      <option value="تل">Till (تل)</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label><b>Wazan (Man):</b></label>
                    <input type="number" value={item.weight} onChange={(e) => handleItemChange(index, 'weight', e.target.value)} required placeholder="0" style={inputStyle} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label><b>Rate:</b></label>
                    <input type="number" value={item.rate} onChange={(e) => handleItemChange(index, 'rate', e.target.value)} required placeholder="0" style={inputStyle} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label><b>Amount:</b></label>
                    <input type="number" value={item.amount.toFixed(0)} readOnly style={{ ...inputStyle, backgroundColor: '#e9ecef', fontWeight: 'bold' }} />
                  </div>
                  <div>
                    <button type="button" onClick={() => removeItem(index)} style={{ padding: '10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginTop: '5px' }}>
                      🗑️
                    </button>
                  </div>
                </div>
              ))}

              {/* Gross Total */}
              <div style={{ textAlign: 'right', padding: '10px', fontWeight: 'bold', fontSize: '18px', color: '#000080' }}>
                Gross Total: Rs. {grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>

            {/* Deductions */}
            <div style={{ backgroundColor: '#fff3cd', padding: '15px', borderRadius: '8px', border: '1px solid #ffeeba' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#856404' }}>➖ Katauti (Deductions)</h4>
              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label><b>Commission (%):</b></label>
                  <input type="number" step="0.01" value={commPercent} onChange={(e) => setCommPercent(e.target.value)} placeholder="Misal: 1" style={inputStyle} />
                  {commPercent > 0 && <small style={{ color: '#dc3545' }}>= Rs. {commAmount.toFixed(2)}</small>}
                </div>
                <div style={{ flex: 1 }}>
                  <label><b>Mazdoori (Rs.):</b></label>
                  <input type="number" value={mazdooriAmount} onChange={(e) => setMazdooriAmount(e.target.value)} placeholder="Misal: 1800" style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label><b>Market Fee (Rs.):</b></label>
                  <input type="number" value={marketFeeAmount} onChange={(e) => setMarketFeeAmount(e.target.value)} placeholder="Misal: 41" style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                 <label><b>Dami (%):</b></label>
                 <input type="number" step="0.01" value={damiPercent} 
                  onChange={(e) => setDamiPercent(e.target.value)} 
                  placeholder="Misal: 1" style={inputStyle} />
                   {damiPercent > 0 && (
                     <small style={{ color: '#dc3545' }}>
                    = Rs. {damiAmount.toFixed(2)}
                       </small>
                       )}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label><b>Notes (Optional):</b></label>
              <input type="text" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Koi khaas baat..." style={inputStyle} />
            </div>

            {/* Final Amount Box */}
            <div style={{ backgroundColor: '#d1e7dd', padding: '15px', borderRadius: '8px', border: '2px solid #198754' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>Gross Amount:</span>
                <strong>Rs. {grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: '#dc3545' }}>
                <span>Total Katauti:</span>
                <strong>- Rs. {totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
              </div>
              <hr style={{ borderColor: '#198754' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '22px', color: '#198754' }}>
                <span><b>NET SAFFA RAQAM:</b></span>
                <span><b>Rs. {netAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</b></span>
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
              <button type="submit" onClick={() => { shouldPrint.current = true; }}
                style={{ flex: 1, padding: '15px', backgroundColor: '#198754', color: 'white', border: 'none', borderRadius: '5px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}>
                💾 Save & Print 🖨️
              </button>
              <button type="submit" onClick={() => { shouldPrint.current = false; }}
                style={{ flex: 1, padding: '15px', backgroundColor: '#000080', color: 'white', border: 'none', borderRadius: '5px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}>
                💾 Sirf Save Karein
              </button>
            </div>

            {status && (
              <p style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '18px', color: status.includes('❌') ? 'red' : 'green' }}>
                {status}
              </p>
            )}
          </form>
        </div>

        {/* ================================================ */}
        {/* 🖨️ PRINT VIEW */}
        {/* ================================================ */}
        <div className="print-only urdu-text" dir="rtl" style={{ backgroundColor: 'white', color: '#000' }}>

          {/* Header */}
          <div className="d-flex justify-content-between align-items-center border-bottom border-dark pb-2 mb-2">
            <div style={{ width: '40%' }}>
              <h2 className="mb-0 fw-bold" style={{ color: '#000080' }}>میاں علی محمد اینڈ سنز</h2>
              <p className="mb-0 fw-bold">دوکان نمبر 74/G غلہ منڈی بورے والا</p>
            </div>
            <div className="text-center" style={{ width: '20%' }}>
              <span style={{ fontSize: '30px' }}>🌾</span>
            </div>
            <div dir="ltr" style={{ width: '40%', textAlign: 'left' }}>
              <h4 className="mb-0 fw-bold" style={{ color: '#000080', fontFamily: 'Arial' }}>Mian Ali Muhammad & Sons</h4>
              <p className="mb-0 fw-bold" style={{ fontFamily: 'Arial' }}>74/G, Grain Market Burewala</p>
            </div>
          </div>

          {/* Contact */}
          <div className="d-flex justify-content-between border-bottom border-dark pb-2 mb-3 fs-6">
            <div dir="ltr" style={{ fontFamily: 'Arial' }}>
              <span className="urdu-text fw-bold me-2">میاں عبدالستار کلیم: </span>
              <b>0336-7202647 / 0309-7032647</b>
            </div>
            <div dir="ltr" style={{ fontFamily: 'Arial' }}>
              <span className="urdu-text fw-bold me-2">میاں عثمان: </span>
              <b>0300-6998470</b>
            </div>
          </div>

          {/* Bill Info */}
          <div className="d-flex justify-content-between mb-3 fs-5">
            <div><b>بل بنام:</b> <u style={{ fontFamily: 'Arial', marginRight: '10px' }}>{customerName} ({khataCategory})</u></div>
            <div dir="ltr"><span className="urdu-text fw-bold">پرتہ نمبر:</span> <b style={{ fontFamily: 'Arial' }}>{savedPartaNo || '......'}</b></div>
            <div><b>تاریخ:</b> <u style={{ fontFamily: 'Arial', marginRight: '10px' }}>{currentDate}</u></div>
          </div>

          {/* Items Table */}
          <table className="table table-bordered border-dark border-2 text-center align-middle mb-0">
            <thead>
              <tr className="fs-5">
                <th className="border-dark">اجناس</th>
                <th className="border-dark">وزن (من)</th>
                <th className="border-dark">در</th>
                <th className="border-dark">روپے</th>
              </tr>
            </thead>
            <tbody style={{ fontFamily: 'Arial', fontSize: '17px' }}>
              {/* Items rows */}
              {items.map((item, index) => (
                <tr key={index}>
                  <td className="urdu-text border-dark">{item.cropType}</td>
                  <td className="border-dark">{item.weight}</td>
                  <td className="border-dark">{Number(item.rate).toLocaleString()}</td>
                  <td className="border-dark">{Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}

              {/* Deductions Row */}
              <tr>
                <td colSpan="2" className="text-start urdu-text border-dark p-2" dir="rtl" style={{ lineHeight: '1.8' }}>
                  {commPercent > 0 && <span>کمیشن ({commPercent}%): <span dir="ltr">{commAmount.toFixed(2)}</span><br /></span>}
                  {mazdooriAmount > 0 && <span>مزدوری: <span dir="ltr">{Number(mazdooriAmount).toFixed(2)}</span><br /></span>}
                  {marketFeeAmount > 0 && <span>مارکیٹ فیس: <span dir="ltr">{Number(marketFeeAmount).toFixed(2)}</span><br /></span>}
                  {damiPercent > 0 && <span>ڈامی ({damiPercent}%): <span dir="ltr">{damiAmount.toFixed(2)}</span></span>}
                </td>
                <td className="urdu-text fw-bold border-dark">کل کٹوتی</td>
                <td className="border-dark fw-bold" dir="ltr" style={{ color: '#dc3545' }}>
                  {totalDeductions > 0 ? `- ${totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                </td>
              </tr>

              {/* Gross Row */}
              <tr>
                <td colSpan="2" className="border-dark"></td>
                <td className="urdu-text fw-bold border-dark fs-5">کل جمع</td>
                <td className="border-dark fw-bold fs-5" dir="ltr">
                  {grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>

              {/* Net Row */}
              <tr style={{ backgroundColor: '#f0fff0' }}>
                <td colSpan="3" className="text-start urdu-text fs-4 fw-bold border-dark">نیٹ صافی رقم:</td>
                <td className="fs-4 fw-bold border-dark" dir="ltr" style={{ color: '#198754' }}>
                  {netAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>

          {details && (
            <div className="mt-2 fs-6">
              <b>نوٹ: </b>{details}
            </div>
          )}

          {/* Signature */}
          <div className="d-flex justify-content-between mt-5 pt-4">
            <div className="fs-5">
              <span className="badge bg-dark rounded-pill py-2 px-3 fs-6">نوٹ</span>
              <b className="ms-2">بھول چوک لین دین</b>
            </div>
            <div className="text-center fs-5">
              ____________________<br />
              <b>دستخط</b>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const inputStyle = {
  width: '100%', padding: '10px', marginTop: '5px',
  borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box'
};

export default PartaBill;