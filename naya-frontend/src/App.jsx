import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import PakkaKhata from './pages/PakkaKhata';
import KhataSettings from './pages/KhataSettings';
import AuctionEntry from './pages/AuctionEntry';
import Rokar from './pages/Rokar';
import Login from './pages/Login';
import JournalVoucher from './pages/JournalVoucher'; 
import PartaBill from './pages/PartaBill';
import Reports from './pages/Reports'; 
import PartaHistory from './pages/PartaHistory';
import ParchaHistory from './pages/ParchaHistory';
import AllParties from './pages/AllParties';
import Inventory from './pages/Inventory';
import Home from './components/Home'; 

function App() {
  const isAuthenticated = () => !!localStorage.getItem('token');
  
  // 🌟 NAYA: Screen aur Sidebar ki state sambhalne ke liye
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false); // Mobile par default band
      } else {
        setIsSidebarOpen(true); // Desktop par default khula
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/*" element={
          isAuthenticated() ? (
            // 🌟 NAYA: Naya App Container jo display flex use karta hai
            <div className="app-container">
              
              {/* Left Sidebar */}
              <Navbar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} isMobile={isMobile} />
              
              {/* Mobile par background parda (Overlay) */}
              {isMobile && (
                <div 
                  className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} 
                  onClick={() => setIsSidebarOpen(false)}
                ></div>
              )}
              
              {/* Right Side Main Content */}
              <div className="main-content">
                
                {/* 🌟 CHOTA SA HEADER (Toggle Button ke liye) */}
                <div style={{ padding: '10px 20px', backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center' }}>
                  
                 <button className="toggle-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                  ☰
                 </button>
                  <h4 style={{ margin: '0 0 0 15px', color: '#042e12', fontWeight: 'bold' }}>
                    🌾 Mandi Khata
                  </h4>
                </div>

                {/* Yahan saare pages load honge (Scrollable Area) */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  <Routes>
                    <Route path="/home" element={<Home />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/auction" element={<AuctionEntry />} />
                    <Route path="/pakka-khata" element={<PakkaKhata />} />
                    <Route path="/rokar" element={<Rokar />} />
                    <Route path="/parta-bill" element={<PartaBill />} />
                    <Route path="/journal-voucher" element={<JournalVoucher />} />
                    <Route path="/all-parties" element={<AllParties />} />
                    <Route path="/parcha-history" element={<ParchaHistory />} />
                    <Route path="/parta-history" element={<PartaHistory />} />
                    <Route path="/inventory" element={<Inventory />} />
                    <Route path="/settings" element={<KhataSettings />} />
                    <Route path="/reports" element={<Reports />} />
                    
                    <Route path="/" element={<Navigate to="/home" />} />
                  </Routes>
                </div>
              </div>

            </div>
          ) : (
            <Navigate to="/login" />
          )
        } />
      </Routes>
    </Router>
  );
}

export default App;