// Simple blog management system
// You can replace this with a headless CMS like Strapi, Contentful, or Sanity

const blogPosts = [
  {
    id: "future-iot-sensors",
    title: "The Future of IoT Sensors in Water Management",
    author: "Sarah Johnson",
    date: "January 15, 2024",
    category: "Technology",
    image: "/images/iot-sensors.png",
    excerpt:
      "Discover how next-generation IoT sensors are revolutionizing water monitoring with improved accuracy and energy efficiency.",
    content: `
      <p>The Internet of Things (IoT) has revolutionized how we monitor and manage water systems across the globe...</p>
      <!-- Full content here -->
    `,
    published: true,
    featured: true,
    tags: ["IoT", "Sensors", "Technology", "Water Management"],
    seo: {
      metaTitle: "The Future of IoT Sensors in Water Management | 2tume Blog",
      metaDescription:
        "Discover how next-generation IoT sensors are revolutionizing water monitoring with improved accuracy and energy efficiency.",
      keywords: ["IoT sensors", "water management", "smart monitoring", "technology"],
    },
  },
  // Add more blog posts here...
]

export function getAllPosts() {
  return blogPosts.filter((post) => post.published)
}

export function getFeaturedPosts(limit = 3) {
  return blogPosts.filter((post) => post.published && post.featured).slice(0, limit)
}

export function getPostBySlug(slug) {
  return blogPosts.find((post) => post.id === slug && post.published)
}

export function getPostsByCategory(category) {
  return blogPosts.filter((post) => post.published && post.category.toLowerCase() === category.toLowerCase())
}

export function getPostsByTag(tag) {
  return blogPosts.filter((post) => post.published && post.tags.some((t) => t.toLowerCase() === tag.toLowerCase()))
}

// Admin functions (you can create a simple admin interface for these)
export function createPost(postData) {
  const newPost = {
    id: generateSlug(postData.title),
    ...postData,
    date: new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  }
  blogPosts.push(newPost)
  return newPost
}

export function updatePost(id, updates) {
  const index = blogPosts.findIndex((post) => post.id === id)
  if (index !== -1) {
    blogPosts[index] = { ...blogPosts[index], ...updates }
    return blogPosts[index]
  }
  return null
}

export function deletePost(id) {
  const index = blogPosts.findIndex((post) => post.id === id)
  if (index !== -1) {
    return blogPosts.splice(index, 1)[0]
  }
  return null
}

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}
