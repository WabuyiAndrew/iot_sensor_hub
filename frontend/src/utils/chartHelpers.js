// export const generateTimeSeriesData = (baseValue, points = 24, variance = 0.2) => {
//   const data = []
//   const now = new Date()
  
//   for (let i = points - 1; i >= 0; i--) {
//     const time = new Date(now.getTime() - i * 60 * 60 * 1000) // Hourly data points
//     const variation = (Math.random() - 0.5) * variance * baseValue
//     const value = Math.max(0, baseValue + variation)
    
//     data.push({
//       time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
//       value: Math.round(value * 100) / 100
//     })
//   }
  
//   return data
// }

// export const generateSystemMetricsChartData = (systemStats, systemHealth) => {
//   const hours = Array.from({ length: 24 }, (_, i) => {
//     const time = new Date()
//     time.setHours(time.getHours() - (23 - i))
//     return time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
//   })

//   // Memory usage trend
//   const memoryData = generateTimeSeriesData(
//     systemHealth?.memory?.heapUsed ? systemHealth.memory.heapUsed / (1024 * 1024) : 150,
//     24,
//     0.3
//   )

//   // CPU usage trend (simulated based on system load)
//   const cpuData = generateTimeSeriesData(45, 24, 0.4)

//   // Response time trend
//   const responseTimeData = generateTimeSeriesData(120, 24, 0.5)

//   // Error rate trend
//   const errorRateData = generateTimeSeriesData(
//     systemStats?.errorRate ? systemStats.errorRate * 100 : 2,
//     24,
//     0.8
//   )

//   return {
//     labels: hours,
//     datasets: [
//       {
//         label: 'Memory Usage (MB)',
//         data: memoryData.map(d => d.value),
//         borderColor: '#3b82f6',
//         backgroundColor: 'rgba(59, 130, 246, 0.1)',
//         tension: 0.4,
//         fill: true,
//       },
//       {
//         label: 'CPU Usage (%)',
//         data: cpuData.map(d => d.value),
//         borderColor: '#10b981',
//         backgroundColor: 'rgba(16, 185, 129, 0.1)',
//         tension: 0.4,
//         fill: true,
//       },
//       {
//         label: 'Response Time (ms)',
//         data: responseTimeData.map(d => d.value),
//         borderColor: '#f59e0b',
//         backgroundColor: 'rgba(245, 158, 11, 0.1)',
//         tension: 0.4,
//         fill: true,
//       },
//       {
//         label: 'Error Rate (%)',
//         data: errorRateData.map(d => d.value),
//         borderColor: '#ef4444',
//         backgroundColor: 'rgba(239, 68, 68, 0.1)',
//         tension: 0.4,
//         fill: true,
//       }
//     ]
//   }
// }

// export const generateDataThroughputChart = (systemStats) => {
//   const hours = Array.from({ length: 12 }, (_, i) => {
//     const time = new Date()
//     time.setHours(time.getHours() - (11 - i) * 2) // 2-hour intervals
//     return time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
//   })

//   const throughputData = generateTimeSeriesData(
//     systemStats?.totalRawReadings ? systemStats.totalRawReadings / 12 : 1000,
//     12,
//     0.3
//   )

//   return {
//     labels: hours,
//     datasets: [
//       {
//         label: 'Data Throughput (readings/interval)',
//         data: throughputData.map(d => d.value),
//         borderColor: '#8b5cf6',
//         backgroundColor: 'rgba(139, 92, 246, 0.1)',
//         tension: 0.4,
//         fill: true,
//         pointBackgroundColor: '#8b5cf6',
//         pointBorderColor: '#ffffff',
//         pointBorderWidth: 2,
//         pointRadius: 4,
//       }
//     ]
//   }
// }

// // Enhanced chart options specifically for signal parameters
// export const getSignalBarChartOptions = (title, paramName, isDarkMode) => {
//   const isDbm = paramName.toLowerCase().includes('dbm')
//   const isRssi = paramName.toLowerCase().includes('rssi')

