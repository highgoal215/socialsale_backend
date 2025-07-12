const axios = require("axios");
const ErrorResponse = require("./errorResponse");

class CheckoutService {
  constructor() {
    this.baseUrl =
      process.env.NODE_ENV === "production"
        ? "https://api.checkout.com"
        : "https://api.sandbox.checkout.com";
    this.publicKey = process.env.CHECKOUT_PUBLIC_KEY;
    this.secretKey = process.env.CHECKOUT_SECRET_KEY;
    this.processingChannelId = process.env.CHECKOUT_CLIENT_ID; // This is actually a processing channel ID

    console.log("Checkout.com configuration:", {
      environment: process.env.NODE_ENV || "development",
      baseUrl: this.baseUrl,
      hasPublicKey: !!this.publicKey,
      hasSecretKey: !!this.secretKey,
      hasProcessingChannelId: !!this.processingChannelId,
    });
  }

  /**
   * Create a direct payment (not hosted)
   * @param {Object} paymentData - Payment details
   * @returns {Promise<Object>} Payment response
   */
  async createPayment(paymentData) {
    try {
      console.log("Creating direct payment with data:", {
        url: `${this.baseUrl}/payments`,
        requestHasAuth: !!this.secretKey,
        amountProvided: !!paymentData.amount,
        currencyProvided: !!paymentData.currency,
      });

      const response = await axios.post(
        `${this.baseUrl}/payments`,
        paymentData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.secretKey}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error("Checkout.com direct payment error:", {
        message: error.message,
        responseStatus: error.response?.status,
        responseData: error.response?.data,
      });

      throw new ErrorResponse(
        error.response?.data?.error_type || "Failed to create payment",
        error.response?.status || 500
      );
    }
  }

  /**
   * Create a hosted payment page
   * @param {Object} paymentData - Payment details
   * @returns {Promise<Object>} Hosted payment response with redirect URL
   */

  async createHostedPayment(paymentData) {
    try {
      // Add detailed logging to help troubleshoot
      console.log("Creating hosted payment with data:", {
        url: `${this.baseUrl}/hosted-payments`,
        requestHasAuth: !!this.secretKey,
        amountProvided: !!paymentData.amount,
        currencyProvided: !!paymentData.currency,
      });

      // Checkout.com expects the Authorization header in the format: 'Bearer sk_xxx'
      const response = await axios.post(
        `${this.baseUrl}/hosted-payments`,
        paymentData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.secretKey}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      // More detailed error logging
      console.error("Checkout.com hosted payment error:", {
        message: error.message,
        responseStatus: error.response?.status,
        responseData: error.response?.data,
      });

      throw new ErrorResponse(
        error.response?.data?.error_type || "Failed to create hosted payment",
        error.response?.status || 500
      );
    }
  }

  /**
   * Get payment details from Checkout.com
   * @param {string} paymentId - The payment ID
   * @returns {Promise<Object>} Payment details
   */
  async getPaymentDetails(paymentId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/payments/${paymentId}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.secretKey}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error(
        "Checkout.com get payment error:",
        error.response?.data || error.message
      );
      throw new ErrorResponse(
        error.response?.data?.error_type || "Failed to get payment details",
        error.response?.status || 500
      );
    }
  }

  /**
   * Refund a payment
   * @param {string} paymentId - The payment ID
   * @param {number} amount - Amount to refund (in minor currency unit)
   * @returns {Promise<Object>} Refund response
   */
  async refundPayment(paymentId, amount) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/payments/${paymentId}/refunds`,
        {
          amount,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.secretKey}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error(
        "Checkout.com refund error:",
        error.response?.data || error.message
      );
      throw new ErrorResponse(
        error.response?.data?.error_type || "Failed to refund payment",
        error.response?.status || 500
      );
    }
  }

  /**
   * Capture an authorized payment
   * @param {string} paymentId - The payment ID
   * @param {number} amount - Amount to capture (in minor currency unit)
   * @returns {Promise<Object>} Capture response
   */
  async capturePayment(paymentId, amount) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/payments/${paymentId}/captures`,
        {
          amount,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.secretKey}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error(
        "Checkout.com capture error:",
        error.response?.data || error.message
      );
      throw new ErrorResponse(
        error.response?.data?.error_type || "Failed to capture payment",
        error.response?.status || 500
      );
    }
  }
}

module.exports = new CheckoutService();
