// "use client"

// import { useState, useEffect, useCallback } from "react"
// import { useNavigate } from "react-router-dom"
// import { useAuth } from "../contexts/AuthContext"
// import { tankApi, deviceApi } from "../utils/api"
// import { toast } from "react-hot-toast"
// import {
//   Search,
//   Edit,
//   Trash2,
//   AlertCircle,
//   SortAsc,
//   SortDesc,
//   Grid3X3,
//   List,
//   MapPin,
//   Wifi,
//   WifiOff,
//   Droplet,
//   Eye,
//   Filter,
//   Loader,
//   PlusCircle,
//   Database,
// } from "lucide-react"
// import TankFormModal from "../components/TankFormModal"
// import EnhancedTankVisualization from "../components/EnhancedTankVisualization"

// const TankTypeManagementPage = () => {
//   const navigate = useNavigate()
//   const { user, isAuthenticated } = useAuth()

//   // State management
//   const [tanks, setTanks] = useState([])
//   const [availableDevices, setAvailableDevices] = useState([])
//   const [loading, setLoading] = useState(true)
//   const [error, setError] = useState(null)
//   const [showModal, setShowModal] = useState(false)
//   const [editingTank, setEditingTank] = useState(null)
//   const [showConfirmModal, setShowConfirmModal] = useState(false)
//   const [tankToDeleteId, setTankToDeleteId] = useState(null)
//   const [isDeleting, setIsDeleting] = useState(false)
//   const [searchTerm, setSearchTerm] = useState("")

//   // Pagination and filtering - matching devices page
//   const [viewMode, setViewMode] = useState("grid")
//   const [sortBy, setSortBy] = useState("name")
//   const [sortOrder, setSortOrder] = useState("asc")
//   const [filterShape, setFilterShape] = useState("all")
//   const [filterStatus, setFilterStatus] = useState("all")
//   const [showFilters, setShowFilters] = useState(false)

//   // Check if user is admin
//   const isAdmin = user?.role === "admin"

//   const fetchTanks = useCallback(async () => {
//     if (!isAuthenticated) return

//     setLoading(true)
//     setError(null)
//     try {
//       const query = {
//         search: searchTerm,
//         shape: filterShape !== "all" ? filterShape : undefined,
//         status: filterStatus !== "all" ? filterStatus : undefined,
//         sortBy: sortBy,
//         sortOrder: sortOrder,
//       }

//       const response = await tankApi.getAllTanks(query)
//       if (response.success) {
//         setTanks(response.data || [])
//         if (!loading || searchTerm || filterShape !== "all" || filterStatus !== "all") {
//           toast.success(searchTerm ? "Tanks filtered successfully!" : "Tanks loaded successfully!")
//         }
//       } else {
//         setError(response.message || "Failed to fetch tanks.")
//         toast.error(response.message || "Failed to fetch tanks.")
//       }
//     } catch (err) {
//       console.error("Error fetching tanks:", err)
//       setError("Failed to load tanks. Please ensure you are logged in and have permission, or check network.")
//       setTanks([])
//       toast.error("Failed to load tanks.")
//     } finally {
//       setLoading(false)
//     }
//   }, [searchTerm, filterShape, filterStatus, sortBy, sortOrder, isAuthenticated])

//   const fetchAvailableDevices = useCallback(async () => {
//     if (!isAuthenticated) return

//     try {
//       // Use the new helper function that handles field mapping
//       const result = await deviceApi.getAvailableDevicesForTank(editingTank?._id)

//       if (result.success) {
//         setAvailableDevices(result.data)
//         console.log("✅ Available devices loaded:", {
//           total: result.data.length,
//           currentlyAssigned: result.data.filter((d) => d._isCurrentlyAssigned).length,
//         })
//       } else {
//         console.warn("Failed to fetch available devices:", result.message)
//         setAvailableDevices([])
//       }
//     } catch (err) {
//       console.error("Error fetching available devices:", err)
//       setAvailableDevices([])
//     }
//   }, [editingTank, isAuthenticated])

//   const handleSubmit = async (submitData) => {
//     try {
//       let result
//       if (editingTank) {
//         result = await tankApi.updateTank(editingTank._id, submitData)
//       } else {
//         result = await tankApi.createTank(submitData)
//       }

//       if (result.success) {
//         toast.success(
//           editingTank
//             ? `Tank "${submitData.name}" updated successfully!`
//             : `Tank "${submitData.name}" added successfully!`,
//         )
//         fetchTanks()
//         fetchAvailableDevices()
//         resetForm()
//         setShowModal(false)
//         setError("")
//       } else {
//         throw new Error(result.message || "Operation failed.")
//       }
//     } catch (err) {
//       console.error("Error submitting tank form:", err)
//       throw err
//     }
//   }

//   const handleAddTank = () => {
//     setEditingTank(null)
//     setShowModal(true)
//     fetchAvailableDevices()
//   }

//   const handleEditTank = useCallback(
//     (tank) => {
//       setEditingTank(tank)
//       setShowModal(true)
//       fetchAvailableDevices()
//     },
//     [fetchAvailableDevices],
//   )

