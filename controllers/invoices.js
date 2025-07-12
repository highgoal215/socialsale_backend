const Invoice = require('../models/Invoice');
const Order = require('../models/Order');
const User = require('../models/User');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const ErrorResponse = require('../utils/errorResponse');

exports.generateInvoice = async (req, res, next) => {
  try {
    const { orderId } = req.body;
    
    if (!orderId) {
      return next(new ErrorResponse('Please provide an order ID', 400));
    }
    
    const order = await Order.findById(orderId);
    
    if (!order) {
      return next(new ErrorResponse(`Order not found with id of ${orderId}`, 404));
    }
    
    // Check if invoice already exists for this order
    const existingInvoice = await Invoice.findOne({ orderId });
    
    if (existingInvoice) {
      return next(new ErrorResponse('Invoice already exists for this order', 400));
    }
    
    // Create invoice items based on order
    const items = [
      {
        description: `${order.serviceType} - ${order.quantity} ${order.serviceType === 'followers' ? 'followers' : order.serviceType}`,
        quantity: 1,
        price: order.originalPrice || order.price
      }
    ];
    
    // Calculate subtotal
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
    
    // Calculate discount
    const discount = order.discount || 0;
    
    // Calculate tax (0% for digital services in this example)
    const tax = 0;
    
    // Calculate total
    const total = subtotal - discount + tax;
    
    // Create invoice
    const invoice = await Invoice.create({
      userId: order.userId,
      orderId: order._id,
      amount: total,
      status: order.status === 'completed' || order.status === 'processing' ? 'paid' : 'unpaid',
      items,
      subtotal,
      discount,
      tax,
      total,
      paymentMethod: order.paymentMethod,
      paymentDate: order.status === 'completed' || order.status === 'processing' ? order.createdAt : null
    });
    
    res.status(201).json({
      success: true,
      data: invoice
    });
  } catch (err) {
    next(err);
  }
};

exports.getUserInvoices = async (req, res, next) => {
  try {
    const invoices = await Invoice.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .populate('orderId', 'socialUsername serviceType quantity');
    
    res.status(200).json({
      success: true,
      count: invoices.length,
      data: invoices
    });
  } catch (err) {
    next(err);
  }
};

exports.getInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('userId', 'username email')
      .populate('orderId');
    
    if (!invoice) {
      return next(new ErrorResponse(`Invoice not found with id of ${req.params.id}`, 404));
    }
    
    // Check if user owns this invoice or is admin
    if (invoice.userId._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to access this invoice', 403));
    }
    
    res.status(200).json({
      success: true,
      data: invoice
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllInvoices = async (req, res, next) => {
  try {
    const { status, userId, dateFrom, dateTo, sort } = req.query;
    let query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (userId) {
      query.userId = userId;
    }
    
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        query.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setDate(toDate.getDate() + 1);
        query.createdAt.$lte = toDate;
      }
    }
    
    let sortObj = { createdAt: -1 };
    if (sort) {
      const [field, direction] = sort.split(':');
      sortObj = { [field]: direction === 'asc' ? 1 : -1 };
    }
    
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    const total = await Invoice.countDocuments(query);
    
    const invoices = await Invoice.find(query)
      .sort(sortObj)
      .skip(startIndex)
      .limit(limit)
      .populate('userId', 'username email')
      .populate('orderId', 'socialUsername serviceType');
    
    res.status(200).json({
      success: true,
      count: invoices.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      data: invoices
    });
  } catch (err) {
    next(err);
  }
};

exports.updateInvoiceStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return next(new ErrorResponse('Please provide a status', 400));
    }
    
    const invoice = await Invoice.findById(req.params.id);
    
    if (!invoice) {
      return next(new ErrorResponse(`Invoice not found with id of ${req.params.id}`, 404));
    }
    
    // Only admin can update invoice status
    if (req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to update invoice status', 403));
    }
    
    invoice.status = status;
    
    if (status === 'paid' && !invoice.paymentDate) {
      invoice.paymentDate = Date.now();
    }
    
    await invoice.save();
    
    res.status(200).json({
      success: true,
      data: invoice
    });
  } catch (err) {
    next(err);
  }
};

