"use client"

import React, { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import axios from "axios"
import { toast } from "react-hot-toast"
import { Lock, Loader2, Gauge } from "lucide-react"
import { motion } from "framer-motion"
import "./Login.css" // Reusing the same styles
import { useAuth } from "../contexts/AuthContext" // Replaced import with useAuth

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { axiosInstance } = useAuth() // Use the axiosInstance from the context

  const token = searchParams.get("token")

  useEffect(() => {
    if (!token) {
      toast.error("Invalid or missing password reset token.")
      navigate("/login")
    }
  }, [token, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.")
      setIsLoading(false)
      return
    }

    try {
      // Use the authenticated axios instance for the API call
      const response = await axiosInstance.post(`/api/users/reset-password`, {
        token,
        newPassword,
      })

      const { success, message } = response.data

      if (success) {
        toast.success(message || "Password reset successfully! You can now log in.")
        navigate("/login")
      } else {
        toast.error(message || "Failed to reset password.")
      }
    } catch (error) {
      console.error("Reset password error:", error.response?.data || error.message)
      toast.error(error.response?.data?.message || "Password reset failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (!token) {
    return null; // Don't render the form if there is no token. The useEffect will handle redirection.
  }

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="bg-gradient"></div>
        <div className="bg-grid"></div>
      </div>
      <div className="login-content">
        <motion.div
          className="login-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="login-header">
            <div className="logo">
              <div className="logo-icon">
                <Gauge className="w-6 h-6" />
              </div>
              <span className="logo-text">2tume</span>
            </div>
            <div className="login-title">
              <h1>Set a New Password</h1>
              <p>Enter and confirm your new password below.</p>
            </div>
          </div>
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <div className="input-wrapper">
                <div className="input-icon-wrapper">
                  <Lock className="input-icon" />
                </div>
                <input
                  type="password"
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <div className="input-wrapper">
                <div className="input-icon-wrapper">
                  <Lock className="input-icon" />
                </div>
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <button type="submit" className="submit-button" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Resetting...</span>
                </>
              ) : (
                <span>Reset Password</span>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  )
}

export default ResetPassword