//   const confirmDeleteTank = useCallback((tankId) => {
//     setTankToDeleteId(tankId)
//     setShowConfirmModal(true)
//   }, [])

//   const handleDeleteConfirmed = async () => {
//     if (!tankToDeleteId) return
//     setIsDeleting(true)
//     try {
//       const result = await tankApi.deleteTank(tankToDeleteId)
//       if (result.success) {
//         toast.success("Tank deleted successfully!")
//         fetchTanks()
//         fetchAvailableDevices()
//       } else {
//         toast.error(result.message || "Failed to delete tank.")
//       }
//     } catch (err) {
//       console.error("Error deleting tank:", err)
//       setError(err.response?.data?.message || "Failed to delete tank. Please try again.")
//       toast.error("Failed to delete tank.")
//     } finally {
//       setIsDeleting(false)
//       setShowConfirmModal(false)
//       setTankToDeleteId(null)
//     }
//   }

//   const resetForm = () => {
//     setEditingTank(null)
//   }

//   const handleViewDetails = (tankId) => {
//     navigate(`/tank-details/${tankId}`)
//   }

//   const handleSearchChange = (e) => {
//     setSearchTerm(e.target.value)
//   }

//   const getStatusColor = (status) => {
//     switch (status) {
//       case "critical":
//         return "bg-red-100/70 text-red-800 dark:bg-red-900/30 dark:text-red-400 backdrop-blur-sm"
//       case "high":
//         return "bg-orange-100/70 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 backdrop-blur-sm"
//       case "low":
//         return "bg-yellow-100/70 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 backdrop-blur-sm"
//       case "offline":
//         return "bg-gray-100/70 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 backdrop-blur-sm"
//       default:
//         return "bg-green-100/70 text-green-800 dark:bg-green-900/30 dark:text-green-400 backdrop-blur-sm"
//     }
//   }

//   // Filter and sort tanks
//   const filteredAndSortedTanks = (Array.isArray(tanks) ? tanks : [])
//     .filter((tank) => {
//       if (searchTerm) {
//         const lowerCaseSearchTerm = searchTerm.toLowerCase()
//         if (
//           !(
//             tank.name?.toLowerCase().includes(lowerCaseSearchTerm) ||
//             tank.location?.toLowerCase().includes(lowerCaseSearchTerm) ||
//             tank.shape?.toLowerCase().includes(lowerCaseSearchTerm)
//           )
//         ) {
//           return false
//         }
//       }
//       if (filterShape !== "all") {
//         if (tank.shape !== filterShape) return false
//       }
//       if (filterStatus !== "all") {
//         if (tank.status !== filterStatus) return false
//       }
//       return true
//     })
//     .sort((a, b) => {
//       const aValue = a[sortBy] || ""
//       const bValue = b[sortBy] || ""
//       const comparison = aValue.toString().localeCompare(bValue.toString())
//       return sortOrder === "asc" ? comparison : -comparison
//     })

//   // Initial data fetch
//   useEffect(() => {
//     if (isAuthenticated) {
//       fetchTanks()
//     }
//   }, [fetchTanks])

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center min-h-[400px]">
//         <div className="text-center">
//           <div className="w-12 h-12 border-4 border-blue-200 dark:border-blue-800 rounded-full animate-spin border-t-blue-600 dark:border-t-blue-400 mx-auto mb-4"></div>
//           <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Loading tanks...</p>
//         </div>
//       </div>
//     )
//   }

//   return (
//     <div className="p-3 sm:p-6 bg-gradient-to-br from-slate-50/50 via-blue-50/30 to-indigo-50/50 dark:from-gray-900 dark:via-slate-900/50 dark:to-indigo-950/30 backdrop-blur-xl rounded-2xl shadow-xl min-h-[calc(100vh-120px)]">
//       {/* Enhanced Header - matching devices page */}
//       <div className="mb-6 sm:mb-8">
//         <div className="flex items-center mb-4 sm:mb-6">
//           <div className="p-2 sm:p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl mr-3 sm:mr-4 shadow-lg">
//             <Database className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
//           </div>
//           <div>
//             <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent">
//               Tank Management
//             </h1>
//             <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
//               Manage your tank configurations and monitor their status
//             </p>
//           </div>
//         </div>

//         {/* Controls Bar - matching devices page */}
//         <div className="flex flex-col gap-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-3 sm:p-4 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
//           {/* Top Row - Search and Main Actions */}
//           <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
//             {/* Search */}
//             <div className="relative flex-1 max-w-md">
//               <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
//               <input
//                 type="text"
//                 placeholder="Search tanks..."
//                 className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-3 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200 text-sm sm:text-base"
//                 value={searchTerm}
//                 onChange={handleSearchChange}
//                 aria-label="Search tanks"
//               />
//             </div>
//             {/* Filter Toggle and Add Button */}
//             <div className="flex gap-2 sm:gap-3">
//               <button
//                 onClick={() => setShowFilters(!showFilters)}
//                 className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 rounded-xl transition-all duration-200 text-sm sm:text-base ${
//                   showFilters
//                     ? "bg-blue-500 text-white shadow-md"
//                     : "bg-white/70 dark:bg-gray-700/70 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
//                 }`}
//               >
//                 <Filter className="w-4 h-4" />
//                 <span className="hidden sm:inline">Filters</span>
//               </button>
//               {isAdmin && (
//                 <button
//                   onClick={handleAddTank}
//                   className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm sm:text-base"
//                 >
//                   <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5" />
//                   <span className="hidden sm:inline">Add Tank</span>
//                   <span className="sm:hidden">Add</span>
//                 </button>
//               )}
//             </div>
//           </div>

