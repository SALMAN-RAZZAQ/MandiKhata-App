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
import TradingBill from './pages/TradingBill';
import ChattaReport from './pages/ChattaReport'; // ✅ Naya page sahi se import ho gaya

function App() {
  const isAuthenticated = () => !!localStorage.getItem('token');
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
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
                
                {/* Header with Toggle Button */}
                <div style={{ padding: '10px 20px', backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center' }}>
                  <button className="toggle-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                    ☰
                  </button>
                  <h4 style={{ margin: '0 0 0 15px', color: '#042e12', fontWeight: 'bold' }}>
                    🌾 Mandi Khata
                  </h4>
                </div>

                {/* Pages load honge yahan */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  <Routes>
                    <Route path="/home"           element={<Home />} />
                    <Route path="/dashboard"      element={<Dashboard />} />
                    <Route path="/auction"        element={<AuctionEntry />} />
                    <Route path="/pakka-khata"    element={<PakkaKhata />} />
                    <Route path="/trading-bill"   element={<TradingBill />} />
                    <Route path="/rokar"          element={<Rokar />} />
                    <Route path="/parta-bill"     element={<PartaBill />} />
                    <Route path="/journal-voucher" element={<JournalVoucher />} />
                    <Route path="/all-parties"    element={<AllParties />} />
                    <Route path="/parcha-history" element={<ParchaHistory />} />
                    <Route path="/parta-history"  element={<PartaHistory />} />
                    <Route path="/inventory"      element={<Inventory />} />
                    <Route path="/settings"       element={<KhataSettings />} />
                    <Route path="/reports"        element={<Reports />} />
                    
                    {/* ✅ JSX comment error fix kar diya hai */}
                    <Route path="/chatta-report"  element={<ChattaReport />} />
                    
                    <Route path="/"               element={<Navigate to="/home" />} />
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