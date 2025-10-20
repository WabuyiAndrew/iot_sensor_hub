
// export default UsersPage;
"use client"

import { useState, useEffect, useCallback } from "react"
import axios from "axios"
import { useCookies } from "react-cookie"
import { toast } from "react-hot-toast"
import UserFormModal from "../components/Content/UserFormModal"
import { useAuth } from "../contexts/AuthContext"
import {
  Search,
  UserPlus,
  Edit3,
  Trash2,
  Users,
  Mail,
  MapPin,
  HardDrive,
  SortAsc,
  SortDesc,
  Grid3X3,
  List,
  AlertCircle,
} from "lucide-react"

const UsersPage = () => {
  // State variables for managing user data, UI, and modals
  const [users, setUsers] = useState([]) // Stores the list of users
  const [loading, setLoading] = useState(true) // Indicates if data is being loaded
  const [error, setError] = useState(null) // Stores any error messages
  const [searchTerm, setSearchTerm] = useState("") // Current search input value
  const [showAddUserModal, setShowAddUserModal] = useState(false) // Controls visibility of Add User modal
  const [showEditUserModal, setShowEditUserModal] = useState(false) // Controls visibility of Edit User modal - FIX: Corrected typo in setter name
  const [selectedUser, setSelectedUser] = useState(null) // Stores data of the user being edited
  const [cookies] = useCookies(["token"]) // For accessing authentication token
  const [viewMode, setViewMode] = useState("grid") // 'grid' or 'list' for user display
  const [sortBy, setSortBy] = useState("username") // Field to sort users by
  const [sortOrder, setSortOrder] = useState("asc") // Sort order: 'asc' or 'desc'
  const [filterRole, setFilterRole] = useState("all") // Filter users by role
  const [showDeleteModal, setShowDeleteModal] = useState(false) // Controls visibility of Delete confirmation modal
  const [userToDelete, setUserToDelete] = useState(null) // Stores data of the user being deleted

  // Determine base URL from environment variable for API calls.
  // Prioritizes NEXT_PUBLIC_BASE_URL for Next.js, then REACT_APP_BASE_URL for Create React App,
  // falling back to a default localhost URL.
  const baseurl = process.env.NEXT_PUBLIC_BASE_URL || process.env.REACT_APP_BASE_URL || "http://localhost:5050"

  // Get user authentication context
  const { user, isAuthenticated } = useAuth()
  // Determine if the current user has admin privileges
  const isAdmin = user && user.role === "admin"

  // Initial state for new user data in the Add User modal
  const [newUserData, setNewUserData] = useState({
    username: "",
    emailid: "",
    password: "",
    fullName: "",
    address: "",
    role: "user",
    location: "",
    phone: "",
    place: "",
    devices: [],
  })

  // State to hold ONLY unassigned devices (used for Add User modal)
  const [unassignedDevices, setUnassignedDevices] = useState([])

  // NEW STATE: To hold the combined list of devices for the Edit User modal
  const [devicesForEditModal, setDevicesForEditModal] = useState([]);


  // Callback function to fetch all users from the backend
  const fetchUsers = useCallback(
    async (search = "") => {
      setLoading(true)
      setError(null)
      try {
        const response = await axios.get(`${baseurl}/api/users`, {
          headers: { Authorization: `Bearer ${cookies.token}` },
          params: { search }, // Pass search term as a query parameter
        })
        if (response.data && Array.isArray(response.data.data)) {
          setUsers(response.data.data)
          console.log("UsersPage: Users fetched successfully:", response.data.data.length, "users.");
        } else {
          console.warn("UsersPage: Received unexpected data format from user API:", response.data);
          setError("Received unexpected data format from user API. Displaying what's available or empty list.");
          setUsers([]);
        }
      } catch (err) {
        const errorMessage =
          err.response?.data?.message || "Failed to load users. Please check your permissions or try again."
        setError(errorMessage)
        setUsers([])
        toast.error(errorMessage)
        console.error("UsersPage: Error fetching users:", err);
      } finally {
        setLoading(false)
      }
    },
    [baseurl, cookies.token],
  )

  // Callback function to fetch ONLY unassigned devices
  const fetchUnassignedDevices = useCallback(async () => {
    if (!isAdmin) {
      setUnassignedDevices([])
      return
    }
    try {
      const response = await axios.get(`${baseurl}/api/devices/unassigned`, {
        headers: { Authorization: `Bearer ${cookies.token}` },
      })
      setUnassignedDevices(Array.isArray(response.data.data) ? response.data.data : [])
      console.log("UsersPage: Unassigned devices fetched:", response.data.data.length, "devices.");
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Failed to fetch unassigned devices for assignment."
      toast.error(errorMessage)
      setUnassignedDevices([])
      console.error("UsersPage: Error fetching unassigned devices:", err);
    }
  }, [baseurl, cookies.token, isAdmin])


  // useEffect hook to fetch data when user or admin status changes
  useEffect(() => {
    if (user) {
      fetchUsers()
      if (isAdmin) {
        fetchUnassignedDevices() // Always fetch unassigned devices for the pool
      } else {
        setUnassignedDevices([])
      }
    }
  }, [user, isAdmin, cookies.token, fetchUsers, fetchUnassignedDevices])


  // Handler for search input changes
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value)
    fetchUsers(e.target.value)
  }

  // Handler for submitting new user data from the Add User modal
  const handleAddUserSubmit = async (formDataFromModal) => {
    try {
      const dataToSend = {
        ...formDataFromModal,
        devices: Array.isArray(formDataFromModal.devices)
          ? formDataFromModal.devices.map((d) => (typeof d === "object" && d._id ? d._id : d))
          : [],
      }
      console.log("UsersPage: Submitting new user data:", dataToSend);
      const response = await axios.post(`${baseurl}/api/users`, dataToSend, {
        headers: { Authorization: `Bearer ${cookies.token}` },
      })
      toast.success(response.data.message || "User added successfully!")
      setShowAddUserModal(false)
      setNewUserData({
        username: "",
        emailid: "",
        password: "",
        fullName: "",
        address: "",
        role: "user",
        location: "",
        phone: "",
        place: "",
        devices: [],
      })
      fetchUsers() // Refresh user list
      fetchUnassignedDevices() // Refresh unassigned devices list
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Failed to add user."
      toast.error(errorMessage)
      console.error("UsersPage: Error adding user:", err.response?.data || err.message);
    }
  }

  // Function to confirm user deletion
  const confirmDeleteUser = (user) => {
    console.log("UsersPage: User object passed to confirmDeleteUser:", user);
    console.log("UsersPage: User ID for deletion (from user object):", user?._id);
    setUserToDelete(user)
    setShowDeleteModal(true)
  }

  // Handler for performing user deletion
  const handleDeleteUser = async () => {
    if (!userToDelete) {
      console.error("UsersPage: No user selected for deletion. Aborting delete operation.");
      toast.error("No user selected for deletion.");
      return
    }

    try {
      console.log("UsersPage: Attempting to delete user with ID:", userToDelete._id);
      const response = await axios.delete(`${baseurl}/api/users/${userToDelete._id}`, {
        headers: { Authorization: `Bearer ${cookies.token}` },
      })
      toast.success(response.data.message || "User deleted successfully!")
      fetchUsers()
      fetchUnassignedDevices() // Refresh unassigned devices list after potential unassignment
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Failed to delete user."
      toast.error(errorMessage)
      console.error("UsersPage: Error deleting user:", err.response?.data || err.message);
    } finally {
      setShowDeleteModal(false)
      setUserToDelete(null)
    }
  }

  // Handler for clicking the Edit button on a user
  const handleEditClick = async (userId) => {
    setLoading(true)
    setError(null)
    try {
      const userResponse = await axios.get(`${baseurl}/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${cookies.token}` },
      })
      const userToEdit = userResponse.data.data;

      if (!userToEdit) {
        toast.error("User data not found for editing.");
        console.error("UsersPage: User data for editing is null/undefined after fetch for ID:", userId);
        return;
      }

      // Ensure unassigned devices are freshly fetched
      if (isAdmin) {
        await fetchUnassignedDevices();
      } else {
        setUnassignedDevices([]);
      }

      const currentlyAssignedDevices = Array.isArray(userToEdit.devices) ? userToEdit.devices : [];

      // Create a Set for quick lookup of currently assigned device IDs
      const assignedDeviceIds = new Set(currentlyAssignedDevices.map(d => d._id));

      // Filter unassignedDevices to only include those NOT already assigned to this user
      const filteredUnassignedDevices = unassignedDevices.filter(
        (device) => !assignedDeviceIds.has(device._id)
      );

      // Combine currently assigned devices with the filtered unassigned devices
      // This list will be passed to the modal.
      // Use map(JSON.stringify) and map(JSON.parse) with a Set for robust deduplication
      // in case `currentlyAssignedDevices` somehow overlap with `unassignedDevices`
      // (though ideally, unassigned devices should not be in assigned list).
      const combinedDevicesForModal = Array.from(new Set([
        ...currentlyAssignedDevices.map(JSON.stringify),
        ...filteredUnassignedDevices.map(JSON.stringify),
      ])).map(JSON.parse);

      // Update the new state variable with the combined list
      setDevicesForEditModal(combinedDevicesForModal);


      setSelectedUser({
        ...userToEdit,
        address: userToEdit.address || '',
        phone: userToEdit.phone || '',
        place: userToEdit.place || '',
        devices: currentlyAssignedDevices, // Pass populated devices for initial checked state
      })

      setShowEditUserModal(true) // FIX: Corrected setter function call
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Failed to load user data for editing."
      toast.error(errorMessage)
      console.error("UsersPage: Error fetching user for edit:", err.response?.data || err.message);
    } finally {
      setLoading(false)
    }
  }

  // Handler for submitting updated user data from the Edit User modal
  const handleUpdateUserSubmit = async (formDataFromModal) => {
    try {
      const dataToSend = {
        ...formDataFromModal,
        devices: Array.isArray(formDataFromModal.devices)
          ? formDataFromModal.devices.map((d) => (typeof d === "object" && d._id ? d._id : d))
          : [],
      }
      console.log("UsersPage: Submitting updated user data for ID:", selectedUser._id, "Data:", dataToSend);
      const response = await axios.put(`${baseurl}/api/users/${selectedUser._id}`, dataToSend, {
        headers: { Authorization: `Bearer ${cookies.token}` },
      })
      toast.success(response.data.message || "User updated successfully!")
      setShowEditUserModal(false) // FIX: Corrected setter function call
      setSelectedUser(null)
      fetchUsers()
      fetchUnassignedDevices() // Refresh unassigned devices list
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Failed to update user."
      toast.error(errorMessage)
      console.error("UsersPage: Error updating user:", err.response?.data || err.message);
    }
  }

  // Filter and sort users based on current search term, role filter, and sort order
  const filteredAndSortedUsers = (Array.isArray(users) ? users : [])
    .filter((user) => {
      if (filterRole !== "all" && user.role !== filterRole) {
        return false
      }
      if (searchTerm) {
        const lowerCaseSearchTerm = searchTerm.toLowerCase()
        return (
          user.username?.toLowerCase().includes(lowerCaseSearchTerm) ||
          user.fullName?.toLowerCase().includes(lowerCaseSearchTerm) ||
          user.emailid?.toLowerCase().includes(lowerCaseSearchTerm) ||
          user.location?.toLowerCase().includes(lowerCaseSearchTerm)
        )
      }
      return true
    })
    .sort((a, b) => {
      const aValue = a[sortBy] || ""
      const bValue = b[sortBy] || ""
      const comparison = aValue.toString().localeCompare(bValue.toString())
      return sortOrder === "asc" ? comparison : -comparison
    })

  // Display loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 dark:border-blue-800 rounded-full animate-spin border-t-blue-600 dark:border-t-blue-400 mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Loading users...</p>
        </div>
      </div>
    )
  }

  // Display error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center p-8 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg font-medium text-red-700 dark:text-red-400 mb-2">Error Loading Users</p>
          <p className="text-red-600 dark:text-red-300">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/30 dark:from-gray-900 dark:via-slate-900/50 dark:to-indigo-950/30 rounded-2xl shadow-xl min-h-[calc(100vh-120px)]">
      {/* Enhanced Header Section */}
      <div className="mb-8">
        <div className="flex items-center mb-6">
          <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl mr-4">
            <Users className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              User Management
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage system users and their permissions</p>
          </div>
        </div>

        {/* Controls Bar: Search, Filters, Sort, View Mode, Add User Button */}
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 rounded-2xl border border-gray-200/50 dark:border-gray-700/50">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search users..."
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>

          {/* Filters and Controls Group */}
          <div className="flex flex-wrap items-center gap-3 justify-center lg:justify-end w-full lg:w-auto">
            {/* Role Filter Dropdown */}
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>

            {/* Sort By Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="username">Username</option>
              <option value="fullName">Full Name</option>
              <option value="role">Role</option>
              <option value="emailid">Email</option>
            </select>

            {/* Sort Order Toggle Button */}
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="p-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200"
            >
              {sortOrder === "asc" ? <SortAsc className="w-5 h-5" /> : <SortDesc className="w-5 h-5" />}
            </button>

            {/* View Mode Toggle Buttons (Grid/List) - Re-enabled and wired to state */}
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg transition-colors duration-200 ${viewMode === "grid"
                    ? "bg-white dark:bg-gray-600 shadow-sm"
                    : "hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
              >
                <Grid3X3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg transition-colors duration-200 ${viewMode === "list"
                    ? "bg-white dark:bg-gray-600 shadow-sm"
                    : "hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>

            {/* Add User Button (only for Admins) */}
            {isAdmin && (
              <button
                onClick={() => {
                  setShowAddUserModal(true)
                  fetchUnassignedDevices() // Fetch unassigned devices for add mode
                }}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <UserPlus className="w-5 h-5" />
                Add User
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Conditional Rendering for User Display (No Users / Grid / List) */}
      {filteredAndSortedUsers.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-xl font-medium text-gray-600 dark:text-gray-400 mb-2">No users found</p>
          <p className="text-gray-500 dark:text-gray-500">
            {searchTerm ? "Try adjusting your search criteria" : "No users have been added yet"}
          </p>
        </div>
      ) : viewMode === "grid" ? ( // Conditional rendering based on viewMode
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAndSortedUsers.map((user) => (
            <div
              key={user._id}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {user.fullName?.charAt(0) || user.username?.charAt(0) || "U"}
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 truncate">{user.username}</h3>
                  <span
                    className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${user.role === "admin"
                        ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                        : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                      }`}
                  >
                    {user.role}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <Users className="w-4 h-4 mr-2" />
                  <span className="truncate">{user.fullName || "N/A"}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <Mail className="w-4 h-4 mr-2" />
                  <span className="truncate">{user.emailid}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span className="truncate">{user.location || "N/A"}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <HardDrive className="w-4 h-4 mr-2" />
                  <span className="truncate">
                    {/* Display number of assigned devices */}
                    {user.devices && user.devices.length > 0
                      ? `${user.devices.length} device${user.devices.length > 1 ? "s" : ""}`
                      : "No devices"}
                  </span>
                </div>
              </div>

              {isAdmin && (
                <div className="flex gap-2 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => handleEditClick(user._id)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => confirmDeleteUser(user)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : ( // List View
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">User</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Role</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Location
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Devices
                  </th>
                  {isAdmin && (
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAndSortedUsers.map((user) => (
                  <tr
                    key={user._id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors duration-200"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                          {user.fullName?.charAt(0) || user.username?.charAt(0) || "U"}
                        </div>
                        <div className="ml-3">
                          <div className="font-medium text-gray-900 dark:text-gray-100">{user.username}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{user.fullName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">{user.emailid}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${user.role === "admin"
                            ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                          }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">{user.location || "N/A"}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      {/* Add defensive check for device.name */}
                      {user.devices && user.devices.length > 0
                        ? user.devices.map((device) => device.name || device._id).join(", ")
                        : "No devices"}
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditClick(user._id)}
                            className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors duration-200"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => confirmDeleteUser(user)}
                            className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors duration-200"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals for Add and Edit User */}
      {showAddUserModal && (
        <UserFormModal
          isOpen={showAddUserModal}
          onClose={() => setShowAddUserModal(false)}
          onSubmit={handleAddUserSubmit}
          initialData={newUserData}
          availableDevices={unassignedDevices} // Correctly passes only unassigned devices for Add mode
          isEditMode={false}
        />
      )}

      {showEditUserModal && selectedUser && (
        <UserFormModal
          isOpen={showEditUserModal}
          onClose={() => {
            setShowEditUserModal(false)
            setSelectedUser(null)
            fetchUnassignedDevices() // Re-fetch unassigned devices as assignments might have changed
            fetchUsers() // Re-fetch users to reflect any changes
          }}
          onSubmit={handleUpdateUserSubmit}
          initialData={{
            ...selectedUser,
            devices: selectedUser.devices || [], // Pass the populated device objects for initial checked state
          }}
          // MODIFIED: Pass the combined list of currently assigned devices and genuinely unassigned devices
          availableDevices={devicesForEditModal} // Now references the new state variable
          isEditMode={true}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full mr-4">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Confirm Deletion</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete user "
              <span className="font-semibold text-gray-800 dark:text-gray-200">{userToDelete.username}</span>
              "? This action cannot be undone. All devices assigned to this user will be unassigned.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors duration-200"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UsersPage
