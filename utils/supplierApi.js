const axios = require('axios');
const Order = require('../models/Order');
const ErrorResponse = require('../utils/errorResponse');

class SupplierApi {
  constructor() {
    this.apiUrl = process.env.SUPPLIER_API_URL;
    this.apiKey = process.env.SUPPLIER_API_KEY;
  }
  
  async getBalance() {
    try {
      // For development purposes, we'll return a mock response
      if (process.env.NODE_ENV === 'development' && !this.apiUrl) {
        return {
          balance: 1250.75,
          currency: 'USD'
        };
      }
      
      const response = await axios.post(`${this.apiUrl}/balance`, {
        key: this.apiKey
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching supplier balance:', error);
      throw new ErrorResponse('Failed to fetch supplier balance', 500);
    }
  }
  
  async placeOrder(order) {
    try {
      // Return empty response if no real API is configured
      if (process.env.NODE_ENV === 'development' && !this.apiUrl) {
        return {
          success: true,
          orderId: `SUP-${Date.now()}`,
          status: 'pending',
          message: 'Order placed successfully'
        };
      }
      
      // Prepare the request payload based on order type
      let payload = {
        key: this.apiKey,
        action: 'add',
        service: this.getServiceId(order.serviceType, order.serviceQuality),
        quantity: order.quantity,
        username: order.socialUsername
      };
      
      // Add URL for likes, views, and comments (not for followers/subscribers)
      if (order.serviceType !== 'followers' && order.serviceType !== 'subscribers' && order.postUrl) {
        payload.link = order.postUrl;
      }
      
      const response = await axios.post(`${this.apiUrl}/order`, payload);
      
      return response.data;
    } catch (error) {
      console.error('Error placing order with supplier:', error);
      throw new ErrorResponse('Failed to place order with supplier', 500);
    }
  }
  
  async checkOrderStatus(supplierOrderId) {
    try {
      // Return empty response if no real API is configured
      if (process.env.NODE_ENV === 'development' && !this.apiUrl) {
        return {
          orderId: supplierOrderId,
          status: 'pending',
          startCount: 0,
          remains: 0
        };
      }
      
      const response = await axios.post(`${this.apiUrl}/status`, {
        key: this.apiKey,
        order: supplierOrderId
      });
      
      return response.data;
    } catch (error) {
      console.error('Error checking order status with supplier:', error);
      throw new ErrorResponse('Failed to check order status with supplier', 500);
    }
  }
  
  async checkMultipleOrderStatus(supplierOrderIds) {
    try {
      // Return empty response if no real API is configured
      if (process.env.NODE_ENV === 'development' && !this.apiUrl) {
        const result = {};
        
        for (const id of supplierOrderIds) {
          result[id] = {
            status: 'pending',
            remains: 0
          };
        }
        
        return result;
      }
      
      const response = await axios.post(`${this.apiUrl}/status`, {
        key: this.apiKey,
        orders: supplierOrderIds.join(',')
      });
      
      return response.data;
    } catch (error) {
      console.error('Error checking multiple order status with supplier:', error);
      throw new ErrorResponse('Failed to check order status with supplier', 500);
    }
  }
  
  async getServices() {
    try {
      // Return empty array if no real API is configured
      if (process.env.NODE_ENV === 'development' && !this.apiUrl) {
        return [];
      }
      
      const response = await axios.post(`${this.apiUrl}/services`, {
        key: this.apiKey
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching supplier services:', error);
      throw new ErrorResponse('Failed to fetch supplier services', 500);
    }
  }
  
  // Helper method to map our service types to supplier service IDs
  getServiceId(serviceType, serviceQuality) {
    // This mapping would be based on the supplier's actual service IDs
    const serviceMap = {
      followers: {
        regular: 1,
        premium: 2
      },
      subscribers: {
        regular: 1, // Use same IDs as followers for now
        premium: 2
      },
      likes: {
        regular: 3,
        premium: 4
      },
      views: {
        regular: 5,
        premium: 5 // Only one quality for views in this example
      },
      comments: {
        regular: 6,
        premium: 6 // Only one quality for comments in this example
      }
    };
    
    return serviceMap[serviceType][serviceQuality] || 1;
  }
}

module.exports = new SupplierApi();