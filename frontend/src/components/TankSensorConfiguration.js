"use client"
import { getSensorTypeOptions } from "../utils/tankVolumeCalculations"

const TankSensorConfiguration = ({ formData, setFormData, formErrors }) => {
  const sensorTypeOptions = getSensorTypeOptions()
  const currentSensorTypeMeta = sensorTypeOptions.find((s) => s.value === formData.sensorType)

  const handleSensorConfigChange = (e) => {
    const { name, value, type, checked } = e.target
    const [sensorTypeKey, fieldName] = name.split(".") // Expects "sensorType.fieldName"

    setFormData((prev) => ({
      ...prev,
      sensorConfig: {
        ...prev.sensorConfig,
        [sensorTypeKey]: {
          ...(prev.sensorConfig[sensorTypeKey] || {}),
          [fieldName]: type === "checkbox" ? checked : Number(value) || value, // Handle numbers and booleans
        },
      },
    }))
  }

  if (!currentSensorTypeMeta || !currentSensorTypeMeta.configFields.length) {
    return <p className="text-sm text-gray-500">No specific configuration fields for this sensor type.</p>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {currentSensorTypeMeta.configFields.map((field) => {
        const fieldId = `${formData.sensorType}.${field.name}`
        const fieldValue = formData.sensorConfig?.[formData.sensorType]?.[field.name]
        const error = formErrors[`sensorConfig.${fieldId}`]

        return (
          <div key={fieldId}>
            <label htmlFor={fieldId} className="block text-sm font-medium text-gray-700 mb-2">
              {field.label} {field.required && "*"}
            </label>
            {field.type === "select" ? (
              <select
                id={fieldId}
                name={fieldId}
                value={fieldValue || ""}
                onChange={handleSensorConfigChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required={field.required}
              >
                <option value="">Select {field.label}</option>
                {field.options.map((option) => (
                  <option key={option} value={option}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </option>
                ))}
              </select>
            ) : field.type === "boolean" ? (
              <input
                type="checkbox"
                id={fieldId}
                name={fieldId}
                checked={fieldValue || false}
                onChange={handleSensorConfigChange}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            ) : field.type === "textarea" ? (
              <textarea
                id={fieldId}
                name={fieldId}
                value={fieldValue || ""}
                onChange={handleSensorConfigChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={field.placeholder}
                rows={3}
                required={field.required}
              />
            ) : (
              <input
                type={field.type}
                id={fieldId}
                name={fieldId}
                step={field.type === "number" ? "0.01" : undefined}
                value={fieldValue || ""}
                onChange={handleSensorConfigChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={field.placeholder}
                required={field.required}
              />
            )}
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
        )
      })}
    </div>
  )
}

export default TankSensorConfiguration
