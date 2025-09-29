
"use client"

import { useState, useEffect } from "react"
import PropTypes from "prop-types"
import { User, Mail, Lock, MapPin, Users, AlertCircle, CheckCircle, Loader, X, Phone, Home } from "lucide-react"

const UserFormModal = ({ isOpen, onClose, onSubmit, initialData, availableDevices, isEditMode }) => {
  const [formData, setFormData] = useState(() => {
    // Helper to safely get device IDs from initialData (which now contains full objects for edit)
    const getInitialDeviceIds = (devicesArray) => {
      return Array.isArray(devicesArray)
        ? devicesArray
            .filter((device) => device != null)
            .map((device) => {
              if (typeof device === "object" && device !== null) {
                return device._id || String(device); // Ensure it's the _id
              }
              return String(device); // Assume it's already an ID string
            })
            .filter((id) => id && /^[0-9a-fA-F]{24}$/.test(id)) // Filter for valid MongoDB ObjectIds
        : [];
    };

    const initialDeviceIds = getInitialDeviceIds(initialData?.devices);

    return {
      username: initialData?.username || "",
      emailid: initialData?.emailid || "",
      password: "",
      fullName: initialData?.fullName || "",
      address: initialData?.address || "",
      role: initialData?.role || "user",
      location: initialData?.location || "",
      phone: initialData?.phone || "",
      place: initialData?.place || "",
      devices: initialDeviceIds, // Store only IDs in formData
    };
  });

  const [formErrors, setFormErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)

  // useEffect to update formData when initialData changes (e.g., when opening for edit)
  useEffect(() => {
    console.log("UserFormModal - useEffect triggered with initialData:", initialData);
    const getInitialDeviceIds = (devicesArray) => {
      return Array.isArray(devicesArray)
        ? devicesArray
            .filter((device) => device != null)
            .map((device) => {
              if (typeof device === "object" && device !== null) {
                return device._id || String(device);
              }
              return String(device);
            })
            .filter((id) => id && /^[0-9a-fA-F]{24}$/.test(id))
        : [];
    };

    const initialDeviceIds = getInitialDeviceIds(initialData?.devices);

    setFormData({
      username: initialData?.username || "",
      emailid: initialData?.emailid || "",
      password: "",
      fullName: initialData?.fullName || "",
      address: initialData?.address || "",
      role: initialData?.role || "user",
      location: initialData?.location || "",
      phone: initialData?.phone || "",
      place: initialData?.place || "",
      devices: initialDeviceIds,
    });
    setFormErrors({});
  }, [initialData]);

  const validateForm = () => {
    const errors = {}
    if (!formData.username?.trim()) errors.username = "Username is required"
    else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) errors.username = "Username can only contain letters, numbers, and underscores"
    if (!formData.emailid?.trim()) errors.emailid = "Email is required"
    else if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(formData.emailid)) errors.emailid = "Please enter a valid email address"
    if (!isEditMode && !formData.password?.trim()) errors.password = "Password is required"
    else if (!isEditMode && formData.password?.trim() && formData.password.trim().length < 6) errors.password = "Password must be at least 6 characters"
    if (!formData.fullName?.trim()) errors.fullName = "Full name is required"
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: undefined, general: undefined }))
  }

  const handleDeviceCheckboxChange = (e) => {
    const deviceId = String(e.target.value)
    const isChecked = e.target.checked

    setFormData((prevData) => {
      const currentDevices = prevData.devices || []
      if (isChecked) {
        return { ...prevData, devices: [...currentDevices, deviceId] }
      } else {
        return { ...prevData, devices: currentDevices.filter((id) => id !== deviceId) }
      }
    })
    if (formErrors.devices) setFormErrors((prev) => ({ ...prev, devices: undefined, general: undefined }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormErrors({})

    if (!validateForm()) return
    setIsLoading(true)

    const excludedFields = ["_id", "createdAt", "updatedAt", "__v", "id"]
    const dataToSubmit = {}

    for (const key in formData) {
      if (excludedFields.includes(key)) continue
      if (
        isEditMode &&
        ["username", "emailid", "fullName", "address", "location", "phone", "place"].includes(key) &&
        typeof formData[key] === "string" &&
        formData[key].trim() === ""
      ) {
        continue
      }
      if (key === "password") {
        if (isEditMode && formData.password?.trim() === "") continue;
        if (!isEditMode && formData.password?.trim() === "") continue;
        if (formData.password?.trim()) dataToSubmit[key] = formData[key];
      }
      else if (key === "devices") {
        const validDevices = (formData[key] || [])
          .filter((device) => device != null)
          .map((device) => {
            if (typeof device === "string") return device
            if (typeof device === "object" && device !== null) return device._id || device.id || String(device)
            return String(device)
          })
          .filter((id) => id && /^[0-9a-fA-F]{24}$/.test(id))
        console.log("UserFormModal: Original device IDs from formData:", formData[key])
        console.log("UserFormModal: Valid device IDs being sent to backend:", validDevices)
        dataToSubmit[key] = validDevices
      } else {
        dataToSubmit[key] = formData[key]
      }
    }
    console.log("UserFormModal: Submitting data from modal:", dataToSubmit)

    try {
      await onSubmit(dataToSubmit)
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
      console.error("UserFormModal: Form submission error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  // Ensure availableDevices are valid and have _id (this now contains ALL devices for edit mode)
  const safeAvailableDevices = (availableDevices || []).filter(
    (device) => device != null && device._id && /^[0-9a-fA-F]{24}$/.test(device._id),
  )

  // For 'Add User', display only truly unassigned devices.
  // For 'Edit User', display ALL devices from the system.
  // The logic for which devices to show is now primarily handled by the UsersPage
  // in how it passes the `availableDevices` prop.
  // So, `devicesToDisplay` simply takes whatever `availableDevices` provides.
  const devicesToDisplay = safeAvailableDevices;


  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900/80 via-blue-900/60 to-indigo-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 shadow-2xl rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 bg-white/20 rounded-xl mr-3">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{isEditMode ? "✏️ Edit User" : "👤 Add New User"}</h2>
                <p className="text-blue-100 mt-1">
                  {isEditMode
                    ? "Update user information and device assignments"
                    : "Create a new user account with device access"}
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
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* General Form Error Display */}
            {formErrors.general && (
              <div className="bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl flex items-center">
                <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                <span>{formErrors.general}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Username Input */}
              <div className="space-y-2">
                <label htmlFor="username" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  👤 Username *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username || ""}
                    onChange={handleChange}
                    required
                    className={`w-full pl-10 pr-4 py-3 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border rounded-xl shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      formErrors.username
                        ? "border-red-300 bg-red-50/50"
                        : "border-gray-200 dark:border-gray-600 hover:border-blue-300"
                    }`}
                    placeholder="Enter username"
                  />
                </div>
                {formErrors.username && (
                  <p className="text-red-500 text-xs flex items-center mt-1">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {formErrors.username}
                  </p>
                )}
              </div>

              {/* Email Input */}
              <div className="space-y-2">
                <label htmlFor="emailid" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  📧 Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    id="emailid"
                    name="emailid"
                    value={formData.emailid || ""}
                    onChange={handleChange}
                    required
                    className={`w-full pl-10 pr-4 py-3 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border rounded-xl shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      formErrors.emailid
                        ? "border-red-300 bg-red-50/50"
                        : "border-gray-200 dark:border-gray-600 hover:border-blue-300"
                    }`}
                    placeholder="Enter email address"
                  />
                </div>
                {formErrors.emailid && (
                  <p className="text-red-500 text-xs flex items-center mt-1">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {formErrors.emailid}
                  </p>
                )}
              </div>

              {/* Password Input (conditional based on isEditMode) */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  🔒 {isEditMode ? "New Password (optional)" : "Password *"}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password || ""}
                    onChange={handleChange}
                    required={!isEditMode}
                    className={`w-full pl-10 pr-4 py-3 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border rounded-xl shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      formErrors.password
                        ? "border-red-300 bg-red-50/50"
                        : "border-gray-200 dark:border-gray-600 hover:border-blue-300"
                    }`}
                    placeholder={isEditMode ? "Leave blank to keep current password" : "Enter password"}
                  />
                </div>
                {formErrors.password && (
                  <p className="text-red-500 text-xs flex items-center mt-1">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {formErrors.password}
                  </p>
                )}
              </div>

              {/* Full Name Input */}
              <div className="space-y-2">
                <label htmlFor="fullName" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  👨‍💼 Full Name *
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName || ""}
                  onChange={handleChange}
                  required
                  className={`w-full px-4 py-3 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border rounded-xl shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    formErrors.fullName
                      ? "border-red-300 bg-red-50/50"
                      : "border-gray-200 dark:border-gray-600 hover:border-blue-300"
                  }`}
                  placeholder="Enter full name"
                />
                {formErrors.fullName && (
                  <p className="text-red-500 text-xs flex items-center mt-1">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {formErrors.fullName}
                  </p>
                )}
              </div>

              {/* Address Input */}
              <div className="space-y-2">
                <label htmlFor="address" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  🏠 Address
                </label>
                <div className="relative">
                  <Home className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={formData.address || ""}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-300"
                    placeholder="Enter address"
                  />
                </div>
              </div>

              {/* Phone Input */}
              <div className="space-y-2">
                <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  📞 Phone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    id="phone"
                    name="phone"
                    value={formData.phone || ""}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-300"
                    placeholder="Enter phone number"
                  />
                </div>
              </div>

              {/* Location Input */}
              <div className="space-y-2">
                <label htmlFor="location" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  📍 Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location || ""}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-300"
                    placeholder="Enter location"
                  />
                </div>
              </div>

              {/* Role Select */}
              <div className="space-y-2">
                <label htmlFor="role" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  👑 Role
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <select
                    id="role"
                    name="role"
                    value={formData.role || "user"}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-300"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="technician">Technician</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Device Assignment Section */}
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">🔗 Assign Devices</label>
              <div className="bg-gray-50/70 dark:bg-gray-700/50 backdrop-blur-sm border border-gray-200 dark:border-gray-600 rounded-xl p-4 max-h-64 overflow-y-auto">
                {devicesToDisplay.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-2">📱</div>
                    <p className="text-gray-500 dark:text-gray-400">No available devices found</p>
                    <p className="text-xs text-gray-400 mt-1">Devices will appear here once they are registered</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {devicesToDisplay
                      .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                      .map((device) => (
                        <div
                          key={device._id}
                          className="flex items-center p-3 bg-white/70 dark:bg-gray-600/50 backdrop-blur-sm rounded-lg border border-gray-200/50 dark:border-gray-500/50 hover:bg-white/90 dark:hover:bg-gray-600/70 transition-all duration-200"
                        >
                          <input
                            type="checkbox"
                            id={`device-${device._id}`}
                            value={device._id}
                            checked={formData.devices?.includes(device._id) || false}
                            onChange={handleDeviceCheckboxChange}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors duration-200"
                          />
                          <label htmlFor={`device-${device._id}`} className="ml-3 flex-1 cursor-pointer">
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              {device.name || device._id}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {device.type} • {device.location || "No location"}
                            </div>
                          </label>
                        </div>
                      ))}
                  </div>
                )}
              </div>
              {formErrors.devices && (
                <p className="text-red-500 text-xs flex items-center mt-1">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {formErrors.devices}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200/50 dark:border-gray-700/50 flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-6 py-3 bg-gray-100/70 hover:bg-gray-200/70 text-gray-700 font-semibold rounded-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
              >
                ❌ Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isLoading ? (
                  <>
                    <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    {isEditMode ? "Updating..." : "Adding..."}
                  </>
                ) : (
                  <>
                    {isEditMode ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        ✏️ Update User
                      </>
                    ) : (
                      <>
                        <User className="w-4 h-4 mr-2" />➕ Add User
                      </>
                    )}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

UserFormModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  initialData: PropTypes.object.isRequired,
  availableDevices: PropTypes.array, // This prop will now contain ALL devices in edit mode
  isEditMode: PropTypes.bool,
}

export default UserFormModal