exports.downloadInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('userId', 'username email')
      .populate('orderId', 'socialUsername serviceType quantity');
    
    if (!invoice) {
      return next(new ErrorResponse(`Invoice not found with id of ${req.params.id}`, 404));
    }
    
    // Check if user owns this invoice or is admin
    if (invoice.userId._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to access this invoice', 403));
    }
    
    // Generate PDF
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`);
    
    // Pipe the PDF directly to the response
    doc.pipe(res);
    
    // Add company logo
    // doc.image('path/to/logo.png', 50, 45, { width: 150 });
    
    // Add title
    doc.fontSize(20).text('INVOICE', { align: 'right' });
    doc.fontSize(10).text(invoice.invoiceNumber, { align: 'right' });
    doc.moveDown();
    
    // Add company info
    doc.fontSize(10).text('Your Instagram Growth Service', { align: 'left' });
    doc.text('123 Main Street', { align: 'left' });
    doc.text('New York, NY 10001', { align: 'left' });
    doc.text('support@yourservice.com', { align: 'left' });
    doc.moveDown();
    
    // Add customer info
    doc.text(`BILL TO:`, { align: 'left' });
    doc.text(`${invoice.userId.username}`, { align: 'left' });
    doc.text(`${invoice.userId.email}`, { align: 'left' });
    doc.moveDown();
    
    // Add invoice details
    doc.text(`Invoice Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, { align: 'left' });
    doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, { align: 'left' });
    doc.text(`Status: ${invoice.status.toUpperCase()}`, { align: 'left' });
    if (invoice.paymentDate) {
      doc.text(`Payment Date: ${new Date(invoice.paymentDate).toLocaleDateString()}`, { align: 'left' });
    }
    doc.moveDown();
    
    // Create table
    const tableTop = 300;
    const itemX = 50;
    const descriptionX = 100;
    const quantityX = 350;
    const priceX = 400;
    const totalX = 450;
    
    // Add table headers
    doc.font('Helvetica-Bold');
    doc.text('#', itemX, tableTop);
    doc.text('Description', descriptionX, tableTop);
    doc.text('Qty', quantityX, tableTop);
    doc.text('Price', priceX, tableTop);
    doc.text('Total', totalX, tableTop);
    doc.moveDown();
    
    // Add table rows
    doc.font('Helvetica');
    let y = tableTop + 20;
    invoice.items.forEach((item, i) => {
      doc.text(i + 1, itemX, y);
      doc.text(item.description, descriptionX, y);
      doc.text(item.quantity.toString(), quantityX, y);
      doc.text(`$${item.price.toFixed(2)}`, priceX, y);
      doc.text(`$${(item.quantity * item.price).toFixed(2)}`, totalX, y);
      y += 20;
    });
    
    // Add subtotal, discount, tax, and total
    y += 20;
    doc.text('Subtotal:', 350, y);
    doc.text(`$${invoice.subtotal.toFixed(2)}`, totalX, y);
    y += 20;
    if (invoice.discount > 0) {
      doc.text('Discount:', 350, y);
      doc.text(`-$${invoice.discount.toFixed(2)}`, totalX, y);
      y += 20;
    }
    if (invoice.tax > 0) {
      doc.text('Tax:', 350, y);
      doc.text(`$${invoice.tax.toFixed(2)}`, totalX, y);
      y += 20;
    }
    doc.font('Helvetica-Bold');
    doc.text('Total:', 350, y);
    doc.text(`$${invoice.total.toFixed(2)}`, totalX, y);
    
    // Add footer
    doc.font('Helvetica');
    doc.fontSize(10).text(
      'Thank you for your business!',
      50,
      700,
      { align: 'center' }
    );
    
    // Finalize the PDF
    doc.end();
  } catch (err) {
    next(err);
  }
};