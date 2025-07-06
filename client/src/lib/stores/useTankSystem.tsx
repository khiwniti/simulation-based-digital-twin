import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { TankData, SystemMetrics, TemperatureThresholds } from '@shared/types';

interface TankSystemState {
  tanks: TankData[];
  systemMetrics: SystemMetrics | null;
  selectedTank: number | null;
  isConnected: boolean;
  lastUpdate: Date | null;
  thresholds: TemperatureThresholds[];
  
  // Actions
  setTanks: (tanks: TankData[]) => void;
  setSystemMetrics: (metrics: SystemMetrics) => void;
  setSelectedTank: (tankId: number | null) => void;
  setConnectionStatus: (connected: boolean) => void;
  updateThreshold: (threshold: TemperatureThresholds) => void;
  getTankById: (id: number) => TankData | undefined;
}

export const useTankSystem = create<TankSystemState>()(
  subscribeWithSelector((set, get) => ({
    tanks: [],
    systemMetrics: null,
    selectedTank: null,
    isConnected: false,
    lastUpdate: null,
    thresholds: [],

    setTanks: (tanks) => set({ 
      tanks, 
      lastUpdate: new Date() 
    }),

    setSystemMetrics: (systemMetrics) => set({ systemMetrics }),

    setSelectedTank: (selectedTank) => set({ selectedTank }),

    setConnectionStatus: (isConnected) => set({ isConnected }),

    updateThreshold: (threshold) => set((state) => ({
      thresholds: state.thresholds.map(t => 
        t.tankId === threshold.tankId ? threshold : t
      )
    })),

    getTankById: (id) => get().tanks.find(tank => tank.id === id)
  }))
);
