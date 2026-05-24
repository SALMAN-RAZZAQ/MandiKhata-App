import React from 'react';

function Home() {
  const today = new Date().toLocaleDateString('en-GB');

  return (
    <div style={{ 
      height: '100vh', // Screen ki height ke barabar, scroll nahi aayega
      width: '100%',
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', // Sab kuch screen ke center mein rahay ga
      padding: '10px',
      fontFamily: 'Arial, sans-serif',
      boxSizing: 'border-box',
      overflow: 'hidden' // Scroll bar ko force-off karne ke liye
    }}>
      
      {/* 1. Shop Name */}
      <h1 style={{ 
        color: '#00008B', 
        fontWeight: '900', 
        fontSize: '32px', 
        marginBottom: '0px' // Niche ka fasla khatam
      }}>
        Mian Ali Muhammad & Sons
      </h1>
      
      {/* 2. Slogan */}
      <h4 style={{ 
        color: '#00008b', 
        fontStyle: 'italic', 
        fontWeight: 'bold', 
        marginTop: '0px',   // Uper ka fasla khatam
        marginBottom: '5px', 
        alignSelf: 'flex-start', 
        marginLeft: '43%'
      }}>
        ( A Name of Trust Since 1988 )
      </h4>
      
      {/* 2. Commission Shop & Trader */}
      <h2 style={{ color: '#DC143C', fontWeight: 'bold', margin: '10px 0', fontSize: '24px' }}>
        Commission Shop & Traders
      </h2>
      
      {/* 3. Address & Contacts */}
      <h4 style={{ color: '#006400', fontWeight: 'bold', margin: '2px 0', fontSize: '18px' }}>
        Office No 74/G, Grain Market Burewala
      </h4>
      <h4 style={{ color: '#006400', fontWeight: 'bold', margin: '2px 0', fontSize: '18px' }}>
        Abdul-Sattar Kaleem: 0336-7202647, 0309-7032647
      </h4>
      <h4 style={{ color: '#006400', fontWeight: 'bold', margin: '2px 0', fontSize: '18px' }}>
        Mian Usman: 0300-6998470
      </h4>

      {/* 4. Date */}
      <h2 style={{ color: '#DC143C', fontWeight: 'bold', marginTop: '20px', fontSize: '22px' }}>
        {today}
      </h2>

      {/* 5. Circular Logo at the bottom */}
      <div style={{ 
        marginTop: '30px',
        width: '120px', 
        height: '120px', 
        borderRadius: '50%', 
        border: '4px solid #B8860B',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
      }}>
        <span style={{ fontSize: '50px' }}>🌾</span>
      </div>

    </div>
  );
}

export default Home;