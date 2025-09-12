const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Function to ensure directory exists
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
  return dirPath;
};

// Base upload directory
const baseUploadDir = path.join(process.cwd(), "uploads");

// Create main uploads directory
ensureDirectoryExists(baseUploadDir);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = path.join(baseUploadDir, "sellers");
    
    // Create subdirectories based on file type if needed
    if (file.fieldname === 'logo') {
      uploadPath = path.join(baseUploadDir, "sellers", "logos");
    } else if (file.fieldname === 'businessLicense' || file.fieldname === 'idCard') {
      uploadPath = path.join(baseUploadDir, "sellers", "documents");
    }
    
    // Ensure the specific directory exists
    ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const originalName = path.basename(file.originalname, ext);
    
    // Create a clean filename: originalName-timestamp-random.extension
    const cleanName = originalName.replace(/[^a-zA-Z0-9]/g, '-');
    const filename = `${cleanName}-${uniqueSuffix}${ext}`;
    
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  // Check MIME types for better validation
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  // Also check file extension as backup
  const allowedExts = /jpeg|jpg|png|gif|pdf|doc|docx/;
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');

  if (allowedMimes.includes(file.mimetype) && allowedExts.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${allowedExts.toString()}`), false);
  }
};

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.'
      });
    }
  }
  next(err);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5 // Maximum number of files
  }
});

module.exports = {
  upload,
  handleMulterError
};