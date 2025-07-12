# Social Order Payments API Documentation

## Overview

The Social Order Payments API allows users to process payments for social media services (followers, likes, views, comments) using different payment methods including credit cards, PayPal, and cryptocurrencies.

## Base URL

```
http://localhost:5005/api/social-order-payments
```

## Endpoints

### 1. Process Social Order Payment

**POST** `/process`

Process a payment for social media services.

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `socialUsername` | string | Yes | The social media username (Instagram, TikTok, etc.) |
| `email` | string | Yes | Customer's email address |
| `paymentMethod` | string | Yes | Payment method: `card`, `paypal`, or `crypto` |
| `serviceType` | string | Yes | Service type: `followers`, `likes`, `views`, `comments` |
| `quality` | string | Yes | Service quality: `general` or `premium` |
| `quantity` | number | Yes | Number of followers/likes/views/comments |
| `postUrl` | string | No | URL of the post (required for likes, views, comments) |

#### Payment Method Specific Fields

##### Card Payment (`paymentMethod: "card"`)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cardNumber` | string | Yes | 16-digit card number |
| `expiryDate` | string | Yes | Expiry date in MM/YY format |
| `cvcNumber` | string | Yes | 3-4 digit CVC/CVV |
| `cardholderName` | string | Yes | Name on the card |

##### PayPal Payment (`paymentMethod: "paypal"`)
No additional fields required. User will be redirected to PayPal for payment.

##### Crypto Payment (`paymentMethod: "crypto"`)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cryptoType` | string | Yes | Cryptocurrency type: `bitcoin`, `ethereum`, `usdc` |

#### Example Requests

##### Card Payment
```json
{
  "socialUsername": "myinstagram",
  "email": "user@example.com",
  "paymentMethod": "card",
  "cardNumber": "4242424242424242",
  "expiryDate": "12/25",
  "cvcNumber": "123",
  "cardholderName": "John Doe",
  "serviceType": "followers",
  "quality": "general",
  "quantity": 100
}
```

##### PayPal Payment
```json
{
  "socialUsername": "myinstagram",
  "email": "user@example.com",
  "paymentMethod": "paypal",
  "serviceType": "likes",
  "quality": "premium",
  "quantity": 50,
  "postUrl": "https://www.instagram.com/p/ABC123/"
}
```

##### Crypto Payment
```json
{
  "socialUsername": "myinstagram",
  "email": "user@example.com",
  "paymentMethod": "crypto",
  "cryptoType": "bitcoin",
  "serviceType": "views",
  "quality": "general",
  "quantity": 1000,
  "postUrl": "https://www.instagram.com/p/DEF456/"
}
```

#### Response

##### Success Response (200)
```json
{
  "success": true,
  "data": {
    "order": {
      "_id": "order_id",
      "socialUsername": "myinstagram",
      "serviceType": "followers",
      "quality": "general",
      "quantity": 100,
      "price": 10.00,
      "status": "pending",
      "paymentStatus": "pending"
    },
    "transaction": {
      "_id": "transaction_id",
      "amount": 10.00,
      "status": "pending",
      "reference": "SOC-abc123def4"
    },
    "paymentResult": {
      "success": true,
      "paymentId": "pay_123456789",
      "status": "Authorized",
      "message": "Payment successful"
    }
  }
}
```

##### Error Response (400/404/500)
```json
{
  "success": false,
  "error": "Error message"
}
```

### 2. Get Payment Status

**GET** `/status/:transactionId`

Get the status of a payment transaction.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `transactionId` | string | Yes | The transaction ID |

#### Example Request

```
GET /api/social-order-payments/status/transaction_id_here
```

#### Response

##### Success Response (200)
```json
{
  "success": true,
  "data": {
    "transaction": {
      "_id": "transaction_id",
      "amount": 10.00,
      "status": "completed",
      "paymentMethod": "credit_card",
      "reference": "SOC-abc123def4"
    },
    "order": {
      "_id": "order_id",
      "socialUsername": "myinstagram",
      "serviceType": "followers",
      "quantity": 100,
      "status": "processing",
      "paymentStatus": "completed"
    }
  }
}
```

## Payment Flow

### 1. Card Payments
1. User submits payment details
2. Payment is processed through Checkout.com
3. If successful, order status changes to "processing"
4. If failed, order status changes to "failed"

### 2. PayPal Payments
1. User submits payment request
2. System returns PayPal redirect URL
3. User completes payment on PayPal
4. PayPal webhook updates order status

### 3. Crypto Payments
1. User submits crypto payment request
2. System generates wallet address and amount
3. User sends cryptocurrency to the address
4. System monitors for payment confirmation

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input parameters |
| 404 | Not Found - Service or transaction not found |
| 500 | Internal Server Error - Server error |

## Rate Limiting

All endpoints are protected by rate limiting middleware. Users are limited to a reasonable number of requests per minute.



## Environment Variables

Make sure the following environment variables are set:

- `CHECKOUT_PUBLIC_KEY` - Checkout.com public key
- `CHECKOUT_SECRET_KEY` - Checkout.com secret key
- `CHECKOUT_CLIENT_ID` - Checkout.com processing channel ID
- `FRONTEND_URL` - Frontend URL for redirects
- `JWT_SECRET` - JWT secret for authentication
- `JWT_EXPIRE` - JWT expiration time

## Security Notes

1. Card details are processed through Checkout.com and not stored on the server
2. All sensitive data is encrypted in transit
3. Rate limiting prevents abuse
4. Input validation ensures data integrity
5. Guest users are created for one-time payments 