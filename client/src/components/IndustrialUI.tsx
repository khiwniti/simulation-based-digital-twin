import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useTankSystem } from '@/lib/stores/useTankSystem';
import { useAlerts } from '@/lib/stores/useAlerts';
import { 
  Monitor, 
  Cpu, 
  Wifi, 
  WifiOff,
  Power,
  Thermometer,
  Gauge,
  AlertTriangle,
  CheckCircle,
  Activity,
  Settings,
  Zap,
  Timer
} from 'lucide-react';

interface SystemStatusProps {
  title: string;
  value: string | number;
  unit?: string;
  status: 'normal' | 'warning' | 'critical';
  icon: React.ReactNode;
}

function SystemStatus({ title, value, unit = '', status, icon }: SystemStatusProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'critical': return 'border-red-500 bg-red-50 dark:bg-red-900/20';
      case 'warning': return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      default: return 'border-green-500 bg-green-50 dark:bg-green-900/20';
    }
  };

  return (
    <div className={`p-3 rounded-lg border-2 ${getStatusColor()} transition-colors`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          {icon}
          <span className="text-sm font-medium">{title}</span>
        </div>
        <Badge 
          variant={status === 'critical' ? 'destructive' : status === 'warning' ? 'secondary' : 'default'}
          className="text-xs"
        >
          {status.toUpperCase()}
        </Badge>
      </div>
      <div className="text-xl font-bold">
        {value}{unit}
      </div>
    </div>
  );
}

