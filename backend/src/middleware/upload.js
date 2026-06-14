// ============================================================
// DigiQuest Studio — File Upload Middleware (Multer)
// ============================================================
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Allowed MIME types
const ALLOWED_TYPES = {
  // Scripts
  'application/pdf': '.pdf',
  'text/plain': '.txt',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  // Images (references)
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  // Video (references)
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  // Archives (brand guidelines)
  'application/zip': '.zip',
  'application/x-rar-compressed': '.rar'
};

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    // Organise uploads into subdirectories by brief ID (or 'temp' before creation)
    const briefId = req.params.id || 'temp';
    const dir = path.join(UPLOADS_DIR, String(briefId));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    // Use UUID + original extension for security (never trust client filenames)
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${uuidv4()}${ext}`;
    cb(null, safeName);
  }
});

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_TYPES[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error(`File type "${file.mimetype}" is not allowed. Accepted: PDF, DOC, DOCX, TXT, JPG, PNG, GIF, WEBP, MP4, MOV, ZIP, RAR.`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB per file
    files: 10                    // max 10 files per request
  }
});

/**
 * Move files from temp directory to a brief-specific directory after creation.
 * @param {string[]} filePaths - Array of file paths in /uploads/temp/
 * @param {number} briefId - The newly created brief ID
 * @returns {string[]} Updated file paths
 */
function moveFilesToBrief(filePaths, briefId) {
  const briefDir = path.join(UPLOADS_DIR, String(briefId));
  if (!fs.existsSync(briefDir)) {
    fs.mkdirSync(briefDir, { recursive: true });
  }

  return filePaths.map(filePath => {
    const fileName = path.basename(filePath);
    const newPath = path.join(briefDir, fileName);
    if (fs.existsSync(filePath) && filePath !== newPath) {
      fs.renameSync(filePath, newPath);
    }
    return path.join('/uploads', String(briefId), fileName);
  });
}

module.exports = { upload, moveFilesToBrief, UPLOADS_DIR };
