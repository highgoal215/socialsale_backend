const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ErrorResponse = require("../utils/errorResponse");

exports.protect = async (req, res, next) => {
  console.log('Auth middleware - headers:', req.headers);
  console.log('Auth middleware - authorization:', req.headers.authorization);
  
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
    console.log("TOKEN", token);
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    console.log('No token found, returning 401');
    return next(new ErrorResponse("Not authorized to access this route", 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decoded:', decoded);

    const user = await User.findById(decoded.id).select("-password");
    console.log('User found:', user);

    if (!user) {
      return next(new ErrorResponse("User no longer exists", 401));
    }

    if (user.blockstate !== 0) {
      return next(
        new ErrorResponse("Your account has been blocked or deleted", 403)
      );
    }

    if (decoded.iat < parseInt(user.passwordChangedAt / 1000)) {
      return next(
        new ErrorResponse(
          "User recently changed password. Please login again",
          401
        )
      );
    }

    req.user = user;
    res.locals.user = user;
    console.log('Auth middleware - user authenticated:', user.role);
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    if (err.name === "TokenExpiredError") {
      return next(
        new ErrorResponse("Your session has expired. Please login again", 401)
      );
    }
    return next(new ErrorResponse("Not authorized to access this route", 401));
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `Role ${req.user.role} is not authorized to access this route`,
          403
        )
      );
    }
    next();
  };
};

exports.refreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.body.refreshToken;

    if (!refreshToken) {
      return next(new ErrorResponse("Refresh token is required", 400));
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return next(new ErrorResponse("Invalid refresh token", 401));
    }

    if (user.blockstate !== 0) {
      return next(
        new ErrorResponse("Your account has been blocked or deleted", 403)
      );
    }

    const token = user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      token,
    });
  } catch (err) {
    return next(new ErrorResponse("Invalid refresh token", 401));
  }
};
