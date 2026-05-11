import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import PakkaKhata from './pages/PakkaKhata';
import KhataSettings from './pages/KhataSettings';
import AuctionEntry from './pages/AuctionEntry';
import Rokar from './pages/Rokar';
import Login from './pages/Login';
import JournalVoucher from './pages/JournalVoucher'; 
import PartaBill from './pages/PartaBill';
import Reports from './pages/Reports'; // ✅ NAYA: Reports page yahan import kiya hai
import PartaHistory from './pages/PartaHistory';
import ParchaHistory from './pages/ParchaHistory';
import AllParties from './pages/AllParties';
import Inventory from './pages/Inventory';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const role = localStorage.getItem('role');

  if (!role) {
    return <Navigate to="/login" />; 
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Agar Munshi Admin wale page par jane ki koshish karega toh Auction par jayega
    return <Navigate to="/auction" />; 
  }

  return children;
};

// ==========================================
// Layout Component jo Routes aur Navbar ko control karega
// ==========================================
const MainLayout = () => {
  const location = useLocation();

  return (
    <>
      {/* Agar hum '/login' page par NAHI hain, sirf tabhi Navbar dikhao */}
      {location.pathname !== '/login' && <Navbar />}
      
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" />} />

        {/* MUNSHI & ADMIN DONO KE LIYE */}
        <Route 
          path="/auction" 
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Munshi']}>
              <AuctionEntry />
            </ProtectedRoute>
          } 
        />

        {/* ✅ THEEK KIYA: Settings sirf Admin (Seth) ke liye */}
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <KhataSettings />
            </ProtectedRoute>
          } 
        />

        {/* ✅ THEEK KIYA: Pakka Khata ab Admin aur Munshi dono dekh sakte hain */}
        <Route 
          path="/pakka-khata" 
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Munshi']}>
              <PakkaKhata />
            </ProtectedRoute>
          } 
        />

        {/* SIRF ADMIN (SETH) KE LIYE */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <Dashboard />
            </ProtectedRoute>
          } 
        />

        {/* ✅ NAYA: REPORTS PAGE - SIRF ADMIN (SETH) KE LIYE */}
        <Route 
          path="/reports" 
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <Reports />
            </ProtectedRoute>
          } 
        />

        {/* ROKAR (CASH DRAWER) - ADMIN & MUNSHI DONO KE LIYE */}
        <Route 
          path="/rokar" 
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Munshi']}>
              <Rokar />
            </ProtectedRoute>
          } 
        />
        {/* PARTA BILL HISTORY - ADMIN & MUNSHI DONO KE LIYE */}
        <Route 
          path="/parta-history" 
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Munshi']}>
              <PartaHistory />
            </ProtectedRoute>
          } 
        />
        
        {/* parta route*/}
        <Route path="/parta-bill" element={
          <ProtectedRoute allowedRoles={['Admin', 'Munshi']}>
            <PartaBill />
          </ProtectedRoute>
        } />

        {/* JOURNAL VOUCHER - ADMIN & MUNSHI DONO KE LIYE */}
        <Route 
          path="/journal-voucher" 
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Munshi']}>
              <JournalVoucher />
            </ProtectedRoute>
          } 
        />
        {/* ALL PARTIES LIST - ADMIN & MUNSHI DONO KE LIYE */}
<Route 
  path="/all-parties" 
  element={
    <ProtectedRoute allowedRoles={['Admin', 'Munshi']}>
      <AllParties />
    </ProtectedRoute>
  } 
/>
{/* PARCHA HISTORY - ADMIN & MUNSHI DONO KE LIYE */}
<Route 
  path="/parcha-history" 
  element={
    <ProtectedRoute allowedRoles={['Admin', 'Munshi']}>
      <ParchaHistory />
    </ProtectedRoute>
  } 
/>
        {/* MAAL INVENTORY - ADMIN & MUNSHI DONO KE LIYE */}
<Route 
  path="/inventory" 
  element={
    <ProtectedRoute allowedRoles={['Admin', 'Munshi']}>
      <Inventory />
    </ProtectedRoute>
  } 
/>
      </Routes>
    </>
  );
};

// ==========================================
// ASAL APP FUNCTION
// ==========================================
function App() {
  return (
    <Router>
      <MainLayout />
    </Router>
  );
}

export default App;