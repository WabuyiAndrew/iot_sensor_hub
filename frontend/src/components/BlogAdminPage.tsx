"use client"

import React from "react"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Plus, Edit, Trash2, Save, Calendar, User, Tag, FileText, Download, Star, Eye } from "lucide-react"
import axios from "axios"
import { useCookies } from "react-cookie"
import toast from "react-hot-toast"

const baseurl = process.env.REACT_APP_BASE_URL || "http://localhost:5000"

interface BlogPost {
  _id: string
  title: string
  slug: string
  author: string
  category: string
  excerpt: string
  content: string
  published: boolean
  featured: boolean
  publishDate: string
  views: number
  readTime: number
  createdBy: {
    name?: string
    emailid: string
  }
  createdAt: string
  updatedAt: string
}

export default function BlogAdminPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [editingPost, setEditingPost] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [cookies] = useCookies(["token"])

  const [formData, setFormData] = useState({
    title: "",
    author: "",
    category: "",
    excerpt: "",
    content: "",
    published: false,
    featured: false,
    publishDate: new Date().toISOString().split("T")[0],
    tags: "",
    metaDescription: "",
  })

  const categories = ["Technology", "Tutorial", "Case Study", "Analytics", "News"]

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    loadPosts()
    loadStats()
  }, [])

  const loadPosts = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${baseurl}/api/blog`, {
        headers: {
          Authorization: `Bearer ${cookies.token}`,
        },
      })

      if (response.data.success) {
        setPosts(response.data.data)
      }
    } catch (error: any) {
      console.error("Failed to load posts:", error)
      toast.error("Failed to load blog posts")
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await axios.get(`${baseurl}/api/blog/stats`, {
        headers: {
          Authorization: `Bearer ${cookies.token}`,
        },
      })

      if (response.data.success) {
        setStats(response.data.data)
      }
    } catch (error) {
      console.error("Failed to load stats:", error)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  const handleNewPost = () => {
    setFormData({
      title: "",
      author: "",
      category: "",
      excerpt: "",
      content: "",
      published: false,
      featured: false,
      publishDate: new Date().toISOString().split("T")[0],
      tags: "",
      metaDescription: "",
    })
    setEditingPost(null)
    setIsEditing(true)
  }

  const handleEditPost = (post: BlogPost) => {
    setFormData({
      title: post.title,
      author: post.author,
      category: post.category,
      excerpt: post.excerpt,
      content: post.content,
      published: post.published,
      featured: post.featured,
      publishDate: post.publishDate.split("T")[0],
      tags: "", // You can add tags field to your model if needed
      metaDescription: "", // Add this field to your form if needed
    })
    setEditingPost(post._id)
    setIsEditing(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const submitData = {
        ...formData,
        tags: formData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      }

      let response
      if (editingPost) {
        response = await axios.put(`${baseurl}/api/blog/${editingPost}`, submitData, {
          headers: {
            Authorization: `Bearer ${cookies.token}`,
            "Content-Type": "application/json",
          },
        })
      } else {
        response = await axios.post(`${baseurl}/api/blog`, submitData, {
          headers: {
            Authorization: `Bearer ${cookies.token}`,
            "Content-Type": "application/json",
          },
        })
      }

      if (response.data.success) {
        toast.success(`Post ${editingPost ? "updated" : "created"} successfully!`)
        setIsEditing(false)
        setEditingPost(null)
        await loadPosts()
        await loadStats()
      }
    } catch (error: any) {
      console.error("Error saving post:", error)
      const errorMessage = error.response?.data?.message || "Failed to save post"
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeletePost = async (id: string) => {
    setShowDeleteConfirm(id)
  }

  const confirmDelete = async () => {
    if (!showDeleteConfirm) return

    try {
      const response = await axios.delete(`${baseurl}/api/blog/${showDeleteConfirm}`, {
        headers: {
          Authorization: `Bearer ${cookies.token}`,
        },
      })

      if (response.data.success) {
        toast.success("Post deleted successfully!")
        await loadPosts()
        await loadStats()
      }
    } catch (error: any) {
      console.error("Error deleting post:", error)
      const errorMessage = error.response?.data?.message || "Failed to delete post"
      toast.error(errorMessage)
    } finally {
      setShowDeleteConfirm(null)
    }
  }

  const cancelDelete = () => {
    setShowDeleteConfirm(null)
  }

  const exportPosts = () => {
    const dataStr = JSON.stringify(posts, null, 2)
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr)
    const exportFileDefaultName = "blog-posts.json"
    const linkElement = document.createElement("a")
    linkElement.setAttribute("href", dataUri)
    linkElement.setAttribute("download", exportFileDefaultName)
    linkElement.click()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading blog posts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Blog Management</h1>
              <p className="text-gray-600 mt-1">Create and manage your blog posts</p>
              {stats && (
                <div className="flex gap-4 mt-3 text-sm text-gray-500">
                  <span>Total: {stats.totalPosts}</span>
                  <span>Published: {stats.publishedPosts}</span>
                  <span>Drafts: {stats.draftPosts}</span>
                  <span>Views: {stats.totalViews}</span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={exportPosts}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <button
                onClick={handleNewPost}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Post
              </button>
            </div>
          </div>
        </div>

        {/* Editor */}
        {isEditing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-6 mb-6"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">{editingPost ? "Edit Post" : "Create New Post"}</h2>
              <div className="flex gap-3">
                <button
                  type="submit"
                  form="blog-form"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSubmitting ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>

            <form id="blog-form" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter post title"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Author *</label>
                  <input
                    type="text"
                    name="author"
                    value={formData.author}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Author name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Publish Date</label>
                  <input
                    type="date"
                    name="publishDate"
                    value={formData.publishDate}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Excerpt *</label>
                <textarea
                  name="excerpt"
                  value={formData.excerpt}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief description of the post"
                  required
                />
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Content *</label>
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  rows={12}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="Write your blog post content here... (Markdown supported)"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Tip: You can use Markdown formatting for rich text content</p>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags (comma-separated)</label>
                <input
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="iot, water management, sensors"
                />
              </div>

              <div className="mt-6 flex gap-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="published"
                    checked={formData.published}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Published</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="featured"
                    checked={formData.featured}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Featured</span>
                </label>
              </div>
            </form>
          </motion.div>
        )}

        {/* Posts List */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-6">Blog Posts ({posts.length})</h2>
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No blog posts yet. Create your first post!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <motion.div
                  key={post._id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex gap-2 flex-wrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          post.published ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {post.published ? "Published" : "Draft"}
                      </span>
                      {post.featured && (
                        <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                          <Star className="w-3 h-3 inline mr-1" />
                          Featured
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditPost(post)}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit post"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePost(post._id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete post"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="flex items-center gap-1 text-xs text-blue-600 mb-1">
                      <Tag className="w-3 h-3" />
                      {post.category}
                    </div>
                    <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2">{post.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2">{post.excerpt}</p>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {post.author}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {post.views}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(post.publishDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Delete</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this blog post? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={cancelDelete}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
