import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Navbar() {
  const navigate = useNavigate();
  const role = localStorage.getItem('role');
  
  // ✅ NAYA: Mobile menu ko kholne aur band karne ka state
  const [isOpen, setIsOpen] = useState(false); 

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  // Jab bhi koi link click ho, mobile menu khud band ho jaye
  const closeMenu = () => setIsOpen(false);

  return (
    <>
      {/* 🎨 CSS Styling (Mobile Responsive Rules) */}
      <style>{`
        .custom-navbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: #2c3e50;
          padding: 10px 20px;
          border-bottom: 4px solid #f1c40f;
          position: relative;
        }
        .nav-brand {
          display: flex;
          flex-direction: column;
        }
        .hamburger {
          display: none; /* Desktop par ghayab rahega */
          font-size: 28px;
          background: none;
          border: none;
          color: white;
          cursor: pointer;
        }
        .nav-links {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }
        .nav-link-btn {
          color: white;
          text-decoration: none;
          padding: 8px 12px;
          background-color: #34495e;
          border-radius: 5px;
          font-size: 14px;
          font-weight: bold;
          white-space: nowrap;
          transition: 0.3s;
          border: none;
          cursor: pointer;
        }
        .nav-link-btn:hover {
          background-color: #f1c40f;
          color: #2c3e50;
        }
        .logout-btn {
          background-color: #dc3545;
          margin-left: 10px;
        }
        
        /* 📱 MOBILE SCREEN KI SETTING (900px se choti screen par) */
        @media (max-width: 900px) {
          .hamburger {
            display: block; /* Mobile par 3 lines wala button dikhao */
          }
          .nav-links {
            display: none; /* Pehle se links chhupa do */
            flex-direction: column;
            position: absolute;
            top: 100%;
            left: 0;
            width: 100%;
            background-color: #2c3e50;
            padding: 15px;
            box-sizing: border-box;
            z-index: 1000;
            border-bottom: 4px solid #f1c40f;
            box-shadow: 0px 4px 6px rgba(0,0,0,0.3);
          }
          .nav-links.open {
            display: flex; /* Jab menu open ho toh dikhao */
          }
          .nav-link-btn {
            width: 100%;
            text-align: center;
            padding: 12px;
            font-size: 16px;
          }
          .logout-btn {
            margin-left: 0;
            margin-top: 10px;
          }
        }
      `}</style>

      <nav className="custom-navbar">
        {/* 🌾 LOGO SECTION */}
        <div className="nav-brand">
          <h2 style={{ margin: 0, color: '#f1c40f', fontSize: '22px' }}>🌾 Mandi Khata</h2>
          <small style={{ color: '#ccc', fontSize: '12px' }}>({role})</small>
        </div>

        {/* 🍔 HAMBURGER BUTTON (Mobile Only) */}
        <button className="hamburger" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? '✖' : '☰'}
        </button>

        {/* 🔗 LINKS SECTION */}
        <div className={`nav-links ${isOpen ? 'open' : ''}`}>
          {role === 'Admin' && <Link to="/dashboard" className="nav-link-btn" onClick={closeMenu}>📊 Dashboard</Link>}
          {role === 'Admin' && <Link to="/settings" className="nav-link-btn" onClick={closeMenu}>⚙️ Settings</Link>}
          {role === 'Admin' && <Link to="/reports" className="nav-link-btn" onClick={closeMenu}>📈 Reports</Link>}

          <Link to="/auction" className="nav-link-btn" onClick={closeMenu}>📝 Naya Parcha</Link>
          <Link to="/parta-bill" className="nav-link-btn" onClick={closeMenu}>🧾 Parta Bill</Link>
          <Link to="/rokar" className="nav-link-btn" onClick={closeMenu}>💰 Rokar</Link>
          <Link to="/pakka-khata" className="nav-link-btn" onClick={closeMenu}>📓 Pakka Khata</Link>
          
          <Link to="/all-parties" className="nav-link-btn" onClick={closeMenu}>👥 Saari Parties</Link>
          <Link to="/inventory" className="nav-link-btn" onClick={closeMenu}>🌾 Stock</Link>
          <Link to="/journal-voucher" className="nav-link-btn" onClick={closeMenu}>📒 Journal</Link>
          
          <Link to="/parcha-history" className="nav-link-btn" onClick={closeMenu}>📜 Purane Parche</Link>
          <Link to="/parta-history" className="nav-link-btn" onClick={closeMenu}>🗄️ Purane Bills</Link>

          <button onClick={handleLogout} className="nav-link-btn logout-btn">🚪 Logout</button>
        </div>
      </nav>
    </>
  );
}

export default Navbar;