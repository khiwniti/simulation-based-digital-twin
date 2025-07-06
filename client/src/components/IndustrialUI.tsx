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
  const getStatusClass = () => {
    switch (status) {
      case 'critical': return 'status-critical';
      case 'warning': return 'status-warning';
      default: return 'status-success';
    }
  };

  return (
    <div className={`p-3 rounded-lg border ${getStatusClass()} transition-colors`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          {icon}
          <span className="metric-label">{title}</span>
        </div>
        <span className="text-xs font-bold px-2 py-1 rounded bg-white/10">
          {status.toUpperCase()}
        </span>
      </div>
      <div className="data-value">
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
      <div className="industrial-card mb-4">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Monitor className="h-6 w-6 text-blue-400" />
              <div>
                <h3 className="text-lg font-bold text-white">Industrial Control System</h3>
                <p className="metric-label">Asphalt Tank Management - SCADA Interface</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {isConnected ? (
                  <Wifi className="h-4 w-4 text-green-400" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-400" />
                )}
                <span className="text-sm font-medium text-white">
                  {isConnected ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
              <div className="text-sm font-mono text-gray-300">
                {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Tabs */}
      <div className="flex space-x-1 bg-white/5 p-1 rounded-lg mb-4">
        {[
          { id: 'general', label: 'General', icon: <Cpu className="h-4 w-4" /> },
          { id: 'thermal', label: 'Thermal', icon: <Thermometer className="h-4 w-4" /> },
          { id: 'electrical', label: 'Electrical', icon: <Zap className="h-4 w-4" /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedSystem(tab.id as any)}
            className={`industrial-button flex items-center space-x-2 flex-1 ${
              selectedSystem === tab.id 
                ? 'bg-white/20 text-white border-white/30' 
                : 'bg-white/5 text-gray-300'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
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
      <div className="industrial-card">
        <div className="p-4 border-b border-white/20">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-blue-400" />
            <h3 className="text-lg font-bold text-white">Monthly Performance Overview</h3>
          </div>
        </div>
        <div className="p-4">
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
                        ? 'bg-blue-400 shadow-lg shadow-blue-500/30' 
                        : 'bg-green-400 hover:bg-green-300'
                    }`}
                    style={{ height: `${height}%` }}
                    title={`${new Date(2025, i).toLocaleDateString('en', { month: 'short' })}: ${height.toFixed(0)}%`}
                  />
                );
              })}
            </div>
            
            {/* Month Labels */}
            <div className="grid grid-cols-12 gap-2 text-xs text-center text-gray-300">
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, i) => (
                <div key={month} className={i === new Date().getMonth() ? 'font-bold text-blue-400' : ''}>
                  {month}
                </div>
              ))}
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="mt-6 grid grid-cols-3 gap-4 pt-4 border-t border-white/20">
            <div className="text-center">
              <div className="data-value text-green-400">98.2%</div>
              <div className="metric-label">Uptime</div>
            </div>
            <div className="text-center">
              <div className="data-value text-blue-400">94.7%</div>
              <div className="metric-label">Efficiency</div>
            </div>
            <div className="text-center">
              <div className="data-value text-purple-400">7.2yrs</div>
              <div className="metric-label">TCO</div>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Operations */}
      <div className="industrial-card">
        <div className="p-4 border-b border-white/20">
          <div className="flex items-center space-x-2">
            <Timer className="h-5 w-5 text-green-400" />
            <h3 className="text-lg font-bold text-white">Real-time Operations</h3>
          </div>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            {tanks.slice(0, 6).map((tank) => (
              <div key={tank.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    tank.status === 'normal' ? 'bg-green-400' :
                    tank.status === 'warning' ? 'bg-yellow-400' : 'bg-red-400'
                  } animate-pulse`} />
                  <span className="font-medium text-white">{tank.name}</span>
                </div>
                
                <div className="flex items-center space-x-4 text-sm">
                  <span className="text-gray-300 font-mono">
                    {tank.temperature.toFixed(1)}°C
                  </span>
                  <span className="text-gray-300 font-mono">
                    {((tank.currentLevel / tank.capacity) * 100).toFixed(0)}%
                  </span>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                    tank.boilerStatus === 'active' 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                      : 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
                  }`}>
                    {tank.boilerStatus.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}