const blogRouter = require('express').Router()
require('express-async-errors')
const jwt = require('jsonwebtoken')

const Blog = require('../models/blog')
const User = require('../models/user')
const Comment = require('../models/comment')
const { info, error } = require('../utils/logger')
const { validate } = require('../models/comment')

blogRouter.get('/', async (request, response) => {
  const blogs = await Blog.find({}).populate('user', { username: 1 })

  // info("Here are the blogs:", blogs);
  response.status(200).json(blogs)
})

blogRouter.get('/:id', async (request, response) => {
  const id = request.params.id
  const blog = await Blog.findById(id).populate('comments')
  console.log('A id speifi blog -->', blog)

  // info("Here are the blogs:", blogs);
  response.status(200).json(blog)
})

blogRouter.post('/:id/comments', async (request, response) => {
  const id = request.params.id
  const blog = await Blog.findById(id)

  const comment = request.body

  const newComment = new Comment(comment)
  await newComment.save()
  blog.comments.push(newComment)
  blog.save()
  response.status(201).json(blog)
})

blogRouter.post('/', async (request, response) => {
  const { title, url, likes, author } = request.body

  if (!title || !url) {
    // console.log("Error :-> No title");
    return response.status(400).json({ error: 'Title or Url unspecified' })
  }

  const token = request.token
  const user = request.user

  const decodedToken = jwt.verify(token, process.env.SECRET)
  if (!decodedToken.id || !user) {
    return response.status(401).json({ error: 'token missing or invalid' })
  }

  if (decodedToken.id !== user._id.toString()) {
    return response.status(401).json({ error: 'Unauthorized' })
  }

  const blog = new Blog({
    title,
    url,
    user: user._id,
    author,
    likes: likes ? likes : 0,
  })

  const savedBlog = await blog.save()

  user.blogs = user.blogs.concat(savedBlog._id)

  const savedUser = await user.save()

  response.status(201).json(savedBlog)
})

blogRouter.delete('/:id', async (request, response) => {
  const id = request.params.id

  const blog = await Blog.findById(id)

  if (!blog.user) {
    return response.status(401).json({ error: 'No such user exists' })
  }

  const tokenUserId = request.user.id

  if (blog.user.toString() !== tokenUserId.toString()) {
    return response
      .status(401)
      .json({ error: 'Deleting only possible by the creator' })
  }
  console.log('deleting')
  const deletedBlog = await Blog.findByIdAndRemove(id)
  if (!deletedBlog) {
    return response.status(400).end()
  }
  response.status(204).end()
})

blogRouter.put('/:id', async (request, response) => {
  const id = request.params.id
  const body = request.body

  const updatedBlog = await Blog.findByIdAndUpdate(id, body, {
    new: true,
  })
  response.status(200).json(updatedBlog)
})

module.exports = blogRouter