//           {/* Filters Row - Collapsible */}
//           {showFilters && (
//             <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
//               {/* Shape Filter */}
//               <select
//                 value={filterShape}
//                 onChange={(e) => setFilterShape(e.target.value)}
//                 className="px-3 sm:px-4 py-2 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
//               >
//                 <option value="all">All Shapes</option>
//                 <option value="cylindrical">Cylindrical</option>
//                 <option value="rectangular">Rectangular</option>
//                 <option value="spherical">Spherical</option>
//               </select>
//               {/* Status Filter */}
//               <select
//                 value={filterStatus}
//                 onChange={(e) => setFilterStatus(e.target.value)}
//                 className="px-3 sm:px-4 py-2 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
//               >
//                 <option value="all">All Status</option>
//                 <option value="normal">Normal</option>
//                 <option value="low">Low</option>
//                 <option value="high">High</option>
//                 <option value="critical">Critical</option>
//                 <option value="offline">Offline</option>
//               </select>
//               {/* Sort */}
//               <select
//                 value={sortBy}
//                 onChange={(e) => setSortBy(e.target.value)}
//                 className="px-3 sm:px-4 py-2 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
//               >
//                 <option value="name">Name</option>
//                 <option value="shape">Shape</option>
//                 <option value="location">Location</option>
//                 <option value="capacity">Capacity</option>
//               </select>
//               <button
//                 onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
//                 className="p-2 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200"
//               >
//                 {sortOrder === "asc" ? (
//                   <SortAsc className="w-4 h-4 sm:w-5 sm:h-5" />
//                 ) : (
//                   <SortDesc className="w-4 h-4 sm:w-5 sm:h-5" />
//                 )}
//               </button>
//               {/* View Mode Toggle */}
//               <div className="flex bg-gray-100/70 dark:bg-gray-700/70 backdrop-blur-sm rounded-xl p-1 ml-auto">
//                 <button
//                   onClick={() => setViewMode("grid")}
//                   className={`p-2 rounded-lg transition-colors duration-200 ${
//                     viewMode === "grid"
//                       ? "bg-white dark:bg-gray-600 shadow-sm"
//                       : "hover:bg-gray-200 dark:hover:bg-gray-600"
//                   }`}
//                 >
//                   <Grid3X3 className="w-4 h-4 sm:w-5 sm:h-5" />
//                 </button>
//                 <button
//                   onClick={() => setViewMode("list")}
//                   className={`p-2 rounded-lg transition-colors duration-200 ${
//                     viewMode === "list"
//                       ? "bg-white dark:bg-gray-600 shadow-sm"
//                       : "hover:bg-gray-200 dark:hover:bg-gray-600"
//                   }`}
//                 >
//                   <List className="w-4 h-4 sm:w-5 sm:h-5" />
//                 </button>
//               </div>
//             </div>
//           )}
//         </div>
//       </div>

//       {error && (
//         <div className="bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 sm:px-6 py-3 sm:py-4 rounded-2xl mb-4 sm:mb-6 flex items-center shadow-lg">
//           <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-3 flex-shrink-0" />
//           <span className="text-sm sm:text-base">{error}</span>
//         </div>
//       )}

//       {/* Tanks Display */}
//       {filteredAndSortedTanks.length > 0 ? (
//         viewMode === "grid" ? (
//           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 items-stretch">
//             {filteredAndSortedTanks.map((tank) => (
//               <div
//                 key={tank._id}
//                 className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex flex-col h-full min-h-[280px] sm:min-h-[320px]"
//               >
//                 <div className="flex items-center justify-between mb-4">
//                   <div className="flex items-center flex-1 min-w-0">
//                     <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white shadow-lg flex-shrink-0">
//                       <Droplet className="w-5 h-5 sm:w-6 sm:h-6" />
//                     </div>
//                     <div className="ml-3 flex-1 min-w-0">
//                       <h3 className="font-bold text-base sm:text-lg text-gray-800 dark:text-gray-100 truncate">
//                         {tank.name}
//                       </h3>
//                       <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 capitalize">
//                         {tank.shape || "Unknown"}
//                       </span>
//                     </div>
//                   </div>
//                   <div className="flex items-center flex-shrink-0 ml-2">
//                     {tank.status === "offline" ? (
//                       <WifiOff className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
//                     ) : (
//                       <Wifi className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
//                     )}
//                   </div>
//                 </div>

