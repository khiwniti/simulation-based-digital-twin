import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useTankSystem } from '@/lib/stores/useTankSystem';
import { socketManager } from '@/lib/socket';
import { 
  Settings, 
  Thermometer, 
  Power, 
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';

export function ControlPanel() {
  const { selectedTank, getTankById, isConnected } = useTankSystem();
  const [tempThreshold, setTempThreshold] = useState(150);
  const [autoMode, setAutoMode] = useState(true);
  
  const selectedTankData = selectedTank ? getTankById(selectedTank) : null;

  const handleTemperatureUpdate = (tankId: number, newTarget: number) => {
    socketManager.updateThresholds(tankId, {
      targetTemperature: newTarget,
      minTemperature: newTarget - 10,
      maxTemperature: newTarget + 10,
      warningRange: 5,
      criticalRange: 15
    });
  };

  const handleBoilerToggle = (tankId: number, enable: boolean) => {
    // In a real system, this would control the boiler
    console.log(`${enable ? 'Starting' : 'Stopping'} boiler for tank ${tankId}`);
  };

  const refreshData = () => {
    const socket = socketManager.connect();
    socket?.emit('requestTankData');
  };

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>System Control</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm">
                {isConnected ? 'Connected to SCADA' : 'Disconnected'}
              </span>
              <Badge variant={isConnected ? 'secondary' : 'destructive'}>
                {isConnected ? 'Online' : 'Offline'}
              </Badge>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              className="flex items-center space-x-1"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Global Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Global Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-2">
            <Switch
              id="auto-mode"
              checked={autoMode}
              onCheckedChange={setAutoMode}
            />
            <Label htmlFor="auto-mode">Automatic Temperature Control</Label>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="global-temp">Global Temperature Threshold</Label>
            <div className="flex items-center space-x-4">
              <Slider
                id="global-temp"
                min={100}
                max={200}
                step={5}
                value={[tempThreshold]}
                onValueChange={(value) => setTempThreshold(value[0])}
                className="flex-1"
              />
              <span className="text-sm font-medium w-16">{tempThreshold}°C</span>
            </div>
          </div>
          
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              // Apply global settings to all tanks
              console.log('Applying global settings to all tanks');
            }}
          >
            Apply to All Tanks
          </Button>
        </CardContent>
      </Card>

      {/* Selected Tank Controls */}
      {selectedTankData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Thermometer className="h-5 w-5" />
              <span>Tank Controls: {selectedTankData.name}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Current Temperature</Label>
                <div className="text-2xl font-bold">
                  {selectedTankData.temperature.toFixed(1)}°C
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Target Temperature</Label>
                <div className="text-2xl font-bold text-blue-600">
                  {selectedTankData.targetTemperature.toFixed(1)}°C
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="target-temp">Set Target Temperature</Label>
              <div className="flex items-center space-x-4">
                <Slider
                  id="target-temp"
                  min={120}
                  max={180}
                  step={1}
                  value={[selectedTankData.targetTemperature]}
                  onValueChange={(value) => {
                    handleTemperatureUpdate(selectedTankData.id, value[0]);
                  }}
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={selectedTankData.targetTemperature}
                  onChange={(e) => {
                    const newValue = parseFloat(e.target.value);
                    if (!isNaN(newValue)) {
                      handleTemperatureUpdate(selectedTankData.id, newValue);
                    }
                  }}
                  className="w-20"
                  min={120}
                  max={180}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <Power className="h-5 w-5" />
                <div>
                  <div className="font-medium">Boiler Control</div>
                  <div className="text-sm text-muted-foreground">
                    Status: <span className="capitalize">{selectedTankData.boilerStatus}</span>
                  </div>
                </div>
              </div>
              
              <Switch
                checked={selectedTankData.boilerStatus === 'active'}
                onCheckedChange={(checked) => {
                  handleBoilerToggle(selectedTankData.id, checked);
                }}
                disabled={selectedTankData.boilerStatus === 'maintenance'}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Volume Level</Label>
                <div className="text-lg font-semibold">
                  {((selectedTankData.currentLevel / selectedTankData.capacity) * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedTankData.currentLevel.toLocaleString()}L / {selectedTankData.capacity.toLocaleString()}L
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>System Status</Label>
                <Badge 
                  variant={
                    selectedTankData.status === 'critical' ? 'destructive' : 
                    selectedTankData.status === 'warning' ? 'secondary' : 'default'
                  }
                  className="text-sm"
                >
                  {selectedTankData.status.toUpperCase()}
                </Badge>
                <div className="text-sm text-muted-foreground">
                  Last update: {new Date(selectedTankData.lastUpdated).toLocaleTimeString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedTank && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <Settings className="h-12 w-12 mx-auto mb-4" />
              <p className="text-lg font-medium">No Tank Selected</p>
              <p className="text-sm">Select a tank from the 3D view to control its settings</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
