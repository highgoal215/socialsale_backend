const Ticket = require('../models/Ticket');
const User = require('../models/User');
const Order = require('../models/Order');
const { upload, getFileInfo } = require('../middleware/upload');
const ErrorResponse = require('../utils/errorResponse');
const { createNotification } = require('./notifications');

exports.getTickets = async (req, res, next) => {
  try {
    const { status, priority, search, userId } = req.query;
    let query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (priority) {
      query.priority = priority;
    }
    
    if (userId) {
      query.userId = userId;
    }
    
    if (search) {
      query.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { 'messages.message': { $regex: search, $options: 'i' } }
      ];
    }
    
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    const total = await Ticket.countDocuments(query);
    
    const tickets = await Ticket.find(query)
      .sort({ lastResponseAt: -1 })
      .skip(startIndex)
      .limit(limit)
      .populate('userId', 'username email')
      .populate('orderId', 'socialUsername serviceType');
    
    res.status(200).json({
      success: true,
      count: tickets.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      data: tickets
    });
  } catch (err) {
    next(err);
  }
};

exports.getUserTickets = async (req, res, next) => {
  try {
    const tickets = await Ticket.find({ userId: req.user.id })
      .sort({ lastResponseAt: -1 })
      .populate('orderId', 'socialUsername serviceType');
    
    res.status(200).json({
      success: true,
      count: tickets.length,
      data: tickets
    });
  } catch (err) {
    next(err);
  }
};

exports.getTicket = async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('userId', 'username email')
      .populate('orderId');
    
    if (!ticket) {
      return next(new ErrorResponse(`Ticket not found with id of ${req.params.id}`, 404));
    }
    
    // Check if user owns this ticket or is admin
    if (ticket.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to access this ticket', 403));
    }
    
    res.status(200).json({
      success: true,
      data: ticket
    });
  } catch (err) {
    next(err);
  }
};

exports.createTicket = async (req, res, next) => {
  try {
    const { subject, message, orderId, priority } = req.body;
    
    if (!subject || !message) {
      return next(new ErrorResponse('Please provide subject and message', 400));
    }
    
    // Check if order exists and belongs to user
    if (orderId) {
      const order = await Order.findById(orderId);
      
      if (!order) {
        return next(new ErrorResponse(`Order not found with id of ${orderId}`, 404));
      }
      
      if (order.userId.toString() !== req.user.id && req.user.role !== 'admin') {
        return next(new ErrorResponse('Not authorized to create ticket for this order', 403));
      }
    }
    
    const ticket = await Ticket.create({
      userId: req.user.id,
      subject,
      priority: priority || 'medium',
      orderId: orderId || null,
      messages: [
        {
          sender: 'user',
          message,
          createdAt: Date.now()
        }
      ],
      lastResponseBy: 'user',
      lastResponseAt: Date.now()
    });

    // Create notification for new ticket
    await createNotification(
      req.user.id,
      'support',
      'Support Ticket Created',
      `Your support ticket "${subject}" has been created successfully.`,
      {
        link: `/tickets/${ticket._id}`,
        relatedId: ticket._id,
        onModel: 'Ticket'
      }
    );
    
    res.status(201).json({
      success: true,
      data: ticket
    });
  } catch (err) {
    next(err);
  }
};

exports.addMessage = async (req, res, next) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return next(new ErrorResponse('Please provide a message', 400));
    }
    
    const ticket = await Ticket.findById(req.params.id);
    
    if (!ticket) {
      return next(new ErrorResponse(`Ticket not found with id of ${req.params.id}`, 404));
    }
    
    // Check if user owns this ticket or is admin
    if (ticket.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to respond to this ticket', 403));
    }
    
    // Determine sender type
    const senderType = req.user.role === 'admin' ? 'admin' : 'user';
    
    // Add message to ticket
    ticket.messages.push({
      sender: senderType,
      message,
      createdAt: Date.now()
    });
    
    // Update last response information
    ticket.lastResponseBy = senderType;
    ticket.lastResponseAt = Date.now();
    
    // If ticket is closed, reopen it
    if (ticket.status === 'closed') {
      ticket.status = 'open';
    }
    
    // If admin is responding to an open ticket, mark as in progress
    if (senderType === 'admin' && ticket.status === 'open') {
      ticket.status = 'in_progress';
    }
    
    await ticket.save();

    // Create notification for new message
    if (senderType === 'admin') {
      // Notify user when admin responds
      await createNotification(
        ticket.userId,
        'support',
        'New Response to Your Ticket',
        `You have received a new response to your ticket "${ticket.subject}".`,
        {
          link: `/tickets/${ticket._id}`,
          relatedId: ticket._id,
          onModel: 'Ticket'
        }
      );
    } else {
      // Notify admins when user responds
      // Get all admin users
      const adminUsers = await User.find({ role: 'admin', blockstate: 0 });
      
      for (const admin of adminUsers) {
        await createNotification(
          admin._id,
          'support',
          'New Ticket Response',
          `User ${req.user.username} responded to ticket: ${ticket.subject}`,
          {
            link: `/admin/tickets/${ticket._id}`,
            relatedId: ticket._id,
            onModel: 'Ticket'
          }
        );
      }
    }
    
    res.status(200).json({
      success: true,
      data: ticket
    });
  } catch (err) {
    next(err);
  }
};

