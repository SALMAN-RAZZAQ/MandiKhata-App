import React, { useState, useEffect } from 'react';

function KhataSettings() {
  const [groups, setGroups] = useState([]);
  const [newName, setNewName] = useState('');
  const [status, setStatus] = useState('');
  
  // ✅ NAYA: Crops ki states
  const [crops, setCrops] = useState([]);
  const [newCropName, setNewCropName] = useState('');
  const [cropStatus, setCropStatus] = useState('');

  const [newPass, setNewPass] = useState('');
  const [passRole, setPassRole] = useState('Admin'); 
  const userRole = localStorage.getItem('role');

  const getToken = () => localStorage.getItem('token');

  const handleSessionExpire = () => {
    alert("Aapka session expire ho gaya hai. Dobara login karein!");
    localStorage.clear();
    window.location.href = '/login';
  };

  useEffect(() => {
    fetchGroups();
    fetchCrops(); // ✅ NAYA: Page load par faslein bhi laye
  }, []);

  // 📁 KHATA GROUPS LOGIC
  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/parcha/khatagroup/all', {
        headers: { 'auth-token': getToken() }
      });
      if (response.status === 401) return handleSessionExpire();
      const data = await response.json();
      if (Array.isArray(data)) setGroups(data);
      else setGroups([]);
    } catch (error) { setGroups([]); }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setStatus('Save ho raha hai...');
    try {
      const response = await fetch('/api/parcha/khatagroup/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'auth-token': getToken() },
        body: JSON.stringify({ name: newName })
      });
      if (response.status === 401) return handleSessionExpire();
      const data = await response.json(); 
      if (response.ok) {
        setStatus('✅ Naya Khata Section ban gaya!');
        setNewName('');
        fetchGroups(); 
      } else {
        setStatus(`❌ Error: ${data.error || 'Server mein masla hai'}`);
      }
    } catch (error) { setStatus('❌ Network Error.'); }
  };

  const deleteKhata = async (id) => {
    const isConfirm = window.confirm("⚠️ Kya aap waqai yeh Khata hamesha ke liye Delete karna chahte hain?");
    if (isConfirm) {
      try {
        const response = await fetch(`/api/parcha/khatagroup/delete/${id}`, { 
          method: 'DELETE', headers: { 'auth-token': getToken() }
        });
        if (response.status === 401) return handleSessionExpire();
        if (response.ok) { alert("✅ Khata Delete Ho Gaya!"); fetchGroups(); } 
        else alert("❌ Delete karne ki ijazat nahi mili.");
      } catch (error) { alert("❌ Error aagaya."); }
    }
  };

  // 🌱 CROPS (FASAL) LOGIC
  const fetchCrops = async () => {
    try {
      const response = await fetch('/api/crops/all', {
        headers: { 'auth-token': getToken() }
      });
      if (response.status === 401) return handleSessionExpire();
      const data = await response.json();
      if (Array.isArray(data)) setCrops(data);
    } catch (error) { console.error(error); }
  };

  const handleAddCrop = async (e) => {
    e.preventDefault();
    setCropStatus('Save ho raha hai...');
    try {
      const response = await fetch('/api/crops/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'auth-token': getToken() },
        body: JSON.stringify({ name: newCropName })
      });
      if (response.status === 401) return handleSessionExpire();
      const data = await response.json(); 
      if (response.ok) {
        setCropStatus('✅ Nayi Fasal add ho gayi!');
        setNewCropName('');
        fetchCrops(); 
      } else {
        setCropStatus(`❌ Error: ${data.error || 'Server mein masla hai'}`);
      }
    } catch (error) { setCropStatus('❌ Network Error.'); }
  };

  const deleteCrop = async (id) => {
    const isConfirm = window.confirm("⚠️ Kya aap waqai yeh Fasal Delete karna chahte hain?");
    if (isConfirm) {
      try {
        const response = await fetch(`/api/crops/delete/${id}`, { 
          method: 'DELETE', headers: { 'auth-token': getToken() }
        });
        if (response.status === 401) return handleSessionExpire();
        if (response.ok) { alert("✅ Fasal Delete Ho Gayi!"); fetchCrops(); } 
        else alert("❌ Masla aaya.");
      } catch (error) { alert("❌ Error."); }
    }
  };

  const updatePassword = async () => {
    if (!newPass) return alert("Pehle naya password likhein!");
    try {
      const response = await fetch('/api/parcha/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'auth-token': getToken() },
        body: JSON.stringify({ role: passRole, newPassword: newPass })
      });
      if (response.status === 401) return handleSessionExpire();
      if(response.ok) { alert(`✅ ${passRole} ka Password Kamyabi se Badal Gaya!`); setNewPass(''); } 
      else alert("❌ Error: Password update nahi ho saka.");
    } catch (error) { alert("❌ Network Error."); }
  };

  return (
    <div style={{ padding: '30px', fontFamily: 'Arial', maxWidth: '600px', margin: '0 auto' }}>
      <h2>⚙️ Khata Settings (کھاتہ سیٹنگز)</h2>
      
      {/* KHATA GROUP SECTION */}
      <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', borderTop: '4px solid #198754' }}>
        <h4 style={{ color: '#198754', marginTop: 0 }}>📁 Khata Section</h4>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '10px' }}>
          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Naye Khate ka naam..." required style={inputStyle} />
          <button type="submit" style={btnStyle('#198754')}>+ Add Khata</button>
        </form>
        {status && <p style={{ marginTop: '10px', color: status.includes('❌') ? 'red' : 'green', fontWeight: 'bold' }}>{status}</p>}
        
        <ul style={{ listStyleType: 'none', padding: 0, marginTop: '15px' }}>
          {groups.map((group) => (
            <li key={group._id} style={listItemStyle}>
              <span>📁 {group.name}</span>
              {userRole === 'Admin' && <button onClick={() => deleteKhata(group._id)} style={btnStyle('#dc3545', '5px 10px')}>🗑️</button>}
            </li>
          ))}
        </ul>
      </div>

      {/* ✅ NAYA: FASAL (CROPS) SECTION */}
      <div style={{ backgroundColor: '#fff8e1', padding: '20px', borderRadius: '8px', borderTop: '4px solid #f39c12', marginTop: '30px' }}>
        <h4 style={{ color: '#f39c12', marginTop: 0 }}>🌱 Fasal (Crop) Settings</h4>
        <form onSubmit={handleAddCrop} style={{ display: 'flex', gap: '10px' }}>
          <input type="text" value={newCropName} onChange={(e) => setNewCropName(e.target.value)} placeholder="Nayi Fasal ka naam (e.g. Gandum)..." required style={inputStyle} />
          <button type="submit" style={btnStyle('#f39c12')}>+ Add Fasal</button>
        </form>
        {cropStatus && <p style={{ marginTop: '10px', color: cropStatus.includes('❌') ? 'red' : 'green', fontWeight: 'bold' }}>{cropStatus}</p>}
        
        <ul style={{ listStyleType: 'none', padding: 0, marginTop: '15px' }}>
          {crops.map((crop) => (
            <li key={crop._id} style={listItemStyle}>
              <span>🌱 {crop.name}</span>
              {userRole === 'Admin' && <button onClick={() => deleteCrop(crop._id)} style={btnStyle('#dc3545', '5px 10px')}>🗑️</button>}
            </li>
          ))}
        </ul>
      </div>

      {/* PASSWORD SECTION */}
      {userRole === 'Admin' && (
        <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#e8f4fd', border: '2px solid #000080', borderRadius: '8px' }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#000080' }}>🔐 Passwords Badlein</h3>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <select value={passRole} onChange={(e) => setPassRole(e.target.value)} style={{ ...inputStyle, flex: 'none', width: 'auto' }}>
              <option value="Admin">👑 Seth (Admin)</option>
              <option value="Munshi">✍️ Munshi</option>
            </select>
            <input type="password" placeholder="Naya Password Likhein..." value={newPass} onChange={(e) => setNewPass(e.target.value)} style={inputStyle} />
          </div>
          <button onClick={updatePassword} style={{ ...btnStyle('#000080'), width: '100%' }}>Update Password</button>
        </div>
      )}
    </div>
  );
}

const inputStyle = { flex: 1, padding: '10px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ccc' };
const btnStyle = (color, padding = '10px 20px') => ({ padding, backgroundColor: color, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' });
const listItemStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '10px 15px', border: '1px solid #ddd', marginBottom: '5px', borderRadius: '5px', fontWeight: 'bold' };

export default KhataSettings;