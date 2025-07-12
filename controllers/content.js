const PageContent = require('../models/PageContent');
const ErrorResponse = require('../utils/errorResponse');

exports.getPageContent = async (req, res, next) => {
  try {
    const { pageId } = req.params;
    
    const content = await PageContent.findOne({ pageId });
    
    if (!content) {
      return next(new ErrorResponse(`Content not found for page: ${pageId}`, 404));
    }
    
    res.status(200).json({
      success: true,
      data: content
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllPageContent = async (req, res, next) => {
  try {
    const content = await PageContent.find();
    
    res.status(200).json({
      success: true,
      count: content.length,
      data: content
    });
  } catch (err) {
    next(err);
  }
};

exports.updatePageContent = async (req, res, next) => {
  try {
    const { pageId } = req.params;
    
    let content = await PageContent.findOne({ pageId });
    
    if (!content) {
      // Create new content if it doesn't exist
      content = await PageContent.create({
        pageId,
        ...req.body,
        lastUpdated: Date.now()
      });
    } else {
      // Update existing content
      content = await PageContent.findOneAndUpdate(
        { pageId },
        {
          ...req.body,
          lastUpdated: Date.now()
        },
        { new: true, runValidators: true }
      );
    }
    
    res.status(200).json({
      success: true,
      data: content
    });
  } catch (err) {
    next(err);
  }
};

exports.getServiceContent = async (req, res, next) => {
  try {
    const servicePages = await PageContent.find({
      pageId: { $in: ['followers', 'likes', 'views', 'comments'] }
    });
    
    res.status(200).json({
      success: true,
      count: servicePages.length,
      data: servicePages
    });
  } catch (err) {
    next(err);
  }
};

exports.getFaqContent = async (req, res, next) => {
  try {
    const faqContent = await PageContent.findOne({ pageId: 'faq' });
    
    if (!faqContent) {
      return next(new ErrorResponse('FAQ content not found', 404));
    }
    
    res.status(200).json({
      success: true,
      data: faqContent
    });
  } catch (err) {
    next(err);
  }
};