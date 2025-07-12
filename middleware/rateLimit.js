const rateLimit = require('express-rate-limit');

const defaultMessage = {
  success: false,
  message: 'Too many requests from this IP, please try again later.'
};

exports.basicLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, 
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: defaultMessage,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => req.ip
});

exports.authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts, please try again later.'
  },
  skipSuccessfulRequests: true
});

exports.orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many order requests, please try again later.'
  },
  skipFailedRequests: false
});

exports.apiCheckLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many API requests, please slow down.'
  },
});

exports.webhookLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: defaultMessage,
  skip: (req) => req.originalUrl.includes('/webhook')
});

exports.downloadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many download requests, please try again later.'
  }
});

exports.ipBasedLimiter = (maxRequests, timeWindow) => {
  return rateLimit({
    windowMs: timeWindow || 60 * 60 * 1000,
    max: maxRequests || 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: defaultMessage
  });
};