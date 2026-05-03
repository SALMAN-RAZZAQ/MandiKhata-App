import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // NAYA: Smooth page tabdeeli ke liye

function Login() {
  // NAYA: Ab dropdown ki jagah text input hoga taake koi bhi apna username likh sake (maslan: salman)
  const [username, setUsername] = useState(''); 
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // ✅ NAYA: Ab request humare naye secure raste par jayegi
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }) 
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // ✅ Jadoo: Role ke sath sath Digital Chabi (Token) bhi save karni hai
        localStorage.setItem('token', data.authToken);
        localStorage.setItem('role', data.role);
        localStorage.setItem('username', data.username);
        
        // Role ke hisab se page par bhejna (Bina page refresh kiye)
        if (data.role === 'Admin') {
          navigate('/dashboard'); // Admin ko Dashboard par bhejein
        } else {
          navigate('/auction'); // Munshi ko Auction par bhejein
        }
      } else {
        setError('❌ ' + (data.message || 'Login mein masla hai!'));
      }
    } catch (err) {
      setError('❌ Server band hai ya Network Error!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f2f5' }}>
      <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        
        <h1 style={{ color: '#000080', margin: '0 0 10px 0' }}>🌾 Mandi Khata</h1>
        <h3 style={{ color: '#666', marginBottom: '30px' }}>System mein dakhil hon</h3>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
          
          {/* ✅ NAYA: Dropdown khatam, yahan Username likhne wala dabba laga diya */}
          <div style={{ width: '90%' }}>
            <label style={{ display: 'block', textAlign: 'left', fontWeight: 'bold', marginBottom: '5px' }}>یوزر نیم (Username):</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)}
              placeholder="salman"
              required
              style={{ width: '100%', padding: '15px', fontSize: '18px', borderRadius: '5px', border: '2px solid #ccc', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ width: '90%' }}>
            <label style={{ display: 'block', textAlign: 'left', fontWeight: 'bold', marginBottom: '5px' }}>پاس ورڈ (Password):</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="******" 
              required 
              style={{ width: '100%', padding: '15px', fontSize: '18px', borderRadius: '5px', border: '2px solid #ccc', boxSizing: 'border-box' }}
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            style={{ width: '90%', padding: '15px', backgroundColor: '#198754', color: 'white', border: 'none', borderRadius: '5px', fontSize: '20px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? '⏳...' : '🚪 Login Karein'}
          </button>
        </form>

        {error && <p style={{ color: 'red', marginTop: '20px', fontWeight: 'bold' }}>{error}</p>}
      </div>
    </div>
  );
}

export default Login;