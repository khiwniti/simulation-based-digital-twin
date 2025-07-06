import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dashboard } from './Dashboard';
import { AlertPanel } from './AlertPanel';
import { ControlPanel } from './ControlPanel';
import { MLPredictionPanel } from './MLPredictionPanel';
import { IndustrialUI } from './IndustrialUI';
import { DigitalTwinComparison } from './DigitalTwinComparison';
import { useTankSystem } from '@/lib/stores/useTankSystem';
import { useAlerts } from '@/lib/stores/useAlerts';
import { 
  Gauge, 
  AlertTriangle, 
  Settings, 
  Brain, 
  Monitor,
  GitCompare,
  Minimize2,
  Maximize2,
  X,
  Move,
  Eye,
  EyeOff
} from 'lucide-react';

interface PanelConfig {
  id: string;
  title: string;
  icon: React.ReactNode;
  component: React.ReactNode;
  defaultPosition: { x: number; y: number };
  defaultSize: { width: number; height: number };
  color: string;
}

interface PanelState {
  isVisible: boolean;
  isMinimized: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
}

export function FloatingPanels() {
  const { unacknowledgedCount } = useAlerts();
  const { selectedTank } = useTankSystem();
  
  const [activePanel, setActivePanel] = useState<string | null>('scada');
  const [globalZIndex, setGlobalZIndex] = useState(1000);
  
  const panels: PanelConfig[] = [
    {
      id: 'scada',
      title: 'SCADA Interface',
      icon: <Monitor className="h-4 w-4" />,
      component: <IndustrialUI />,
      defaultPosition: { x: 20, y: 80 },
      defaultSize: { width: 380, height: 480 },
      color: 'bg-slate-900 border-slate-700'
    },
    {
      id: 'dashboard',
      title: 'System Dashboard',
      icon: <Gauge className="h-4 w-4" />,
      component: <Dashboard />,
      defaultPosition: { x: 420, y: 80 },
      defaultSize: { width: 420, height: 580 },
      color: 'bg-blue-900/90 border-blue-700'
    },
    {
      id: 'ml',
      title: 'AI/ML Predictions',
      icon: <Brain className="h-4 w-4" />,
      component: <MLPredictionPanel />,
      defaultPosition: { x: 20, y: 580 },
      defaultSize: { width: 380, height: 400 },
      color: 'bg-purple-900/90 border-purple-700'
    },
    {
      id: 'twin',
      title: 'Digital Twin',
      icon: <GitCompare className="h-4 w-4" />,
      component: <DigitalTwinComparison />,
      defaultPosition: { x: 860, y: 80 },
      defaultSize: { width: 420, height: 480 },
      color: 'bg-green-900/90 border-green-700'
    },
    {
      id: 'alerts',
      title: 'System Alerts',
      icon: <AlertTriangle className="h-4 w-4" />,
      component: <AlertPanel />,
      defaultPosition: { x: 860, y: 580 },
      defaultSize: { width: 350, height: 380 },
      color: 'bg-red-900/90 border-red-700'
    },
    {
      id: 'control',
      title: 'Tank Control',
      icon: <Settings className="h-4 w-4" />,
      component: <ControlPanel />,
      defaultPosition: { x: 420, y: 680 },
      defaultSize: { width: 420, height: 320 },
      color: 'bg-orange-900/90 border-orange-700'
    }
  ];

  const [panelStates, setPanelStates] = useState<Record<string, PanelState>>(
    panels.reduce((acc, panel) => ({
      ...acc,
      [panel.id]: {
        isVisible: panel.id === 'scada' || panel.id === 'dashboard', // Start with main panels visible
        isMinimized: false,
        position: panel.defaultPosition,
        size: panel.defaultSize,
        zIndex: 1000
      }
    }), {})
  );

  const handlePanelAction = (panelId: string, action: 'toggle' | 'minimize' | 'maximize' | 'close' | 'focus') => {
    setPanelStates(prev => {
      const newStates = { ...prev };
      
      if (action === 'toggle') {
        newStates[panelId] = {
          ...newStates[panelId],
          isVisible: !newStates[panelId].isVisible,
          zIndex: globalZIndex + 1
        };
        setGlobalZIndex(globalZIndex + 1);
      } else if (action === 'minimize') {
        newStates[panelId] = {
          ...newStates[panelId],
          isMinimized: !newStates[panelId].isMinimized
        };
      } else if (action === 'close') {
        newStates[panelId] = {
          ...newStates[panelId],
          isVisible: false
        };
      } else if (action === 'focus') {
        newStates[panelId] = {
          ...newStates[panelId],
          zIndex: globalZIndex + 1
        };
        setGlobalZIndex(globalZIndex + 1);
      }
      
      return newStates;
    });
  };

  const handlePanelDrag = (panelId: string, newPosition: { x: number; y: number }) => {
    setPanelStates(prev => ({
      ...prev,
      [panelId]: {
        ...prev[panelId],
        position: newPosition
      }
    }));
  };

  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      {/* Panel Toggle Bar */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 pointer-events-auto">
        <Card className="bg-black/80 backdrop-blur-sm border-gray-600">
          <CardContent className="p-3">
            <div className="flex items-center space-x-2">
              {panels.map((panel) => (
                <Button
                  key={panel.id}
                  variant={panelStates[panel.id].isVisible ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handlePanelAction(panel.id, 'toggle')}
                  className={`flex items-center space-x-2 ${
                    panelStates[panel.id].isVisible 
                      ? 'bg-blue-600 hover:bg-blue-700' 
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  {panel.icon}
                  <span className="hidden md:inline text-xs">{panel.title}</span>
                  {panel.id === 'alerts' && unacknowledgedCount > 0 && (
                    <Badge variant="destructive" className="ml-1 text-xs px-1 py-0">
                      {unacknowledgedCount}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Status Indicator */}
      <div className="absolute top-4 right-4 pointer-events-auto">
        <Card className="bg-black/80 backdrop-blur-sm border-gray-600">
          <CardContent className="p-3">
            <div className="flex items-center space-x-3 text-white">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm">System Online</span>
              </div>
              {selectedTank && (
                <div className="flex items-center space-x-2 border-l border-gray-600 pl-3">
                  <Settings className="h-4 w-4" />
                  <span className="text-sm">Tank-{selectedTank.toString().padStart(2, '0')}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Floating Panels */}
      {panels.map((panel) => (
        <FloatingPanel
          key={panel.id}
          panel={panel}
          state={panelStates[panel.id]}
          onAction={(action) => handlePanelAction(panel.id, action)}
          onDrag={(position) => handlePanelDrag(panel.id, position)}
        />
      ))}
    </div>
  );
}

interface FloatingPanelProps {
  panel: PanelConfig;
  state: PanelState;
  onAction: (action: 'minimize' | 'close' | 'focus') => void;
  onDrag: (position: { x: number; y: number }) => void;
}

function FloatingPanel({ panel, state, onAction, onDrag }: FloatingPanelProps) {
  const dragRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (dragRef.current) {
      const rect = dragRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setIsDragging(true);
      onAction('focus');
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newPosition = {
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      };
      
      // Boundary constraints
      const maxX = window.innerWidth - state.size.width;
      const maxY = window.innerHeight - state.size.height;
      
      newPosition.x = Math.max(0, Math.min(maxX, newPosition.x));
      newPosition.y = Math.max(0, Math.min(maxY, newPosition.y));
      
      onDrag(newPosition);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  if (!state.isVisible) return null;

  return (
    <div
      ref={dragRef}
      className="absolute pointer-events-auto"
      style={{
        left: state.position.x,
        top: state.position.y,
        width: state.size.width,
        height: state.isMinimized ? 'auto' : state.size.height,
        zIndex: state.zIndex
      }}
    >
      <Card className={`${panel.color} text-white shadow-2xl backdrop-blur-sm`}>
        <CardHeader 
          className="cursor-move p-3 border-b border-gray-600"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2 text-sm">
              {panel.icon}
              <span>{panel.title}</span>
              <Move className="h-3 w-3 text-gray-400" />
            </CardTitle>
            
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAction('minimize')}
                className="h-6 w-6 p-0 text-gray-300 hover:text-white hover:bg-white/20"
              >
                {state.isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAction('close')}
                className="h-6 w-6 p-0 text-gray-300 hover:text-white hover:bg-red-500/50"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {!state.isMinimized && (
          <CardContent className="p-4 overflow-auto" style={{ maxHeight: state.size.height - 60 }}>
            {panel.component}
          </CardContent>
        )}
      </Card>
    </div>
  );
}