const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Order = require('../models/Order');
const Service = require('../models/Service');
const ErrorResponse = require('../utils/errorResponse');
const checkoutService = require('../utils/checkoutService');

// @desc    Process social order payment
// @route   POST /api/social-order-payments/process
// @access  Public
exports.processSocialOrderPayment = async (req, res, next) => {
  try {
    const {
      socialUsername,
      email,
      paymentMethod,
      // Card payment details
      cardNumber,
      expiryDate,
      cvcNumber,
      cardholderName,
      // Crypto payment details
      cryptoType,
      // Service details
      serviceType,
      quality,
      quantity,
      postUrl
    } = req.body;

    // Validate required fields
    if (!socialUsername || !email || !paymentMethod) {
      return next(new ErrorResponse('Social username, email, and payment method are required', 400));
    }

    // Validate payment method
    if (!['card', 'paypal', 'crypto'].includes(paymentMethod)) {
      return next(new ErrorResponse('Invalid payment method. Must be card, paypal, or crypto', 400));
    }

    // Validate payment method specific fields
    if (paymentMethod === 'card') {
      if (!cardNumber || !expiryDate || !cvcNumber || !cardholderName) {
        return next(new ErrorResponse('Card number, expiry date, CVC, and cardholder name are required for card payments', 400));
      }
    }

    if (paymentMethod === 'crypto') {
      if (!cryptoType || !['bitcoin', 'ethereum', 'usdc'].includes(cryptoType)) {
        return next(new ErrorResponse('Valid crypto type (bitcoin, ethereum, usdc) is required for crypto payments', 400));
      }
    }

    // Validate service details
    if (!serviceType || !quality || !quantity) {
      return next(new ErrorResponse('Service type, quality, and quantity are required', 400));
    }

    if (!['followers', 'likes', 'views', 'comments'].includes(serviceType)) {
      return next(new ErrorResponse('Invalid service type. Must be followers, likes, views, or comments', 400));
    }

    if (!['general', 'premium'].includes(quality)) {
      return next(new ErrorResponse('Invalid quality. Must be general or premium', 400));
    }

    // Find or create user by email
    let user = await User.findOne({ email });
    if (!user) {
      // Create a new user with the provided email
      user = await User.create({
        email,
        username: socialUsername,
        name: cardholderName || socialUsername,
        password: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15), // Temporary password
        isGuest: true
      });
    }

    // Find the service
    const service = await Service.findOne({
      type: serviceType,
      quality: quality,
      active: true
    });

    if (!service) {
      return next(new ErrorResponse(`Service not found for ${serviceType} (${quality})`, 404));
    }

    // Calculate price
    const price = service.price * quantity;

    // Generate order number
    const orderNumber = await Order.generateOrderNumber();
    
    // Create order data object
    const orderData = {
      userId: user._id,
      serviceId: service._id,
      supplierServiceId: service.supplierServiceId,
      socialUsername,
      serviceType,
      quality,
      quantity,
      price,
      supplierPrice: service.supplierPrice * quantity,
      paymentMethod: paymentMethod === 'card' ? 'credit_card' : 
                    paymentMethod === 'paypal' ? 'paypal' : 
                    `crypto_${cryptoType}`,
      status: 'pending',
      paymentStatus: 'pending',
      orderNumber
    };

    // Only add postUrl if it's provided or required for the service type
    if (postUrl || ['likes', 'views', 'comments'].includes(serviceType)) {
      if (!postUrl && ['likes', 'views', 'comments'].includes(serviceType)) {
        return next(new ErrorResponse(`Post URL is required for ${serviceType} service`, 400));
      }
      orderData.postUrl = postUrl;
    }

    // Create order
    const order = await Order.create(orderData);

    // Create transaction
    const transaction = await Transaction.create({
      userId: user._id,
      orderId: order._id,
      amount: price,
      fee: 0,
      netAmount: price,
      type: 'order_payment',
      paymentMethod: paymentMethod === 'card' ? 'credit_card' : 
                    paymentMethod === 'paypal' ? 'paypal' : 
                    `crypto_${cryptoType}`,
      status: 'pending',
      description: `Payment for ${quantity} ${serviceType} (${quality}) for ${socialUsername}`,
      reference: `SOC-${order._id.toString().substring(0, 10)}`,
      metadata: {
        socialUsername,
        serviceType,
        quality,
        quantity,
        postUrl: postUrl || '',
        paymentMethod,
        ...(paymentMethod === 'card' && {
          cardholderName,
          cardLast4: cardNumber.slice(-4)
        }),
        ...(paymentMethod === 'crypto' && {
          cryptoType
        })
      }
    });

    // Process payment based on method
    let paymentResult;
    
    if (paymentMethod === 'card') {
      // Process card payment through Checkout.com
      try {
        paymentResult = await processCardPayment({
          cardNumber,
          expiryDate,
          cvcNumber,
          cardholderName,
          amount: price,
          transaction,
          order
        });
      } catch (error) {
        // If Checkout.com is not configured, return a mock response for testing
        if (error.statusCode === 401) {
          paymentResult = {
            success: false,
            status: 'pending',
            message: 'Payment gateway not configured. This is a test environment.',
            requiresConfiguration: true
          };
        } else {
          throw error;
        }
      }
    } else if (paymentMethod === 'paypal') {
      // Process PayPal payment
      paymentResult = await processPayPalPayment({
        amount: price,
        transaction,
        order,
        email
      });
    } else if (paymentMethod === 'crypto') {
      // Process crypto payment
      paymentResult = await processCryptoPayment({
        cryptoType,
        amount: price,
        transaction,
        order
      });
    }

    res.status(200).json({
      success: true,
      data: {
        order,
        transaction,
        paymentResult
      }
    });

  } catch (err) {
    next(err);
  }
};

