const axios = require('axios');
const crypto = require('crypto');
const ErrorResponse = require('../utils/errorResponse');

// Initialize Stripe only if API key is available
let stripe;
try {
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  }
} catch (error) {
  console.warn('Stripe initialization failed:', error.message);
}

class PaymentService {
  constructor() {
    this.configureGateways();
  }

  configureGateways() {
    // Initialize payment gateway configurations
    this.stripeEnabled = !!stripe;
    this.paypalEnabled = !!process.env.PAYPAL_CLIENT_ID && !!process.env.PAYPAL_SECRET;
    this.coinbaseEnabled = !!process.env.COINBASE_API_KEY;
    
    // Configure PayPal base URLs
    this.paypalBaseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://api-m.paypal.com' 
      : 'https://api-m.sandbox.paypal.com';
    
    // Log available payment methods
    console.log('Available payment methods:');
    console.log('- Stripe:', this.stripeEnabled ? 'Enabled' : 'Disabled');
    console.log('- PayPal:', this.paypalEnabled ? 'Enabled' : 'Disabled');
    console.log('- Coinbase:', this.coinbaseEnabled ? 'Enabled' : 'Disabled');
  }

  // Get PayPal access token
  async getPayPalAccessToken() {
    try {
      if (!this.paypalEnabled) {
        throw new ErrorResponse('PayPal is not configured', 500);
      }

      const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`).toString('base64');
      
      const response = await axios({
        method: 'post',
        url: `${this.paypalBaseUrl}/v1/oauth2/token`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${auth}`
        },
        data: 'grant_type=client_credentials'
      });

      return response.data.access_token;
    } catch (error) {
      console.error('PayPal authentication error:', error.response?.data || error.message);
      throw new ErrorResponse('Failed to authenticate with PayPal', 500);
    }
  }

  // Create a payment intent with Stripe
  async createStripePaymentIntent(amount, currency = 'usd', metadata = {}) {
    try {
      if (!this.stripeEnabled) {
        throw new ErrorResponse('Stripe payments are not configured', 500);
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Stripe requires amount in cents
        currency,
        metadata,
        payment_method_types: ['card'],
        capture_method: 'automatic',
      });

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      };
    } catch (error) {
      console.error('Stripe payment intent error:', error);
      throw new ErrorResponse(error.message || 'Failed to create payment with Stripe', 500);
    }
  }

  // Verify Stripe payment
  async verifyStripePayment(paymentIntentId) {
    try {
      if (!this.stripeEnabled) {
        throw new ErrorResponse('Stripe payments are not configured', 500);
      }

      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      return {
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100, // Convert back from cents
        currency: paymentIntent.currency,
        paymentMethod: paymentIntent.payment_method_type,
        verified: paymentIntent.status === 'succeeded',
        metadata: paymentIntent.metadata
      };
    } catch (error) {
      console.error('Stripe payment verification error:', error);
      throw new ErrorResponse(error.message || 'Failed to verify Stripe payment', 500);
    }
  }

  // Create a PayPal order
  async createPayPalOrder(amount, currency = 'USD', description = 'Payment', orderId = null) {
    try {
      if (!this.paypalEnabled) {
        throw new ErrorResponse('PayPal payments are not configured', 500);
      }

      const accessToken = await this.getPayPalAccessToken();
      
      const payload = {
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: orderId || `REF-${Date.now()}`,
          description,
          amount: {
            currency_code: currency,
            value: amount.toFixed(2)
          }
        }],
        application_context: {
          brand_name: process.env.BRAND_NAME || 'Instagram Growth Service',
          return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/success`,
          cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/cancel`
        }
      };

      const response = await axios({
        method: 'post',
        url: `${this.paypalBaseUrl}/v2/checkout/orders`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        data: payload
      });

      return {
        id: response.data.id,
        status: response.data.status,
        approvalUrl: response.data.links.find(link => link.rel === 'approve').href
      };
    } catch (error) {
      console.error('PayPal order creation error:', error.response?.data || error.message);
      throw new ErrorResponse(error.response?.data?.message || 'Failed to create PayPal order', 500);
    }
  }

  // Capture PayPal payment
  async capturePayPalPayment(paypalOrderId) {
    try {
      if (!this.paypalEnabled) {
        throw new ErrorResponse('PayPal payments are not configured', 500);
      }

      const accessToken = await this.getPayPalAccessToken();
      
      const response = await axios({
        method: 'post',
        url: `${this.paypalBaseUrl}/v2/checkout/orders/${paypalOrderId}/capture`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const captureData = response.data;
      const captureDetails = captureData.purchase_units[0].payments.captures[0];

      return {
        id: captureData.id,
        status: captureData.status,
        captureId: captureDetails.id,
        amount: parseFloat(captureDetails.amount.value),
        currency: captureDetails.amount.currency_code,
        payerId: captureData.payer.payer_id,
        verified: captureData.status === 'COMPLETED',
        captureDetails
      };
    } catch (error) {
      console.error('PayPal payment capture error:', error.response?.data || error.message);
      throw new ErrorResponse(error.response?.data?.message || 'Failed to capture PayPal payment', 500);
    }
  }

  // Generate crypto payment address
  async generateCryptoPaymentAddress(currency) {
    try {
      if (!this.coinbaseEnabled) {
        throw new ErrorResponse('Cryptocurrency payments are not configured', 500);
      }

      // This is a simplified example - in a real implementation, you would use
      // Coinbase Commerce API or another crypto payment processor
      
      // For now, we'll return mock addresses for testing
      const addresses = {
        crypto_btc: process.env.BTC_ADDRESS || '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy',
        crypto_eth: process.env.ETH_ADDRESS || '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        crypto_usdt: process.env.USDT_ADDRESS || 'TKRJDpSEfgLsJHuMpczDwDQiTGM6HNVdqP',
        crypto_bnb: process.env.BNB_ADDRESS || 'bnb1m4m8vxppju0z4d07fwgacc7xyhyktxvgqgr0n3',
        crypto_sol: process.env.SOL_ADDRESS || '9GH9RMKnUkFPBcQmwKWxeQjv952NLvCRQZBoZGveAeBT'
      };

      if (!addresses[currency]) {
        throw new ErrorResponse(`Unsupported cryptocurrency: ${currency}`, 400);
      }

      // Generate a unique payment reference
      const reference = crypto.randomBytes(8).toString('hex');

      return {
        address: addresses[currency],
        reference
      };
    } catch (error) {
      console.error('Crypto payment address generation error:', error);
      throw new ErrorResponse(error.message || 'Failed to generate crypto payment address', 500);
    }
  }

  // Calculate crypto amount based on current rates
  async calculateCryptoAmount(amount, currency) {
    try {
      // In a production environment, you would use a rate API
      // For now, use mock conversion rates
      const rates = {
        crypto_btc: 0.000025, // 1 USD = 0.000025 BTC
        crypto_eth: 0.00042,  // 1 USD = 0.00042 ETH
        crypto_usdt: 1,       // 1 USD = 1 USDT
        crypto_bnb: 0.0033,   // 1 USD = 0.0033 BNB
        crypto_sol: 0.033     // 1 USD = 0.033 SOL
      };

      if (!rates[currency]) {
        throw new ErrorResponse(`Unsupported cryptocurrency: ${currency}`, 400);
      }

      const cryptoAmount = amount * rates[currency];
      
      return {
        fiatAmount: amount,
        cryptoAmount,
        fiatCurrency: 'USD',
        cryptoCurrency: currency.replace('crypto_', '').toUpperCase(),
        rate: rates[currency]
      };
    } catch (error) {
      console.error('Crypto amount calculation error:', error);
      throw new ErrorResponse(error.message || 'Failed to calculate crypto amount', 500);
    }
  }

  // Verify crypto payment (in a real-world scenario, this would check the blockchain)
  async verifyCryptoPayment(txHash, currency, expectedAmount) {
    try {
      if (!this.coinbaseEnabled) {
        throw new ErrorResponse('Cryptocurrency payments are not configured', 500);
      }

      // In a production environment, you would verify by:
      // 1. Checking the blockchain to confirm the transaction exists
      // 2. Verify it's sent to your wallet address
      // 3. Verify the amount matches (considering network fees)
      // 4. Verify enough confirmations
      
      // For now, let's assume verification is successful if txHash exists
      if (!txHash) {
        throw new ErrorResponse('Transaction hash is required', 400);
      }

      // Mock verification
      const verified = txHash.length >= 16;
      
      return {
        verified,
        txHash,
        currency,
        amount: expectedAmount,
        confirmations: verified ? 6 : 0,
        message: verified ? 'Payment verified' : 'Payment not verified'
      };
    } catch (error) {
      console.error('Crypto payment verification error:', error);
      throw new ErrorResponse(error.message || 'Failed to verify crypto payment', 500);
    }
  }

  // Process Apple Pay payment
  async processApplePayment(token, amount, currency = 'usd') {
    try {
      if (!this.stripeEnabled) {
        throw new ErrorResponse('Stripe (required for Apple Pay) is not configured', 500);
      }

      // Apple Pay is processed through Stripe
      const paymentMethod = await stripe.paymentMethods.create({
        type: 'card',
        card: {
          token,
        },
      });

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency,
        payment_method: paymentMethod.id,
        confirm: true,
        payment_method_types: ['card'],
      });

      return {
        status: paymentIntent.status,
        paymentIntentId: paymentIntent.id,
        verified: paymentIntent.status === 'succeeded',
      };
    } catch (error) {
      console.error('Apple Pay processing error:', error);
      throw new ErrorResponse(error.message || 'Failed to process Apple Pay payment', 500);
    }
  }

  // Calculate payment fee based on payment method
  calculateFee(amount, paymentMethod) {
    const feeStructure = {
      credit_card: { percentage: 2.9, fixed: 0.30 },
      debit_card: { percentage: 2.9, fixed: 0.30 },
      apple_pay: { percentage: 2.9, fixed: 0.30 },
      paypal: { percentage: 3.9, fixed: 0.30 },
      crypto_btc: { percentage: 1, fixed: 0 },
      crypto_eth: { percentage: 1, fixed: 0 },
      crypto_usdt: { percentage: 1, fixed: 0 },
      crypto_bnb: { percentage: 1, fixed: 0 },
      crypto_sol: { percentage: 1, fixed: 0 },
      balance: { percentage: 0, fixed: 0 },
      bank_transfer: { percentage: 0, fixed: 0 }
    };

    const fee = feeStructure[paymentMethod] || { percentage: 0, fixed: 0 };
    return parseFloat(((amount * fee.percentage / 100) + fee.fixed).toFixed(2));
  }

  // Get payment methods with details
  getPaymentMethods() {
    // Build the list of methods
    const methods = [];
    
    // Credit Card
    if (this.stripeEnabled) {
      methods.push({
        id: 'credit_card',
        name: 'Credit Card',
        description: 'Pay with Visa, Mastercard, or American Express',
        enabled: true,
        fee: '2.9% + $0.30',
        icon: 'credit-card'
      });
    }
    
    // Apple Pay
    if (this.stripeEnabled && process.env.APPLE_PAY_MERCHANT_ID) {
      methods.push({
        id: 'apple_pay',
        name: 'Apple Pay',
        description: 'Pay with Apple Pay',
        enabled: true,
        fee: '2.9% + $0.30',
        icon: 'apple'
      });
    }
    
    // PayPal
    if (this.paypalEnabled) {
      methods.push({
        id: 'paypal',
        name: 'PayPal',
        description: 'Pay with your PayPal account',
        enabled: true,
        fee: '3.9% + $0.30',
        icon: 'paypal'
      });
    }
    
    // Cryptocurrencies
    if (this.coinbaseEnabled) {
      methods.push({
        id: 'crypto_btc',
        name: 'Bitcoin (BTC)',
        description: 'Pay with Bitcoin',
        enabled: true,
        fee: '1%',
        icon: 'bitcoin'
      });
      
      methods.push({
        id: 'crypto_eth',
        name: 'Ethereum (ETH)',
        description: 'Pay with Ethereum',
        enabled: true,
        fee: '1%',
        icon: 'ethereum'
      });
      
      methods.push({
        id: 'crypto_usdt',
        name: 'Tether (USDT)',
        description: 'Pay with USDT',
        enabled: true,
        fee: '1%',
        icon: 'tether'
      });
    }
    
    // Account Balance (always enabled)
    methods.push({
      id: 'balance',
      name: 'Account Balance',
      description: 'Pay with your account balance',
      enabled: true,
      fee: 'Free',
      icon: 'wallet'
    });
    
    return methods;
  }
}

module.exports = new PaymentService();