//                 {/* Enhanced Tank Visualization */}
//                 <div className="flex justify-center mb-4">
//                   <EnhancedTankVisualization
//                     tank={tank}
//                     fillPercentage={tank.currentFillPercentage || 0}
//                     currentVolume={tank.currentVolumeLiters || 0}
//                     capacity={tank.capacity || 1000}
//                     status={
//                       tank.currentFillPercentage >= 90
//                         ? "critical"
//                         : tank.currentFillPercentage >= 80
//                           ? "warning"
//                           : "normal"
//                     }
//                     animated={true}
//                     showDetails={false}
//                     size="medium"
//                   />
//                 </div>

//                 <div className="space-y-2 sm:space-y-3 flex-grow">
//                   <div className="flex items-center text-xs sm:text-sm text-gray-600 dark:text-gray-400">
//                     <span className="font-semibold mr-2">Material:</span>
//                     <span className="font-mono text-xs bg-gray-100/70 dark:bg-gray-700/70 backdrop-blur-sm px-2 py-1 rounded truncate capitalize">
//                       {tank.materialType || tank.material?.category || "Liquid"}
//                     </span>
//                   </div>
//                   <div className="flex items-center text-xs sm:text-sm text-gray-600 dark:text-gray-400">
//                     <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
//                     <span className="truncate">{tank.location || "No location"}</span>
//                   </div>
//                   <div className="flex items-center text-xs sm:text-sm text-gray-600 dark:text-gray-400">
//                     <span className="font-semibold mr-2">Capacity:</span>
//                     <span className="truncate">{(tank.capacity || 0).toLocaleString()} L</span>
//                   </div>
//                   <div className="flex items-center text-xs sm:text-sm text-gray-600 dark:text-gray-400">
//                     <span className="font-semibold mr-2">Current:</span>
//                     <span className="truncate">{(tank.currentVolumeLiters || 0).toLocaleString()} L</span>
//                   </div>
//                   <div className="flex items-center">
//                     <span
//                       className={`inline-block px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
//                         tank.status,
//                       )}`}
//                     >
//                       {tank.status?.charAt(0).toUpperCase() + tank.status?.slice(1) || "Unknown"}
//                     </span>
//                   </div>
//                 </div>

//                 {/* Action Buttons - matching devices page exactly */}
//                 <div className="flex gap-1 sm:gap-2 mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-200/50 dark:border-gray-700/50 flex-shrink-0">
//                   <button
//                     onClick={() => handleViewDetails(tank._id)}
//                     className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 shadow-sm text-xs sm:text-sm min-w-0"
//                   >
//                     <Eye className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
//                     <span className="truncate">View</span>
//                   </button>
//                   {isAdmin && (
//                     <>
//                       <button
//                         onClick={() => handleEditTank(tank)}
//                         className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors duration-200 shadow-sm text-xs sm:text-sm min-w-0"
//                         aria-label={`Edit ${tank.name}`}
//                       >
//                         <Edit className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
//                         <span className="truncate">Edit</span>
//                       </button>
//                       <button
//                         onClick={() => confirmDeleteTank(tank._id)}
//                         className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 shadow-sm text-xs sm:text-sm min-w-0"
//                         aria-label={`Delete ${tank.name}`}
//                       >
//                         <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
//                         <span className="truncate">Del</span>
//                       </button>
//                     </>
//                   )}
//                 </div>
//               </div>
//             ))}
//           </div>
//         ) : (
//           <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
//             <div className="overflow-x-auto">
//               <table className="w-full">
//                 <thead className="bg-gray-50/70 dark:bg-gray-700/50 backdrop-blur-sm">
//                   <tr>
//                     <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
//                       Tank
//                     </th>
//                     <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
//                       Shape
//                     </th>
//                     <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
//                       Location
//                     </th>
//                     <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
//                       Status
//                     </th>
//                     <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
//                       Capacity
//                     </th>
//                     <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
//                       Actions
//                     </th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-gray-200/50 dark:divide-gray-700/50">
//                   {filteredAndSortedTanks.map((tank) => (
//                     <tr
//                       key={tank._id}
//                       className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors duration-200"
//                     >
//                       <td className="px-4 sm:px-6 py-3 sm:py-4">
//                         <div className="flex items-center">
//                           <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center text-white shadow-lg flex-shrink-0">
//                             <Droplet className="w-4 h-4 sm:w-5 sm:h-5" />
//                           </div>
//                           <div className="ml-3 min-w-0">
//                             <div className="font-medium text-sm sm:text-base text-gray-900 dark:text-gray-100 truncate">
//                               {tank.name}
//                             </div>
//                             <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
//                               {(tank.currentVolumeLiters || 0).toLocaleString()} L
//                             </div>
//                           </div>
//                         </div>
//                       </td>
//                       <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900 dark:text-gray-100 capitalize">
//                         {tank.shape || "Unknown"}
//                       </td>
//                       <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900 dark:text-gray-100 max-w-xs truncate">
//                         {tank.location || "N/A"}
//                       </td>
//                       <td className="px-4 sm:px-6 py-3 sm:py-4">
//                         <span
//                           className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${getStatusColor(
//                             tank.status,
//                           )}`}
//                         >
//                           {tank.status === "offline" ? (
//                             <WifiOff className="w-3 h-3 mr-1" />
//                           ) : (
//                             <Wifi className="w-3 h-3 mr-1" />
//                           )}
//                           {tank.status?.charAt(0).toUpperCase() + tank.status?.slice(1) || "Unknown"}
//                         </span>
//                       </td>
//                       <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900 dark:text-gray-100">
//                         {(tank.capacity || 0).toLocaleString()} L
//                       </td>
//                       <td className="px-4 sm:px-6 py-3 sm:py-4">
//                         <div className="flex gap-1 sm:gap-2">
//                           <button
//                             onClick={() => handleViewDetails(tank._id)}
//                             className="p-1 sm:p-2 text-blue-600 hover:bg-blue-100/50 dark:hover:bg-blue-900/30 rounded-lg transition-colors duration-200"
//                           >
//                             <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
//                           </button>
//                           {isAdmin && (
//                             <>
//                               <button
//                                 onClick={() => handleEditTank(tank)}
//                                 className="p-1 sm:p-2 text-indigo-600 hover:bg-indigo-100/50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors duration-200"
//                               >
//                                 <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
//                               </button>
//                               <button
//                                 onClick={() => confirmDeleteTank(tank._id)}
//                                 className="p-1 sm:p-2 text-red-600 hover:bg-red-100/50 dark:hover:bg-red-900/30 rounded-lg transition-colors duration-200"
//                               >
//                                 <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
//                               </button>
//                             </>
//                           )}
//                         </div>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           </div>
//         )
//       ) : (
//         <div className="text-center py-12 sm:py-16">
//           <Database className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
//           <p className="text-lg sm:text-xl font-medium text-gray-600 dark:text-gray-400 mb-2">
//             {searchTerm ? "No tanks found matching your search" : "No tanks available"}
//           </p>
//           <p className="text-sm sm:text-base text-gray-500 dark:text-gray-500">
//             {searchTerm ? "Try adjusting your search criteria" : "Add your first tank to get started"}
//           </p>
//         </div>
//       )}

