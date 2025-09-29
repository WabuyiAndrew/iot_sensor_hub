export interface Device {
  _id: string;
  name: string;
  serialNumber: string;
  type: string;
  location?: string;
  isActive: boolean;
  batteryLevel?: number;
  signalStrength?: number;
  lastSeen?: string;
}

export interface SensorData {
  [key: string]: any;
  last_updated?: string;
}

export interface Zone {
  value: number;
  color: string;
  label?: string;
}

export interface TimeRange {
  value: string;
  label: string;
  icon: any;
  description: string;
}

export interface ChartDataPoint {
  timestamp: string;
  displayTimestamp: string;
  value: number;
  originalTimestamp: string;
}