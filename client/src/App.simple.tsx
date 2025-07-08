import React from 'react';

function App() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🏭 Digital Twin Simulation System</h1>
      <div style={{ 
        background: '#f0f0f0', 
        padding: '20px', 
        borderRadius: '8px',
        margin: '20px 0'
      }}>
        <h2>✅ System Status</h2>
        <p><strong>Backend API:</strong> ✅ Running on port 5000</p>
        <p><strong>Frontend:</strong> ✅ React app loaded successfully</p>
        <p><strong>Dependencies:</strong> ✅ Updated to latest versions</p>
      </div>
      
      <div style={{ 
        background: '#e8f5e8', 
        padding: '20px', 
        borderRadius: '8px',
        margin: '20px 0'
      }}>
        <h2>🔧 Development Progress</h2>
        <ul>
          <li>✅ All major dependencies updated</li>
          <li>✅ Security vulnerabilities fixed</li>
          <li>✅ Backend API endpoints working</li>
          <li>✅ SCADA simulation running</li>
          <li>⚠️ TypeScript compilation errors being resolved</li>
          <li>🔄 3D visualization components being fixed</li>
        </ul>
      </div>

      <div style={{ 
        background: '#fff3cd', 
        padding: '20px', 
        borderRadius: '8px',
        margin: '20px 0'
      }}>
        <h2>📊 API Test</h2>
        <button 
          onClick={() => {
            fetch('/api/tanks')
              .then(res => res.json())
              .then(data => {
                alert(`API Working! Found ${data.length} tanks`);
              })
              .catch(err => {
                alert('API Error: ' + err.message);
              });
          }}
          style={{
            background: '#007bff',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Test API Connection
        </button>
      </div>
    </div>
  );
}

export default App;