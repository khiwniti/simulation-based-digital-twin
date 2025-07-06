import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTankSystem } from '@/lib/stores/useTankSystem';
import { 
  GitCompare, 
  Cpu, 
  Radio,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Zap,
  Target
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

export function DigitalTwinComparison() {
  const { tanks, selectedTank, getTankById } = useTankSystem();
  const [comparisonMode, setComparisonMode] = useState<'variance' | 'performance' | 'prediction'>('variance');
  
  const selectedTankData = selectedTank ? getTankById(selectedTank) : null;

  // Generate simulated comparison data
  const comparisonData = useMemo(() => {
    if (!selectedTankData) return [];
    
    const now = Date.now();
    const dataPoints = 20;
    
    return Array.from({ length: dataPoints }, (_, i) => {
      const timeOffset = i * 30000; // 30 seconds apart
      const timestamp = new Date(now - (dataPoints - i - 1) * 30000);
      
      // Simulate real sensor data with some noise
      const realTemp = selectedTankData.temperature + (Math.random() - 0.5) * 3;
      
      // Simulate digital twin prediction (more stable)
      const twinTemp = selectedTankData.temperature + (Math.random() - 0.5) * 1.5;
      
      // Calculate variance
      const variance = Math.abs(realTemp - twinTemp);
      
      return {
        time: timestamp.toLocaleTimeString().slice(0, 5),
        realSensor: realTemp,
        digitalTwin: twinTemp,
        variance: variance,
        target: selectedTankData.targetTemperature,
        timestamp: timestamp.getTime()
      };
    });
  }, [selectedTankData]);

  const syncStatus = useMemo(() => {
    if (comparisonData.length === 0) return { status: 'synced', avgVariance: 0 };
    
    const avgVariance = comparisonData.reduce((sum, point) => sum + point.variance, 0) / comparisonData.length;
    
    let status: 'synced' | 'drift' | 'desync';
    if (avgVariance < 1) status = 'synced';
    else if (avgVariance < 3) status = 'drift';
    else status = 'desync';
    
    return { status, avgVariance };
  }, [comparisonData]);

  const performanceMetrics = useMemo(() => {
    if (!selectedTankData) return null;
    
    return {
      realSensorAccuracy: selectedTankData.sensors?.temperatureSensor?.accuracy || 99.2,
      twinAccuracy: 96.8 + Math.random() * 2, // Simulated twin accuracy
      predictionConfidence: selectedTankData.prediction?.actionConfidence * 100 || 85,
      energyOptimization: selectedTankData.prediction?.energyOptimization || 78,
      responseTime: 0.15 + Math.random() * 0.1, // ms
      dataLatency: 2.3 + Math.random() * 0.5 // seconds
    };
  }, [selectedTankData]);

  if (!selectedTankData) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <GitCompare className="h-12 w-12 mx-auto mb-4" />
            <p className="text-lg font-medium">Digital Twin Comparison</p>
            <p className="text-sm">Select a tank to compare real-time data with digital twin</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'synced': return 'text-green-500';
      case 'drift': return 'text-yellow-500';
      case 'desync': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'synced': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'drift': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'desync': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <RefreshCw className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Sync Status Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <GitCompare className="h-5 w-5" />
              <span>Digital Twin Sync Status</span>
              <Badge variant="secondary">{selectedTankData.name}</Badge>
            </CardTitle>
            
            <div className="flex items-center space-x-3">
              {getStatusIcon(syncStatus.status)}
              <span className={`font-semibold capitalize ${getStatusColor(syncStatus.status)}`}>
                {syncStatus.status}
              </span>
              <Badge variant="outline">
                Δ {syncStatus.avgVariance.toFixed(2)}°C
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">
                {selectedTankData.sensors.temperatureSensor.value.toFixed(1)}°C
              </div>
              <div className="text-sm text-muted-foreground">Real Sensor</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-500">
                {selectedTankData.temperature.toFixed(1)}°C
              </div>
              <div className="text-sm text-muted-foreground">Digital Twin</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">
                {selectedTankData.targetTemperature.toFixed(1)}°C
              </div>
              <div className="text-sm text-muted-foreground">Target</div>
            </div>
            
            <div className="text-center">
              <div className={`text-2xl font-bold ${getStatusColor(syncStatus.status)}`}>
                {(100 - syncStatus.avgVariance * 10).toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Sync Quality</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Tabs */}
      <Tabs value={comparisonMode} onValueChange={(value) => setComparisonMode(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="variance" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Variance Analysis</span>
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center space-x-2">
            <Cpu className="h-4 w-4" />
            <span>Performance</span>
          </TabsTrigger>
          <TabsTrigger value="prediction" className="flex items-center space-x-2">
            <Target className="h-4 w-4" />
            <span>Prediction Quality</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="variance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Real-time Data Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="time" 
                      fontSize={12}
                      tick={{ fill: 'currentColor' }}
                    />
                    <YAxis 
                      fontSize={12}
                      tick={{ fill: 'currentColor' }}
                      domain={['dataMin - 2', 'dataMax + 2']}
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
                      dataKey="realSensor" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                      name="Real Sensor Data"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="digitalTwin" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 3 }}
                      name="Digital Twin"
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Variance Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="time" 
                      fontSize={12}
                      tick={{ fill: 'currentColor' }}
                    />
                    <YAxis 
                      fontSize={12}
                      tick={{ fill: 'currentColor' }}
                    />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="variance" 
                      stroke="#ef4444" 
                      fill="#ef4444" 
                      fillOpacity={0.3}
                      name="Temperature Variance (°C)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          {performanceMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Radio className="h-5 w-5" />
                    <span>Sensor Performance</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Real Sensor Accuracy</span>
                      <span className="font-semibold">{performanceMetrics.realSensorAccuracy.toFixed(1)}%</span>
                    </div>
                    <Progress value={performanceMetrics.realSensorAccuracy} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Digital Twin Accuracy</span>
                      <span className="font-semibold">{performanceMetrics.twinAccuracy.toFixed(1)}%</span>
                    </div>
                    <Progress value={performanceMetrics.twinAccuracy} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Response Time</span>
                      <span className="font-semibold">{performanceMetrics.responseTime.toFixed(2)}ms</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Data Latency</span>
                      <span className="font-semibold">{performanceMetrics.dataLatency.toFixed(1)}s</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Zap className="h-5 w-5" />
                    <span>AI Performance</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Prediction Confidence</span>
                      <span className="font-semibold">{performanceMetrics.predictionConfidence.toFixed(1)}%</span>
                    </div>
                    <Progress value={performanceMetrics.predictionConfidence} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Energy Optimization</span>
                      <span className="font-semibold">{performanceMetrics.energyOptimization.toFixed(1)}%</span>
                    </div>
                    <Progress value={performanceMetrics.energyOptimization} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Model Status</span>
                      <Badge variant="secondary">Active</Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Last Training</span>
                      <span className="text-sm text-muted-foreground">6h ago</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="prediction" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Prediction Accuracy Assessment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center space-y-2">
                  <div className="text-3xl font-bold text-green-500">94.2%</div>
                  <div className="text-sm text-muted-foreground">Temperature Prediction</div>
                  <Progress value={94.2} className="h-2" />
                </div>
                
                <div className="text-center space-y-2">
                  <div className="text-3xl font-bold text-blue-500">89.7%</div>
                  <div className="text-sm text-muted-foreground">Boiler Control</div>
                  <Progress value={89.7} className="h-2" />
                </div>
                
                <div className="text-center space-y-2">
                  <div className="text-3xl font-bold text-purple-500">92.1%</div>
                  <div className="text-sm text-muted-foreground">Maintenance Prediction</div>
                  <Progress value={92.1} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Model Confidence Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={comparisonData.map((point, i) => ({
                    ...point,
                    confidence: 85 + Math.sin(i * 0.5) * 10 + Math.random() * 5
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="time" fontSize={12} />
                    <YAxis domain={[70, 100]} fontSize={12} />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="confidence" 
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      dot={{ fill: '#f59e0b', r: 3 }}
                      name="Prediction Confidence (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex space-x-3">
            <Button variant="outline" size="sm" className="flex items-center space-x-2">
              <RefreshCw className="h-4 w-4" />
              <span>Sync Digital Twin</span>
            </Button>
            
            <Button variant="outline" size="sm" className="flex items-center space-x-2">
              <Cpu className="h-4 w-4" />
              <span>Calibrate Model</span>
            </Button>
            
            <Button variant="outline" size="sm" className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Export Comparison</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}