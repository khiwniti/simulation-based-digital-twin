import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAlerts } from '@/lib/stores/useAlerts';
import { useTankSystem } from '@/lib/stores/useTankSystem';
import { socketManager } from '@/lib/socket';
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle, 
  Volume2, 
  VolumeX,
  X
} from 'lucide-react';

export function AlertPanel() {
  const { 
    alerts, 
    unacknowledgedCount, 
    soundEnabled, 
    acknowledgeAlert, 
    clearAlert, 
    clearAllAlerts, 
    toggleSound 
  } = useAlerts();
  const { getTankById } = useTankSystem();

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'high': return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'medium': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'low': return <Info className="h-4 w-4 text-blue-500" />;
      default: return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const handleAcknowledge = (alertId: string) => {
    acknowledgeAlert(alertId);
    socketManager.acknowledgeAlert(alertId);
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString();
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>System Alerts</span>
            {unacknowledgedCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unacknowledgedCount}
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSound}
              className="flex items-center space-x-1"
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              <span>{soundEnabled ? 'On' : 'Off'}</span>
            </Button>
            
            {alerts.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllAlerts}
                className="text-red-500 hover:text-red-700"
              >
                Clear All
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <p className="text-lg font-medium">All Systems Normal</p>
            <p className="text-sm">No active alerts</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {alerts.map((alert) => {
                const tank = getTankById(alert.tankId);
                return (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border transition-colors ${
                      alert.acknowledged 
                        ? 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50' 
                        : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                    }`}
                  >
                    <div className="flex items-start justify-between space-x-3">
                      <div className="flex items-start space-x-3 flex-1">
                        {getAlertIcon(alert.severity)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <Badge variant={getSeverityColor(alert.severity) as any}>
                              {alert.severity.toUpperCase()}
                            </Badge>
                            <span className="text-sm font-medium">
                              {tank?.name || `Tank ${alert.tankId}`}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatTime(alert.timestamp)}
                            </span>
                          </div>
                          
                          <p className="text-sm text-gray-900 dark:text-gray-100 mb-2">
                            {alert.message}
                          </p>
                          
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <span>Type: {alert.type}</span>
                            <span>•</span>
                            <span>{formatDate(alert.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        {!alert.acknowledged && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAcknowledge(alert.id)}
                            className="text-xs"
                          >
                            Acknowledge
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => clearAlert(alert.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {alert.acknowledged && (
                      <div className="mt-2 text-xs text-green-600 dark:text-green-400 flex items-center">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Acknowledged
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
