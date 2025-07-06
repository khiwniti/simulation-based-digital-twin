import React, { useEffect } from 'react';
import { TankSystem } from './components/TankSystem';
import { Dashboard } from './components/Dashboard';
import { AlertPanel } from './components/AlertPanel';
import { ControlPanel } from './components/ControlPanel';
import { MLPredictionPanel } from './components/MLPredictionPanel';
import { IndustrialUI } from './components/IndustrialUI';
import { DigitalTwinComparison } from './components/DigitalTwinComparison';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { useTankSystem } from './lib/stores/useTankSystem';
import { useAlerts } from './lib/stores/useAlerts';
import { socketManager } from './lib/socket';
import { 
  Gauge, 
  BarChart3, 
  AlertTriangle, 
  Settings, 
  Brain, 
  Monitor,
  GitCompare
} from 'lucide-react';

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

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-200px)]">
          {/* Left Panel - 3D Visualization */}
          <div className="col-span-8">
            <div className="bg-card rounded-lg border h-full">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">3D Tank Visualization</h2>
              </div>
              <div className="h-[calc(100%-60px)]">
                <TankSystem />
              </div>
            </div>
          </div>

          {/* Right Panel - Controls and Information */}
          <div className="col-span-4">
            <Tabs defaultValue="industrial" className="h-full">
              <TabsList className="grid w-full grid-cols-6 text-xs">
                <TabsTrigger value="industrial" className="flex items-center space-x-1">
                  <Monitor className="h-3 w-3" />
                  <span className="hidden lg:inline">SCADA</span>
                </TabsTrigger>
                <TabsTrigger value="dashboard" className="flex items-center space-x-1">
                  <Gauge className="h-3 w-3" />
                  <span className="hidden lg:inline">Dashboard</span>
                </TabsTrigger>
                <TabsTrigger value="ml" className="flex items-center space-x-1">
                  <Brain className="h-3 w-3" />
                  <span className="hidden lg:inline">AI/ML</span>
                </TabsTrigger>
                <TabsTrigger value="twin" className="flex items-center space-x-1">
                  <GitCompare className="h-3 w-3" />
                  <span className="hidden lg:inline">Twin</span>
                </TabsTrigger>
                <TabsTrigger value="alerts" className="flex items-center space-x-1">
                  <AlertTriangle className="h-3 w-3" />
                  <span className="hidden lg:inline">Alerts</span>
                </TabsTrigger>
                <TabsTrigger value="control" className="flex items-center space-x-1">
                  <Settings className="h-3 w-3" />
                  <span className="hidden lg:inline">Control</span>
                </TabsTrigger>
              </TabsList>
              
              <div className="mt-4 h-[calc(100%-60px)]">
                <TabsContent value="industrial" className="h-full overflow-auto">
                  <IndustrialUI />
                </TabsContent>
                
                <TabsContent value="dashboard" className="h-full overflow-auto">
                  <Dashboard />
                </TabsContent>
                
                <TabsContent value="ml" className="h-full overflow-auto">
                  <MLPredictionPanel />
                </TabsContent>
                
                <TabsContent value="twin" className="h-full overflow-auto">
                  <DigitalTwinComparison />
                </TabsContent>
                
                <TabsContent value="alerts" className="h-full">
                  <AlertPanel />
                </TabsContent>
                
                <TabsContent value="control" className="h-full overflow-auto">
                  <ControlPanel />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
