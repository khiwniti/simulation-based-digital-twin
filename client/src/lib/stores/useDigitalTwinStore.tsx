import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

/**
 * Digital Twin State Management Store
 * Central store for managing virtual-physical state synchronization
 * Implements state reconciliation, conflict resolution, and persistence
 */

export interface TwinState {
  id: string;
  timestamp: number;
  source: 'physical' | 'virtual' | 'predicted';
  confidence: number;
  value: any;
  metadata?: {
    quality: 'good' | 'bad' | 'uncertain';
    lastUpdate: number;
    updateFrequency: number;
  };
}

export interface TwinComponent {
  id: string;
  type: 'tank' | 'boiler' | 'pump' | 'valve' | 'pipe' | 'loading_station';
  name: string;
  physicalState: Record<string, TwinState>;
  virtualState: Record<string, TwinState>;
  predictedState: Record<string, TwinState>;
  reconciliationStatus: 'synchronized' | 'diverged' | 'reconciling';
  lastSyncTime: number;
  syncLatency: number;
  alarms: TwinAlarm[];
}

export interface TwinAlarm {
  id: string;
  componentId: string;
  type: 'deviation' | 'quality' | 'communication' | 'prediction';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  timestamp: number;
  acknowledged: boolean;
  active: boolean;
}

export interface ReconciliationPolicy {
  strategy: 'physical_priority' | 'virtual_priority' | 'latest' | 'quality_based' | 'ml_based';
  deviationThreshold: number;
  reconciliationInterval: number;
  conflictResolution: 'automatic' | 'manual' | 'alert';
}

export interface SynchronizationMetrics {
  totalComponents: number;
  synchronizedComponents: number;
  divergedComponents: number;
  averageLatency: number;
  lastFullSync: number;
  syncErrors: number;
  dataQuality: number; // 0-100%
}

interface DigitalTwinStore {
  // State
  components: Map<string, TwinComponent>;
  reconciliationPolicy: ReconciliationPolicy;
  syncMetrics: SynchronizationMetrics;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  lastHeartbeat: number;
  
  // State History
  stateHistory: Map<string, TwinState[]>;
  historyRetentionHours: number;
  
  // Actions - State Management
  updatePhysicalState: (componentId: string, property: string, state: TwinState) => void;
  updateVirtualState: (componentId: string, property: string, state: TwinState) => void;
  updatePredictedState: (componentId: string, property: string, state: TwinState) => void;
  
  // Actions - Reconciliation
  reconcileComponent: (componentId: string) => Promise<void>;
  reconcileAll: () => Promise<void>;
  setReconciliationPolicy: (policy: ReconciliationPolicy) => void;
  resolveConflict: (componentId: string, property: string, resolution: 'physical' | 'virtual') => void;
  
  // Actions - Synchronization
  syncWithPhysical: () => Promise<void>;
  syncWithVirtual: () => Promise<void>;
  performFullSync: () => Promise<void>;
  updateSyncMetrics: () => void;
  
  // Actions - Component Management
  registerComponent: (component: TwinComponent) => void;
  unregisterComponent: (componentId: string) => void;
  getComponent: (componentId: string) => TwinComponent | undefined;
  
  // Actions - Alarms
  addAlarm: (alarm: TwinAlarm) => void;
  acknowledgeAlarm: (alarmId: string) => void;
  clearAlarm: (alarmId: string) => void;
  getActiveAlarms: () => TwinAlarm[];
  
  // Actions - History
  addToHistory: (componentId: string, property: string, state: TwinState) => void;
  getHistory: (componentId: string, property: string, hours?: number) => TwinState[];
  pruneHistory: () => void;
  
  // Actions - Persistence
  saveState: () => void;
  loadState: () => void;
  exportState: () => string;
  importState: (stateJson: string) => void;
}

const DEFAULT_RECONCILIATION_POLICY: ReconciliationPolicy = {
  strategy: 'quality_based',
  deviationThreshold: 0.05, // 5% deviation tolerance
  reconciliationInterval: 5000, // 5 seconds
  conflictResolution: 'automatic'
};

