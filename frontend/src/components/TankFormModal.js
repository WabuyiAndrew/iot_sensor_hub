"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import PropTypes from "prop-types"
import {
  Droplet,
  AlertCircle,
  CheckCircle,
  Loader,
  X,
  Settings,
  Layers,
  MapPin,
  Gauge,
  HardDrive,
  Shapes,
} from "lucide-react"
import {
  getTankShapeOptions as getTankShapeOptionsUtil,
  getSensorTypeOptions,
  getBulkDensityOptions,
  validateTankDimensions,
} from "../utils/tankShapeConfigs"

const TankFormModal = ({ isOpen, onClose, onSubmit, initialData, availableDevices, isEditMode }) => {
  const [formData, setFormData] = useState({
    name: "",
    shape: "cylindrical",
    orientation: "vertical",
    location: "",
    materialType: "liquid",
    capacity: "",
    dimensions: {
      height: "",
      diameter: "",
      length: "",
      width: "",
      radius: "",
      topRadius: "",
      coneAngle: "",
      ullage: "",
      totalHeight: "",
      groundClearance: "",
      outletDiameter: "",
      majorAxis: "",
      minorAxis: "",
      capsuleLength: "",
      dishRadius: "",
    },
    selectedDeviceId: "",
    alertThresholds: {
      low: "",
      high: "",
      critical: "",
    },
    deviceType: "",
    offsetDepth: "",
    sensorConfigs: [],
    bulkDensity: "",
  })

  const [formErrors, setFormErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [selectedMaterialPresetName, setSelectedMaterialPresetName] = useState("")

  // Use refs to track initialization and prevent infinite loops
  const initializedRef = useRef(false)
  const lastInitialDataRef = useRef(null)

  // Options for dropdowns
  const tankShapes = getTankShapeOptionsUtil()
  const sensorTypes = getSensorTypeOptions()
  const bulkDensityOptions = getBulkDensityOptions()
  const materialTypeOptions = ["liquid", "solid", "gas"]

  // Utility function to check if a device type needs an offset depth
  const deviceNeedsOffset = (deviceType) => {
    return ["ultrasonic_level_sensor", "radar_level_sensor", "laser_level_sensor"].includes(deviceType)
  }

  // Initialize form data function
  const initializeFormData = useCallback(
    (data) => {
      if (data) {
        // Edit mode - populate with existing data
        const newFormData = {
          name: data.name || "",
          shape: data.shape || "cylindrical",
          orientation: data.orientation || "vertical",
          location: data.location || "",
          materialType: data.material?.category || data.materialType || "liquid",
          capacity: data.capacity?.toString() || "",
          dimensions: {
            height: data.dimensions?.height?.toString() || "",
            diameter: data.dimensions?.diameter?.toString() || "",
            length: data.dimensions?.length?.toString() || "",
            width: data.dimensions?.width?.toString() || "",
            radius: data.dimensions?.radius?.toString() || "",
            topRadius: data.dimensions?.topRadius?.toString() || "",
            coneAngle: data.dimensions?.coneAngle?.toString() || "",
            ullage: data.dimensions?.ullage?.toString() || "",
            totalHeight: data.dimensions?.totalHeight?.toString() || "",
            groundClearance: data.dimensions?.groundClearance?.toString() || "",
            outletDiameter: data.dimensions?.outletDiameter?.toString() || "",
            majorAxis: data.dimensions?.majorAxis?.toString() || "",
            minorAxis: data.dimensions?.minorAxis?.toString() || "",
            capsuleLength: data.dimensions?.capsuleLength?.toString() || "",
            dishRadius: data.dimensions?.dishRadius?.toString() || "",
          },
          selectedDeviceId: data.device?._id || "",
          alertThresholds: {
            low: data.alertThresholds?.low?.toString() || "",
            high: data.alertThresholds?.high?.toString() || "",
            critical: data.alertThresholds?.critical?.toString() || "",
          },
          deviceType: data.deviceType || "",
          offsetDepth: data.offsetDepth?.toString() || "",
          sensorConfigs: data.sensorConfigs || [],
          bulkDensity: data.bulkDensity?.toString() || "",
        }

        setFormData(newFormData)

        // Set bulk density preset if applicable - FIXED
        const matchedPreset = bulkDensityOptions.find((p) => {
          const densityValue = data.bulkDensity?.toString()
          return densityValue && p.density.toString() === densityValue
        })
        setSelectedMaterialPresetName(matchedPreset ? matchedPreset.material : "")
      } else {
        // New tank mode - reset to defaults
        setFormData({
          name: "",
          shape: "cylindrical",
          orientation: "vertical",
          location: "",
          materialType: "liquid",
          capacity: "",
          dimensions: {
            height: "",
            diameter: "",
            length: "",
            width: "",
            radius: "",
            topRadius: "",
            coneAngle: "",
            ullage: "",
            totalHeight: "",
            groundClearance: "",
            outletDiameter: "",
            majorAxis: "",
            minorAxis: "",
            capsuleLength: "",
            dishRadius: "",
          },
          selectedDeviceId: "",
          alertThresholds: {
            low: "",
            high: "",
            critical: "",
          },
          deviceType: "",
          offsetDepth: "",
          sensorConfigs: [],
          bulkDensity: "",
        })
        setSelectedMaterialPresetName("")
      }
    },
    [bulkDensityOptions],
  )

  // Handle modal open/close and data initialization
  useEffect(() => {
    if (isOpen) {
      // Check if we need to initialize or if data has changed
      const dataChanged = lastInitialDataRef.current !== initialData

      if (!initializedRef.current || dataChanged) {
        initializeFormData(initialData)
        setFormErrors({})
        initializedRef.current = true
        lastInitialDataRef.current = initialData
      }
    } else {
      // Reset when modal closes
      initializedRef.current = false
      lastInitialDataRef.current = null
      setFormErrors({})
    }
  }, [isOpen, initialData, initializeFormData])

  const validateForm = () => {
    const errors = {}

    if (!formData.name?.trim()) errors.name = "Tank name is required"
    if (!formData.location?.trim()) errors.location = "Location is required"
    if (isNaN(Number(formData.capacity)) || Number(formData.capacity) <= 0) {
      errors.capacity = "Capacity must be a positive number"
    }

    // Use the imported validation function
    const dimensionErrors = validateTankDimensions(formData.shape, formData.dimensions, formData.orientation)
    if (dimensionErrors.length > 0) {
      errors.dimensions = dimensionErrors.join(". ")
    }

    if (
      (formData.alertThresholds.low && isNaN(Number(formData.alertThresholds.low))) ||
      (formData.alertThresholds.high && isNaN(Number(formData.alertThresholds.high))) ||
      (formData.alertThresholds.critical && isNaN(Number(formData.alertThresholds.critical)))
    ) {
      errors.alertThresholds = "Alert thresholds must be valid numbers"
    }

    if (
      formData.materialType === "solid" &&
      (isNaN(Number(formData.bulkDensity)) || Number(formData.bulkDensity) <= 0)
    ) {
      errors.bulkDensity = "Bulk density is required and must be a positive number for solid materials"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: undefined, general: undefined }))
  }

  const handleDimensionChange = (dimension, value) => {
    setFormData((prev) => ({
      ...prev,
      dimensions: {
        ...prev.dimensions,
        [dimension]: value,
      },
    }))
    if (formErrors.dimensions) setFormErrors((prev) => ({ ...prev, dimensions: undefined }))
  }

  const handleShapeChange = (newShape) => {
    const shapeConfig = tankShapes.find((s) => s.value === newShape)
    if (shapeConfig) {
      const newOrientation = shapeConfig.orientations.includes(formData.orientation)
        ? formData.orientation
        : shapeConfig.orientations[0]
      const newMaterialType = shapeConfig.materialType || formData.materialType

      // Clear all dimensions when changing shape
      const clearedDimensions = Object.keys(formData.dimensions).reduce((acc, key) => {
        acc[key] = ""
        return acc
      }, {})

      setFormData((prev) => ({
        ...prev,
        shape: newShape,
        orientation: newOrientation,
        materialType: newMaterialType,
        dimensions: clearedDimensions,
        bulkDensity: newMaterialType === "liquid" ? "" : prev.bulkDensity,
      }))
      setSelectedMaterialPresetName("")

      // Clear dimension-related errors
      setFormErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors.dimensions
        return newErrors
      })
    }
  }

  const handleBulkDensityPreset = (presetMaterial) => {
    const selectedPreset = bulkDensityOptions.find((opt) => opt.material === presetMaterial)
    if (selectedPreset) {
      setFormData((prev) => {
        const newDimensions = {
          ...prev.dimensions,
        }
        if (selectedPreset.coneAngle !== undefined) {
          newDimensions.coneAngle = selectedPreset.coneAngle.toString()
        }
        if (selectedPreset.ullage !== undefined) {
          newDimensions.ullage = selectedPreset.ullage.toString()
        }

        return {
          ...prev,
          bulkDensity: selectedPreset.density.toString(),
          dimensions: newDimensions,
        }
      })
      setSelectedMaterialPresetName(selectedPreset.material)
    } else {
      setSelectedMaterialPresetName("")
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormErrors({})

    if (!validateForm()) return
    setIsLoading(true)

    const submitData = {
      name: formData.name,
      shape: formData.shape,
      orientation: formData.orientation,
      location: formData.location,
      materialType: formData.materialType,
      capacity: Number(formData.capacity),
      // Fix: Use dimensions object structure that matches the schema
      dimensions: {
        height: formData.dimensions.height ? Number(formData.dimensions.height) : null,
        diameter: formData.dimensions.diameter ? Number(formData.dimensions.diameter) : null,
        length: formData.dimensions.length ? Number(formData.dimensions.length) : null,
        width: formData.dimensions.width ? Number(formData.dimensions.width) : null,
        radius: formData.dimensions.radius ? Number(formData.dimensions.radius) : null,
        topRadius: formData.dimensions.topRadius ? Number(formData.dimensions.topRadius) : null,
        coneAngle: formData.dimensions.coneAngle ? Number(formData.dimensions.coneAngle) : null,
        ullage: formData.dimensions.ullage ? Number(formData.dimensions.ullage) : null,
        totalHeight: formData.dimensions.totalHeight ? Number(formData.dimensions.totalHeight) : null,
        groundClearance: formData.dimensions.groundClearance ? Number(formData.dimensions.groundClearance) : null,
        outletDiameter: formData.dimensions.outletDiameter ? Number(formData.dimensions.outletDiameter) : null,
        majorAxis: formData.dimensions.majorAxis ? Number(formData.dimensions.majorAxis) : null,
        minorAxis: formData.dimensions.minorAxis ? Number(formData.dimensions.minorAxis) : null,
        capsuleLength: formData.dimensions.capsuleLength ? Number(formData.dimensions.capsuleLength) : null,
        dishRadius: formData.dimensions.dishRadius ? Number(formData.dimensions.dishRadius) : null,
      },
      alertThresholds: {
        low: formData.alertThresholds.low ? Number(formData.alertThresholds.low) : null,
        high: formData.alertThresholds.high ? Number(formData.alertThresholds.high) : null,
        critical: formData.alertThresholds.critical ? Number(formData.alertThresholds.critical) : null,
      },
      deviceType: formData.deviceType || null,
      offsetDepth: deviceNeedsOffset(formData.deviceType) && formData.offsetDepth !== "" ? Number(formData.offsetDepth) : null,
      bulkDensity:
        formData.materialType === "solid" && formData.bulkDensity !== "" ? Number(formData.bulkDensity) : null,
      device: formData.selectedDeviceId || null,
    }

    // Clean up null values from dimensions
    Object.keys(submitData.dimensions).forEach((key) => {
      if (submitData.dimensions[key] === null || submitData.dimensions[key] === undefined) {
        delete submitData.dimensions[key]
      }
    })

    try {
      await onSubmit(submitData)
    } catch (error) {
      if (error.response && error.response.data) {
        const { message, errors } = error.response.data
        if (errors) {
          if (Array.isArray(errors)) setFormErrors({ general: `Validation failed: ${errors.join(", ")}` })
          else if (typeof errors === "object") setFormErrors(errors)
        } else if (message) {
          setFormErrors({ general: message })
        } else {
          setFormErrors({ general: "An unexpected error occurred during submission." })
        }
      } else {
        setFormErrors({ general: "Network error or unexpected server response." })
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  const selectedShape = tankShapes.find((s) => s.value === formData.shape)

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900/80 via-blue-900/60 to-indigo-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 shadow-2xl rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 bg-white/20 rounded-xl mr-3">
                <Droplet className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{isEditMode ? "✏️ Edit Tank" : "🏗️ Add New Tank"}</h2>
                <p className="text-blue-100 mt-1">
                  {isEditMode
                    ? "Update tank configuration and device assignments"
                    : "Create a new tank with specifications and device connection"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors duration-200"
              aria-label="Close modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Form Content Area (scrollable) */}
        <div className="p-6 overflow-y-auto flex-grow">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* General Form Error Display */}
            {formErrors.general && (
              <div className="bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl flex items-center">
                <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                <span>{formErrors.general}</span>
              </div>
            )}

            {/* Basic Information Section */}
            <div className="space-y-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl mr-3">
                  <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Basic Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tank Name */}
                <div className="space-y-2">
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    🏷️ Tank Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className={`w-full px-4 py-3 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border rounded-xl shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.name
                        ? "border-red-300 bg-red-50/50"
                        : "border-gray-200 dark:border-gray-600 hover:border-blue-300"
                      }`}
                    placeholder="Enter tank name"
                  />
                  {formErrors.name && (
                    <p className="text-red-500 text-xs flex items-center mt-1">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {formErrors.name}
                    </p>
                  )}
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <label htmlFor="location" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    📍 Location *
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      required
                      className={`w-full pl-10 pr-4 py-3 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border rounded-xl shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.location
                          ? "border-red-300 bg-red-50/50"
                          : "border-gray-200 dark:border-gray-600 hover:border-blue-300"
                        }`}
                      placeholder="Enter tank location"
                    />
                  </div>
                  {formErrors.location && (
                    <p className="text-red-500 text-xs flex items-center mt-1">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {formErrors.location}
                    </p>
                  )}
                </div>

                {/* Tank Shape */}
                <div className="space-y-2">
                  <label htmlFor="shape" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    🔷 Tank Shape
                  </label>
                  <div className="relative">
                    <Shapes className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <select
                      id="shape"
                      name="shape"
                      value={formData.shape}
                      onChange={(e) => handleShapeChange(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-300"
                    >
                      {tankShapes.map((shape) => (
                        <option key={shape.value} value={shape.value}>
                          {shape.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Orientation */}
                {selectedShape?.orientations.length > 1 && (
                  <div className="space-y-2">
                    <label
                      htmlFor="orientation"
                      className="block text-sm font-semibold text-gray-700 dark:text-gray-300"
                    >
                      🔄 Orientation
                    </label>
                    <select
                      id="orientation"
                      name="orientation"
                      value={formData.orientation}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-300"
                    >
                      {selectedShape.orientations.map((orientation) => (
                        <option key={orientation} value={orientation}>
                          {orientation.charAt(0).toUpperCase() + orientation.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {/* Material Type */}
                <div className="space-y-2">
                  <label htmlFor="materialType" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    🧪 Material Type
                  </label>
                  <select
                    id="materialType"
                    name="materialType"
                    value={formData.materialType}
                    onChange={(e) => {
                      const newMaterialType = e.target.value
                      setFormData((prev) => ({
                        ...prev,
                        materialType: newMaterialType,
                        bulkDensity: newMaterialType === "liquid" ? "" : prev.bulkDensity,
                      }))
                      setSelectedMaterialPresetName("")
                    }}
                    className="w-full px-4 py-3 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-300"
                  >
                    {materialTypeOptions.map((type) => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Capacity */}
                <div className="space-y-2">
                  <label htmlFor="capacity" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    📊 Capacity (Liters) *
                  </label>
                  <div className="relative">
                    <Gauge className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="number"
                      id="capacity"
                      name="capacity"
                      value={formData.capacity}
                      onChange={handleChange}
                      required
                      className={`w-full pl-10 pr-4 py-3 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border rounded-xl shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.capacity
                          ? "border-red-300 bg-red-50/50"
                          : "border-gray-200 dark:border-gray-600 hover:border-blue-300"
                        }`}
                      placeholder="e.g., 10000"
                      min="0.01"
                      step="0.01"
                    />
                  </div>
                  {formErrors.capacity && (
                    <p className="text-red-500 text-xs flex items-center mt-1">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {formErrors.capacity}
                    </p>
                  )}
                </div>
              </div>
              {/* Bulk Density for Solid Materials */}
              {formData.materialType === "solid" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label
                      htmlFor="bulkDensityPreset"
                      className="block text-sm font-semibold text-gray-700 dark:text-gray-300"
                    >
                      📋 Bulk Density Preset
                    </label>
                    <select
                      id="bulkDensityPreset"
                      name="bulkDensityPreset"
                      value={selectedMaterialPresetName}
                      onChange={(e) => handleBulkDensityPreset(e.target.value)}
                      className="w-full px-4 py-3 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-300"
                    >
                      <option value="">-- Select a Preset --</option>
                      {bulkDensityOptions.map((preset) => (
                        <option key={preset.material} value={preset.material}>
                          {preset.material} ({preset.density} kg/m³)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="bulkDensity"
                      className="block text-sm font-semibold text-gray-700 dark:text-gray-300"
                    >
                      ⚖️ Bulk Density (kg/m³) *
                    </label>
                    <input
                      type="number"
                      id="bulkDensity"
                      name="bulkDensity"
                      value={formData.bulkDensity}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border rounded-xl shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.bulkDensity
                          ? "border-red-300 bg-red-50/50"
                          : "border-gray-200 dark:border-gray-600 hover:border-blue-300"
                        }`}
                      placeholder="e.g., 1500"
                      min="0.01"
                      step="0.01"
                    />
                    {formErrors.bulkDensity && (
                      <p className="text-red-500 text-xs flex items-center mt-1">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        {formErrors.bulkDensity}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
            {/* Dimensions Section */}
            <div className="space-y-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl mr-3">
                  <Layers className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Dimensions (Meters)</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {selectedShape &&
                  selectedShape.requiredDimensions[formData.orientation || "vertical"]?.map((dim) => (
                    <div key={dim} className="space-y-2">
                      <label
                        htmlFor={`dimensions-${dim}`}
                        className="block text-sm font-semibold text-gray-700 dark:text-gray-300"
                      >
                        📏 {dim.charAt(0).toUpperCase() + dim.slice(1).replace(/([A-Z])/g, " $1")} *
                      </label>
                      <input
                        type="number"
                        id={`dimensions-${dim}`}
                        name={dim}
                        value={formData.dimensions[dim] || ""}
                        onChange={(e) => handleDimensionChange(dim, e.target.value)}
                        required
                        className={`w-full px-4 py-3 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border rounded-xl shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.dimensions
                            ? "border-red-300 bg-red-50/50"
                            : "border-gray-200 dark:border-gray-600 hover:border-blue-300"
                          }`}
                        placeholder={`e.g., ${dim === "height" || dim === "totalHeight"
                            ? "5.0"
                            : dim === "diameter"
                              ? "3.0"
                              : dim === "coneAngle"
                                ? "45"
                                : dim === "ullage"
                                  ? "1.0"
                                  : "2.0"
                          }`}
                        min="0.01"
                        step="0.01"
                      />
                    </div>
                  ))}
              </div>
              {formErrors.dimensions && (
                <p className="text-red-500 text-sm flex items-center mt-2">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  {formErrors.dimensions}
                </p>
              )}
            </div>
            {/* Device Configuration Section */}
            <div className="space-y-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl mr-3">
                  <HardDrive className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Device Configuration</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Sensor Type */}
                <div className="space-y-2">
                  <label htmlFor="deviceType" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    🔧 Sensor Type
                  </label>
                  <select
                    id="deviceType"
                    name="deviceType"
                    value={formData.deviceType}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-300"
                  >
                    <option value="">-- Select a Sensor --</option>
                    {sensorTypes.map((sensor) => (
                      <option key={sensor.value} value={sensor.value}>
                        {sensor.label}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Sensor Offset Depth */}
                {deviceNeedsOffset(formData.deviceType) && (
                  <div className="space-y-2">
                    <label
                      htmlFor="offsetDepth"
                      className="block text-sm font-semibold text-gray-700 dark:text-gray-300"
                    >
                      📏 Sensor Offset Depth (Meters)
                    </label>
                    <input
                      type="number"
                      id="offsetDepth"
                      name="offsetDepth"
                      value={formData.offsetDepth}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-300"
                      placeholder="e.g., 0.5"
                      min="0"
                      step="0.01"
                    />
                  </div>
                )}
                {/* Associated Device */}
                <div className="space-y-2">
                  <label
                    htmlFor="selectedDeviceId"
                    className="block text-sm font-semibold text-gray-700 dark:text-gray-300"
                  >
                    🔗 Associated Device
                  </label>
                  <select
                    id="selectedDeviceId"
                    name="selectedDeviceId"
                    value={formData.selectedDeviceId}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-300"
                  >
                    <option value="">-- Select a Device --</option>
                    {availableDevices.map((device) => (
                      <option key={device._id} value={device._id}>
                        {device.name} ({device.deviceType})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Alert Thresholds Section */}
            <div className="space-y-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl mr-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Alert Thresholds (%)</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label htmlFor="lowThreshold" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Low Level
                  </label>
                  <input
                    type="number"
                    id="lowThreshold"
                    name="alertThresholds.low"
                    value={formData.alertThresholds.low}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        alertThresholds: { ...prev.alertThresholds, low: e.target.value },
                      }))
                    }
                    className="w-full px-4 py-3 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-300"
                    min="0"
                    max="100"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="highThreshold" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    High Level
                  </label>
                  <input
                    type="number"
                    id="highThreshold"
                    name="alertThresholds.high"
                    value={formData.alertThresholds.high}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        alertThresholds: { ...prev.alertThresholds, high: e.target.value },
                      }))
                    }
                    className="w-full px-4 py-3 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-300"
                    min="0"
                    max="100"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="criticalThreshold"
                    className="block text-sm font-semibold text-gray-700 dark:text-gray-300"
                  >
                    Critical Level
                  </label>
                  <input
                    type="number"
                    id="criticalThreshold"
                    name="alertThresholds.critical"
                    value={formData.alertThresholds.critical}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        alertThresholds: { ...prev.alertThresholds, critical: e.target.value },
                      }))
                    }
                    className="w-full px-4 py-3 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-300"
                    min="0"
                    max="100"
                  />
                </div>
                {formErrors.alertThresholds && (
                  <div className="md:col-span-3">
                    <p className="text-red-500 text-xs flex items-center mt-1">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {formErrors.alertThresholds}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="bg-white/90 dark:bg-gray-800/90 p-6 flex-shrink-0 flex justify-end items-center border-t border-white/20 dark:border-gray-700/50 space-x-3">
          <button
            onClick={onClose}
            type="button"
            className="px-6 py-3 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            type="submit"
            disabled={isLoading}
            className={`px-6 py-3 font-bold rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 ${isLoading
                ? "bg-blue-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30"
              }`}
          >
            {isLoading && <Loader className="animate-spin w-5 h-5 mr-2" />}
            {isEditMode ? "Save Changes" : "Add Tank"}
          </button>
        </div>
      </div>
    </div>
  )
}

TankFormModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  initialData: PropTypes.object,
  availableDevices: PropTypes.array,
  isEditMode: PropTypes.bool,
}

export default TankFormModal