import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Reports() {
  const [balances, setBalances] = useState([]);
  const [monthlySummary, setMonthlySummary] = useState([]);
  const [trialBalance, setTrialBalance] = useState({ totalDebit: 0, totalCredit: 0 });
  
  // ✅ NAYA: Income state
  const [income, setIncome] = useState({ totalCommission: 0, totalMazdoori: 0, totalMarketFee: 0, totalDami: 0, grandTotal: 0 });
  const [loading, setLoading] = useState(true);
  
  const navigate = useNavigate();
  const getToken = () => localStorage.getItem('token');
  const userRole = localStorage.getItem('role');

  useEffect(() => {
    if (userRole !== 'Admin') {
      alert("⚠️ Reports sirf Admin dekh sakta hai!");
      navigate('/');
      return;
    }

    const fetchReports = async () => {
      try {
        const headers = { 'auth-token': getToken() };
        
        // Chaaron APIs ko ek sath call karo
        const [balRes, sumRes, tbRes, incRes] = await Promise.all([
          fetch('/api/reports/balances', { headers }),
          fetch('/api/reports/monthly', { headers }),
          fetch('/api/reports/trial-balance', { headers }),
          fetch('/api/reports/income', { headers }) // ✅ NAYA
        ]);

        if (balRes.ok) setBalances(await balRes.json());
        if (sumRes.ok) setMonthlySummary(await sumRes.json());
        if (tbRes.ok) setTrialBalance(await tbRes.json());
        if (incRes.ok) setIncome(await incRes.json()); // ✅ NAYA
        
      } catch (error) {
        console.error("Reports load error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [navigate, userRole]);

  if (loading) return <div style={{ padding: '30px', fontSize: '20px' }}>⏳ Reports load ho rahi hain...</div>;

  const getMonthName = (monthNumber) => {
    const date = new Date();
    date.setMonth(monthNumber - 1);
    return date.toLocaleString('en-US', { month: 'long' });
  };

  const diff = Math.abs(trialBalance.totalDebit - trialBalance.totalCredit);
  const isBalanced = diff === 0;

  return (
    <div style={{ padding: '30px', fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ color: '#000080', borderBottom: '2px solid #000080', paddingBottom: '10px' }}>
        📈 Dukan Ki Reports (Admin Dashboard)
      </h2>

      {/* SYSTEM HEALTH CHECK (TRIAL BALANCE) */}
      <div style={{ 
        backgroundColor: isBalanced ? '#d1e7dd' : '#f8d7da', 
        border: `2px solid ${isBalanced ? '#198754' : '#dc3545'}`,
        padding: '20px', borderRadius: '8px', marginBottom: '20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap'
      }}>
        <div>
          <h3 style={{ margin: 0, color: isBalanced ? '#0f5132' : '#842029' }}>
            {isBalanced ? '✅ System 100% Balanced Hai' : '❌ HISAAB MEIN FARAQ HAI (IMBALANCE)'}
          </h3>
          <p style={{ margin: '5px 0 0 0', color: '#555' }}>Total Debit aur Total Credit ki tasdeeq</p>
        </div>
        <div style={{ textAlign: 'right', fontSize: '18px' }}>
          <div>Total Jama (Credit): <b>Rs. {trialBalance.totalCredit.toLocaleString()}</b></div>
          <div>Total Naam (Debit): <b>Rs. {trialBalance.totalDebit.toLocaleString()}</b></div>
          {!isBalanced && (
            <div style={{ color: 'red', fontWeight: 'bold', marginTop: '5px', fontSize: '20px' }}>
              Faraq (Difference): Rs. {diff.toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {/* ========================================= */}
      {/* NAYA: DUKAN KI KAMAI (PROFIT CARDS) */}
      {/* ========================================= */}
      <h3 style={{ color: '#198754', marginTop: '30px' }}>💵 Meri Kamai (Income Tracker)</h3>
      <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' }}>
        <div style={incomeCardStyle('#0d6efd')}>
          <h4>Commission</h4>
          <h2>Rs. {income.totalCommission.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
        </div>
        <div style={incomeCardStyle('#6f42c1')}>
          <h4>Dami</h4>
          <h2>Rs. {income.totalDami.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
        </div>
        <div style={incomeCardStyle('#fd7e14')}>
          <h4>Mazdoori</h4>
          <h2>Rs. {income.totalMazdoori.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
        </div>
        <div style={incomeCardStyle('#20c997')}>
          <h4>Market Fee</h4>
          <h2>Rs. {income.totalMarketFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
        </div>
        <div style={{ ...incomeCardStyle('#198754'), backgroundColor: '#198754', color: 'white', border: 'none' }}>
          <h4 style={{ color: '#d1e7dd' }}>Grand Total Profit</h4>
          <h2 style={{ fontSize: '28px' }}>Rs. {income.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {/* OUTSTANDING BALANCES */}
        <div style={{ flex: 1, minWidth: '400px', backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#dc3545' }}>💰 Baqaya Jat (Outstanding Dues)</h3>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', textAlign: 'left' }}>
                  <th style={thStyle}>Party Name</th>
                  <th style={thStyle}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {balances.length === 0 ? (
                  <tr><td colSpan="2" style={{ padding: '10px', textAlign: 'center' }}>Sab hisaab clear hai!</td></tr>
                ) : (
                  balances.map(party => (
                    <tr key={party._id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ ...tdStyle, fontWeight: 'bold' }}>{party.name} <br/><small>{party.partyType}</small></td>
                      <td style={{ ...tdStyle, color: party.balanceType === 'Jama' ? '#198754' : '#dc3545', fontWeight: 'bold' }}>
                        {party.balanceType === 'Jama' ? 'Advance: ' : 'Udhaar: '}
                        Rs. {Math.abs(party.currentBalance).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MONTHLY SUMMARY */}
        <div style={{ flex: 1, minWidth: '400px', backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#000080' }}>📅 Mahana Hissab (Monthly Summary)</h3>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', textAlign: 'left' }}>
                  <th style={thStyle}>Mahina</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {monthlySummary.length === 0 ? (
                  <tr><td colSpan="3" style={{ padding: '10px', textAlign: 'center' }}>Koi data nahi hai.</td></tr>
                ) : (
                  monthlySummary.map((sum, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ ...tdStyle, fontWeight: 'bold' }}>{getMonthName(sum._id.month)} {sum._id.year}</td>
                      <td style={tdStyle}><span style={badgeStyle}>{sum._id.type}</span></td>
                      <td style={{ ...tdStyle, fontWeight: 'bold', color: '#000080' }}>
                         Rs. {Math.max(sum.totalCredit, sum.totalDebit).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// Styles
const thStyle = { padding: '12px', borderBottom: '2px solid #ddd' };
const tdStyle = { padding: '12px' };
const badgeStyle = { padding: '5px 10px', backgroundColor: '#e9ecef', borderRadius: '15px', fontSize: '12px', fontWeight: 'bold' };
const incomeCardStyle = (color) => ({
  flex: 1, minWidth: '180px', backgroundColor: 'white', padding: '20px', borderRadius: '8px', 
  boxShadow: '0 2px 5px rgba(0,0,0,0.1)', borderLeft: `5px solid ${color}`, color: color
});

export default Reports;