export const useDigitalTwinStore = create<DigitalTwinStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // Initial State
      components: new Map(),
      reconciliationPolicy: DEFAULT_RECONCILIATION_POLICY,
      syncMetrics: {
        totalComponents: 0,
        synchronizedComponents: 0,
        divergedComponents: 0,
        averageLatency: 0,
        lastFullSync: Date.now(),
        syncErrors: 0,
        dataQuality: 100
      },
      connectionStatus: 'disconnected',
      lastHeartbeat: Date.now(),
      stateHistory: new Map(),
      historyRetentionHours: 24,

      // State Management Actions
      updatePhysicalState: (componentId, property, state) => set((draft) => {
        const component = draft.components.get(componentId);
        if (component) {
          component.physicalState[property] = state;
          component.lastSyncTime = Date.now();
          
          // Add to history
          get().addToHistory(componentId, property, state);
          
          // Check for divergence
          const virtualState = component.virtualState[property];
          if (virtualState && Math.abs(state.value - virtualState.value) > draft.reconciliationPolicy.deviationThreshold) {
            component.reconciliationStatus = 'diverged';
            
            // Create deviation alarm
            const alarm: TwinAlarm = {
              id: `${componentId}-${property}-${Date.now()}`,
              componentId,
              type: 'deviation',
              severity: 'medium',
              message: `Physical-Virtual deviation detected for ${property}: Physical=${state.value}, Virtual=${virtualState.value}`,
              timestamp: Date.now(),
              acknowledged: false,
              active: true
            };
            get().addAlarm(alarm);
          }
        }
      }),

      updateVirtualState: (componentId, property, state) => set((draft) => {
        const component = draft.components.get(componentId);
        if (component) {
          component.virtualState[property] = state;
          get().addToHistory(componentId, property, state);
        }
      }),

      updatePredictedState: (componentId, property, state) => set((draft) => {
        const component = draft.components.get(componentId);
        if (component) {
          component.predictedState[property] = state;
          get().addToHistory(componentId, property, state);
        }
      }),

      // Reconciliation Actions
      reconcileComponent: async (componentId) => {
        const component = get().components.get(componentId);
        if (!component) return;

        const policy = get().reconciliationPolicy;
        
        set((draft) => {
          const comp = draft.components.get(componentId);
          if (comp) {
            comp.reconciliationStatus = 'reconciling';
          }
        });

        // Perform reconciliation based on strategy
        for (const [property, physicalState] of Object.entries(component.physicalState)) {
          const virtualState = component.virtualState[property];
          if (!virtualState) continue;

          let reconciledValue: any;
          let source: 'physical' | 'virtual';

          switch (policy.strategy) {
            case 'physical_priority':
              reconciledValue = physicalState.value;
              source = 'physical';
              break;
            case 'virtual_priority':
              reconciledValue = virtualState.value;
              source = 'virtual';
              break;
            case 'latest':
              reconciledValue = physicalState.timestamp > virtualState.timestamp ? 
                physicalState.value : virtualState.value;
              source = physicalState.timestamp > virtualState.timestamp ? 'physical' : 'virtual';
              break;
            case 'quality_based':
              if (physicalState.metadata?.quality === 'good' && virtualState.metadata?.quality !== 'good') {
                reconciledValue = physicalState.value;
                source = 'physical';
              } else if (virtualState.metadata?.quality === 'good' && physicalState.metadata?.quality !== 'good') {
                reconciledValue = virtualState.value;
                source = 'virtual';
              } else {
                reconciledValue = physicalState.confidence > virtualState.confidence ? 
                  physicalState.value : virtualState.value;
                source = physicalState.confidence > virtualState.confidence ? 'physical' : 'virtual';
              }
              break;
            case 'ml_based':
              // Use predicted state if available and recent
              const predictedState = component.predictedState[property];
              if (predictedState && (Date.now() - predictedState.timestamp) < 60000) {
                reconciledValue = predictedState.value;
                source = 'virtual';
              } else {
                reconciledValue = physicalState.value;
                source = 'physical';
              }
              break;
            default:
              reconciledValue = physicalState.value;
              source = 'physical';
          }

          // Update states with reconciled value
          const reconciledState: TwinState = {
            id: `${componentId}-${property}-reconciled`,
            timestamp: Date.now(),
            source,
            confidence: Math.max(physicalState.confidence, virtualState.confidence),
            value: reconciledValue,
            metadata: {
              quality: 'good',
              lastUpdate: Date.now(),
              updateFrequency: 1000
            }
          };

          set((draft) => {
            const comp = draft.components.get(componentId);
            if (comp) {
              comp.physicalState[property] = reconciledState;
              comp.virtualState[property] = reconciledState;
              comp.reconciliationStatus = 'synchronized';
            }
          });
        }
      },

      reconcileAll: async () => {
        const components = Array.from(get().components.keys());
        for (const componentId of components) {
          await get().reconcileComponent(componentId);
        }
        get().updateSyncMetrics();
      },

      setReconciliationPolicy: (policy) => set((draft) => {
        draft.reconciliationPolicy = policy;
      }),

      resolveConflict: (componentId, property, resolution) => set((draft) => {
        const component = draft.components.get(componentId);
        if (component) {
          const sourceState = resolution === 'physical' ? 
            component.physicalState[property] : component.virtualState[property];
          
          if (sourceState) {
            component.physicalState[property] = sourceState;
            component.virtualState[property] = sourceState;
            component.reconciliationStatus = 'synchronized';
          }
        }
      }),

      // Synchronization Actions
      syncWithPhysical: async () => {
        // This will be connected to SCADA systems
        set((draft) => {
          draft.connectionStatus = 'connected';
          draft.lastHeartbeat = Date.now();
        });
      },

      syncWithVirtual: async () => {
        // Sync with simulation engine
        const startTime = Date.now();
        
        // Update sync latency for each component
        set((draft) => {
          draft.components.forEach((component) => {
            component.syncLatency = Date.now() - startTime;
          });
        });
      },

      performFullSync: async () => {
        set((draft) => {
          draft.connectionStatus = 'reconnecting';
        });

        try {
          await get().syncWithPhysical();
          await get().syncWithVirtual();
          await get().reconcileAll();
          
          set((draft) => {
            draft.connectionStatus = 'connected';
            draft.syncMetrics.lastFullSync = Date.now();
          });
        } catch (error) {
          set((draft) => {
            draft.connectionStatus = 'disconnected';
            draft.syncMetrics.syncErrors++;
          });
          throw error;
        }
      },

      updateSyncMetrics: () => set((draft) => {
        const components = Array.from(draft.components.values());
        const synchronized = components.filter(c => c.reconciliationStatus === 'synchronized').length;
        const diverged = components.filter(c => c.reconciliationStatus === 'diverged').length;
        const avgLatency = components.reduce((sum, c) => sum + c.syncLatency, 0) / components.length || 0;

        draft.syncMetrics = {
          totalComponents: components.length,
          synchronizedComponents: synchronized,
          divergedComponents: diverged,
          averageLatency: avgLatency,
          lastFullSync: draft.syncMetrics.lastFullSync,
          syncErrors: draft.syncMetrics.syncErrors,
          dataQuality: (synchronized / components.length) * 100 || 100
        };
      }),

      // Component Management
      registerComponent: (component) => set((draft) => {
        draft.components.set(component.id, component);
        get().updateSyncMetrics();
      }),

      unregisterComponent: (componentId) => set((draft) => {
        draft.components.delete(componentId);
        get().updateSyncMetrics();
      }),

      getComponent: (componentId) => {
        return get().components.get(componentId);
      },

      // Alarm Management
      addAlarm: (alarm) => set((draft) => {
        const component = draft.components.get(alarm.componentId);
        if (component) {
          component.alarms.push(alarm);
        }
      }),

      acknowledgeAlarm: (alarmId) => set((draft) => {
        draft.components.forEach((component) => {
          const alarm = component.alarms.find(a => a.id === alarmId);
          if (alarm) {
            alarm.acknowledged = true;
          }
        });
      }),

      clearAlarm: (alarmId) => set((draft) => {
        draft.components.forEach((component) => {
          const alarm = component.alarms.find(a => a.id === alarmId);
          if (alarm) {
            alarm.active = false;
          }
        });
      }),

      getActiveAlarms: () => {
        const alarms: TwinAlarm[] = [];
        get().components.forEach((component) => {
          alarms.push(...component.alarms.filter(a => a.active));
        });
        return alarms.sort((a, b) => b.timestamp - a.timestamp);
      },

      // History Management
      addToHistory: (componentId, property, state) => set((draft) => {
        const key = `${componentId}-${property}`;
        if (!draft.stateHistory.has(key)) {
          draft.stateHistory.set(key, []);
        }
        const history = draft.stateHistory.get(key)!;
        history.push(state);
        
        // Keep only recent history
        const cutoff = Date.now() - (draft.historyRetentionHours * 60 * 60 * 1000);
        draft.stateHistory.set(key, history.filter(s => s.timestamp > cutoff));
      }),

      getHistory: (componentId, property, hours = 24) => {
        const key = `${componentId}-${property}`;
        const history = get().stateHistory.get(key) || [];
        const cutoff = Date.now() - (hours * 60 * 60 * 1000);
        return history.filter(s => s.timestamp > cutoff);
      },

      pruneHistory: () => set((draft) => {
        const cutoff = Date.now() - (draft.historyRetentionHours * 60 * 60 * 1000);
        draft.stateHistory.forEach((history, key) => {
          draft.stateHistory.set(key, history.filter(s => s.timestamp > cutoff));
        });
      }),

      // Persistence
      saveState: () => {
        const state = get();
        const serializable = {
          components: Array.from(state.components.entries()),
          reconciliationPolicy: state.reconciliationPolicy,
          syncMetrics: state.syncMetrics,
          stateHistory: Array.from(state.stateHistory.entries())
        };
        localStorage.setItem('digitalTwinState', JSON.stringify(serializable));
      },

      loadState: () => {
        const saved = localStorage.getItem('digitalTwinState');
        if (saved) {
          const parsed = JSON.parse(saved);
          set((draft) => {
            draft.components = new Map(parsed.components);
            draft.reconciliationPolicy = parsed.reconciliationPolicy;
            draft.syncMetrics = parsed.syncMetrics;
            draft.stateHistory = new Map(parsed.stateHistory);
          });
        }
      },

      exportState: () => {
        const state = get();
        return JSON.stringify({
          components: Array.from(state.components.entries()),
          reconciliationPolicy: state.reconciliationPolicy,
          syncMetrics: state.syncMetrics,
          timestamp: Date.now()
        }, null, 2);
      },

      importState: (stateJson) => {
        const parsed = JSON.parse(stateJson);
        set((draft) => {
          draft.components = new Map(parsed.components);
          draft.reconciliationPolicy = parsed.reconciliationPolicy;
          draft.syncMetrics = parsed.syncMetrics;
        });
      }
    }))
  )
);

// Auto-save state every 30 seconds
if (typeof window !== 'undefined') {
  setInterval(() => {
    useDigitalTwinStore.getState().saveState();
  }, 30000);
  
  // Load saved state on initialization
  useDigitalTwinStore.getState().loadState();
}

// Auto-reconciliation based on policy
if (typeof window !== 'undefined') {
  setInterval(() => {
    const store = useDigitalTwinStore.getState();
    if (store.reconciliationPolicy.conflictResolution === 'automatic') {
      store.reconcileAll();
    }
  }, useDigitalTwinStore.getState().reconciliationPolicy.reconciliationInterval);
}

// History pruning every hour
if (typeof window !== 'undefined') {
  setInterval(() => {
    useDigitalTwinStore.getState().pruneHistory();
  }, 60 * 60 * 1000);
}