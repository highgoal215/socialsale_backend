const Service = require('../models/Service');
const SupplierService = require('../utils/supplierService');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all services
// @route   GET /api/services
// @access  Public
exports.getServices = async (req, res, next) => {
  try {
    const { type, quality, popular, active, category } = req.query;
    console.log("what are the query params", req.query);
    let query = {};

    if (type) {
      query.type = type;
    }
    if (quality) {
      query.quality = quality;
    }

    if (category) {
      query.category = category;
    }

    if (popular !== undefined) {
      query.popular = popular === 'true';
    }

    if (active !== undefined) {
      query.active = active === 'true';
    } else {
      // By default, only show active services
      query.active = true;
    }

    const services = await Service.find(query).sort({ type: 1, quality: 1, minQuantity: 1 });

    res.status(200).json({
      success: true,
      count: services.length,
      data: services
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get service by ID
// @route   GET /api/services/:id
// @access  Public
exports.getService = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return next(new ErrorResponse(`Service not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
      success: true,
      data: service
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create service
// @route   POST /api/services
// @access  Private/Admin
exports.createService = async (req, res, next) => {
  try {
    // Validate service type and quality
    const { type, quality, supplierServiceId, category } = req.body;

    if (!['followers', 'likes', 'views', 'comments'].includes(type)) {
      return next(new ErrorResponse('Invalid service type. Must be followers, likes, views, or comments', 400));
    }

    if (!['general', 'premium'].includes(quality)) {
      return next(new ErrorResponse('Invalid quality. Must be general or premium', 400));
    }

    if (!['Instagram', 'TikTok', 'YouTube'].includes(category)) {
      return next(new ErrorResponse('Invalid category. Must be Instagram, TikTok, or YouTube', 400));
    }
    console.log("req.body>>>>>>>>>>>>>", req.body)
    // Validate supplier service ID - make it more flexible
    const validServiceIds = {
      followers: { general: '2183', premium: '3305' },
      likes: { general: '1782', premium: '1761' },
      views: { general: '8577', premium: '340' },
      comments: { general: '1234', premium: '5678' } // Add placeholder IDs for comments
    };

    // Only validate if the service type and quality combination exists in our mapping
    if (validServiceIds[type] && validServiceIds[type][quality]) {
      const expectedServiceId = validServiceIds[type][quality];

      if (supplierServiceId !== expectedServiceId) {
        return next(new ErrorResponse(`Invalid supplier service ID for ${type} (${quality}). Expected: ${expectedServiceId}`, 400));
      }
    }

    const service = await Service.create(req.body);

    res.status(201).json({
      success: true,
      data: service
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update service
// @route   PUT /api/services/:id
// @access  Private/Admin
exports.updateService = async (req, res, next) => {
  try {
    let service = await Service.findById(req.params.id);

    if (!service) {
      return next(new ErrorResponse(`Service not found with id of ${req.params.id}`, 404));
    }

    // Don't allow changing service type, quality, or supplier service ID
    const { type, quality, supplierServiceId, ...updateData } = req.body;

    service = await Service.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: service
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete service
// @route   DELETE /api/services/:id
// @access  Private/Admin
exports.deleteService = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return next(new ErrorResponse(`Service not found with id of ${req.params.id}`, 404));
    }

    await service.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete all services
// @route   DELETE /api/services/all
// @access  Private/Admin
exports.deleteAllServices = async (req, res, next) => {
  try {
    const result = await Service.deleteMany({});

    res.status(200).json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} services`,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle service active status
// @route   PUT /api/services/:id/toggle
// @access  Private/Admin
exports.toggleServiceStatus = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return next(new ErrorResponse(`Service not found with id of ${req.params.id}`, 404));
    }

    // Use findByIdAndUpdate to avoid triggering full document validation
    const updatedService = await Service.findByIdAndUpdate(
      req.params.id,
      { active: !service.active },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: updatedService
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Mark service as popular
// @route   PUT /api/services/:id/popular
// @access  Private/Admin
exports.togglePopular = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return next(new ErrorResponse(`Service not found with id of ${req.params.id}`, 404));
    }

    // Use findByIdAndUpdate to avoid triggering full document validation
    const updatedService = await Service.findByIdAndUpdate(
      req.params.id,
      { popular: !service.popular },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: updatedService
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get supplier services (admin only)
// @route   GET /api/services/supplier
// @access  Private/Admin
exports.getSupplierServices = async (req, res, next) => {
  try {
    const services = await SupplierService.getInstagramServices();
    // console.log("what are these services", services);
    res.status(200).json({
      success: true,
      count: services.length,
      data: services
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get supplier balance (admin only)
// @route   GET /api/services/balance
// @access  Private/Admin
exports.getSupplierBalance = async (req, res, next) => {
  try {
    const balance = await SupplierService.getBalance();

    res.status(200).json({
      success: true,
      data: balance
    });
  } catch (err) {
    next(err);
  }
};