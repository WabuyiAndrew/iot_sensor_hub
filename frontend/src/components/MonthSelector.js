"use client"

import { useMemo } from "react"
import { Calendar, Clock, BarChart3 } from "lucide-react"

const MonthSelector = ({ onDateRangeChange, selectedRange, setSelectedRange }) => {
  // Generate list of available months (current month and previous 11 months)
  const availableMonths = useMemo(() => {
    const months = []
    const now = new Date()

    // Generate last 12 months including current month
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = `month-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      const monthLabel = date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })

      months.push({
        key: monthKey,
        label: monthLabel,
        value: monthKey,
        startDate: new Date(date.getFullYear(), date.getMonth(), 1),
        endDate: new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999),
        description: `All data from ${monthLabel}`,
        icon: Calendar,
      })
    }
    return months
  }, [])

  // Keep existing quick ranges but remove the longer periods
  const quickRanges = [
    { value: "daily", label: "Daily", icon: Clock, description: "Last 24 Hours" },
    { value: "weekly", label: "Weekly", icon: Calendar, description: "Last 7 Days" },
    { value: "monthly", label: "Monthly", icon: BarChart3, description: "Last 30 Days" },
  ]

  // Combine quick ranges with month options
  const allRanges = [...quickRanges, ...availableMonths]

  const handleRangeSelect = (range) => {
    console.log(`📅 Month selector: Selecting range ${range.value}`, range);
    
    // FIXED: Always set the selected range first
    setSelectedRange(range.value)
    
    if (range.startDate && range.endDate) {
      // For month selections, call the date range change callback
      console.log(`📅 Month selector: Setting date range for ${range.label}:`, {
        startDate: range.startDate,
        endDate: range.endDate,
        isMonthRange: true
      })
      onDateRangeChange(range.startDate, range.endDate)
    } else {
      // For quick ranges, clear custom dates
      console.log(`📅 Month selector: Clearing custom dates for ${range.label}`)
      onDateRangeChange(null, null)
    }
  }

  const selectedRangeData = allRanges.find((range) => range.value === selectedRange)

  return (
    <div className="flex flex-wrap justify-center gap-2 mb-6">
      {/* Quick Ranges */}
      {quickRanges.map((range) => {
        const IconComponent = range.icon
        return (
          <button
            key={range.value}
            onClick={() => handleRangeSelect(range)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
              selectedRange === range.value
                ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg scale-105"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 hover:scale-105"
            }`}
            title={range.description}
          >
            <IconComponent size={16} />
            <span className="text-sm">{range.label}</span>
          </button>
        )
      })}

      {/* Month Dropdown */}
      <div className="relative">
        <select
          value={selectedRange}
          onChange={(e) => {
            const selectedMonth = allRanges.find((range) => range.value === e.target.value)
            if (selectedMonth) {
              console.log(`📅 Month dropdown: Selected month ${selectedMonth.label}`, selectedMonth);
              handleRangeSelect(selectedMonth)
            }
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-200 appearance-none cursor-pointer min-w-[160px] ${
            selectedRangeData && selectedRangeData.startDate
              ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg"
              : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600"
          }`}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' strokeLinecap='round' strokeLinejoin='round' strokeWidth='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
            backgroundPosition: "right 8px center",
            backgroundRepeat: "no-repeat",
            backgroundSize: "16px",
            paddingRight: "32px",
          }}
        >
          <option value="" disabled>
            Select Month...
          </option>
          {availableMonths.map((month) => (
            <option key={month.key} value={month.value}>
              {month.label}
            </option>
          ))}
        </select>
      </div>

      {/* Show selected range info */}
      {selectedRangeData && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm">
          <Calendar size={14} />
          <span>{selectedRangeData.description || selectedRangeData.label}</span>
        </div>
      )}
    </div>
  )
}

export default MonthSelector