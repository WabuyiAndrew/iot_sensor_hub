"use client"
import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import {
  ArrowRight,
  Gauge,
  Shield,
  Zap,
  Globe,
  Bell,
  BarChart3,
  Smartphone,
  Settings,
  Users,
  TrendingUp,
  Droplets,
  Thermometer,
  Activity,
  MapPin,
  Calendar,
  User,
  Mail,
  Phone,
  Clock,
  Linkedin,
  Twitter,
  Facebook,
  Instagram,
  Menu,
  X,
  Sparkles,
  ChevronRight,
  Star,
  CheckCircle,
  AlertCircle,
  Server,
  Wifi,
  Database,
  Sun,
  Moon,
} from "lucide-react"
import axios from "axios"
import "./LandingPage.css"

const baseurl = process.env.REACT_APP_BASE_URL || "http://localhost:5000"

const LandingPage = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      const savedMode = localStorage.getItem("darkMode")
      return savedMode ? JSON.parse(savedMode) : false
    }
    return false
  })

  // Blog posts state
  const [blogPosts, setBlogPosts] = useState([])
  const [blogLoading, setBlogLoading] = useState(true)

  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(darkMode))
    if (darkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [darkMode])

  // Fetch blog posts
  useEffect(() => {
    const fetchBlogPosts = async () => {
      try {
        setBlogLoading(true)
        const response = await axios.get(`${baseurl}/api/blog?limit=3&featured=true`)

        if (response.data.success) {
          setBlogPosts(response.data.data)
        }
      } catch (error) {
        console.error("Failed to fetch blog posts:", error)
        // Fallback to empty array if fetch fails
        setBlogPosts([])
      } finally {
        setBlogLoading(false)
      }
    }

    fetchBlogPosts()
  }, [])

  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 },
  }

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const floatingAnimation = {
    animate: {
      y: [-10, 10, -10],
      transition: {
        duration: 6,
        repeat: Number.POSITIVE_INFINITY,
        ease: "easeInOut",
      },
    },
  }

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState(null)

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus(null)

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setSubmitStatus("success")
        setFormData({ name: "", email: "", subject: "", message: "" })
      } else {
        setSubmitStatus("error")
      }
    } catch (error) {
      setSubmitStatus("error")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={`landing-page ${darkMode ? "dark" : ""}`}>
      {/* Header */}
      <header className="header">
        <nav className="nav">
          <div className="nav-brand">
            <div className="logo">
              <div className="logo-icon">
                <Gauge className="w-6 h-6" />
              </div>
              <span className="logo-text">2tume</span>
            </div>
          </div>
          <div className={`nav-menu ${isMenuOpen ? "active" : ""}`}>
            <a href="#home" className="nav-link" onClick={() => setIsMenuOpen(false)}>
              Home
            </a>
            <a href="#about" className="nav-link" onClick={() => setIsMenuOpen(false)}>
              About
            </a>
            <a href="#features" className="nav-link" onClick={() => setIsMenuOpen(false)}>
              Features
            </a>
            <a href="#contact" className="nav-link" onClick={() => setIsMenuOpen(false)}>
              Contact
            </a>
            <a href="#blog" className="nav-link" onClick={() => setIsMenuOpen(false)}>
              Blog
            </a>
            <Link to="/login" className="get-started-btn" onClick={() => setIsMenuOpen(false)}>
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="nav-actions">
            <button
              className="theme-toggle"
              onClick={() => setDarkMode(!darkMode)}
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {darkMode ? (
                <motion.div initial={{ rotate: 0 }} animate={{ rotate: 360 }} transition={{ duration: 0.5 }}>
                  <Sun className="w-5 h-5" />
                </motion.div>
              ) : (
                <motion.div initial={{ rotate: 0 }} animate={{ rotate: 360 }} transition={{ duration: 0.5 }}>
                  <Moon className="w-5 h-5" />
                </motion.div>
              )}
            </button>
            <div className="hamburger" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section id="home" className="hero">
        <div className="hero-bg">
          <div className="hero-particles"></div>
          <div className="hero-grid"></div>
        </div>
        <div className="container">
          <motion.div className="hero-content" initial="initial" animate="animate" variants={staggerContainer}>
            <motion.div className="hero-badge" variants={fadeInUp}>
              <Sparkles className="w-4 h-4" />
              <span>Next-Gen IoT Platform</span>
            </motion.div>
            <motion.h1 className="hero-title" variants={fadeInUp}>
              Smart IoT Solutions for
              <span className="gradient-text"> Water Management</span>
            </motion.h1>
            <motion.p className="hero-subtitle" variants={fadeInUp}>
              Monitor, control, and optimize your water systems with real-time IoT sensors, advanced analytics, and
              intelligent automation. Transform your infrastructure with 2tume's cutting-edge platform.
            </motion.p>
            <motion.div className="hero-buttons" variants={fadeInUp}>
              <Link to="/login" className="cta-primary">
                <span>Start Monitoring</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>
            <motion.div className="hero-stats" variants={fadeInUp}>
              <div className="stat">
                <div className="stat-icon">
                  <Droplets className="w-6 h-6" />
                </div>
                <div className="stat-content">
                  <div className="stat-number">500+</div>
                  <div className="stat-label">Tanks Monitored</div>
                </div>
              </div>
              <div className="stat">
                <div className="stat-icon">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div className="stat-content">
                  <div className="stat-number">99.9%</div>
                  <div className="stat-label">Uptime</div>
                </div>
              </div>
              <div className="stat">
                <div className="stat-icon">
                  <Users className="w-6 h-6" />
                </div>
                <div className="stat-content">
                  <div className="stat-number">1000+</div>
                  <div className="stat-label">Active Users</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
          <motion.div
            className="hero-visual"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="dashboard-preview">
              <div className="dashboard-mockup">
                <div className="mockup-header">
                  <div className="mockup-controls">
                    <div className="control red"></div>
                    <div className="control yellow"></div>
                    <div className="control green"></div>
                  </div>
                  <div className="mockup-title">2tume Dashboard</div>
                </div>
                <div className="mockup-content">
                  <div className="mockup-sidebar">
                    <div className="sidebar-item active">
                      <Gauge className="w-4 h-4" />
                      <span>Dashboard</span>
                    </div>
                    <div className="sidebar-item">
                      <Server className="w-4 h-4" />
                      <span>Devices</span>
                    </div>
                    <div className="sidebar-item">
                      <BarChart3 className="w-4 h-4" />
                      <span>Analytics</span>
                    </div>
                  </div>
                  <div className="mockup-main">
                    <div className="metric-cards">
                      <div className="metric-card">
                        <Thermometer className="w-5 h-5 text-blue-500" />
                        <div className="metric-value">24°C</div>
                        <div className="metric-label">Temperature</div>
                      </div>
                      <div className="metric-card">
                        <Droplets className="w-5 h-5 text-cyan-500" />
                        <div className="metric-value">85%</div>
                        <div className="metric-label">Water Level</div>
                      </div>
                      <div className="metric-card">
                        <Activity className="w-5 h-5 text-green-500" />
                        <div className="metric-value">Online</div>
                        <div className="metric-label">Status</div>
                      </div>
                    </div>
                    <div className="chart-area">
                      <div className="chart-placeholder">
                        <div className="chart-bars">
                          <div className="bar" style={{ height: "60%" }}></div>
                          <div className="bar" style={{ height: "80%" }}></div>
                          <div className="bar" style={{ height: "45%" }}></div>
                          <div className="bar" style={{ height: "90%" }}></div>
                          <div className="bar" style={{ height: "70%" }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="dashboard-overlay">
                <div className="floating-widgets">
                  <motion.div className="widget widget-1" {...floatingAnimation}>
                    <Wifi className="w-4 h-4" />
                    <span>Connected</span>
                  </motion.div>
                  <motion.div
                    className="widget widget-2"
                    {...floatingAnimation}
                    transition={{ ...floatingAnimation.animate.transition, delay: 1 }}
                  >
                    <Database className="w-4 h-4" />
                    <span>Data Synced</span>
                  </motion.div>
                  <motion.div
                    className="widget widget-3"
                    {...floatingAnimation}
                    transition={{ ...floatingAnimation.animate.transition, delay: 2 }}
                  >
                    <Bell className="w-4 h-4" />
                    <span>3 Alerts</span>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <div className="container">
          <motion.div
            className="section-header"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="section-badge">
              <Settings className="w-4 h-4" />
              <span>Advanced Features</span>
            </div>
            <h2>Why Choose 2tume IoT Platform?</h2>
            <p>Comprehensive solutions designed for modern water management systems</p>
          </motion.div>
          <div className="features-grid">
            {[
              {
                icon: <Activity className="w-8 h-8" />,
                title: "Real-time Monitoring",
                description:
                  "Monitor water levels, temperature, and quality parameters in real-time with advanced IoT sensors and instant data visualization.",
                gradient: "from-blue-500 to-cyan-500",
                delay: 0.1,
              },
              {
                icon: <Bell className="w-8 h-8" />,
                title: "Smart Alerts",
                description:
                  "Receive instant notifications for critical events, maintenance needs, and system anomalies with intelligent alert management.",
                gradient: "from-purple-500 to-pink-500",
                delay: 0.2,
              },
              {
                icon: <BarChart3 className="w-8 h-8" />,
                title: "Advanced Analytics",
                description:
                  "Gain insights with powerful analytics, predictive maintenance, and consumption pattern analysis for optimal performance.",
                gradient: "from-green-500 to-emerald-500",
                delay: 0.3,
              },
              {
                icon: <Smartphone className="w-8 h-8" />,
                title: "Mobile Access",
                description:
                  "Access your dashboard anywhere, anytime with our responsive web platform and dedicated mobile applications.",
                gradient: "from-orange-500 to-red-500",
                delay: 0.4,
              },
              {
                icon: <Shield className="w-8 h-8" />,
                title: "Secure & Reliable",
                description:
                  "Enterprise-grade security with encrypted data transmission, secure authentication, and 99.9% uptime guarantee.",
                gradient: "from-indigo-500 to-purple-500",
                delay: 0.5,
              },
              {
                icon: <Zap className="w-8 h-8" />,
                title: "Easy Integration",
                description:
                  "Seamlessly integrate with existing systems and scale from single tanks to enterprise networks with our flexible APIs.",
                gradient: "from-teal-500 to-cyan-500",
                delay: 0.6,
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                className="feature-card"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: feature.delay }}
                whileHover={{ y: -10, transition: { duration: 0.3 } }}
              >
                <div className={`feature-icon bg-gradient-to-r ${feature.gradient}`}>{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <div className="feature-arrow">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about">
        <div className="container">
          <div className="about-content">
            <motion.div
              className="about-text"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="section-badge">
                <Globe className="w-4 h-4" />
                <span>About 2tume</span>
              </div>
              <h2>Revolutionizing Water Management Through Innovation</h2>
              <p>
                2tume is a cutting-edge IoT platform specializing in smart water management solutions. Founded with the
                vision to revolutionize how we monitor and manage water resources, we combine advanced sensor technology
                with intelligent analytics to create sustainable solutions.
              </p>
              <p>
                Our platform serves municipalities, industries, and residential complexes worldwide, helping them
                optimize water usage, prevent wastage, and ensure reliable supply through predictive maintenance and
                real-time monitoring capabilities.
              </p>
              <div className="about-features">
                {[
                  { icon: <Shield className="w-5 h-5" />, text: "ISO 27001 Certified Security" },
                  { icon: <Clock className="w-4 h-4" />, text: "24/7 Technical Support" },
                  { icon: <Globe className="w-4 h-4" />, text: "Global Infrastructure" },
                  { icon: <Star className="w-4 h-4" />, text: "Award-Winning Platform" },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    className="about-feature"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="feature-check">{item.icon}</div>
                    <span>{item.text}</span>
                  </motion.div>
                ))}
              </div>
              <div className="about-cta">
                <Link to="/login" className="cta-primary">
                  <span>Join Our Mission</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
            <motion.div
              className="about-visual"
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="about-image-container">
                <div className="tech-grid">
                  <div className="tech-item">
                    <Server className="w-8 h-8" />
                    <span>IoT Sensors</span>
                  </div>
                  <div className="tech-item">
                    <Database className="w-8 h-8" />
                    <span>Cloud Storage</span>
                  </div>
                  <div className="tech-item">
                    <BarChart3 className="w-8 h-8" />
                    <span>Analytics</span>
                  </div>
                  <div className="tech-item">
                    <Smartphone className="w-8 h-8" />
                    <span>Mobile Apps</span>
                  </div>
                </div>
                <div className="about-stats">
                  <div className="stat-card">
                    <div className="stat-value">50+</div>
                    <div className="stat-desc">Countries Served</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">10M+</div>
                    <div className="stat-desc">Data Points Daily</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Blog Section - UPDATED TO FETCH REAL DATA */}
      <section id="blog" className="blog">
        <div className="container">
          <motion.div
            className="section-header"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="section-badge">
              <Calendar className="w-4 h-4" />
              <span>Latest Insights</span>
            </div>
            <h2>From Our Blog</h2>
            <p>Stay updated with the latest trends in IoT and water management technology</p>
          </motion.div>
          <div className="blog-grid">
            {blogLoading ? (
              // Loading skeleton
              Array.from({ length: 3 }).map((_, index) => (
                <motion.div
                  key={index}
                  className="blog-card"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="blog-image">
                    <div className="blog-image-placeholder animate-pulse bg-gray-200">
                      <BarChart3 className="w-12 h-12 text-gray-400" />
                    </div>
                    <div className="blog-category bg-gray-200 animate-pulse">Loading...</div>
                  </div>
                  <div className="blog-content">
                    <div className="h-6 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse mb-4"></div>
                    <div className="blog-meta">
                      <div className="blog-author">
                        <User className="w-4 h-4" />
                        <span className="bg-gray-200 animate-pulse rounded w-20 h-4"></span>
                      </div>
                      <div className="blog-date">
                        <Calendar className="w-4 h-4" />
                        <span className="bg-gray-200 animate-pulse rounded w-24 h-4"></span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : blogPosts.length > 0 ? (
              blogPosts.map((post, index) => (
                <motion.article
                  key={post._id}
                  className="blog-card"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -10, transition: { duration: 0.3 } }}
                >
                  <div className="blog-image">
                    <div className="blog-image-placeholder">
                      <BarChart3 className="w-12 h-12" />
                    </div>
                    <div className="blog-category">{post.category}</div>
                  </div>
                  <div className="blog-content">
                    <h3>{post.title}</h3>
                    <p>{post.excerpt}</p>
                    <div className="blog-meta">
                      <div className="blog-author">
                        <User className="w-4 h-4" />
                        <span>{post.author}</span>
                      </div>
                      <div className="blog-date">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(post.publishDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Link to={`/blog/${post.slug}`} className="blog-link">
                      Read More
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </motion.article>
              ))
            ) : (
              // No posts available
              <div className="col-span-full text-center py-12">
                <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No Blog Posts Yet</h3>
                <p className="text-gray-500">Check back soon for our latest insights and updates.</p>
              </div>
            )}
          </div>
          {/* View All Posts Button */}
          <motion.div
            className="text-center mt-12"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
          >
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <span className="font-semibold">View All Posts</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="contact">
        <div className="container">
          <motion.div
            className="section-header"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="section-badge">
              <Mail className="w-4 h-4" />
              <span>Get in Touch</span>
            </div>
            <h2>Ready to Transform Your Water Management?</h2>
            <p>Contact our experts today and discover how 2tume can revolutionize your operations</p>
          </motion.div>
          <div className="contact-content">
            <motion.div
              className="contact-info"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="contact-card">
                <h3>Contact Information</h3>
                <div className="contact-item">
                  <div className="contact-icon">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div className="contact-details">
                    <h4>Address</h4>
                    <p>
                      123 IoT Innovation Drive
                      <br />
                      Tech City, TC 12345
                      <br />
                      United States
                    </p>
                  </div>
                </div>
                <div className="contact-item">
                  <div className="contact-icon">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div className="contact-details">
                    <h4>Phone</h4>
                    <p>
                      +1 (555) 123-4567
                      <br />
                      +1 (555) 987-6543
                    </p>
                  </div>
                </div>
                <div className="contact-item">
                  <div className="contact-icon">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div className="contact-details">
                    <h4>Email</h4>
                    <p>
                      info@2tume.com
                      <br />
                      support@2tume.com
                    </p>
                  </div>
                </div>
                <div className="contact-item">
                  <div className="contact-icon">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div className="contact-details">
                    <h4>Business Hours</h4>
                    <p>
                      Monday - Friday: 9:00 AM - 6:00 PM
                      <br />
                      Saturday: 10:00 AM - 4:00 PM
                      <br />
                      Sunday: Closed
                    </p>
                  </div>
                </div>
                <div className="social-section">
                  <h4>Follow Us</h4>
                  <div className="social-links">
                    <a href="#" className="social-link linkedin">
                      <Linkedin className="w-5 h-5" />
                    </a>
                    <a href="#" className="social-link twitter">
                      <Twitter className="w-5 h-5" />
                    </a>
                    <a href="#" className="social-link facebook">
                      <Facebook className="w-5 h-5" />
                    </a>
                    <a href="#" className="social-link instagram">
                      <Instagram className="w-5 h-5" />
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
            <motion.div
              className="contact-form-container"
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="contact-form-card">
                <h3>Send us a Message</h3>
                <form className="contact-form" onSubmit={handleSubmit}>
                  <div className="form-row">
                    <div className="form-group">
                      <input
                        type="text"
                        name="name"
                        placeholder="Your Name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <input
                        type="email"
                        name="email"
                        placeholder="Your Email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <input
                      type="text"
                      name="subject"
                      placeholder="Subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <textarea
                      name="message"
                      placeholder="Your Message"
                      rows="6"
                      value={formData.message}
                      onChange={handleInputChange}
                      required
                    ></textarea>
                  </div>
                  {submitStatus === "success" && (
                    <div className="form-status success">
                      <CheckCircle className="w-5 h-5" />
                      <span>Message sent successfully! We'll get back to you soon.</span>
                    </div>
                  )}
                  {submitStatus === "error" && (
                    <div className="form-status error">
                      <AlertCircle className="w-5 h-5" />
                      <span>Failed to send message. Please try again.</span>
                    </div>
                  )}
                  <button type="submit" className="submit-btn" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <div className="spinner"></div>
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Message</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <div className="footer-logo">
                <div className="logo">
                  <div className="logo-icon">
                    <Gauge className="w-6 h-6" />
                  </div>
                  <span className="logo-text">2tume</span>
                </div>
                <p>Transforming water management through intelligent IoT solutions and cutting-edge technology.</p>
              </div>
            </div>
            <div className="footer-section">
              <h4>Quick Links</h4>
              <ul>
                <li>
                  <a href="#home">Home</a>
                </li>
                <li>
                  <a href="#about">About</a>
                </li>
                <li>
                  <Link to="/login">Dashboard</Link>
                </li>
                <li>
                  <a href="#blog">Blog</a>
                </li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Services</h4>
              <ul>
                <li>
                  <a href="#">Water Tank Monitoring</a>
                </li>
                <li>
                  <a href="#">IoT Sensor Installation</a>
                </li>
                <li>
                  <a href="#">Data Analytics</a>
                </li>
                <li>
                  <a href="#">Technical Support</a>
                </li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Contact</h4>
              <ul>
                <li>
                  <Mail className="w-4 h-4" />
                  <span>info@2tume.com</span>
                </li>
                <li>
                  <Phone className="w-4 h-4" />
                  <span>+1 (555) 123-4567</span>
                </li>
                <li>
                  <MapPin className="w-4 h-4" />
                  <span>Tech City, TC 12345</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2024 2tume. All rights reserved.</p>
            <div className="footer-links">
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
              <a href="#">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
