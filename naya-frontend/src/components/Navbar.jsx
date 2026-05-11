import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Navbar() {
  const navigate = useNavigate();
  const role = localStorage.getItem('role');

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <nav style={navStyle}>
      {/* 🌾 LOGO SECTION */}
      <div style={logoContainer}>
        <h2 style={{ margin: 0, color: '#f1c40f', fontSize: '22px' }}>🌾 Mandi Khata</h2>
        <small style={{ color: '#ccc', fontSize: '12px' }}>({role})</small>
      </div>

      {/* 🔗 LINKS SECTION (✅ Yahan Flex-Wrap lagaya gaya hai) */}
      <div style={linksContainer}>
        
        {/* SIRF ADMIN WALE LINKS */}
        {role === 'Admin' && <Link to="/dashboard" style={linkStyle}>📊 Dashboard</Link>}
        {role === 'Admin' && <Link to="/settings" style={linkStyle}>⚙️ Settings</Link>}
        {role === 'Admin' && <Link to="/reports" style={linkStyle}>📈 Reports</Link>}

        {/* DONO (ADMIN AUR MUNSHI) WALE LINKS */}
        <Link to="/auction" style={linkStyle}>📝 Naya Parcha</Link>
        <Link to="/parta-bill" style={linkStyle}>🧾 Parta Bill</Link>
        <Link to="/rokar" style={linkStyle}>💰 Rokar</Link>
        <Link to="/pakka-khata" style={linkStyle}>📓 Pakka Khata</Link>
        
        <Link to="/all-parties" style={linkStyle}>👥 Saari Parties</Link>
        <Link to="/inventory" style={linkStyle}>🌾 Stock</Link>
        <Link to="/journal-voucher" style={linkStyle}>📒 Journal</Link>
        
        <Link to="/parcha-history" style={linkStyle}>📜 Purane Parche</Link>
        <Link to="/parta-history" style={linkStyle}>🗄️ Purane Bills</Link>

        {/* LOGOUT BUTTON */}
        <button onClick={handleLogout} style={logoutBtnStyle}>🚪 Logout</button>
      </div>
    </nav>
  );
}

// ==========================================
// 🎨 CSS STYLING (Yahan Asal Jadoo Hai)
// ==========================================

const navStyle = {
  display: 'flex',
  flexWrap: 'wrap', // ✅ FIX: Poora navbar zaroorat parne par wrap ho jayega
  alignItems: 'center',
  justifyContent: 'space-between',
  backgroundColor: '#2c3e50', // Professional Dark Blue/Grey color
  padding: '10px 20px',
  borderBottom: '4px solid #f1c40f' // Khoobsurat peeli line
};

const logoContainer = {
  display: 'flex',
  flexDirection: 'column',
  marginRight: '20px',
  marginBottom: '5px'
};

const linksContainer = {
  display: 'flex',
  flexWrap: 'wrap', // ✅ FIX: Buttons aapas mein nahi takrayenge, neechay aa jayenge
  gap: '10px',      // Har button ke darmiyan 10px ka fasla
  alignItems: 'center'
};

const linkStyle = {
  color: 'white',
  textDecoration: 'none',
  padding: '8px 12px',
  backgroundColor: '#34495e',
  borderRadius: '5px',
  fontSize: '14px',
  fontWeight: 'bold',
  whiteSpace: 'nowrap', // ✅ FIX: Text beech mein se toot kar neechay nahi jayega
  transition: 'background-color 0.3s'
};

const logoutBtnStyle = {
  backgroundColor: '#dc3545', // Lal (Red) color danger ke liye
  color: 'white',
  border: 'none',
  padding: '8px 15px',
  borderRadius: '5px',
  cursor: 'pointer',
  fontWeight: 'bold',
  fontSize: '14px',
  marginLeft: '10px' // Thora sa alag dikhane ke liye
};

export default Navbar;