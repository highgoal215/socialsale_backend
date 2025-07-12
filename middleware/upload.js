const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const ErrorResponse = require('../utils/errorResponse');

// Ensure upload directories exist
const createUploadDirectories = () => {
  const directories = [
    'uploads',
    'uploads/avatars',
    'uploads/banners',
    'uploads/blog',
    'uploads/instagram-growth'
  ];
  
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// Create directories on module load
createUploadDirectories();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/';
    
    // Determine upload path based on field name or request context
    if (file.fieldname === 'avatar') {
      uploadPath = 'uploads/avatars/';
    } else if (file.fieldname === 'banner') {
      uploadPath = 'uploads/banners/';
    } else if (file.fieldname === 'image' || file.fieldname === 'blogImage') {
      uploadPath = 'uploads/blog/';
    } else if (req.body.type === 'instagram') {
      uploadPath = 'uploads/instagram-growth/';
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = uuidv4();
    const extension = path.extname(file.originalname);
    const filename = `${file.fieldname}-${uniqueSuffix}${extension}`;
    cb(null, filename);
  },
});

const fileFilter = (req, file, cb) => {
  // Check if file is an image
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new ErrorResponse('Please upload an image file', 400), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5, // 5MB limit
  },
  fileFilter: fileFilter,
});

// Helper function to get file URL for local storage
const getFileUrl = (filename, folder) => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5005';
  const uploadPath = folder ? `uploads/${folder}/` : 'uploads/';
  return `${baseUrl}/${uploadPath}${filename}`;
};

// Helper function to delete file from local storage
const deleteLocalFile = (filepath) => {
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

// Helper function to get file info
const getFileInfo = (file) => {
  // Determine the folder based on the file path
  let folder = '';
  if (file.path.includes('/avatars/')) {
    folder = 'avatars';
  } else if (file.path.includes('/banners/')) {
    folder = 'banners';
  } else if (file.path.includes('/blog/')) {
    folder = 'blog';
  } else if (file.path.includes('/instagram-growth/')) {
    folder = 'instagram-growth';
  }
  
  
  return {
    filename: file.filename,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    path: file.path,
    url: getFileUrl(file.filename, folder)
  };
};

module.exports = {
  upload,
  getFileUrl,
  deleteLocalFile,
  getFileInfo
};
