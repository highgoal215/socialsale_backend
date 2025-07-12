 const ErrorResponse = require('../utils/errorResponse');

exports.admin = (req, res, next) => {
  console.log('Admin middleware - user role:', req.user.role);
  if (req.user.role !== 'admin') {
    console.log('User is not admin, returning 403');
    return next(new ErrorResponse('Not authorized to access this route. Admin access required.', 403));
  }
  console.log('Admin middleware - user is admin, proceeding');
  next();
};

exports.moderator = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
    return next(new ErrorResponse('Not authorized to access this route. Moderator access required.', 403));
  }
  next();
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new ErrorResponse(`Role ${req.user.role} is not authorized to access this route`, 403));
    }
    next();
  };
};

exports.resourceOwner = (model, paramIdField = 'id', userIdField = 'userId') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[paramIdField];
      
      if (!resourceId) {
        return next(new ErrorResponse('Resource ID is required', 400));
      }
      
      const resource = await model.findById(resourceId);
      
      if (!resource) {
        return next(new ErrorResponse(`Resource not found with id of ${resourceId}`, 404));
      }
      
      if (resource[userIdField].toString() !== req.user.id && req.user.role !== 'admin') {
        return next(new ErrorResponse('Not authorized to access this resource', 403));
      }
      
      req.resource = resource;
      next();
    } catch (err) {
      next(err);
    }
  };
};