//   return {
//     responsive: true,
//     maintainAspectRatio: false,
//     interaction: {
//       mode: 'index',
//       intersect: false,
//     },
//     plugins: {
//       title: {
//         display: true,
//         text: title,
//         color: isDarkMode ? '#F9FAFB' : '#111827',
//         font: {
//           size: 16,
//           weight: 'bold',
//         },
//         padding: 20,
//       },
//       legend: {
//         position: 'top',
//         labels: {
//           color: isDarkMode ? '#E5E7EB' : '#374151',
//           usePointStyle: true,
//           padding: 20,
//           font: {
//             size: 12,
//           }
//         },
//       },
//       tooltip: {
//         backgroundColor: isDarkMode ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)',
//         titleColor: isDarkMode ? '#F9FAFB' : '#111827',
//         bodyColor: isDarkMode ? '#E5E7EB' : '#374151',
//         borderColor: isDarkMode ? '#3B82F6' : '#2563EB',
//         borderWidth: 1,
//         cornerRadius: 8,
//         padding: 12,
//         callbacks: {
//           label: (context) => {
//             let label = context.dataset.label || ''
//             if (label) {
//               label += ': '
//             }
//             if (context.parsed.y !== null) {
//               if (isDbm) {
//                 label += context.parsed.y.toFixed(1) + ' dBm'
//                 // Add signal quality indicator
//                 const value = context.parsed.y
//                 if (value >= -50) label += ' (Excellent)'
//                 else if (value >= -60) label += ' (Very Good)'
//                 else if (value >= -70) label += ' (Good)'
//                 else if (value >= -80) label += ' (Fair)'
//                 else label += ' (Poor)'
//               } else if (isRssi) {
//                 label += Math.round(context.parsed.y) + ' (Raw RSSI)'
//               } else {
//                 label += context.parsed.y.toFixed(2)
//               }
//             }
//             return label
//           },
//         },
//       },
//     },
//     scales: {
//       x: {
//         type: 'time',
//         time: {
//           unit: 'hour',
//           displayFormats: {
//             hour: 'HH:mm'
//           }
//         },
//         grid: {
//           color: isDarkMode ? 'rgba(75, 85, 99, 0.3)' : 'rgba(209, 213, 219, 0.4)',
//           drawBorder: false,
//         },
//         ticks: {
//           color: isDarkMode ? '#D1D5DB' : '#4B5563',
//           maxTicksLimit: 12,
//         }
//       },
//       y: {
//         beginAtZero: false,
//         reverse: isDbm, // dBm values are better when higher (closer to 0)
//         min: isDbm ? -120 : (isRssi ? 0 : undefined),
//         max: isDbm ? 0 : (isRssi ? 1024 : undefined),
//         grid: {
//           color: isDarkMode ? 'rgba(75, 85, 99, 0.3)' : 'rgba(209, 213, 219, 0.4)',
//           drawBorder: false,
//         },
//         ticks: {
//           color: isDarkMode ? '#D1D5DB' : '#4B5563',
//           callback: (value) => {
//             if (isDbm) {
//               return value + ' dBm'
//             } else if (isRssi) {
//               return Math.round(value)
//             }
//             return value
//           },
//         },
//       },
//     },
//     elements: {
//       bar: {
//         borderRadius: 6,
//         borderSkipped: false,
//       },
//     },
//     animation: {
//       duration: 750,
//       easing: 'easeInOutQuart',
//     },
//   }
// }

