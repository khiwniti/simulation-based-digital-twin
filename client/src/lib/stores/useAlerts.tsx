import { create } from 'zustand';
import { Alert } from '@shared/types';

interface AlertState {
  alerts: Alert[];
  unacknowledgedCount: number;
  soundEnabled: boolean;
  
  // Actions
  addAlert: (alert: Alert) => void;
  acknowledgeAlert: (alertId: string) => void;
  clearAlert: (alertId: string) => void;
  clearAllAlerts: () => void;
  toggleSound: () => void;
  getAlertsForTank: (tankId: number) => Alert[];
}

export const useAlerts = create<AlertState>((set, get) => ({
  alerts: [],
  unacknowledgedCount: 0,
  soundEnabled: true,

  addAlert: (alert) => set((state) => {
    const newAlerts = [alert, ...state.alerts];
    const unacknowledgedCount = newAlerts.filter(a => !a.acknowledged).length;
    
    // Play alert sound if enabled and critical
    if (state.soundEnabled && alert.severity === 'critical') {
      // Use existing audio system
      const audio = new Audio('/sounds/hit.mp3');
      audio.volume = 0.5;
      audio.play().catch(e => console.log('Alert sound failed:', e));
    }
    
    return {
      alerts: newAlerts,
      unacknowledgedCount
    };
  }),

  acknowledgeAlert: (alertId) => set((state) => {
    const alerts = state.alerts.map(alert =>
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    );
    const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length;
    
    return { alerts, unacknowledgedCount };
  }),

  clearAlert: (alertId) => set((state) => {
    const alerts = state.alerts.filter(alert => alert.id !== alertId);
    const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length;
    
    return { alerts, unacknowledgedCount };
  }),

  clearAllAlerts: () => set({ alerts: [], unacknowledgedCount: 0 }),

  toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),

  getAlertsForTank: (tankId) => get().alerts.filter(alert => alert.tankId === tankId)
}));
