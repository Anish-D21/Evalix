import multer from 'multer';

// Files are held in memory only long enough to forward to the NLP
// service (Section 48: no persistent filesystem storage). 10MB matches
// the NLP service's own max_syllabus_upload_mb default.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export default upload;
