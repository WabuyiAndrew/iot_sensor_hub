const express = require("express")
const {
  getBlogs,
  getBlogBySlug,
  createBlog,
  updateBlog,
  deleteBlog,
  getBlogStats,
} = require("../controllers/blogController")
const { userAuthMiddleware, authorizeRoles } = require("../middleware/AuthMiddleware")

const router = express.Router()

// Public routes
router.get("/", getBlogs) // Can be accessed by public for published posts
router.get("/slug/:slug", getBlogBySlug) // Can be accessed by public for published posts

// Protected routes - Admin only
router.use(userAuthMiddleware) // All routes below require authentication
router.use(authorizeRoles("admin")) // All routes below require admin role

router.post("/", createBlog)
router.get("/stats", getBlogStats)
router.put("/:id", updateBlog)
router.delete("/:id", deleteBlog)

module.exports = router