export function IndustrialUI() {
  const { tanks, systemMetrics, isConnected } = useTankSystem();
  const { unacknowledgedCount } = useAlerts();
  const [selectedSystem, setSelectedSystem] = useState<'general' | 'thermal' | 'electrical'>('general');

  const activeTanks = tanks.filter(tank => tank.status !== 'critical').length;
  const avgTemperature = tanks.length > 0 ? tanks.reduce((sum, tank) => sum + tank.temperature, 0) / tanks.length : 0;
  const totalCapacity = tanks.reduce((sum, tank) => sum + tank.capacity, 0);
  const totalUsed = tanks.reduce((sum, tank) => sum + tank.currentLevel, 0);
  const usagePercentage = totalCapacity > 0 ? (totalUsed / totalCapacity) * 100 : 0;
  const avgEfficiency = tanks.length > 0 ? tanks.reduce((sum, tank) => sum + (tank.efficiency || 85), 0) / tanks.length : 0;
  const totalEnergyConsumption = tanks.reduce((sum, tank) => sum + (tank.energyConsumption || 20), 0);

  return (
    <div className="space-y-4">
      {/* System Header */}
      <Card className="bg-slate-900 text-white border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Monitor className="h-6 w-6 text-blue-400" />
              <div>
                <CardTitle className="text-lg">Industrial Control System</CardTitle>
                <p className="text-sm text-slate-300">Asphalt Tank Management - SCADA Interface</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {isConnected ? (
                  <Wifi className="h-4 w-4 text-green-400" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-400" />
                )}
                <span className="text-sm">
                  {isConnected ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
              <div className="text-sm text-slate-300">
                {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* System Tabs */}
      <div className="flex space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
        {[
          { id: 'general', label: 'General', icon: <Cpu className="h-4 w-4" /> },
          { id: 'thermal', label: 'Thermal', icon: <Thermometer className="h-4 w-4" /> },
          { id: 'electrical', label: 'Electrical', icon: <Zap className="h-4 w-4" /> }
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={selectedSystem === tab.id ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedSystem(tab.id as any)}
            className="flex items-center space-x-2 flex-1"
          >
            {tab.icon}
            <span>{tab.label}</span>
          </Button>
        ))}
      </div>

      {/* System Overview Grid */}
      {selectedSystem === 'general' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SystemStatus
            title="System Status"
            value={`${activeTanks}/${tanks.length}`}
            status={activeTanks === tanks.length ? 'normal' : activeTanks > tanks.length * 0.7 ? 'warning' : 'critical'}
            icon={<Activity className="h-4 w-4" />}
          />
          
          <SystemStatus
            title="Alerts"
            value={unacknowledgedCount}
            status={unacknowledgedCount === 0 ? 'normal' : unacknowledgedCount < 5 ? 'warning' : 'critical'}
            icon={<AlertTriangle className="h-4 w-4" />}
          />
          
          <SystemStatus
            title="Capacity"
            value={usagePercentage.toFixed(1)}
            unit="%"
            status={usagePercentage < 80 ? 'normal' : usagePercentage < 90 ? 'warning' : 'critical'}
            icon={<Gauge className="h-4 w-4" />}
          />
          
          <SystemStatus
            title="Efficiency"
            value={avgEfficiency.toFixed(1)}
            unit="%"
            status={avgEfficiency > 80 ? 'normal' : avgEfficiency > 60 ? 'warning' : 'critical'}
            icon={<CheckCircle className="h-4 w-4" />}
          />
        </div>
      )}

      {selectedSystem === 'thermal' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SystemStatus
            title="Avg Temperature"
            value={avgTemperature.toFixed(1)}
            unit="°C"
            status="normal"
            icon={<Thermometer className="h-4 w-4" />}
          />
          
          <SystemStatus
            title="Active Boilers"
            value={tanks.filter(tank => tank.boilerStatus === 'active').length}
            unit={`/${tanks.length}`}
            status="normal"
            icon={<Power className="h-4 w-4" />}
          />
          
          <SystemStatus
            title="Temp Range"
            value={`${Math.min(...tanks.map(t => t.temperature)).toFixed(0)}-${Math.max(...tanks.map(t => t.temperature)).toFixed(0)}`}
            unit="°C"
            status="normal"
            icon={<Activity className="h-4 w-4" />}
          />
          
          <SystemStatus
            title="Maintenance"
            value={tanks.filter(tank => tank.boilerStatus === 'maintenance').length}
            status={tanks.filter(tank => tank.boilerStatus === 'maintenance').length === 0 ? 'normal' : 'warning'}
            icon={<Settings className="h-4 w-4" />}
          />
        </div>
      )}

      {selectedSystem === 'electrical' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SystemStatus
            title="Power Consumption"
            value={totalEnergyConsumption.toFixed(1)}
            unit="kW"
            status={totalEnergyConsumption < 200 ? 'normal' : totalEnergyConsumption < 300 ? 'warning' : 'critical'}
            icon={<Zap className="h-4 w-4" />}
          />
          
          <SystemStatus
            title="Grid Status"
            value="STABLE"
            status="normal"
            icon={<Power className="h-4 w-4" />}
          />
          
          <SystemStatus
            title="Load Factor"
            value={(totalEnergyConsumption / 400 * 100).toFixed(1)}
            unit="%"
            status="normal"
            icon={<Gauge className="h-4 w-4" />}
          />
          
          <SystemStatus
            title="Backup"
            value="READY"
            status="normal"
            icon={<CheckCircle className="h-4 w-4" />}
          />
        </div>
      )}

      {/* Monthly Overview Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Monthly Performance Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Performance Bars */}
            <div className="grid grid-cols-12 gap-2 items-end h-32">
              {Array.from({ length: 12 }, (_, i) => {
                const height = 60 + Math.random() * 40; // Simulate monthly data
                const isCurrentMonth = i === new Date().getMonth();
                return (
                  <div
                    key={i}
                    className={`rounded-t-sm transition-all duration-300 ${
                      isCurrentMonth 
                        ? 'bg-blue-500 shadow-lg' 
                        : 'bg-green-500 hover:bg-green-600'
                    }`}
                    style={{ height: `${height}%` }}
                    title={`${new Date(2025, i).toLocaleDateString('en', { month: 'short' })}: ${height.toFixed(0)}%`}
                  />
                );
              })}
            </div>
            
            {/* Month Labels */}
            <div className="grid grid-cols-12 gap-2 text-xs text-center text-muted-foreground">
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, i) => (
                <div key={month} className={i === new Date().getMonth() ? 'font-bold text-blue-500' : ''}>
                  {month}
                </div>
              ))}
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="mt-6 grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">98.2%</div>
              <div className="text-sm text-muted-foreground">Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">94.7%</div>
              <div className="text-sm text-muted-foreground">Efficiency</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-500">7.2yrs</div>
              <div className="text-sm text-muted-foreground">TCO</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Operations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Timer className="h-5 w-5" />
            <span>Real-time Operations</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tanks.slice(0, 6).map((tank) => (
              <div key={tank.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    tank.status === 'normal' ? 'bg-green-500' :
                    tank.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                  } animate-pulse`} />
                  <span className="font-medium">{tank.name}</span>
                </div>
                
                <div className="flex items-center space-x-4 text-sm">
                  <span className="text-muted-foreground">
                    {tank.temperature.toFixed(1)}°C
                  </span>
                  <span className="text-muted-foreground">
                    {((tank.currentLevel / tank.capacity) * 100).toFixed(0)}%
                  </span>
                  <Badge 
                    variant={tank.boilerStatus === 'active' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {tank.boilerStatus}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}