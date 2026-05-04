import React, { useState, useEffect } from 'react';

function KhataSettings() {
  const [groups, setGroups] = useState([]);
  const [newName, setNewName] = useState('');
  const [status, setStatus] = useState('');
  const [newPass, setNewPass] = useState('');
  
  const [passRole, setPassRole] = useState('Admin'); 
  const userRole = localStorage.getItem('role');

  // ✅ NAYA: Token (Chabi) nikalne ka asaan tareeqa
  const getToken = () => localStorage.getItem('token');

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/parcha/khatagroup/all');
      const data = await response.json();
      setGroups(data);
    } catch (error) {
      console.error("Categories load nahi ho sakeen");
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setStatus('Save ho raha hai...');
    try {
      const response = await fetch('http://localhost:5000/api/parcha/khatagroup/add', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'auth-token': getToken() // ✅ Asal Masla: Yahan Chabi lagani zaroori thi!
        },
        body: JSON.stringify({ name: newName })
      });

      const data = await response.json(); // Backend se asal message mangwaya

      if (response.ok) {
        setStatus('✅ Naya Khata Section ban gaya!');
        setNewName('');
        fetchGroups(); 
      } else {
        // ✅ Ab jhoota message nahi, backend ka ASAL error show hoga
        setStatus(`❌ Error: ${data.error || 'Server mein masla hai'}`);
      }
    } catch (error) {
      setStatus('❌ Network Error.');
    }
  };

  const deleteKhata = async (id) => {
    const isConfirm = window.confirm("⚠️ Kya aap waqai yeh Khata hamesha ke liye Delete karna chahte hain?");
    if (isConfirm) {
      try {
        const response = await fetch(`http://localhost:5000/api/parcha/khatagroup/delete/${id}`, { 
          method: 'DELETE',
          headers: {
            'auth-token': getToken() // ✅ Delete ke liye bhi chabi chahiye
          }
        });
        if (response.ok) {
          alert("✅ Khata Delete Ho Gaya!");
          fetchGroups(); 
        } else {
          alert("❌ Delete karne ki ijazat nahi mili.");
        }
      } catch (error) { alert("❌ Error aagaya."); }
    }
  };

  const updatePassword = async () => {
    if (!newPass) {
      alert("Pehle naya password likhein!");
      return;
    }
    try {
      const res = await fetch('http://localhost:5000/api/parcha/update-password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'auth-token': getToken() // ✅ Password change ke liye bhi chabi
        },
        body: JSON.stringify({ role: passRole, newPassword: newPass })
      });
      
      if(res.ok) {
        alert(`✅ ${passRole} ka Password Kamyabi se Badal Gaya!`);
        setNewPass(''); 
      } else {
        alert("❌ Error: Password update nahi ho saka.");
      }
    } catch (error) { alert("❌ Network Error."); }
  };

  return (
    <div style={{ padding: '30px', fontFamily: 'Arial', maxWidth: '600px', margin: '0 auto' }}>
      <h2>⚙️ Khata Settings (کھاتہ سیٹنگز)</h2>
      
      <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', borderTop: '4px solid #198754' }}>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            value={newName} 
            onChange={(e) => setNewName(e.target.value)} 
            placeholder="Naye Khate ka naam (e.g., Zati Kharcha)" 
            required 
            style={{ flex: 1, padding: '10px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#198754', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            + Add Khata
          </button>
        </form>
        {status && <p style={{ marginTop: '15px', color: status.includes('❌') ? 'red' : 'green', fontWeight: 'bold' }}>{status}</p>}
      </div>

      <h3 style={{ marginTop: '40px' }}>Mojooda Khata Groups:</h3>
      <ul style={{ listStyleType: 'none', padding: 0 }}>
        {groups.map((group) => (
          <li key={group._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '15px', border: '1px solid #ddd', marginBottom: '10px', borderRadius: '5px', fontWeight: 'bold', fontSize: '18px' }}>
            <span>📁 {group.name}</span>
            
            {userRole === 'Admin' && (
              <button 
                onClick={() => deleteKhata(group._id)}
                style={{ padding: '5px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                🗑️ Delete
              </button>
            )}
          </li>
        ))}
      </ul>

      {userRole === 'Admin' && (
        <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#e8f4fd', border: '2px solid #000080', borderRadius: '8px' }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#000080' }}>🔐 Passwords Badlein</h3>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <select 
              value={passRole} 
              onChange={(e) => setPassRole(e.target.value)}
              style={{ padding: '10px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer' }}
            >
              <option value="Admin">👑 Seth (Admin)</option>
              <option value="Munshi">✍️ Munshi</option>
            </select>

            <input 
              type="password" 
              placeholder="Naya Password Likhein..." 
              value={newPass} 
              onChange={(e) => setNewPass(e.target.value)}
              style={{ flex: 1, padding: '10px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>

          <button onClick={updatePassword} style={{ width: '100%', padding: '10px 20px', backgroundColor: '#000080', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            Update Password
          </button>
        </div>
      )}
    </div>
  );
}

export default KhataSettings;