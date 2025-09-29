import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const SensorReadingCard = ({
  title,
  value,
  unit = '',
  icon: Icon,
  color = 'blue',
  trend = 'neutral',
  previousValue = null,
  className = ''
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Animate value changes
  useEffect(() => {
    if (typeof value === 'number' && !isNaN(value)) {
      setIsAnimating(true);
      
      const startValue = displayValue;
      const endValue = value;
      const duration = 1000; // 1 second animation
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);
        const currentValue = startValue + (endValue - startValue) * easeOutCubic;
        
        setDisplayValue(currentValue);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
        }
      };
      
      requestAnimationFrame(animate);
    }
  }, [value]);

  const colorClasses = {
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      icon: 'text-blue-500',
      accent: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800'
    },
    green: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      icon: 'text-green-500',
      accent: 'text-green-600 dark:text-green-400',
      border: 'border-green-200 dark:border-green-800'
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      icon: 'text-purple-500',
      accent: 'text-purple-600 dark:text-purple-400',
      border: 'border-purple-200 dark:border-purple-800'
    },
    orange: {
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      icon: 'text-orange-500',
      accent: 'text-orange-600 dark:text-orange-400',
      border: 'border-orange-200 dark:border-orange-800'
    },
    red: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      icon: 'text-red-500',
      accent: 'text-red-600 dark:text-red-400',
      border: 'border-red-200 dark:border-red-800'
    }
  };

  const colors = colorClasses[color] || colorClasses.blue;

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTrendText = () => {
    if (previousValue !== null && typeof previousValue === 'number' && typeof value === 'number') {
      const diff = value - previousValue;
      const percentage = previousValue !== 0 ? ((diff / previousValue) * 100).toFixed(1) : '0.0';
      
      if (Math.abs(diff) < 0.1) return 'No change';
      
      return `${diff > 0 ? '+' : ''}${percentage}%`;
    }
    return '';
  };

  const formatValue = (val) => {
    if (typeof val !== 'number' || isNaN(val)) return '0.0';
    return val.toFixed(1);
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border ${colors.border} p-6 transition-all duration-300 hover:shadow-md ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colors.bg}`}>
          <Icon className={`w-6 h-6 ${colors.icon}`} />
        </div>
        
        <div className="flex items-center space-x-1 text-sm">
          {getTrendIcon()}
          <span className="text-gray-500 dark:text-gray-400">
            {getTrendText()}
          </span>
        </div>
      </div>
      
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {title}
        </h3>
        
        <div className="flex items-baseline space-x-2">
          <span 
            className={`text-2xl font-bold ${colors.accent} transition-all duration-300 ${isAnimating ? 'scale-105' : ''}`}
          >
            {formatValue(displayValue)}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {unit}
          </span>
        </div>
        
        {/* Value change indicator */}
        {previousValue !== null && typeof previousValue === 'number' && (
          <div className="text-xs text-gray-400 dark:text-gray-500">
            Previous: {formatValue(previousValue)}{unit}
          </div>
        )}
      </div>
      
      {/* Pulse animation for active updates */}
      {isAnimating && (
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
      )}
    </div>
  );
};

export default SensorReadingCard;