//       {/* Tank Form Modal */}
//       {showModal && isAdmin && (
//         <TankFormModal
//           isOpen={showModal}
//           onClose={() => {
//             setShowModal(false)
//             resetForm()
//           }}
//           onSubmit={handleSubmit}
//           initialData={editingTank}
//           availableDevices={availableDevices}
//           isEditMode={!!editingTank}
//         />
//       )}

//       {/* Delete Confirmation Modal - matching devices page */}
//       {showConfirmModal && (
//         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
//           <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 shadow-2xl rounded-2xl p-6 w-full max-w-md">
//             <div className="flex items-center mb-4">
//               <div className="p-3 bg-red-100/70 dark:bg-red-900/30 backdrop-blur-sm rounded-full mr-4">
//                 <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
//               </div>
//               <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Confirm Deletion</h3>
//             </div>
//             <p className="text-gray-600 dark:text-gray-400 mb-6">
//               Are you sure you want to delete this tank? This action cannot be undone and will remove all associated
//               data.
//             </p>
//             <div className="flex gap-3">
//               <button
//                 onClick={() => setShowConfirmModal(false)}
//                 className="flex-1 px-4 py-2 bg-gray-200/70 dark:bg-gray-700/70 backdrop-blur-sm text-gray-800 dark:text-gray-200 rounded-xl hover:bg-gray-300/70 dark:hover:bg-gray-600/70 transition-colors duration-200"
//               >
//                 Cancel
//               </button>
//               <button
//                 onClick={handleDeleteConfirmed}
//                 disabled={isDeleting}
//                 className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
//               >
//                 {isDeleting ? (
//                   <>
//                     <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />
//                     Deleting...
//                   </>
//                 ) : (
//                   "Delete Tank"
//                 )}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   )
// }

// export default TankTypeManagementPage



// src/pages/TankTypeManagementPage.jsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { tankApi, deviceApi } from "../utils/api"
import { toast } from "react-hot-toast"
import {
  Search,
  Edit,
  Trash2,
  AlertCircle,
  SortAsc,
  SortDesc,
  Grid3X3,
  List,
  MapPin,
  Wifi,
  WifiOff,
  Droplet,
  Eye,
  Filter,
  Loader,
  PlusCircle,
  Database,
} from "lucide-react"
import TankFormModal from "../components/TankFormModal"
import EnhancedTankVisualization from "../components/EnhancedTankVisualization"
import MessageBox from "../components/MessageBox"

