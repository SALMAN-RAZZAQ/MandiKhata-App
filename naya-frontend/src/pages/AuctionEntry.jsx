import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// ✅ FIX 2: Dukan ki maloomat ko alag nikal liya (Hardcoded nahi rahi)
const DUKAN_INFO = {
  nameUrdu: "میاں علی محمد اینڈ سنز",
  nameEng: "Mian Ali Muhammad & Sons",
  addressUrdu: "دوکان نمبر 74/G غلہ منڈی بورے والا",
  addressEng: "74/G, Grain Market Burewala",
  phone1Urdu: "میاں عبدالستار کلیم: 0336-7202647 / 0309-7032647",
  phone2Urdu: "میاں عثمان: 0300-6998470"
};

function AuctionEntry() {
  const [khatas, setKhatas] = useState([]);
  
  // ✅ BUG FIX: Ab parchaNumber backend se aayega (PRC-1001 format)
  // Pehle "---" dikhao, save hone ke baad real number set hoga
  const [parchaNumber, setParchaNumber] = useState('---');
  
  // Print ke liye ref use karo - state update ka wait nahi karna padega
  const confirmedParchaNoRef = useRef('---');

  const [transactionType, setTransactionType] = useState('Adaigi');
  const [farmerName, setFarmerName] = useState(''); 
  const [khataCategory, setKhataCategory] = useState('');
  const [cropType, setCropType] = useState(''); 
  
  const [weight, setWeight] = useState('');
  const [rate, setRate] = useState('');
  
  const [commPercent, setCommPercent] = useState(''); 
  const [laborPercent, setLaborPercent] = useState(''); 
  const [damiPercent, setDamiPercent] = useState(''); 
  const [marketFeePercent, setMarketFeePercent] = useState(''); 
  const [status, setStatus] = useState('');

  const printFlagRef = useRef(false);

  const navigate = useNavigate();
  const getToken = () => localStorage.getItem('token');

  const handleSessionExpire = () => {
    alert("Aapka session expire ho gaya hai. Dobara login karein!");
    localStorage.clear();
    navigate('/login');
  };

  useEffect(() => {
    fetch('/api/parcha/khatagroup/all', {
  headers: { 'auth-token': getToken() }
})
  .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setKhatas(data);
          if(data.length > 0) setKhataCategory(data[0].name); 
        }
      })
      .catch(err => {
        if (err.message === 'Unauthorized') handleSessionExpire();
        else console.log(err);
      });
  }, []);

  const grossAmount = (Number(weight) || 0) * (Number(rate) || 0);
  const commAmount = grossAmount * ((Number(commPercent) || 0) / 100);
  const laborAmount = grossAmount * ((Number(laborPercent) || 0) / 100);
  const damiAmount = grossAmount * ((Number(damiPercent) || 0) / 100);
  const marketFeeAmount = grossAmount * ((Number(marketFeePercent) || 0) / 100); 
  
  const totalDeductions = commAmount + laborAmount + damiAmount + marketFeeAmount;
  const netAmount = grossAmount - totalDeductions; 

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('⏳ Parchi Save ho rahi hai...');

    try {
      const response = await fetch('/api/parcha/add', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'auth-token': getToken() 
        },
        body: JSON.stringify({
          transactionType,
          farmerName,
          khataCategory,
          cropType,
          weight,
          rate,
          totalAmount: netAmount,
          commission: commAmount,
          mazdoori: laborAmount,
          dami: damiAmount,
          marketFee: marketFeeAmount
        })
      });

      if (response.status === 401) return handleSessionExpire();

      if (response.ok) {
        // ✅ BUG FIX: Backend se real PRC-XXXX number lo
        const responseData = await response.json();
        const realParchaNo = responseData.data?.parchaNo || 'N/A';
        
        // Ref ko turant update karo (print ke liye - state ka wait nahi)
        confirmedParchaNoRef.current = realParchaNo;
        setParchaNumber(realParchaNo);
        
        setStatus('✅ Parchi Save ho gayi! #' + realParchaNo);
        
        if (printFlagRef.current) {
          // ✅ Thoda wait karo taake React print view re-render kar sake
          setTimeout(() => window.print(), 150);
        }

        setTimeout(() => {
          setFarmerName('');
          setCropType('');
          setWeight('');
          setRate('');
          setCommPercent('');
          setLaborPercent('');
          setDamiPercent('');
          setMarketFeePercent('');
          setStatus('');
          // ✅ Reset: nayi parchi ke liye wapis '---' kar do
          setParchaNumber('---');
          confirmedParchaNoRef.current = '---';
          
          if (khatas.length > 0) {
            setKhataCategory(khatas[0].name);
          } else {
            setKhataCategory('');
          }
        }, 1500);

      } else {
        const errorData = await response.json();
        setStatus('❌ ' + (errorData.error || 'Masla aagaya, Parchi save nahi hui.'));
      }
    } catch (error) {
      setStatus('❌ Network Error!');
    }
  };

  const currentDate = new Date().toLocaleDateString('en-GB');

  return (
    <>
      <style>
        {`
          @media screen {
            .print-only { display: none !important; }
          }
          
          @media print {
            body * { visibility: hidden; }
            .print-only, .print-only * { visibility: visible; }
            .print-only {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 10px;
            }
            .screen-only { display: none !important; }
          }
        `}
      </style>

      <div style={{ padding: '30px', fontFamily: 'Arial', maxWidth: '800px', margin: '0 auto' }}>
        
        <div className="screen-only">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #000080', paddingBottom: '10px', marginBottom: '15px' }}>
            <h2 style={{ color: '#000080', margin: 0 }}>📝 Naya Katcha Parcha</h2>
            {/* Screen par bhi parcha number dikhayen */}
            <h4 style={{ color: '#e74c3c', margin: 0 }}>Parchi #: {parchaNumber}</h4>
          </div>
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
            
            <div style={{ display: 'flex', gap: '15px' }}>
              <div style={{ flex: 1 }}>
                <label><b>Parchi Ki Qisam:</b></label>
                <select value={transactionType} onChange={(e) => setTransactionType(e.target.value)} style={inputStyle}>
                  <option value="Adaigi">Adaigi (ادائیگی)</option>
                  <option value="Wasooli">Wasooli (وصولی)</option>
                  <option value="Khareed_Kisan">Khareed Kisan (خرید کسان)</option>
                  <option value="Baich_Kisan">Baich Kisan (بیچ کسان)</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label><b>Khata Group:</b></label>
                <select value={khataCategory} onChange={(e) => setKhataCategory(e.target.value)} style={inputStyle} required>
                  <option value="">Khata Select Karein...</option>
                  {khatas.map(k => <option key={k._id} value={k.name}>{k.name}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px' }}>
              <div style={{ flex: 1 }}>
                <label><b>Party Ka Naam:</b></label>
                <input type="text" value={farmerName} onChange={(e) => setFarmerName(e.target.value)} required placeholder="Party ka naam likhein..." style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label><b>Jins (Crop):</b></label>
                <select value={cropType} onChange={(e) => setCropType(e.target.value)} style={inputStyle} required>
                  <option value="">Fasal Select Karein...</option>
                  <option value="گندم">Gandum (گندم - Wheat)</option>
                  <option value="کپاس">Kapas (کپاس - Cotton)</option>
                  <option value="مکئی">Makai (مکئی - Corn)</option>
                  <option value="چاول">Monjee (چاول - Rice)</option>
                  <option value="سرسوں">Sarson (سرسوں - Mustard)</option>
                  <option value="چنا">Chana (چنا - Chickpeas)</option>
                  <option value="گڑ">Gurr (گڑ - Jaggery)</option>
                  <option value="شکر">Shakar (شکر - Raw Sugar)</option>
                  <option value="تل">Till (تل - Sesame)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px' }}>
              <div style={{ flex: 1 }}>
                <label><b>Wazan (Maund):</b></label>
                <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} required placeholder="Kitne Maund?" style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label><b>Rate (Per Maund):</b></label>
                <input type="number" value={rate} onChange={(e) => setRate(e.target.value)} required placeholder="Rate likhein..." style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px', backgroundColor: '#e9ecef', padding: '10px', borderRadius: '5px' }}>
              <div style={{ flex: 1 }}>
                <label><b>Commission (%):</b></label>
                <input type="number" step="0.01" value={commPercent} onChange={(e) => setCommPercent(e.target.value)} placeholder="Misal: 2" style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label><b>Labour (%):</b></label>
                <input type="number" step="0.01" value={laborPercent} onChange={(e) => setLaborPercent(e.target.value)} placeholder="Misal: 1.3" style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label><b>Dami (%):</b></label>
                <input type="number" step="0.01" value={damiPercent} onChange={(e) => setDamiPercent(e.target.value)} placeholder="Misal: 1" style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label><b>Market Fee (%):</b></label>
                <input type="number" step="0.01" value={marketFeePercent} onChange={(e) => setMarketFeePercent(e.target.value)} placeholder="Misal: 1.5" style={inputStyle} />
              </div>
            </div>

            <div style={{ backgroundColor: '#fff3cd', padding: '15px', borderRadius: '5px', border: '1px solid #ffeeba', marginTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>Gross Amount:</span> <strong>Rs. {grossAmount.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: '#dc3545' }}>
                <span>Total Kati:</span> <strong>- Rs. {totalDeductions.toFixed(2)}</strong>
              </div>
              <hr />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '20px', color: '#198754' }}>
                <span><b>NET SAFFA AMOUNT:</b></span> <span><b>Rs. {netAmount.toFixed(2)}</b></span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
              <button type="submit" onClick={() => { printFlagRef.current = true; }} style={{ flex: 1, padding: '15px', backgroundColor: '#198754', color: 'white', border: 'none', borderRadius: '5px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}>
                💾 Save & Print 🖨️
              </button>
              <button type="submit" onClick={() => { printFlagRef.current = false; }} style={{ flex: 1, padding: '15px', backgroundColor: '#000080', color: 'white', border: 'none', borderRadius: '5px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}>
                💾 Sirf Save Karein
              </button>
            </div>
            {status && <p style={{ textAlign: 'center', fontWeight: 'bold', color: status.includes('❌') ? 'red' : 'green' }}>{status}</p>}
          </form>
        </div>

        {/* 🖨️ PRINT VIEW */}
        <div className="print-only urdu-text" dir="rtl" style={{ border: '0px', backgroundColor: 'white', color: '#000' }}>
          
          <div className="d-flex justify-content-between align-items-center border-bottom border-dark pb-2 mb-2">
            <div className="text-right" style={{ width: '40%' }}>
              <h2 className="mb-0 fw-bold" style={{ color: '#000080' }}>{DUKAN_INFO.nameUrdu}</h2>
              <p className="mb-0 fw-bold">{DUKAN_INFO.addressUrdu}</p>
            </div>
            
            <div className="text-center" style={{ width: '20%' }}>
               <span style={{ fontSize: '30px' }}>🌾</span> 
            </div>

            <div className="text-left" dir="ltr" style={{ width: '40%', textAlign: 'left' }}>
              <h4 className="mb-0 fw-bold" style={{ color: '#000080', fontFamily: 'Arial' }}>{DUKAN_INFO.nameEng}</h4>
              <p className="mb-0 fw-bold" style={{ fontFamily: 'Arial' }}>{DUKAN_INFO.addressEng}</p>
            </div>
          </div>

          <div className="d-flex justify-content-between border-bottom border-dark pb-2 mb-4 fs-6">
             <div dir="ltr" style={{ fontFamily: 'Arial' }}>
                <span className="urdu-text fw-bold me-2">{DUKAN_INFO.phone1Urdu}</span>
             </div>
             <div dir="ltr" style={{ fontFamily: 'Arial' }}>
                <span className="urdu-text fw-bold me-2">{DUKAN_INFO.phone2Urdu}</span>
             </div>
          </div>

          <div className="d-flex justify-content-between mb-3 fs-5">
              <div><b>بل بنام:</b> <u style={{ fontFamily: 'Arial', marginRight: '10px' }}>{farmerName || '................'} ({khataCategory})</u></div>
              {/* ✅ BUG FIX: Ref use karo - backend wala REAL number (PRC-1001) print hoga */}
              <div dir="ltr"><span className="urdu-text fw-bold">نمبر:</span> <b style={{ fontFamily: 'Arial' }}>{confirmedParchaNoRef.current}</b></div>
              <div><b>تاریخ:</b> <u style={{ fontFamily: 'Arial', marginRight: '10px' }}>{currentDate}</u></div>
          </div>

          <table className="table table-bordered border-dark border-2 text-center align-middle">
            <thead>
              <tr className="fs-5">
                <th className="border-dark border-2">اجناس</th>
                <th className="border-dark border-2">تفصیل</th>
                <th className="border-dark border-2">در</th>
                <th className="border-dark border-2">روپے</th>
              </tr>
            </thead>
            <tbody style={{ fontFamily: 'Arial', fontSize: '18px' }}>
              <tr>
                <td className="urdu-text fs-5 border-dark">{cropType || '................'}</td>
                <td className="urdu-text border-dark">وزن: {weight || '0'} من</td>
                <td className="border-dark">{rate || '0'}</td>
                <td className="border-dark">{grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
              
              <tr>
                <td className="border-dark"></td>
                <td className="text-start urdu-text border-dark p-2" dir="rtl" style={{ lineHeight: '1.8' }}>
                  {commPercent > 0 && <span>کمیشن ({commPercent}%): <span dir="ltr" className="ms-2">{commAmount.toFixed(2)}</span> <br /></span>}
                  {laborPercent > 0 && <span>مزدوری ({laborPercent}%): <span dir="ltr" className="ms-2">{laborAmount.toFixed(2)}</span> <br /></span>}
                  {damiPercent > 0 && <span>ڈامی ({damiPercent}%): <span dir="ltr" className="ms-2">{damiAmount.toFixed(2)}</span> <br /></span>}
                  {marketFeePercent > 0 && <span>مارکیٹ فیس ({marketFeePercent}%): <span dir="ltr" className="ms-2">{marketFeeAmount.toFixed(2)}</span></span>}
                </td>
                <td className="border-dark"></td>
                <td className="border-dark" dir="ltr">
                   {totalDeductions > 0 ? `- ${totalDeductions.toFixed(2)}` : ''}
                </td>
              </tr>

              <tr>
                <td colSpan="3" className="text-start urdu-text fs-4 fw-bold border-dark bg-light">
                  نیٹ صافی رقم:
                </td>
                <td className="fs-4 fw-bold border-dark bg-light">
                  {netAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="d-flex justify-content-between mt-5 pt-5">
            <div className="fs-5">
              <span className="badge bg-dark rounded-pill py-2 px-3 fs-6">نوٹ</span> <b className="ms-2">بھول چوک لین دین</b>
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

const inputStyle = { width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' };

export default AuctionEntry;