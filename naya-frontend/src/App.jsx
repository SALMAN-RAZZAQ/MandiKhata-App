import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import PakkaKhata from './pages/PakkaKhata';
import KhataSettings from './pages/KhataSettings';
import AuctionEntry from './pages/AuctionEntry';
import Rokar from './pages/Rokar';
import Login from './pages/Login';

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

        {/* ROKAR (CASH DRAWER) - ADMIN & MUNSHI DONO KE LIYE */}
        <Route 
          path="/rokar" 
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Munshi']}>
              <Rokar />
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