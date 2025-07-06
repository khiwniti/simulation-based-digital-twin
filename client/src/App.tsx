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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Asphalt Tank Management System</h1>
              <p className="text-sm text-muted-foreground">
                Digital Twin & Real-time Monitoring
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-muted-foreground">
                Last Update: {new Date().toLocaleTimeString()}
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
