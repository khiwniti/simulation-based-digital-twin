import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useTankSystem } from '@/lib/stores/useTankSystem';
import { 
  Brain, 
  TrendingUp, 
  Zap, 
  AlertTriangle, 
  Clock, 
  Target,
  Activity,
  Settings
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function MLPredictionPanel() {
  const { selectedTank, getTankById } = useTankSystem();
  const selectedTankData = selectedTank ? getTankById(selectedTank) : null;

  if (!selectedTankData?.prediction) {
    return (
      <div className="industrial-card">
        <div className="py-8">
          <div className="text-center">
            <Brain className="h-12 w-12 mx-auto mb-4 text-purple-400" />
            <p className="text-lg font-bold text-white">AI Prediction Engine</p>
            <p className="metric-label">Select a tank to view ML predictions</p>
          </div>
        </div>
      </div>
    );
  }

  const prediction = selectedTankData.prediction;
  
  // Create temperature prediction chart data
  const chartData = prediction.predictedTemperature.map((temp, index) => ({
    time: `+${(index + 1) * 2}m`,
    predicted: temp,
    target: selectedTankData.targetTemperature
  }));

  const getActionColor = (action: string) => {
    switch (action) {
      case 'start': return 'bg-green-500';
      case 'stop': return 'bg-red-500';
      case 'maintain': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'start': return <Zap className="h-4 w-4" />;
      case 'stop': return <Activity className="h-4 w-4" />;
      case 'maintain': return <Settings className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getRiskColor = (risk: number) => {
    if (risk > 0.7) return 'text-red-500';
    if (risk > 0.4) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className="space-y-4">
      {/* ML Prediction Overview */}
      <div className="industrial-card mb-4">
        <div className="p-4 border-b border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-purple-400" />
              <span className="text-lg font-bold text-white">AI Prediction Engine</span>
            </div>
            <span className="metric-label bg-white/10 px-2 py-1 rounded">
              {selectedTankData.name}
            </span>
          </div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Next Action Prediction */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${getActionColor(prediction.nextBoilerAction)}`} />
                <span className="text-sm font-medium">Next Action</span>
              </div>
              <div className="flex items-center space-x-2">
                {getActionIcon(prediction.nextBoilerAction)}
                <span className="capitalize font-semibold">{prediction.nextBoilerAction.replace('_', ' ')}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Confidence: {(prediction.actionConfidence * 100).toFixed(1)}%
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div 
                  className="bg-purple-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${prediction.actionConfidence * 100}%` }}
                />
              </div>
            </div>

            {/* Energy Optimization */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">Energy Efficiency</span>
              </div>
              <div className="text-2xl font-bold">
                {prediction.energyOptimization.toFixed(1)}%
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div 
                  className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${prediction.energyOptimization}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Temperature Prediction Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Temperature Prediction</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="time" 
                  fontSize={12}
                  tick={{ fill: 'currentColor' }}
                />
                <YAxis 
                  fontSize={12}
                  tick={{ fill: 'currentColor' }}
                  domain={['dataMin - 5', 'dataMax + 5']}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="predicted" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  name="Predicted Temperature"
                />
                <Line 
                  type="monotone" 
                  dataKey="target" 
                  stroke="#10b981" 
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  dot={false}
                  name="Target Temperature"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-blue-500" />
              <span>Time to Target: </span>
              <span className="font-semibold">
                {prediction.timeToTarget > 0 ? `${prediction.timeToTarget} min` : 'Beyond horizon'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-green-500" />
              <span>Current: </span>
              <span className="font-semibold">{selectedTankData.temperature.toFixed(1)}°C</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Assessment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Risk Assessment</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Failure Risk</span>
              <span className={`font-bold ${getRiskColor(prediction.failureRisk)}`}>
                {(prediction.failureRisk * 100).toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={prediction.failureRisk * 100} 
              className="h-3"
            />
            
            {prediction.maintenanceWindow && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center space-x-2 text-yellow-800 dark:text-yellow-200">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">Maintenance Scheduled</span>
                </div>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  Recommended maintenance: {new Date(prediction.maintenanceWindow).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sensor Health */}
      <Card>
        <CardHeader>
          <CardTitle>Sensor Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(selectedTankData.sensors).map(([sensorType, sensor]) => (
              <div key={sensorType} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">
                    {sensorType.replace('Sensor', '')}
                  </span>
                  <Badge 
                    variant={sensor.status === 'online' ? 'secondary' : 'destructive'}
                    className="text-xs"
                  >
                    {sensor.status}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Accuracy: {sensor.accuracy.toFixed(1)}%
                </div>
                <Progress value={sensor.accuracy} className="h-1" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              size="sm"
              className="flex items-center space-x-2"
            >
              <Brain className="h-4 w-4" />
              <span>Retrain Model</span>
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              className="flex items-center space-x-2"
            >
              <Settings className="h-4 w-4" />
              <span>Calibrate Sensors</span>
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              className="flex items-center space-x-2"
              disabled={prediction.actionConfidence < 0.8}
            >
              <Zap className="h-4 w-4" />
              <span>Apply ML Action</span>
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              className="flex items-center space-x-2"
            >
              <TrendingUp className="h-4 w-4" />
              <span>Export Data</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}