// export const getChartOptions = (title, yAxisLabel, isDarkMode = false) => {
//   return {
//     responsive: true,
//     maintainAspectRatio: false,
//     interaction: {
//       mode: 'index',
//       intersect: false,
//     },
//     plugins: {
//       title: {
//         display: true,
//         text: title,
//         color: isDarkMode ? '#F9FAFB' : '#111827',
//         font: {
//           size: 16,
//           weight: 'bold',
//         },
//         padding: 20,
//       },
//       legend: {
//         position: 'top',
//         labels: {
//           color: isDarkMode ? '#E5E7EB' : '#374151',
//           usePointStyle: true,
//           padding: 20,
//           font: {
//             size: 12,
//           }
//         },
//       },
//       tooltip: {
//         backgroundColor: isDarkMode ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)',
//         titleColor: isDarkMode ? '#F9FAFB' : '#111827',
//         bodyColor: isDarkMode ? '#E5E7EB' : '#374151',
//         borderColor: isDarkMode ? '#3B82F6' : '#2563EB',
//         borderWidth: 1,
//         cornerRadius: 8,
//         padding: 12,
//       },
//     },
//     scales: {
//       x: {
//         display: true,
//         title: {
//           display: true,
//           text: 'Time',
//           color: isDarkMode ? '#D1D5DB' : '#4B5563',
//           font: {
//             size: 12,
//             weight: 'bold',
//           }
//         },
//         grid: {
//           color: isDarkMode ? 'rgba(75, 85, 99, 0.3)' : 'rgba(209, 213, 219, 0.4)',
//           drawOnChartArea: true,
//         },
//         ticks: {
//           color: isDarkMode ? '#D1D5DB' : '#4B5563',
//           maxTicksLimit: 8,
//         }
//       },
//       y: {
//         display: true,
//         title: {
//           display: !!yAxisLabel,
//           text: yAxisLabel || '',
//           color: isDarkMode ? '#D1D5DB' : '#4B5563',
//           font: {
//             size: 12,
//             weight: 'bold',
//           }
//         },
//         grid: {
//           color: isDarkMode ? 'rgba(75, 85, 99, 0.3)' : 'rgba(209, 213, 219, 0.4)',
//           drawOnChartArea: true,
//         },
//         ticks: {
//           color: isDarkMode ? '#D1D5DB' : '#4B5563',
//         },
//         beginAtZero: true,
//       },
//     },
//     elements: {
//       line: {
//         borderWidth: 2,
//       },
//       point: {
//         radius: 3,
//         hoverRadius: 6,
//       },
//     },
//   }
// }

// // Enhanced data throughput chart with better styling
// export const generateEnhancedDataThroughputChart = (systemStats, isDarkMode) => {
//   const hours = Array.from({ length: 24 }, (_, i) => {
//     const time = new Date()
//     time.setHours(time.getHours() - (23 - i))
//     return time.toISOString()
//   })

//   const throughputData = generateTimeSeriesData(
//     systemStats?.totalRawReadings ? systemStats.totalRawReadings / 24 : 800,
//     24,
//     0.4
//   )

//   return {
//     labels: hours,
//     datasets: [
//       {
//         label: 'Data Throughput (readings/hour)',
//         data: throughputData.map((d, i) => ({
//           x: hours[i],
//           y: d.value
//         })),
//         borderColor: '#8b5cf6',
//         backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.8)' : 'rgba(139, 92, 246, 0.6)',
//         borderWidth: 2,
//         borderRadius: 8,
//         borderSkipped: false,
//         hoverBackgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.9)' : 'rgba(139, 92, 246, 0.8)',
//         hoverBorderColor: '#7c3aed',
//         hoverBorderWidth: 3,
//       }
//     ]
//   }
// }


export const generateTimeSeriesData = (baseValue, points = 24, variance = 0.2) => {
  const data = []
  const now = new Date()
  
  for (let i = points - 1; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000) // Hourly data points
    const variation = (Math.random() - 0.5) * variance * baseValue
    const value = Math.max(0, baseValue + variation)
    
    data.push({
      time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      value: Math.round(value * 100) / 100
    })
  }
  
  return data
}

