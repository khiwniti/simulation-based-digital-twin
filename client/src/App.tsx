import React, { useEffect } from 'react';
import { TankSystem } from './components/TankSystem';
import { FloatingPanels } from './components/FloatingPanels';
import { useTankSystem } from './lib/stores/useTankSystem';
import { useAlerts } from './lib/stores/useAlerts';
import { socketManager } from './lib/socket';

function App() {
  const { setSystemMetrics, setConnectionStatus } = useTankSystem();
  const { addAlert } = useAlerts();

  useEffect(() => {
    // Connect to WebSocket and set up listeners
    const socket = socketManager.connect();
    
    if (socket) {
      setConnectionStatus(true);
      
      // Listen for system metrics
      socketManager.onSystemMetrics((metrics) => {
        setSystemMetrics(metrics);
      });

      // Listen for new alerts
      socketManager.onAlert((alert) => {
        addAlert(alert);
      });
    }

    return () => {
      socketManager.disconnect();
      setConnectionStatus(false);
    };
  }, [setSystemMetrics, setConnectionStatus, addAlert]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="industrial-panel border-b border-white/20 relative z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Asphalt Tank Management System</h1>
              <p className="text-sm text-gray-300 font-medium">
                Digital Twin & Real-time SCADA Monitoring
              </p>
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-300">System Online</span>
              </div>
              <div className="text-sm text-gray-300 font-mono">
                {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Full Screen 3D Background */}
      <main className="fixed inset-0 top-[100px]">
        {/* 3D Background */}
        <div className="absolute inset-0 z-0">
          <TankSystem />
        </div>

        {/* Floating Panels */}
        <FloatingPanels />
      </main>
    </div>
  );
}

export default App;
