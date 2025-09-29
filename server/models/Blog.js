const mongoose = require("mongoose")

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    author: {
      type: String,
      required: [true, "Author is required"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: ["Technology", "Tutorial", "Case Study", "Analytics", "News"],
    },
    excerpt: {
      type: String,
      required: [true, "Excerpt is required"],
      trim: true,
      maxlength: [500, "Excerpt cannot exceed 500 characters"],
    },
    content: {
      type: String,
      required: [true, "Content is required"],
    },
    published: {
      type: Boolean,
      default: false,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    publishDate: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    readTime: {
      type: Number, // in minutes
      default: 1,
    },
    views: {
      type: Number,
      default: 0,
    },
    metaDescription: {
      type: String,
      maxlength: [160, "Meta description cannot exceed 160 characters"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Create indexes for better performance
blogSchema.index({ slug: 1 })
blogSchema.index({ published: 1, publishDate: -1 })
blogSchema.index({ category: 1, published: 1 })
blogSchema.index({ featured: 1, published: 1 })
blogSchema.index({ createdBy: 1 })

// Virtual for formatted publish date
blogSchema.virtual("formattedDate").get(function () {
  return this.publishDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
})

// Pre-save middleware to generate slug and calculate read time
blogSchema.pre("save", function (next) {
  if (this.isModified("title")) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
  }

  if (this.isModified("content")) {
    // Calculate read time (average 200 words per minute)
    const wordCount = this.content.split(/\s+/).length
    this.readTime = Math.ceil(wordCount / 200)
  }

  if (!this.metaDescription && this.excerpt) {
    this.metaDescription = this.excerpt.substring(0, 160)
  }

  next()
})

// Static method to get published posts
blogSchema.statics.getPublished = function () {
  return this.find({ published: true }).sort({ publishDate: -1 })
}

// Static method to get featured posts
blogSchema.statics.getFeatured = function () {
  return this.find({ published: true, featured: true }).sort({ publishDate: -1 })
}

// Instance method to increment views
blogSchema.methods.incrementViews = function () {
  this.views += 1
  return this.save()
}

module.exports = mongoose.model("Blog", blogSchema)
