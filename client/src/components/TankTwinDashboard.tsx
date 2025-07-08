import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  Thermometer, 
  Gauge, 
  Zap, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Settings,
  BarChart3,
  MapPin,
  Droplets,
  Flame
} from 'lucide-react';
import { EnhancedTankSystem3D } from './EnhancedTankSystem3D';

interface TankTwinData {
  id: number;
  name: string;
  currentLevel: number;
  capacity: number;
  temperature: number;
  targetTemperature: number;
  status: 'normal' | 'warning' | 'critical' | 'offline';
  heatingCoil: {
    inletTemperature: number;
    outletTemperature: number;
    flowRate: number;
    efficiency: number;
  };
  thermalProfile: {
    topTemperature: number;
    middleTemperature: number;
    bottomTemperature: number;
    stratification: number;
  };
  energyBalance: {
    heatInput: number;
    heatLoss: number;
    efficiency: number;
  };
}

interface SystemMetrics {
  overall: {
    efficiency: number;
    availability: number;
    energyConsumption: number;
  };
  hotOilSystem: {
    circulation: number;
    efficiency: number;
    heatDuty: number;
  };
}

interface SystemHealth {
  status: 'good' | 'warning' | 'critical';
  criticalTanks: number;
  efficiency: number;
  availability: number;
}

export function TankTwinDashboard() {
  const [tanks, setTanks] = useState<TankTwinData[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [selectedTank, setSelectedTank] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data from Tank Twin Manager API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch system status
        const statusResponse = await fetch('/api/tank-twin/status');
        const statusData = await statusResponse.json();
        
        if (statusData.success) {
          setSystemHealth(statusData.data.health);
          setSystemMetrics(statusData.data.metrics);
        }

        // Fetch tank data
        const tanksResponse = await fetch('/api/tank-twin/tanks');
        const tanksData = await tanksResponse.json();
        
        if (tanksData.success) {
          setTanks(tanksData.data);
        }

        setError(null);
      } catch (err) {
        setError('Failed to fetch tank twin data');
        console.error('Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    
    // Set up real-time updates
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'good': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default: return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Tank Twin Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tipco Asphalt Plant Digital Twin</h1>
          <p className="text-gray-600">Enterprise-grade tank management system</p>
        </div>
        <div className="flex items-center space-x-4">
          {systemHealth && (
            <div className="flex items-center space-x-2">
              {getHealthStatusIcon(systemHealth.status)}
              <span className="text-sm font-medium">
                System {systemHealth.status.charAt(0).toUpperCase() + systemHealth.status.slice(1)}
              </span>
            </div>
          )}
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* System Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tanks</CardTitle>
            <Droplets className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tanks.length}</div>
            <p className="text-xs text-muted-foreground">
              {tanks.filter(t => t.status === 'normal').length} operational
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Efficiency</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemMetrics?.overall.efficiency.toFixed(1)}%
            </div>
            <Progress value={systemMetrics?.overall.efficiency || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hot-Oil Circulation</CardTitle>
            <Flame className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemMetrics?.hotOilSystem.circulation.toLocaleString()} L/min
            </div>
            <p className="text-xs text-muted-foreground">
              {systemMetrics?.hotOilSystem.efficiency.toFixed(1)}% efficiency
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Energy Consumption</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemMetrics?.overall.energyConsumption.toLocaleString()} kWh
            </div>
            <p className="text-xs text-muted-foreground">Daily consumption</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="3d-view">3D Plant View</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tank Status Grid */}
            <Card>
              <CardHeader>
                <CardTitle>Tank Status Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {tanks.map((tank) => (
                    <div
                      key={tank.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedTank === tank.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedTank(selectedTank === tank.id ? null : tank.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{tank.name}</span>
                        <Badge className={getStatusColor(tank.status)}>
                          {tank.status}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Level:</span>
                          <span>{((tank.currentLevel / tank.capacity) * 100).toFixed(1)}%</span>
                        </div>
                        <Progress value={(tank.currentLevel / tank.capacity) * 100} className="h-2" />
                        <div className="flex justify-between text-sm">
                          <span>Temp:</span>
                          <span>{tank.temperature.toFixed(1)}°C</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Efficiency:</span>
                          <span>{tank.energyBalance.efficiency.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Selected Tank Details */}
            {selectedTank && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    Tank {selectedTank} - Detailed View
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const tank = tanks.find(t => t.id === selectedTank);
                    if (!tank) return <p>Tank not found</p>;

                    return (
                      <div className="space-y-4">
                        {/* Temperature Profile */}
                        <div>
                          <h4 className="font-medium mb-2">Temperature Profile</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>Top:</span>
                              <span>{tank.thermalProfile.topTemperature.toFixed(1)}°C</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Middle:</span>
                              <span>{tank.thermalProfile.middleTemperature.toFixed(1)}°C</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Bottom:</span>
                              <span>{tank.thermalProfile.bottomTemperature.toFixed(1)}°C</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Stratification:</span>
                              <span>{tank.thermalProfile.stratification.toFixed(1)}°C</span>
                            </div>
                          </div>
                        </div>

                        {/* Heating Coil */}
                        <div>
                          <h4 className="font-medium mb-2">Heating Coil</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>Inlet Temp:</span>
                              <span>{tank.heatingCoil.inletTemperature.toFixed(1)}°C</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Outlet Temp:</span>
                              <span>{tank.heatingCoil.outletTemperature.toFixed(1)}°C</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Flow Rate:</span>
                              <span>{tank.heatingCoil.flowRate.toFixed(0)} L/min</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Efficiency:</span>
                              <span>{tank.heatingCoil.efficiency.toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>

                        {/* Energy Balance */}
                        <div>
                          <h4 className="font-medium mb-2">Energy Balance</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>Heat Input:</span>
                              <span>{tank.energyBalance.heatInput.toFixed(1)} kW</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Heat Loss:</span>
                              <span>{tank.energyBalance.heatLoss.toFixed(1)} kW</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Net Efficiency:</span>
                              <span>{tank.energyBalance.efficiency.toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>

                        <Button className="w-full" variant="outline">
                          <Settings className="h-4 w-4 mr-2" />
                          Configure Tank Settings
                        </Button>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* 3D View Tab */}
        <TabsContent value="3d-view" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>3D Plant Visualization</CardTitle>
              <p className="text-sm text-gray-600">
                Interactive 3D representation of the Tipco Asphalt facility with real-time data
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[600px] w-full">
                <EnhancedTankSystem3D />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Efficiency Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <BarChart3 className="h-12 w-12 mb-2" />
                  <p>Efficiency trend chart would be displayed here</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Energy Consumption</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <Zap className="h-12 w-12 mb-2" />
                  <p>Energy consumption chart would be displayed here</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Predictive Maintenance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Tank 3 heating coil efficiency below optimal range. Maintenance recommended within 7 days.
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tanks.filter(tank => tank.energyBalance.efficiency < 80).map(tank => (
                    <div key={tank.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">{tank.name}</span>
                        <Badge variant="outline">Maintenance Due</Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        Efficiency: {tank.energyBalance.efficiency.toFixed(1)}%
                      </p>
                      <p className="text-sm text-gray-600">
                        Recommended: Heating coil inspection
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button className="w-full" variant="outline">
                  Generate Daily Operations Report
                </Button>
                <Button className="w-full" variant="outline">
                  Generate Energy Efficiency Report
                </Button>
                <Button className="w-full" variant="outline">
                  Generate Maintenance Schedule Report
                </Button>
                <Button className="w-full" variant="outline">
                  Generate Compliance Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}