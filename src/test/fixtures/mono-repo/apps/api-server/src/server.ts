/**
 * API Server application
 */

import express from 'express'
import { ProductRepository, OrderRepository } from '@mono-repo/data-layer'
import { formatDate, debounce } from '@mono-repo/shared-utils'

const app = express()
const port = process.env.PORT || 3000

app.use(express.json())

// Initialize repositories
const productRepo = new ProductRepository()
const orderRepo = new OrderRepository()

// Product routes
app.get('/api/products', async (req, res) => {
  try {
    const products = await productRepo.findAll()
    res.json(products)
  }
  catch {
    res.status(500).json({ error: 'Failed to fetch products' })
  }
})

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await productRepo.findById(req.params.id)
    if (!product) {
      return res.status(404).json({ error: 'Product not found' })
    }
    res.json(product)
  }
  catch {
    res.status(500).json({ error: 'Failed to fetch product' })
  }
})

app.post('/api/products', async (req, res) => {
  try {
    const product = await productRepo.create(req.body)
    res.status(201).json(product)
  }
  catch {
    res.status(400).json({ error: 'Failed to create product' })
  }
})

app.get('/api/products/category/:category', async (req, res) => {
  try {
    const products = await productRepo.findByCategory(req.params.category)
    res.json(products)
  }
  catch {
    res.status(500).json({ error: 'Failed to fetch products by category' })
  }
})

// Order routes
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await orderRepo.findAll()
    res.json(orders)
  }
  catch {
    res.status(500).json({ error: 'Failed to fetch orders' })
  }
})

app.get('/api/orders/:id', async (req, res) => {
  try {
    const order = await orderRepo.findById(req.params.id)
    if (!order) {
      return res.status(404).json({ error: 'Order not found' })
    }
    res.json(order)
  }
  catch {
    res.status(500).json({ error: 'Failed to fetch order' })
  }
})

app.post('/api/orders', async (req, res) => {
  try {
    const order = await orderRepo.create(req.body)
    res.status(201).json(order)
  }
  catch {
    res.status(400).json({ error: 'Failed to create order' })
  }
})

app.patch('/api/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body
    const order = await orderRepo.updateStatus(req.params.id, status)
    if (!order) {
      return res.status(404).json({ error: 'Order not found' })
    }
    res.json(order)
  }
  catch {
    res.status(400).json({ error: 'Failed to update order status' })
  }
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: formatDate(new Date()),
    uptime: process.uptime(),
  })
})

// Event listeners
productRepo.on('productCreated', (product) => {
  console.log(`Product created: ${product.name}`)
})

orderRepo.on('orderCreated', (order) => {
  console.log(`Order created for ${order.customerName}`)
})

orderRepo.on('orderStatusChanged', (order, oldStatus) => {
  console.log(`Order ${order.id} status changed from ${oldStatus} to ${order.status}`)
})

// Graceful shutdown
const shutdown = debounce(() => {
  console.log('Shutting down server...')
  process.exit(0)
}, 1000)

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})

export default app