const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const bcrypt = require('bcryptjs');
const { createSystemNotification } = require('./notifications');
const { verifyGoogleToken } = require('../config/google');
// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return next(new ErrorResponse('Email already registered', 400));
    }

    const user = await User.create({
      username,
      email,
      password,
      role: 'user',
      status: 'active',
      blockstate: 0
    });

    // Create welcome notification
    await createSystemNotification(
      user._id,
      'Welcome to LikesIo!',
      'Thank you for joining us. Start growing your Instagram presence today!',
      {
        link: '/pricing'
      }
    );

    sendTokenResponse(user, 201, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
    try {
     
      const { email, password } = req.body;
      console.log(req.body);
      console.log(`Login attempt with: ${email} / ${password}`);
  
      if (!email || !password) {
        return next(new ErrorResponse('Please provide an email and password', 400));
      }
  
      const user = await User.findOne({ email }).select('+password');
      console.log('User Data:', user);
      
      if (user) {
        
        const passwordMatches = await bcrypt.compare(password, user.password);
        console.log('Direct bcrypt comparison result:', passwordMatches);
        
        const modelMethodResult = await user.matchPassword(password);
        console.log('Model method comparison result:', modelMethodResult);
      }
  
      if (!user) {
        return next(new ErrorResponse('Invalid credentials', 401));
      }
  
      if (user.blockstate !== 0) {
        return next(new ErrorResponse('Your account has been blocked or deleted', 403));
      }
  
      const isMatch = await user.matchPassword(password);
  
      if (!isMatch) {
        return next(new ErrorResponse('Invalid credentials', 401));
      }
  
      // Create login notification for security
      await createSystemNotification(
        user._id,
        'New Login Detected',
        `New login detected from ${req.ip || 'unknown location'}. If this wasn't you, please contact support immediately.`,
        {
          link: '/profile'
        }
      );
  
      // This is the critical part - send the token response
      sendTokenResponse(user, 200, res);
      
    } catch (err) {
      console.error('Login error:', err);
      next(err);
    }
  };

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.status(200).json({
      success: true,
      user: user
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update User Profile
// @route   Put /api/auth/updateprofile
// @access  Private
exports.updateUserProfile = async (req, res, next) => {
  try {
    const { username, id } = req.body;

    console.log(username, id);
    
    // Check if username is being updated and if it's already taken
    if (username) {
      const existingUser = await User.findOne({ username, _id: { $ne: id } });
      if (existingUser) {
        return next(new ErrorResponse('Username is already taken', 400));
      }
    }

    // Find the user first
    let user = await User.findById(id);
    
    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }

    // Update username and password if provided
    if (username) user.username = username;

    // Save the user (this will trigger password hashing if password was changed)
    await user.save();

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        balance: user.balance
      },
      message: 'Profile updated successfully'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update User Profile
// @route   Put /api/auth/updatepassword
// @access  Private
exports.updatePassword = async (req, res, next) => {
  try {
    const { password, id } = req.body;

    console.log(password, id);
    
    // Check if username is being updated and if it's already taken
    if (password) {
      const existingUser = await User.findOne({ password, _id: { $ne: id } });
      if (existingUser) {
        return next(new ErrorResponse('Username is already taken', 400));
      }
    }

    // Find the user first
    let user = await User.findById(id);
    
    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }

    // Update username and password if provided
    if (password) user.password = password;

    // Save the user (this will trigger password hashing if password was changed)
    await user.save();

    res.status(200).json({
      success: true,
      username: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        balance: user.balance
      },
      message: 'Profile updated successfully'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  
  try {
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Google OAuth login
// @route   POST /api/auth/google
// @access  Public
exports.googleLogin = async (req, res, next) => {
  try {
    const { token } = req.body;
    console.log(token);

    if (!token) {
      return next(new ErrorResponse('Google token is required', 400));
    }

    // Verify Google token
    const googleData = await verifyGoogleToken(token);
    
    if (!googleData.emailVerified) {
      return next(new ErrorResponse('Google email not verified', 400));
    }

    // Check if user exists with this Google ID
    let user = await User.findOne({ googleId: googleData.googleId });

    if (!user) {
      // Check if user exists with this email (for linking existing accounts)
      user = await User.findOne({ email: googleData.email });
      
      if (user) {
        // Link Google account to existing user
        user.googleId = googleData.googleId;
        user.googleEmail = googleData.email;
        user.googleName = googleData.name;
        user.googlePicture = googleData.picture;
        user.provider = 'google';
        await user.save();
      } else {
        // Create new user with Google data
        const username = googleData.name.replace(/\s+/g, '').toLowerCase() + Math.random().toString(36).substr(2, 5);
        
        user = await User.create({
          username,
          email: googleData.email,
          googleId: googleData.googleId,
          googleEmail: googleData.email,
          googleName: googleData.name,
          googlePicture: googleData.picture,
          provider: 'google',
          role: 'user',
          status: 'active',
          blockstate: 0
        });
      }
    }

    // Check if user is blocked
    if (user.blockstate !== 0) {
      return next(new ErrorResponse('Your account has been blocked or deleted', 403));
    }

    // Send token response
    sendTokenResponse(user, 200, res);
    
  } catch (err) {
    console.error('Google login error:', err);
    next(err);
  }
};

// @desc    Link Google account to existing user
// @route   POST /api/auth/link-google
// @access  Private
exports.linkGoogleAccount = async (req, res, next) => {
  try {
    const { token } = req.body;
    const userId = req.user.id;

    if (!token) {
      return next(new ErrorResponse('Google token is required', 400));
    }

    // Verify Google token
    const googleData = await verifyGoogleToken(token);
    
    if (!googleData.emailVerified) {
      return next(new ErrorResponse('Google email not verified', 400));
    }

    // Check if Google account is already linked to another user
    const existingGoogleUser = await User.findOne({ googleId: googleData.googleId });
    if (existingGoogleUser && existingGoogleUser._id.toString() !== userId) {
      return next(new ErrorResponse('This Google account is already linked to another user', 400));
    }

    // Get current user
    const user = await User.findById(userId);
    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }

    // Link Google account
    user.googleId = googleData.googleId;
    user.googleEmail = googleData.email;
    user.googleName = googleData.name;
    user.googlePicture = googleData.picture;
    user.provider = 'google';
    
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Google account linked successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        balance: user.balance,
        googleId: user.googleId,
        googleName: user.googleName,
        googlePicture: user.googlePicture,
        provider: user.provider
      }
    });
    
  } catch (err) {
    console.error('Link Google account error:', err);
    next(err);
  }
};

// @desc    Unlink Google account
// @route   POST /api/auth/unlink-google
// @access  Private
exports.unlinkGoogleAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get current user
    const user = await User.findById(userId);
    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }

    // Check if user has a password (required to unlink Google)
    if (!user.password) {
      return next(new ErrorResponse('Please set a password before unlinking Google account', 400));
    }

    // Unlink Google account
    user.googleId = undefined;
    user.googleEmail = undefined;
    user.googleName = undefined;
    user.googlePicture = undefined;
    user.provider = 'local';
    
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Google account unlinked successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        balance: user.balance,
        provider: user.provider
      }
    });
    
  } catch (err) {
    console.error('Unlink Google account error:', err);
    next(err);
  }
};

const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res
    .status(statusCode)
    .json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        balance: user.balance,
        totalSpent: user.totalSpent
      }
    });
}; 
