import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useTankSystem } from '@/lib/stores/useTankSystem';
import { useAlerts } from '@/lib/stores/useAlerts';
import { 
  Thermometer, 
  Fuel, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Gauge
} from 'lucide-react';

export function Dashboard() {
  const { tanks, systemMetrics, selectedTank, getTankById } = useTankSystem();
  const { alerts, unacknowledgedCount } = useAlerts();

  const selectedTankData = selectedTank ? getTankById(selectedTank) : null;

  const summaryStats = useMemo(() => {
    if (tanks.length === 0) return null;

    const totalCapacity = tanks.reduce((sum, tank) => sum + tank.capacity, 0);
    const totalUsed = tanks.reduce((sum, tank) => sum + tank.currentLevel, 0);
    const avgTemp = tanks.reduce((sum, tank) => sum + tank.temperature, 0) / tanks.length;
    const activeTanks = tanks.filter(tank => tank.status !== 'critical').length;
    const activeBoilers = tanks.filter(tank => tank.boilerStatus === 'active').length;

    return {
      totalCapacity,
      totalUsed,
      usagePercentage: (totalUsed / totalCapacity) * 100,
      avgTemp,
      activeTanks,
      activeBoilers,
      criticalTanks: tanks.filter(tank => tank.status === 'critical').length,
      warningTanks: tanks.filter(tank => tank.status === 'warning').length
    };
  }, [tanks]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'normal': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-4">
      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Capacity</CardTitle>
            <Fuel className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryStats ? `${summaryStats.totalCapacity.toLocaleString()}L` : 'Loading...'}
            </div>
            {summaryStats && (
              <>
                <p className="text-xs text-muted-foreground">
                  {summaryStats.totalUsed.toLocaleString()}L used
                </p>
                <Progress value={summaryStats.usagePercentage} className="mt-2" />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Temperature</CardTitle>
            <Thermometer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryStats ? `${summaryStats.avgTemp.toFixed(1)}°C` : 'Loading...'}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all tanks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Systems</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryStats ? `${summaryStats.activeTanks}/${tanks.length}` : 'Loading...'}
            </div>
            <p className="text-xs text-muted-foreground">
              {summaryStats ? `${summaryStats.activeBoilers} boilers active` : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {unacknowledgedCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Unacknowledged alerts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tank Status Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Tank Status Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tanks.map((tank) => (
              <div
                key={tank.id}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  selectedTank === tank.id 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{tank.name}</h3>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(tank.status)}
                    <Badge variant={tank.status === 'critical' ? 'destructive' : 'secondary'}>
                      {tank.status}
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Temperature</span>
                    <span className="font-medium">{tank.temperature.toFixed(1)}°C</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Level</span>
                    <span className="font-medium">
                      {((tank.currentLevel / tank.capacity) * 100).toFixed(1)}%
                    </span>
                  </div>
                  
                  <Progress 
                    value={(tank.currentLevel / tank.capacity) * 100} 
                    className="h-2"
                  />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Boiler</span>
                    <div className="flex items-center space-x-1">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(tank.boilerStatus)}`} />
                      <span className="text-sm capitalize">{tank.boilerStatus}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selected Tank Details */}
      {selectedTankData && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Tank: {selectedTankData.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center">
                  <Thermometer className="h-4 w-4 mr-2" />
                  Temperature Control
                </h4>
                <div className="text-sm space-y-1">
                  <div>Current: <span className="font-medium">{selectedTankData.temperature.toFixed(1)}°C</span></div>
                  <div>Target: <span className="font-medium">{selectedTankData.targetTemperature.toFixed(1)}°C</span></div>
                  <div>Difference: <span className={`font-medium ${
                    Math.abs(selectedTankData.temperature - selectedTankData.targetTemperature) > 5 
                      ? 'text-red-500' 
                      : 'text-green-500'
                  }`}>
                    {(selectedTankData.temperature - selectedTankData.targetTemperature).toFixed(1)}°C
                  </span></div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center">
                  <Gauge className="h-4 w-4 mr-2" />
                  Volume Status
                </h4>
                <div className="text-sm space-y-1">
                  <div>Capacity: <span className="font-medium">{selectedTankData.capacity.toLocaleString()}L</span></div>
                  <div>Current: <span className="font-medium">{selectedTankData.currentLevel.toLocaleString()}L</span></div>
                  <div>Percentage: <span className="font-medium">
                    {((selectedTankData.currentLevel / selectedTankData.capacity) * 100).toFixed(1)}%
                  </span></div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center">
                  <Activity className="h-4 w-4 mr-2" />
                  System Status
                </h4>
                <div className="text-sm space-y-1">
                  <div>Overall: {getStatusIcon(selectedTankData.status)} 
                    <span className="ml-2 capitalize">{selectedTankData.status}</span>
                  </div>
                  <div>Boiler: <span className={`font-medium capitalize ${
                    selectedTankData.boilerStatus === 'active' ? 'text-green-500' : 'text-yellow-500'
                  }`}>{selectedTankData.boilerStatus}</span></div>
                  <div>Last Update: <span className="text-xs">
                    {new Date(selectedTankData.lastUpdated).toLocaleTimeString()}
                  </span></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
