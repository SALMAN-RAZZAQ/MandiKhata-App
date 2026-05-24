import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

function Navbar({ isOpen, setIsOpen, isMobile }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const handleLinkClick = () => {
    if (isMobile) {
      setIsOpen(false); // Mobile par link click karte hi sidebar band
    }
  };

  const menuItems = [
    { title: 'ڈیش بورڈ (Dashboard)', path: '/dashboard', icon: '🏠' },
    { title: 'کچا بل', path: '/auction', icon: '📝' },
    { title: 'پکا بل', path: '/parta-bill', icon: '📋' },
    { title: 'خریداری / ٹریڈنگ', path: '/trading-bill', icon: '📊' }, // ✅ NAYA BUTTON YAHAN ADD KIYA HAI
    { title: 'روزنامچہ / کیش بک', path: '/rokar', icon: '💰' },
    { title: 'پکا کھاتہ', path: '/pakka-khata', icon: '📒' },
    { title: 'جرنل واؤچر', path: '/journal-voucher', icon: '📓' },
    { title: 'پرانے کچے بل', path: '/parcha-history', icon: '📜' },
    { title: 'پرانے پکے بل', path: '/parta-history', icon: '🗂️' },
    { title: 'اسٹاک / انوینٹری', path: '/inventory', icon: '📦' },
    { title: 'تمام پارٹیاں', path: '/all-parties', icon: '👥' },
    { title: 'رپورٹس', path: '/reports', icon: '📈' },
    { title: 'سیٹنگز', path: '/settings', icon: '⚙️' }
  ];

  return (
    <div className={`desktop-sidebar ${isOpen ? 'open' : 'closed'}`}>
      
      {/* 🌟 LOGO BOX - Clean and Professional */}
      <Link to="/home" onClick={handleLinkClick} style={{ textDecoration: 'none', display: 'block' }}>
        <div style={{ padding: '20px 10px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', cursor: 'pointer' }}>
          <h3 style={{ margin: 0, color: '#042e12', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span style={{ fontSize: '26px' }}>🌾</span> Mandi Khata
          </h3>
          <small style={{ color: '#64748b', fontWeight: 'bold' }}></small>
        </div>
      </Link>
     

      <div className="sidebar-menu-container" style={{ flex: 1, overflowY: 'auto' }}>
        {menuItems.map((item, index) => (
          <Link 
            key={index} 
            to={item.path} 
            onClick={handleLinkClick}
            className={`sidebar-link ${location.pathname === item.path ? 'active' : ''}`}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="urdu-text-menu">{item.title}</span>
          </Link>
          
        ))}
      </div>

      <div style={{ padding: '12px', borderTop: '1px solid #e2e8f0', backgroundColor: '#fff' }}>
        <button 
          onClick={handleLogout} 
          style={{ width: '100%', padding: '8px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <span style={{ marginRight: '8px', fontSize: '18px' }}>🔴</span> Exit / Logout
        </button>
      </div>

    </div>
  );
}

export default Navbar;