const TankTypeManagementPage = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()

  const [tanks, setTanks] = useState([])
  const [availableDevices, setAvailableDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editingTank, setEditingTank] = useState(null)

  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [tankToDeleteId, setTankToDeleteId] = useState(null)
  const [confirmMessage, setConfirmMessage] = useState("")

  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState("grid")
  const [sortBy, setSortBy] = useState("name")
  const [sortOrder, setSortOrder] = useState("asc")
  const [filterShape, setFilterShape] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [showFilters, setShowFilters] = useState(false)

  const isAdmin = user?.role === "admin"

  /**
   * Fetches tanks from the API with current search, filter, and sort parameters.
   */
  const fetchTanks = useCallback(async () => {
    if (!isAuthenticated) return

    setLoading(true)
    setError(null)
    try {
      const query = {
        search: searchTerm,
        shape: filterShape !== "all" ? filterShape : undefined,
        status: filterStatus !== "all" ? filterStatus : undefined,
        sortBy: sortBy,
        sortOrder: sortOrder,
      }

      const response = await tankApi.getAllTanks(query)
      if (response.success) {
        setTanks(response.data || [])
        if (searchTerm || filterShape !== "all" || filterStatus !== "all") {
          toast.success(searchTerm ? "Tanks filtered successfully!" : "Tanks loaded successfully!")
        }
      } else {
        throw new Error(response.message || "Failed to fetch tanks.")
      }
    } catch (err) {
      console.error("Error fetching tanks:", err)
      setError("Failed to load tanks. Please ensure you are logged in and have permission, or check network.")
      setTanks([])
      toast.error("Failed to load tanks.")
    } finally {
      setLoading(false)
    }
  }, [searchTerm, filterShape, filterStatus, sortBy, sortOrder, isAuthenticated]) // REMOVED 'loading' from dependency array

  /**
   * Fetches devices that are available for a tank, including the one currently assigned.
   * @param {string|null} tankId The ID of the tank being edited, or null for a new tank.
   */
  const fetchAvailableDevices = useCallback(async (tankId) => {
    if (!isAuthenticated) return

    try {
      const result = await deviceApi.getAvailableDevicesForTank(tankId)
      if (result.success) {
        setAvailableDevices(result.data)
        console.log("✅ Available devices loaded:", {
          total: result.data.length,
          currentlyAssigned: result.data.filter((d) => d._isCurrentlyAssigned).length,
        })
      } else {
        console.warn("Failed to fetch available devices:", result.message)
        setAvailableDevices([])
      }
    } catch (err) {
      console.error("Error fetching available devices:", err)
      setAvailableDevices([])
    }
  }, [isAuthenticated])

  const handleSubmit = async (submitData) => {
    try {
      let result
      if (editingTank) {
        result = await tankApi.updateTank(editingTank._id, submitData)
      } else {
        result = await tankApi.createTank(submitData)
      }

      if (result.success) {
        toast.success(
          editingTank
            ? `Tank "${submitData.name}" updated successfully!`
            : `Tank "${submitData.name}" added successfully!`,
        )
        fetchTanks()
        resetForm()
        setShowModal(false)
        setError("")
      } else {
        throw new Error(result.message || "Operation failed.")
      }
    } catch (err) {
      console.error("Error submitting tank form:", err)
      throw err
    }
  }

  const handleAddTank = useCallback(() => {
    setEditingTank(null)
    fetchAvailableDevices(null)
    setShowModal(true)
  }, [fetchAvailableDevices])

  const handleEditTank = useCallback(
    (tank) => {
      setEditingTank(tank)
      fetchAvailableDevices(tank._id)
      setShowModal(true)
    },
    [fetchAvailableDevices],
  )

  const confirmDeleteTank = useCallback((tank) => {
    setTankToDeleteId(tank._id)
    setConfirmMessage(`Are you sure you want to delete the tank named "${tank.name}"? This action cannot be undone and will remove all associated data.`)
    setShowConfirmModal(true)
  }, [])

  const handleDeleteConfirmed = async () => {
    if (!tankToDeleteId) return
    try {
      const result = await tankApi.deleteTank(tankToDeleteId)
      if (result.success) {
        toast.success("Tank deleted successfully!")
        fetchTanks()
      } else {
        toast.error(result.message || "Failed to delete tank.")
      }
    } catch (err) {
      console.error("Error deleting tank:", err)
      setError(err.response?.data?.message || "Failed to delete tank. Please try again.")
      toast.error("Failed to delete tank.")
    } finally {
      setShowConfirmModal(false)
      setTankToDeleteId(null)
    }
  }

  const resetForm = () => {
    setEditingTank(null)
  }

  const handleViewDetails = (tankId) => {
    navigate(`/tank-details/${tankId}`)
  }

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "critical":
        return "bg-red-100/70 text-red-800 dark:bg-red-900/30 dark:text-red-400 backdrop-blur-sm"
      case "high":
        return "bg-orange-100/70 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 backdrop-blur-sm"
      case "low":
        return "bg-yellow-100/70 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 backdrop-blur-sm"
      case "offline":
        return "bg-gray-100/70 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 backdrop-blur-sm"
      default:
        return "bg-green-100/70 text-green-800 dark:bg-green-900/30 dark:text-green-400 backdrop-blur-sm"
    }
  }

  const filteredAndSortedTanks = (Array.isArray(tanks) ? tanks : [])
    .filter((tank) => {
      if (searchTerm) {
        const lowerCaseSearchTerm = searchTerm.toLowerCase()
        if (
          !(
            tank.name?.toLowerCase().includes(lowerCaseSearchTerm) ||
            tank.location?.toLowerCase().includes(lowerCaseSearchTerm) ||
            tank.shape?.toLowerCase().includes(lowerCaseSearchTerm)
          )
        ) {
          return false
        }
      }
      if (filterShape !== "all") {
        if (tank.shape !== filterShape) return false
      }
      if (filterStatus !== "all") {
        if (tank.status !== filterStatus) return false
      }
      return true
    })
    .sort((a, b) => {
      const aValue = a[sortBy] || ""
      const bValue = b[sortBy] || ""
      const comparison = aValue.toString().localeCompare(bValue.toString())
      return sortOrder === "asc" ? comparison : -comparison
    })

  // This useEffect will now only run when isAuthenticated, searchTerm, or other filters change,
  // not on every state change inside fetchTanks.
  useEffect(() => {
    if (isAuthenticated) {
      fetchTanks()
    }
  }, [fetchTanks, isAuthenticated])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 dark:border-blue-800 rounded-full animate-spin border-t-blue-600 dark:border-t-blue-400 mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Loading tanks...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-6 bg-gradient-to-br from-slate-50/50 via-blue-50/30 to-indigo-50/50 dark:from-gray-900 dark:via-slate-900/50 dark:to-indigo-950/30 backdrop-blur-xl rounded-2xl shadow-xl min-h-[calc(100vh-120px)]">
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center mb-4 sm:mb-6">
          <div className="p-2 sm:p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl mr-3 sm:mr-4 shadow-lg">
            <Database className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent">
              Tank Management
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
              Manage your tank configurations and monitor their status
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-3 sm:p-4 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
              <input
                type="text"
                placeholder="Search tanks..."
                className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-3 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200 text-sm sm:text-base"
                value={searchTerm}
                onChange={handleSearchChange}
                aria-label="Search tanks"
              />
            </div>
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 rounded-xl transition-all duration-200 text-sm sm:text-base ${showFilters
                    ? "bg-blue-500 text-white shadow-md"
                    : "bg-white/70 dark:bg-gray-700/70 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                  }`}
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
              </button>
              {isAdmin && (
                <button
                  onClick={handleAddTank}
                  className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm sm:text-base"
                >
                  <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">Add Tank</span>
                  <span className="sm:hidden">Add</span>
                </button>
              )}
            </div>
          </div>
          {showFilters && (
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
              <select
                value={filterShape}
                onChange={(e) => setFilterShape(e.target.value)}
                className="px-3 sm:px-4 py-2 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">All Shapes</option>
                <option value="cylindrical">Cylindrical</option>
                <option value="rectangular">Rectangular</option>
                <option value="spherical">Spherical</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 sm:px-4 py-2 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">All Status</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
                <option value="offline">Offline</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 sm:px-4 py-2 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="name">Name</option>
                <option value="shape">Shape</option>
                <option value="location">Location</option>
                <option value="capacity">Capacity</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="p-2 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200"
              >
                {sortOrder === "asc" ? (
                  <SortAsc className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <SortDesc className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </button>
              <div className="flex bg-gray-100/70 dark:bg-gray-700/70 backdrop-blur-sm rounded-xl p-1 ml-auto">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-lg transition-colors duration-200 ${viewMode === "grid"
                      ? "bg-white dark:bg-gray-600 shadow-sm"
                      : "hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                >
                  <Grid3X3 className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-lg transition-colors duration-200 ${viewMode === "list"
                      ? "bg-white dark:bg-gray-600 shadow-sm"
                      : "hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                >
                  <List className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {error && (
        <div className="bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 sm:px-6 py-3 sm:py-4 rounded-2xl mb-4 sm:mb-6 flex items-center shadow-lg">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-3 flex-shrink-0" />
          <span className="text-sm sm:text-base">{error}</span>
        </div>
      )}
      {filteredAndSortedTanks.length > 0 ? (
        viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 items-stretch">
            {filteredAndSortedTanks.map((tank) => (
              <div
                key={tank._id}
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex flex-col h-full min-h-[280px] sm:min-h-[320px]"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center flex-1 min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white shadow-lg flex-shrink-0">
                      <Droplet className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <h3 className="font-bold text-base sm:text-lg text-gray-800 dark:text-gray-100 truncate">
                        {tank.name}
                      </h3>
                      <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 capitalize">
                        {tank.shape || "Unknown"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center flex-shrink-0 ml-2">
                    {tank.status === "offline" ? (
                      <WifiOff className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                    ) : (
                      <Wifi className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                    )}
                  </div>
                </div>
                <div className="flex justify-center mb-4">
                  <EnhancedTankVisualization
                    tank={tank}
                    fillPercentage={tank.currentFillPercentage || 0}
                    currentVolume={tank.currentVolumeLiters || 0}
                    capacity={tank.capacity || 1000}
                    status={
                      tank.currentFillPercentage >= 90
                        ? "critical"
                        : tank.currentFillPercentage >= 80
                          ? "warning"
                          : "normal"
                    }
                    animated={true}
                    showDetails={false}
                    size="medium"
                  />
                </div>
                <div className="space-y-2 sm:space-y-3 flex-grow">
                  <div className="flex items-center text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-semibold mr-2">Material:</span>
                    <span className="font-mono text-xs bg-gray-100/70 dark:bg-gray-700/70 backdrop-blur-sm px-2 py-1 rounded truncate capitalize">
                      {tank.materialType || tank.material?.category || "Liquid"}
                    </span>
                  </div>
                  <div className="flex items-center text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                    <span className="truncate">{tank.location || "No location"}</span>
                  </div>
                  <div className="flex items-center text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-semibold mr-2">Capacity:</span>
                    <span className="truncate">{(tank.capacity || 0).toLocaleString()} L</span>
                  </div>
                  <div className="flex items-center text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-semibold mr-2">Current:</span>
                    <span className="truncate">{(tank.currentVolumeLiters || 0).toLocaleString()} L</span>
                  </div>
                  <div className="flex items-center">
                    <span
                      className={`inline-block px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        tank.status,
                      )}`}
                    >
                      {tank.status?.charAt(0).toUpperCase() + tank.status?.slice(1) || "Unknown"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 sm:gap-2 mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-200/50 dark:border-gray-700/50 flex-shrink-0">
                  <button
                    onClick={() => handleViewDetails(tank._id)}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 shadow-sm text-xs sm:text-sm min-w-0"
                  >
                    <Eye className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="truncate">View</span>
                  </button>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => handleEditTank(tank)}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors duration-200 shadow-sm text-xs sm:text-sm min-w-0"
                        aria-label={`Edit ${tank.name}`}
                      >
                        <Edit className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="truncate">Edit</span>
                      </button>
                      <button
                        onClick={() => confirmDeleteTank(tank)}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 shadow-sm text-xs sm:text-sm min-w-0"
                        aria-label={`Delete ${tank.name}`}
                      >
                        <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="truncate">Del</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/70 dark:bg-gray-700/50 backdrop-blur-sm">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Tank
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Shape
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Location
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Status
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Capacity
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/50 dark:divide-gray-700/50">
                  {filteredAndSortedTanks.map((tank) => (
                    <tr
                      key={tank._id}
                      className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors duration-200"
                    >
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center text-white shadow-lg flex-shrink-0">
                            <Droplet className="w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                          <div className="ml-3 min-w-0">
                            <div className="font-medium text-sm sm:text-base text-gray-900 dark:text-gray-100 truncate">
                              {tank.name}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                              {(tank.currentVolumeLiters || 0).toLocaleString()} L
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900 dark:text-gray-100 capitalize">
                        {tank.shape || "Unknown"}
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900 dark:text-gray-100 max-w-xs truncate">
                        {tank.location || "N/A"}
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${getStatusColor(
                            tank.status,
                          )}`}
                        >
                          {tank.status === "offline" ? (
                            <WifiOff className="w-3 h-3 mr-1" />
                          ) : (
                            <Wifi className="w-3 h-3 mr-1" />
                          )}
                          {tank.status?.charAt(0).toUpperCase() + tank.status?.slice(1) || "Unknown"}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                        {(tank.capacity || 0).toLocaleString()} L
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <div className="flex gap-1 sm:gap-2">
                          <button
                            onClick={() => handleViewDetails(tank._id)}
                            className="p-1 sm:p-2 text-blue-600 hover:bg-blue-100/50 dark:hover:bg-blue-900/30 rounded-lg transition-colors duration-200"
                          >
                            <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => handleEditTank(tank)}
                                className="p-1 sm:p-2 text-indigo-600 hover:bg-indigo-100/50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors duration-200"
                              >
                                <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                              </button>
                              <button
                                onClick={() => confirmDeleteTank(tank)}
                                className="p-1 sm:p-2 text-red-600 hover:bg-red-100/50 dark:hover:bg-red-900/30 rounded-lg transition-colors duration-200"
                              >
                                <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <div className="text-center py-12 sm:py-16">
          <Database className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-lg sm:text-xl font-medium text-gray-600 dark:text-gray-400 mb-2">
            {searchTerm ? "No tanks found matching your search" : "No tanks available"}
          </p>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-500">
            {searchTerm ? "Try adjusting your search criteria" : "Add your first tank to get started"}
          </p>
        </div>
      )}
      {showModal && isAdmin && (
        <TankFormModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false)
            resetForm()
          }}
          onSubmit={handleSubmit}
          initialData={editingTank}
          availableDevices={availableDevices}
          isEditMode={!!editingTank}
        />
      )}
      {showConfirmModal && (
        <MessageBox
          message={confirmMessage}
          type="warning"
          onConfirm={handleDeleteConfirmed}
          onCancel={() => {
            setShowConfirmModal(false)
            setTankToDeleteId(null)
          }}
          showCancel={true}
        />
      )}
    </div>
  )
}

export default TankTypeManagementPage