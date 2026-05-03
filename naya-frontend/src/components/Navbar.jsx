import React from 'react';
import { Link } from 'react-router-dom';

function Navbar() {
  const userRole = localStorage.getItem('role');

  const handleLogout = () => {
    localStorage.clear(); 
    window.location.href = '/login'; 
  };

  if (!userRole) return null; 

  return (
    <nav style={{ backgroundColor: '#2c3e50', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      <h2 style={{ margin: 0, color: '#f1c40f' }}>🌾 Mandi Khata <span style={{fontSize: '14px', color: '#ccc'}}>({userRole})</span></h2>
      
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        
        {/* YEH BUTTONS SIRF SETH KO DIKHENGE */}
        {userRole === 'Admin' && (
          <>
            <Link to="/dashboard" style={linkStyle}>📊 Dashboard</Link>
            <Link to="/pakka-khata" style={linkStyle}>📒 Pakka Khata</Link>
          </>
        )}

        {/* YEH BUTTONS DONO KO DIKHENGE */}
        <Link to="/settings" style={linkStyle}>⚙️ Settings</Link> 
        <Link to="/auction" style={linkStyle}>📝 Naya Parcha</Link>
        {/* Rokar (Cashbook) Ka Link - Munshi aur Admin dono ke liye */}
        <Link to="/rokar" className="text-white text-decoration-none mx-3 fw-bold fs-5">
   💰   روکڑ (Rokar)
        </Link>
        
        <button onClick={handleLogout} style={{ padding: '8px 15px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '5px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginLeft: '10px' }}>
          🔒 Logout
        </button>

      </div>
    </nav>
  );
}

const linkStyle = { color: 'white', textDecoration: 'none', fontSize: '18px', fontWeight: 'bold', padding: '8px 12px', borderRadius: '4px', transition: 'background-color 0.3s' };

export default Navbar;