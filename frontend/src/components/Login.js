"use client"

import { useState } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { motion } from "framer-motion"
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Gauge, AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { toast } from "react-hot-toast"
import "./Login.css"
import axios from "axios"
import { useAuth } from "../contexts/AuthContext"

const baseurl = process.env.REACT_APP_BASE_URL || "http://localhost:5050"
// "https://api.2tume.com"

const Login = () => {
  const [formData, setFormData] = useState({
    emailid: "",
    password: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotEmail, setForgotEmail] = useState("")
  const [forgotPasswordStatus, setForgotPasswordStatus] = useState(null)
  const [rememberMe, setRememberMe] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      console.log("[Login] Attempting login with:", { emailid: formData.emailid, rememberMe })

      const response = await axios.post(
        `${baseurl}/api/users/login`,
        {
          ...formData,
          rememberMe,
        },
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }
        }
      )

      console.log("[Login] Login response:", response.data)
      const { success, message, token, user } = response.data

      if (success && token) {
        console.log("[Login] Login successful, token received:", token ? "exists" : "missing")
        await login(token, rememberMe)
        toast.success("Login successful!")
        const from = location.state?.from?.pathname || (user?.role === "admin" ? "/dashboard" : "/my-dashboard")
        navigate(from, { replace: true })
      } else if (success && user) {
        const cookieToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('token='))
          ?.split('=')[1];

        if (cookieToken) {
          await login(cookieToken, rememberMe)
          toast.success("Login successful!")
          const from = location.state?.from?.pathname || (user?.role === "admin" ? "/dashboard" : "/my-dashboard")
          navigate(from, { replace: true })
        } else {
          toast.error("Authentication failed - no token received")
        }
      } else {
        console.error("[Login] Login failed - no token or success=false:", { success, token: token ? "exists" : "missing" })
        toast.error(message || "Login failed - no authentication token received")
      }
    } catch (error) {
      console.error("Login error:", error.response?.data || error.message)
      toast.error(error.response?.data?.message || "Login failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setForgotPasswordStatus("loading")
    setIsLoading(true)

    try {
      const response = await axios.post(
        `${baseurl}/api/users/forgot-password`,
        { email: forgotEmail },
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }
        }
      )

      const { success, message } = response.data

      if (success) {
        setForgotPasswordStatus("success")
        toast.success("Password reset link sent to your email!")
      } else {
        setForgotPasswordStatus("error")
        toast.error(message || "Failed to send reset link")
      }
    } catch (error) {
      console.error("Forgot password error:", error.response?.data || error.message)
      setForgotPasswordStatus("error")
      toast.error(error.response?.data?.message || "Network error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (showForgotPassword) {
    return (
      <div className="login-container">
        <div className="login-background">
          <div className="bg-gradient"></div>
          <div className="bg-gradient"></div>
          <div className="bg-gradient"></div>
        </div>

        <div className="login-content">
          <motion.div
            className="login-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="login-header">
              <button className="back-button" onClick={() => setShowForgotPassword(false)}>
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </button>

              <div className="logo">
                <div className="logo-icon">
                  <Gauge className="w-6 h-6" />
                </div>
                <span className="logo-text">2tume</span>
              </div>

              <div className="login-title">
                <h1>Reset Password</h1>
                <p>Enter the email address for your admin account and we'll send a link to reset your password.</p>
              </div>
            </div>

            <form className="login-form" onSubmit={handleForgotPassword}>
              <div className="form-group">
                <div className="input-wrapper">
                  <div className="input-icon-wrapper">
                    <Mail className="input-icon" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    placeholder="Enter your email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {forgotPasswordStatus === "success" && (
                <div className="form-status success">
                  <CheckCircle className="w-5 h-5" />
                  <span>Reset link sent! Check your email.</span>
                </div>
              )}

              {forgotPasswordStatus === "error" && (
                <div className="form-status error">
                  <AlertCircle className="w-5 h-5" />
                  <span>Failed to send reset link. Please try again.</span>
                </div>
              )}

              <button type="submit" className="submit-button" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <span>Send Reset Link</span>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="bg-gradient"></div>
        <div className="bg-gradient"></div>
        <div className="bg-gradient"></div>
      </div>

      <div className="login-content">
        <motion.div
          className="login-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="login-header">
            <Link to="/" className="back-button">
              <ArrowLeft className="w-4 h-4" />
              Home
            </Link>

            <div className="logo">
              <div className="logo-icon">
                <Gauge className="w-6 h-6" />
              </div>
              <span className="logo-text">2tume</span>
            </div>

            <div className="login-title">
              <h1>Admin Access</h1>
              <p>Sign in to access the IoT dashboard and manage the system.</p>
            </div>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <div className="input-wrapper">
                <div className="input-icon-wrapper">
                  <Mail className="input-icon" />
                </div>
                <input
                  type="email"
                  name="emailid"
                  placeholder="Enter your email"
                  value={formData.emailid}
                  onChange={handleInputChange}
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
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
                <div className="input-icon-wrapper password-toggle" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="input-icon" /> : <Eye className="input-icon" />}
                </div>
              </div>
            </div>

            <div className="form-options">
              <label className="remember-me">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Remember me
              </label>

              <button type="button" className="forgot-password" onClick={() => setShowForgotPassword(true)}>
                Forgot password?
              </button>
            </div>

            <button type="submit" className="submit-button" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          <div className="login-footer">
            <p>
              By signing in, you agree to our{" "}
              <Link to="/terms" className="footer-link">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link to="/privacy" className="footer-link">
                Privacy Policy
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Login