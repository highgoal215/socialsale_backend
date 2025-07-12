const axios = require('axios');
const ErrorResponse = require('../utils/errorResponse');

class SupplierService {
  constructor() {
    this.apiUrl = 'https://justanotherpanel.com/api/v2';
    this.apiKey = 'fbb8b9e852ba4b8a88229973cd6fe42a';
  }

  /**
   * Get all services from supplier
   */
  async getServices() {
    try {
      const response = await axios.post(this.apiUrl, {
        key: this.apiKey,
        action: 'services'
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching supplier services:', error.response?.data || error.message);
      throw new ErrorResponse('Failed to fetch supplier services', 500);
    }
  }

  /**
   * Get filtered Instagram services
   */
  async getInstagramServices() {
    try {
      const allServices = await this.getServices();
      // Only return services with these specific IDs
      const specificServiceIds = ['1782', '1761', '2183', '3305', '8577', '340', '1234', '5678'];
      const serviceMap = {
        '1782': { type: 'likes', quality: 'general' },
        '1761': { type: 'likes', quality: 'premium' },
        '2183': { type: 'followers', quality: 'general' },
        '3305': { type: 'followers', quality: 'premium' },
        '8577': { type: 'views', quality: 'general' },
        '340': { type: 'views', quality: 'premium' },
        '1234': { type: 'comments', quality: 'general' },
        '5678': { type: 'comments', quality: 'premium' }
      };
      
      const filteredServices = allServices.filter(service => specificServiceIds.includes(service.service));
      
      // Add type and quality information to each service
      return filteredServices.map(service => ({
        ...service,
        serviceType: serviceMap[service.service]?.type || '',
        serviceQuality: serviceMap[service.service]?.quality || ''
      }));
    } catch (error) {
      throw new ErrorResponse('Failed to fetch Instagram services', 500);
    }
  }

  /**
   * Place an order with the supplier
   */
  async placeOrder(serviceId, link, quantity) {
    try {
      const response = await axios.post(this.apiUrl, {
        key: this.apiKey,
        action: 'add',
        service: serviceId,
        link: link,
        quantity: quantity
      });

      if (response.data.error) {
        throw new ErrorResponse(response.data.error, 400);
      }

      return response.data;
    } catch (error) {
      console.error('Error placing order with supplier:', error.response?.data || error.message);
      throw new ErrorResponse(error.response?.data?.error || 'Failed to place order with supplier', 500);
    }
  }

  /**
   * Check order status
   */
  async checkOrderStatus(orderId) {
    try {
      const response = await axios.post(this.apiUrl, {
        key: this.apiKey,
        action: 'status',
        order: orderId
      });

      if (response.data.error) {
        throw new ErrorResponse(response.data.error, 400);
      }

      return response.data;
    } catch (error) {
      console.error('Error checking order status:', error.response?.data || error.message);
      throw new ErrorResponse(error.response?.data?.error || 'Failed to check order status', 500);
    }
  }

  /**
   * Check multiple order statuses
   */
  async checkMultipleOrderStatus(orderIds) {
    try {
      const response = await axios.post(this.apiUrl, {
        key: this.apiKey,
        action: 'status',
        orders: orderIds.join(',')
      });

      return response.data;
    } catch (error) {
      console.error('Error checking multiple order status:', error.response?.data || error.message);
      throw new ErrorResponse(error.response?.data?.error || 'Failed to check order status', 500);
    }
  }

  /**
   * Get user balance
   */
  async getBalance() {
    try {
      const response = await axios.post(this.apiUrl, {
        key: this.apiKey,
        action: 'balance'
      });

      if (response.data.error) {
        throw new ErrorResponse(response.data.error, 400);
      }

      return response.data;
    } catch (error) {
      console.error('Error fetching supplier balance:', error.response?.data || error.message);
      throw new ErrorResponse(error.response?.data?.error || 'Failed to fetch supplier balance', 500);
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId) {
    try {
      const response = await axios.post(this.apiUrl, {
        key: this.apiKey,
        action: 'cancel',
        orders: orderId
      });

      if (response.data.error) {
        throw new ErrorResponse(response.data.error, 400);
      }

      return response.data;
    } catch (error) {
      console.error('Error canceling order:', error.response?.data || error.message);
      throw new ErrorResponse(error.response?.data?.error || 'Failed to cancel order', 500);
    }
  }

  /**
   * Request refill
   */
  async requestRefill(orderId) {
    try {
      const response = await axios.post(this.apiUrl, {
        key: this.apiKey,
        action: 'refill',
        order: orderId
      });

      if (response.data.error) {
        throw new ErrorResponse(response.data.error, 400);
      }

      return response.data;
    } catch (error) {
      console.error('Error requesting refill:', error.response?.data || error.message);
      throw new ErrorResponse(error.response?.data?.error || 'Failed to request refill', 500);
    }
  }

  /**
   * Check refill status
   */
  async checkRefillStatus(refillId) {
    try {
      const response = await axios.post(this.apiUrl, {
        key: this.apiKey,
        action: 'refill_status',
        refill: refillId
      });

      if (response.data.error) {
        throw new ErrorResponse(response.data.error, 400);
      }

      return response.data;
    } catch (error) {
      console.error('Error checking refill status:', error.response?.data || error.message);
      throw new ErrorResponse(error.response?.data?.error || 'Failed to check refill status', 500);
    }
  }
}

module.exports = new SupplierService();