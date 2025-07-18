const SEOSettings = require('../models/SEOSettings');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all SEO settings
// @route   GET /api/seo-settings
// @access  Private (Admin)
exports.getAllSEOSettings = async (req, res, next) => {
  try {
    const seoSettings = await SEOSettings.find().sort({ pageId: 1 });
    
    res.status(200).json({
      success: true,
      count: seoSettings.length,
      data: seoSettings
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single SEO setting
// @route   GET /api/seo-settings/:pageId
// @access  Public
exports.getSEOSetting = async (req, res, next) => {
  try {
    const { pageId } = req.params;
    
    const seoSetting = await SEOSettings.findOne({ pageId, isActive: true });
    
    if (!seoSetting) {
      return next(new ErrorResponse(`SEO settings not found for page: ${pageId}`, 404));
    }
    
    res.status(200).json({
      success: true,
      data: seoSetting
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new SEO setting
// @route   POST /api/seo-settings
// @access  Private (Admin)
exports.createSEOSetting = async (req, res, next) => {
  try {
    const seoSetting = await SEOSettings.create(req.body);
    
    res.status(201).json({
      success: true,
      data: seoSetting
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update SEO setting
// @route   PUT /api/seo-settings/:pageId
// @access  Private (Admin)
exports.updateSEOSetting = async (req, res, next) => {
  try {
    const { pageId } = req.params;
    
    let seoSetting = await SEOSettings.findOne({ pageId });
    
    if (!seoSetting) {
      return next(new ErrorResponse(`SEO settings not found for page: ${pageId}`, 404));
    }
    
    seoSetting = await SEOSettings.findOneAndUpdate(
      { pageId },
      { ...req.body, lastUpdated: Date.now() },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      data: seoSetting
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete SEO setting
// @route   DELETE /api/seo-settings/:pageId
// @access  Private (Admin)
exports.deleteSEOSetting = async (req, res, next) => {
  try {
    const { pageId } = req.params;
    
    const seoSetting = await SEOSettings.findOne({ pageId });
    
    if (!seoSetting) {
      return next(new ErrorResponse(`SEO settings not found for page: ${pageId}`, 404));
    }
    
    await SEOSettings.findOneAndDelete({ pageId });
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle SEO setting active status
// @route   PUT /api/seo-settings/:pageId/toggle
// @access  Private (Admin)
exports.toggleSEOSetting = async (req, res, next) => {
  try {
    const { pageId } = req.params;
    
    let seoSetting = await SEOSettings.findOne({ pageId });
    
    if (!seoSetting) {
      return next(new ErrorResponse(`SEO settings not found for page: ${pageId}`, 404));
    }
    
    seoSetting.isActive = !seoSetting.isActive;
    seoSetting.lastUpdated = Date.now();
    await seoSetting.save();
    
    res.status(200).json({
      success: true,
      data: seoSetting
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get multiple SEO settings by page IDs
// @route   POST /api/seo-settings/bulk
// @access  Public
exports.getBulkSEOSettings = async (req, res, next) => {
  try {
    const { pageIds } = req.body;
    
    if (!pageIds || !Array.isArray(pageIds)) {
      return next(new ErrorResponse('Please provide an array of page IDs', 400));
    }
    
    const seoSettings = await SEOSettings.find({
      pageId: { $in: pageIds },
      isActive: true
    });
    
    res.status(200).json({
      success: true,
      count: seoSettings.length,
      data: seoSettings
    });
  } catch (err) {
    next(err);
  }
}; 