export const generateSystemMetricsChartData = (systemStats, systemHealth) => {
  const hours = Array.from({ length: 24 }, (_, i) => {
    const time = new Date()
    time.setHours(time.getHours() - (23 - i))
    return time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  })

  // Memory usage trend
  const memoryData = generateTimeSeriesData(
    systemHealth?.memory?.heapUsed ? systemHealth.memory.heapUsed / (1024 * 1024) : 150,
    24,
    0.3
  )

  // CPU usage trend (simulated based on system load)
  const cpuData = generateTimeSeriesData(45, 24, 0.4)

  // Response time trend
  const responseTimeData = generateTimeSeriesData(120, 24, 0.5)

  // Error rate trend
  const errorRateData = generateTimeSeriesData(
    systemStats?.errorRate ? systemStats.errorRate * 100 : 2,
    24,
    0.8
  )

  return {
    labels: hours,
    datasets: [
      {
        label: 'Memory Usage (MB)',
        data: memoryData.map(d => d.value),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'CPU Usage (%)',
        data: cpuData.map(d => d.value),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Response Time (ms)',
        data: responseTimeData.map(d => d.value),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Error Rate (%)',
        data: errorRateData.map(d => d.value),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
        fill: true,
      }
    ]
  }
}

export const generateDataThroughputChart = (systemStats) => {
  const hours = Array.from({ length: 12 }, (_, i) => {
    const time = new Date()
    time.setHours(time.getHours() - (11 - i) * 2) // 2-hour intervals
    return time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  })

  const throughputData = generateTimeSeriesData(
    systemStats?.totalRawReadings ? systemStats.totalRawReadings / 12 : 1000,
    12,
    0.3
  )

  return {
    labels: hours,
    datasets: [
      {
        label: 'Data Throughput (readings/interval)',
        data: throughputData.map(d => d.value),
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#8b5cf6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
      }
    ]
  }
}

// Enhanced chart options specifically for signal parameters
export const getSignalBarChartOptions = (title, paramName, isDarkMode) => {
  const isDbm = paramName.toLowerCase().includes('dbm')
  const isRssi = paramName.toLowerCase().includes('rssi')

  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      title: {
        display: true,
        text: title,
        color: isDarkMode ? '#F9FAFB' : '#111827',
        font: {
          size: 16,
          weight: 'bold',
        },
        padding: 20,
      },
      legend: {
        position: 'top',
        labels: {
          color: isDarkMode ? '#E5E7EB' : '#374151',
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
          }
        },
      },
      tooltip: {
        backgroundColor: isDarkMode ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        titleColor: isDarkMode ? '#F9FAFB' : '#111827',
        bodyColor: isDarkMode ? '#E5E7EB' : '#374151',
        borderColor: isDarkMode ? '#3B82F6' : '#2563EB',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        callbacks: {
          label: (context) => {
            let label = context.dataset.label || ''
            if (label) {
              label += ': '
            }
            if (context.parsed.y !== null) {
              if (isDbm) {
                label += context.parsed.y.toFixed(1) + ' dBm'
                // Add signal quality indicator
                const value = context.parsed.y
                if (value >= -50) label += ' (Excellent)'
                else if (value >= -60) label += ' (Very Good)'
                else if (value >= -70) label += ' (Good)'
                else if (value >= -80) label += ' (Fair)'
                else label += ' (Poor)'
              } else if (isRssi) {
                label += Math.round(context.parsed.y) + ' (Raw RSSI)'
              } else {
                label += context.parsed.y.toFixed(2)
              }
            }
            return label
          },
        },
      },
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'hour',
          displayFormats: {
            hour: 'HH:mm'
          }
        },
        grid: {
          color: isDarkMode ? 'rgba(75, 85, 99, 0.3)' : 'rgba(209, 213, 219, 0.4)',
          drawBorder: false,
        },
        ticks: {
          color: isDarkMode ? '#D1D5DB' : '#4B5563',
          maxTicksLimit: 12,
        }
      },
      y: {
        beginAtZero: false,
        reverse: isDbm, // dBm values are better when higher (closer to 0)
        min: isDbm ? -120 : (isRssi ? 0 : undefined),
        max: isDbm ? 0 : (isRssi ? 1024 : undefined),
        grid: {
          color: isDarkMode ? 'rgba(75, 85, 99, 0.3)' : 'rgba(209, 213, 219, 0.4)',
          drawBorder: false,
        },
        ticks: {
          color: isDarkMode ? '#D1D5DB' : '#4B5563',
          callback: (value) => {
            if (isDbm) {
              return value + ' dBm'
            } else if (isRssi) {
              return Math.round(value)
            }
            return value
          },
        },
      },
    },
    elements: {
      bar: {
        borderRadius: 6,
        borderSkipped: false,
      },
    },
    animation: {
      duration: 750,
      easing: 'easeInOutQuart',
    },
  }
}