// @desc    Get payment status
// @route   GET /api/social-order-payments/status/:transactionId
// @access  Public
exports.getPaymentStatus = async (req, res, next) => {
  try {
    const { transactionId } = req.params;

    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return next(new ErrorResponse(`Transaction not found with id ${transactionId}`, 404));
    }

    const order = await Order.findById(transaction.orderId);

    res.status(200).json({
      success: true,
      data: {
        transaction,
        order
      }
    });
  } catch (err) {
    next(err);
  }
};

// Helper functions for different payment methods
async function processCardPayment({ cardNumber, expiryDate, cvcNumber, cardholderName, amount, transaction, order }) {
  try {
    // Convert amount to minor units (cents)
    const amountInCents = Math.round(amount * 100);
    
    // Create payment with Checkout.com
    const payment = await checkoutService.createPayment({
      amount: amountInCents,
      currency: 'USD',
      payment_type: 'Regular',
      reference: transaction.reference,
      description: transaction.description,
      customer: {
        email: order.userId.email,
        name: cardholderName
      },
      source: {
        type: 'card',
        number: cardNumber,
        expiry_month: parseInt(expiryDate.split('/')[0]),
        expiry_year: parseInt(expiryDate.split('/')[1]),
        cvv: cvcNumber,
        name: cardholderName
      },
      metadata: {
        orderId: order._id.toString(),
        transactionId: transaction._id.toString(),
        socialUsername: order.socialUsername
      }
    });

    // Update transaction with payment details
    transaction.externalReference = payment.id;
    transaction.paymentDetails = payment;
    
    if (payment.status === 'Authorized' || payment.status === 'Captured') {
      transaction.status = 'completed';
      order.status = 'processing';
      order.paymentStatus = 'completed';
      order.deliveryStartedAt = Date.now();
    } else if (payment.status === 'Declined') {
      transaction.status = 'failed';
      order.paymentStatus = 'failed';
    } else {
      transaction.status = 'pending';
    }

    await transaction.save();
    await order.save();

    return {
      success: transaction.status === 'completed',
      paymentId: payment.id,
      status: payment.status,
      message: payment.status === 'Authorized' || payment.status === 'Captured' 
        ? 'Payment successful' 
        : payment.status === 'Declined' 
        ? 'Payment declined' 
        : 'Payment pending'
    };

  } catch (error) {
    // Update transaction as failed
    transaction.status = 'failed';
    transaction.paymentDetails = { error: error.message };
    await transaction.save();
    
    order.paymentStatus = 'failed';
    await order.save();

    throw error;
  }
}

async function processPayPalPayment({ amount, transaction, order, email }) {
  try {
    // For PayPal, we would typically redirect to PayPal for payment
    // This is a simplified implementation
    const paypalPaymentUrl = `${process.env.FRONTEND_URL}/paypal/pay?amount=${amount}&transactionId=${transaction._id}&orderId=${order._id}`;
    
    return {
      success: false,
      redirectUrl: paypalPaymentUrl,
      status: 'pending',
      message: 'Redirect to PayPal for payment'
    };

  } catch (error) {
    transaction.status = 'failed';
    transaction.paymentDetails = { error: error.message };
    await transaction.save();
    
    order.paymentStatus = 'failed';
    await order.save();

    throw error;
  }
}

async function processCryptoPayment({ cryptoType, amount, transaction, order }) {
  try {
    // For crypto payments, we would typically generate a wallet address
    // This is a simplified implementation
    const walletAddress = generateCryptoWalletAddress(cryptoType);
    const cryptoAmount = convertToCrypto(amount, cryptoType);
    
    // Update transaction with crypto details
    transaction.paymentDetails = {
      cryptoType,
      walletAddress,
      cryptoAmount,
      exchangeRate: getCryptoExchangeRate(cryptoType)
    };
    await transaction.save();

    return {
      success: false,
      walletAddress,
      cryptoAmount,
      cryptoType,
      status: 'pending',
      message: `Send ${cryptoAmount} ${cryptoType.toUpperCase()} to ${walletAddress}`
    };

  } catch (error) {
    transaction.status = 'failed';
    transaction.paymentDetails = { error: error.message };
    await transaction.save();
    
    order.paymentStatus = 'failed';
    await order.save();

    throw error;
  }
}

// Helper functions for crypto payments
function generateCryptoWalletAddress(cryptoType) {
  // This would typically call a crypto service API
  const addresses = {
    bitcoin: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    ethereum: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
    usdc: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
  };
  return addresses[cryptoType] || addresses.ethereum;
}

function convertToCrypto(usdAmount, cryptoType) {
  // This would typically use real-time exchange rates
  const rates = {
    bitcoin: 45000, // USD per BTC
    ethereum: 3000,  // USD per ETH
    usdc: 1         // USD per USDC
  };
  return (usdAmount / rates[cryptoType]).toFixed(8);
}

function getCryptoExchangeRate(cryptoType) {
  const rates = {
    bitcoin: 45000,
    ethereum: 3000,
    usdc: 1
  };
  return rates[cryptoType] || 1;
} 