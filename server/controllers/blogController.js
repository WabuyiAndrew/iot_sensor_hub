const Blog = require("../models/Blog")
const asyncHandler = require("express-async-handler")
const slugify = require("slugify") // ADDED: Import slugify

// @desc    Get all blog posts (admin) or published posts (public)
// @route   GET /api/blog
// @access  Public for published, Private/Admin for all
const getBlogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, category, featured, published } = req.query
  const isAdmin = req.user && req.user.role === "admin"

  const query = {}

  // If not admin, only show published posts
  if (!isAdmin) {
    query.published = true
  } else if (published !== undefined) {
    query.published = published === "true"
  }

  if (category) {
    query.category = category
  }

  if (featured !== undefined) {
    query.featured = featured === "true"
  }

  const options = {
    page: Number.parseInt(page),
    limit: Number.parseInt(limit),
    sort: { publishDate: -1 },
    populate: {
      path: "createdBy",
      select: "name emailid",
    },
  }

  try {
    const blogs = await Blog.find(query)
      .populate("createdBy", "name emailid")
      .sort({ publishDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await Blog.countDocuments(query)

    res.json({
      success: true,
      data: blogs,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching blog posts",
      error: error.message,
    })
  }
})

// @desc    Get single blog post by slug
// @route   GET /api/blog/:slug
// @access  Public for published, Private/Admin for all
const getBlogBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params
  const isAdmin = req.user && req.user.role === "admin"

  const query = { slug }
  if (!isAdmin) {
    query.published = true
  }

  const blog = await Blog.findOne(query).populate("createdBy", "name emailid")

  if (!blog) {
    return res.status(404).json({
      success: false,
      message: "Blog post not found",
    })
  }

  // Increment views for published posts
  if (blog.published && !isAdmin) {
    await blog.incrementViews()
  }

  res.json({
    success: true,
    data: blog,
  })
})

// @desc    Create new blog post
// @route   POST /api/blog
// @access  Private/Admin
const createBlog = asyncHandler(async (req, res) => {
  if (!req.user || !req.user._id) {
    return res.status(401).json({
      success: false,
      message: "Not authorized to create blog post. User information missing.",
    })
  }

  const {
    title,
    author,
    category,
    excerpt,
    content,
    published = false,
    featured = false,
    publishDate,
    tags = [],
    metaDescription,
  } = req.body

  // Validate required fields
  if (!title || !author || !category || !excerpt || !content) {
    return res.status(400).json({
      success: false,
      message: "Please provide all required fields: title, author, category, excerpt, content",
    })
  }

  // ADDED: Generate slug from title
  const slug = slugify(title, { lower: true, strict: true, trim: true })

  try {
    const blog = await Blog.create({
      title,
      slug, // ADDED: Include the generated slug
      author,
      category,
      excerpt,
      content,
      published,
      featured,
      publishDate: publishDate || Date.now(),
      tags,
      metaDescription,
      createdBy: req.user._id,
    })

    const populatedBlog = await Blog.findById(blog._id).populate("createdBy", "name emailid")

    res.status(201).json({
      success: true,
      message: "Blog post created successfully",
      data: populatedBlog,
    })
  } catch (error) {
    if (error.code === 11000) {
      // Handle duplicate key error, which might occur if slug is unique
      return res.status(400).json({
        success: false,
        message: "A blog post with this title (or generated slug) already exists",
      })
    }

    // Generic 500 for other unexpected errors
    res.status(500).json({
      success: false,
      message: "Error creating blog post",
      error: error.message,
    })
  }
})

// @desc    Update blog post
// @route   PUT /api/blog/:id
// @access  Private/Admin
const updateBlog = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { title } = req.body; // Destructure title to potentially update slug

  const blog = await Blog.findById(id)

  if (!blog) {
    return res.status(404).json({
      success: false,
      message: "Blog post not found",
    })
  }

  // ADDED: If title is updated, re-generate slug
  if (title) {
    req.body.slug = slugify(title, { lower: true, strict: true, trim: true });
  }

  try {
    const updatedBlog = await Blog.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    }).populate("createdBy", "name emailid")

    res.json({
      success: true,
      message: "Blog post updated successfully",
      data: updatedBlog,
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A blog post with this title (or generated slug) already exists",
      })
    }

    res.status(500).json({
      success: false,
      message: "Error updating blog post",
      error: error.message,
    })
  }
})

// @desc    Delete blog post
// @route   DELETE /api/blog/:id
// @access  Private/Admin
const deleteBlog = asyncHandler(async (req, res) => {
  const { id } = req.params

  const blog = await Blog.findById(id)

  if (!blog) {
    return res.status(404).json({
      success: false,
      message: "Blog post not found",
    })
  }

  await Blog.findByIdAndDelete(id)

  res.json({
    success: true,
    message: "Blog post deleted successfully",
  })
})

// @desc    Get blog statistics
// @route   GET /api/blog/stats
// @access  Private/Admin
const getBlogStats = asyncHandler(async (req, res) => {
  const totalPosts = await Blog.countDocuments()
  const publishedPosts = await Blog.countDocuments({ published: true })
  const featuredPosts = await Blog.countDocuments({ featured: true, published: true })
  const draftPosts = await Blog.countDocuments({ published: false })

  const categoryStats = await Blog.aggregate([
    { $match: { published: true } },
    { $group: { _id: "$category", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ])

  const totalViews = await Blog.aggregate([
    { $match: { published: true } },
    { $group: { _id: null, totalViews: { $sum: "$views" } } },
  ])

  res.json({
    success: true,
    data: {
      totalPosts,
      publishedPosts,
      featuredPosts,
      draftPosts,
      categoryStats,
      totalViews: totalViews[0]?.totalViews || 0,
    },
  })
})

module.exports = {
  getBlogs,
  getBlogBySlug,
  createBlog,
  updateBlog,
  deleteBlog,
  getBlogStats,
}