export const getChartOptions = (title, yAxisLabel, isDarkMode = false) => {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      title: {
        display: true,
        text: title,
        color: isDarkMode ? '#F9FAFB' : '#111827',
        font: {
          size: 16,
          weight: 'bold',
        },
        padding: 20,
      },
      legend: {
        position: 'top',
        labels: {
          color: isDarkMode ? '#E5E7EB' : '#374151',
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
          }
        },
      },
      tooltip: {
        backgroundColor: isDarkMode ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        titleColor: isDarkMode ? '#F9FAFB' : '#111827',
        bodyColor: isDarkMode ? '#E5E7EB' : '#374151',
        borderColor: isDarkMode ? '#3B82F6' : '#2563EB',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Time',
          color: isDarkMode ? '#D1D5DB' : '#4B5563',
          font: {
            size: 12,
            weight: 'bold',
          }
        },
        grid: {
          color: isDarkMode ? 'rgba(75, 85, 99, 0.3)' : 'rgba(209, 213, 219, 0.4)',
          drawOnChartArea: true,
        },
        ticks: {
          color: isDarkMode ? '#D1D5DB' : '#4B5563',
          maxTicksLimit: 8,
        }
      },
      y: {
        display: true,
        title: {
          display: !!yAxisLabel,
          text: yAxisLabel || '',
          color: isDarkMode ? '#D1D5DB' : '#4B5563',
          font: {
            size: 12,
            weight: 'bold',
          }
        },
        grid: {
          color: isDarkMode ? 'rgba(75, 85, 99, 0.3)' : 'rgba(209, 213, 219, 0.4)',
          drawOnChartArea: true,
        },
        ticks: {
          color: isDarkMode ? '#D1D5DB' : '#4B5563',
        },
        beginAtZero: true,
      },
    },
    elements: {
      line: {
        borderWidth: 2,
      },
      point: {
        radius: 3,
        hoverRadius: 6,
      },
    },
  }
}

// Enhanced data throughput chart with better styling
export const generateEnhancedDataThroughputChart = (systemStats, isDarkMode) => {
  const hours = Array.from({ length: 24 }, (_, i) => {
    const time = new Date()
    time.setHours(time.getHours() - (23 - i))
    return time.toISOString()
  })

  const throughputData = generateTimeSeriesData(
    systemStats?.totalRawReadings ? systemStats.totalRawReadings / 24 : 800,
    24,
    0.4
  )

  return {
    labels: hours,
    datasets: [
      {
        label: 'Data Throughput (readings/hour)',
        data: throughputData.map((d, i) => ({
          x: hours[i],
          y: d.value
        })),
        borderColor: '#8b5cf6',
        backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.8)' : 'rgba(139, 92, 246, 0.6)',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
        hoverBackgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.9)' : 'rgba(139, 92, 246, 0.8)',
        hoverBorderColor: '#7c3aed',
        hoverBorderWidth: 3,
      }
    ]
  }
}