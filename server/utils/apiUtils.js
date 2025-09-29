// API utility functions
export const createHeaders = () => {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
  }
}

export const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
  }
  return await response.json()
}
