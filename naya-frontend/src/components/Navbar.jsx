import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Navbar() {
  const userRole = localStorage.getItem('role');
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear(); 
    navigate('/login'); // NAYA: Page reload kiye bina smooth redirect
  };

  if (!userRole) return null; 

  return (
    <nav style={{ backgroundColor: '#2c3e50', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      <h2 style={{ margin: 0, color: '#f1c40f' }}>🌾 Mandi Khata <span style={{fontSize: '14px', color: '#ccc'}}>({userRole})</span></h2>
      
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        
        {/* YEH BUTTONS SIRF SETH (ADMIN) KO DIKHENGE */}
        {userRole === 'Admin' && (
          <>
            <Link to="/dashboard" style={linkStyle}>📊 Dashboard</Link>
            {/* ✅ FIX: Settings ab sirf Admin ko dikhega */}
            <Link to="/settings" style={linkStyle}>⚙️ Settings</Link> 
            <Link to="/reports">Reports</Link>
          </>
        )}

        {/* YEH BUTTONS DONO (ADMIN AUR MUNSHI) KO DIKHENGE */}
        <Link to="/pakka-khata" style={linkStyle}>📒 Pakka Khata</Link>
        <Link to="/auction" style={linkStyle}>📝 Naya Parcha</Link>
        <Link to="/all-parties">Saari Parties</Link>
        
        {/* ✅ NAYA: Journal Voucher */}
        <Link to="/journal-voucher" style={{...linkStyle, color: '#c084fc'}}>📒 Journal</Link>
        
        {/* Rokar (Cashbook) Ka Link */}
        <Link to="/rokar" style={{...linkStyle, fontSize: '20px'}}>
          💰 روکڑ (Rokar)
        </Link>
        <Link to="/parta-bill" style={linkStyle}>📋 Parta Bill</Link>
        <Link to="/parta-history">Purane Bills</Link>
        
        <button onClick={handleLogout} style={{ padding: '8px 15px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '5px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginLeft: '10px' }}>
          🔒 Logout
        </button>

      </div>
    </nav>
  );
}

const linkStyle = { color: 'white', textDecoration: 'none', fontSize: '18px', fontWeight: 'bold', padding: '8px 12px', borderRadius: '4px', transition: 'background-color 0.3s' };

export default Navbar;

