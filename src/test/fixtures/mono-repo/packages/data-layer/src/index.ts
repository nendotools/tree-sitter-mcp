/**
 * Data layer package with repositories and models
 */

import { generateUUID, EventEmitter } from '@mono-repo/shared-utils'

export interface BaseEntity {
  id: string
  createdAt: Date
  updatedAt: Date
}

export interface Product extends BaseEntity {
  name: string
  description: string
  price: number
  category: string
  inStock: boolean
}

export interface Order extends BaseEntity {
  productIds: string[]
  customerName: string
  customerEmail: string
  totalAmount: number
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
}

type DataEvents = {
  productCreated: [Product]
  productUpdated: [Product]
  orderCreated: [Order]
  orderStatusChanged: [Order, string]
}

export class Repository<T extends BaseEntity> extends EventEmitter<DataEvents> {
  protected items: Map<string, T> = new Map()

  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    const now = new Date()
    const item = {
      ...data,
      id: generateUUID(),
      createdAt: now,
      updatedAt: now,
    } as T

    this.items.set(item.id, item)
    return item
  }

  async findById(id: string): Promise<T | null> {
    return this.items.get(id) || null
  }

  async findAll(): Promise<T[]> {
    return Array.from(this.items.values())
  }

  async update(id: string, updates: Partial<Omit<T, 'id' | 'createdAt'>>): Promise<T | null> {
    const item = this.items.get(id)
    if (!item) {
      return null
    }

    const updatedItem = {
      ...item,
      ...updates,
      updatedAt: new Date(),
    }

    this.items.set(id, updatedItem)
    return updatedItem
  }

  async delete(id: string): Promise<boolean> {
    return this.items.delete(id)
  }

  async count(): Promise<number> {
    return this.items.size
  }
}

export class ProductRepository extends Repository<Product> {
  async findByCategory(category: string): Promise<Product[]> {
    const products = await this.findAll()
    return products.filter(p => p.category.toLowerCase() === category.toLowerCase())
  }

  async findInStock(): Promise<Product[]> {
    const products = await this.findAll()
    return products.filter(p => p.inStock)
  }

  async create(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    const product = await super.create(data)
    this.emit('productCreated', product)
    return product
  }
}

export class OrderRepository extends Repository<Order> {
  async findByStatus(status: Order['status']): Promise<Order[]> {
    const orders = await this.findAll()
    return orders.filter(o => o.status === status)
  }

  async findByCustomer(customerEmail: string): Promise<Order[]> {
    const orders = await this.findAll()
    return orders.filter(o => o.customerEmail === customerEmail)
  }

  async updateStatus(id: string, status: Order['status']): Promise<Order | null> {
    const order = await this.findById(id)
    if (!order) {
      return null
    }

    const oldStatus = order.status
    const updatedOrder = await this.update(id, { status })

    if (updatedOrder) {
      this.emit('orderStatusChanged', updatedOrder, oldStatus)
    }

    return updatedOrder
  }

  async create(data: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<Order> {
    const order = await super.create(data)
    this.emit('orderCreated', order)
    return order
  }
}