exports.updateTicketStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return next(new ErrorResponse('Please provide a status', 400));
    }
    
    const ticket = await Ticket.findById(req.params.id);
    
    if (!ticket) {
      return next(new ErrorResponse(`Ticket not found with id of ${req.params.id}`, 404));
    }
    
    // Only admins can update ticket status
    if (req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to update ticket status', 403));
    }
    
    const oldStatus = ticket.status;
    ticket.status = status;
    ticket.updatedAt = Date.now();
    
    await ticket.save();
    
    // Create notification for status change
    if (oldStatus !== status) {
      let notificationMessage = '';
      switch (status) {
        case 'open':
          notificationMessage = 'Your support ticket has been reopened.';
          break;
        case 'in_progress':
          notificationMessage = 'Your support ticket is now being processed by our team.';
          break;
        case 'closed':
          notificationMessage = 'Your support ticket has been closed.';
          break;
      }
      
      if (notificationMessage) {
        await createNotification(
          ticket.userId,
          'support',
          'Ticket Status Updated',
          notificationMessage,
          {
            link: `/tickets/${ticket._id}`,
            relatedId: ticket._id,
            onModel: 'Ticket'
          }
        );
      }
    }
    
    res.status(200).json({
      success: true,
      data: ticket
    });
  } catch (err) {
    next(err);
  }
};

exports.updateTicketPriority = async (req, res, next) => {
  try {
    const { priority } = req.body;
    
    if (!priority) {
      return next(new ErrorResponse('Please provide a priority', 400));
    }
    
    const ticket = await Ticket.findById(req.params.id);
    
    if (!ticket) {
      return next(new ErrorResponse(`Ticket not found with id of ${req.params.id}`, 404));
    }
    
    // Only admins can update ticket priority
    if (req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to update ticket priority', 403));
    }
    
    const oldPriority = ticket.priority;
    ticket.priority = priority;
    ticket.updatedAt = Date.now();
    
    await ticket.save();
    
    // Create notification for priority change
    if (oldPriority !== priority) {
      await createNotification(
        ticket.userId,
        'support',
        'Ticket Priority Updated',
        `Your support ticket priority has been changed to ${priority}.`,
        {
          link: `/tickets/${ticket._id}`,
          relatedId: ticket._id,
          onModel: 'Ticket'
        }
      );
    }
    
    res.status(200).json({
      success: true,
      data: ticket
    });
  } catch (err) {
    next(err);
  }
};

exports.closeTicket = async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    
    if (!ticket) {
      return next(new ErrorResponse(`Ticket not found with id of ${req.params.id}`, 404));
    }
    
    // Check if user owns this ticket or is admin
    if (ticket.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to close this ticket', 403));
    }
    
    const wasOpen = ticket.status !== 'closed';
    ticket.status = 'closed';
    ticket.updatedAt = Date.now();
    
    await ticket.save();
    
    // Create notification for ticket closure
    if (wasOpen) {
      await createNotification(
        ticket.userId,
        'support',
        'Ticket Closed',
        `Your support ticket "${ticket.subject}" has been closed.`,
        {
          link: `/tickets/${ticket._id}`,
          relatedId: ticket._id,
          onModel: 'Ticket'
        }
      );
    }
    
    res.status(200).json({
      success: true,
      data: ticket
    });
  } catch (err) {
    next(err);
  }
};

exports.uploadAttachment = async (req, res, next) => {
  try {
    const { ticketId, messageIndex } = req.body;
    
    if (!req.file) {
      return next(new ErrorResponse('Please upload a file', 400));
    }
    
    const ticket = await Ticket.findById(ticketId);
    
    if (!ticket) {
      return next(new ErrorResponse(`Ticket not found with id of ${ticketId}`, 404));
    }
    
    // Check if user owns this ticket or is admin
    if (ticket.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to add attachments to this ticket', 403));
    }
    
    const fileInfo = getFileInfo(req.file);
    
    // If we're updating an existing message
    if (messageIndex !== undefined) {
      if (!ticket.messages[messageIndex]) {
        return next(new ErrorResponse('Message not found', 404));
      }
      
      ticket.messages[messageIndex].attachments = ticket.messages[messageIndex].attachments || [];
      ticket.messages[messageIndex].attachments.push(fileInfo.url);
    } else {
      // We'll add this URL to the response for client to use when creating a new message
      res.status(200).json({
        success: true,
        data: {
          url: fileInfo.url,
          filename: fileInfo.filename
        }
      });
      return;
    }
    
    await ticket.save();
    
    res.status(200).json({
      success: true,
      data: ticket
    });
  } catch (err) {
    next(err);
  }
};