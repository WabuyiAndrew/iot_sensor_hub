import React from 'react';
import { Wifi, WifiOff, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

const DeviceStatusIndicator = ({ 
  status = 'offline', 
  size = 'medium',
  showLabel = true,
  lastSeen = null,
  className = ''
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8'
  };

  const getStatusConfig = (status) => {
    switch (status?.toLowerCase()) {
      case 'online':
      case 'active':
        return {
          icon: CheckCircle,
          color: 'text-green-500',
          bgColor: 'bg-green-100 dark:bg-green-900/20',
          label: 'Online',
          pulse: true
        };
      case 'offline':
      case 'inactive':
        return {
          icon: WifiOff,
          color: 'text-red-500',
          bgColor: 'bg-red-100 dark:bg-red-900/20',
          label: 'Offline',
          pulse: false
        };
      case 'warning':
      case 'maintenance':
        return {
          icon: AlertTriangle,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
          label: 'Warning',
          pulse: true
        };
      case 'connecting':
      case 'pending':
        return {
          icon: Clock,
          color: 'text-blue-500',
          bgColor: 'bg-blue-100 dark:bg-blue-900/20',
          label: 'Connecting',
          pulse: true
        };
      default:
        return {
          icon: WifiOff,
          color: 'text-gray-500',
          bgColor: 'bg-gray-100 dark:bg-gray-900/20',
          label: 'Unknown',
          pulse: false
        };
    }
  };

  const config = getStatusConfig(status);
  const IconComponent = config.icon;
  const sizeClass = sizeClasses[size];

  const getLastSeenText = () => {
    if (!lastSeen) return null;
    
    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffMs = now - lastSeenDate;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return lastSeenDate.toLocaleDateString();
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`relative flex items-center justify-center p-2 rounded-full ${config.bgColor}`}>
        <IconComponent className={`${sizeClass} ${config.color}`} />
        {config.pulse && (
          <div className={`absolute inset-0 rounded-full ${config.bgColor} animate-ping opacity-75`} />
        )}
      </div>
      
      {showLabel && (
        <div className="flex flex-col">
          <span className={`text-sm font-medium ${config.color}`}>
            {config.label}
          </span>
          {lastSeen && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {getLastSeenText()}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default DeviceStatusIndicator;