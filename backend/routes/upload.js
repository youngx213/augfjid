import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Ensure sounds directory exists
const soundsDir = path.join(__dirname, "../sounds");
if (!fs.existsSync(soundsDir)) {
  fs.mkdirSync(soundsDir, { recursive: true });
}

// Configure multer for sound uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, soundsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check if file is audio
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed!'), false);
    }
  }
});

// Upload sound file
router.post("/sound", upload.single('sound'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        ok: false, 
        error: "No sound file uploaded" 
      });
    }

    const soundInfo = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      url: `/sounds/${req.file.filename}`
    };

    console.log(`Sound uploaded: ${req.file.originalname} -> ${req.file.filename}`);

    res.json({
      ok: true,
      message: "Sound uploaded successfully",
      sound: soundInfo
    });
  } catch (error) {
    console.error("Sound upload error:", error);
    res.status(500).json({
      ok: false,
      error: error.message || "Upload failed"
    });
  }
});

// Get available sounds
router.get("/sounds", (req, res) => {
  try {
    const sounds = [];
    
    if (fs.existsSync(soundsDir)) {
      const files = fs.readdirSync(soundsDir);
      
      files.forEach(file => {
        const filePath = path.join(soundsDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isFile()) {
          const ext = path.extname(file).toLowerCase();
          if (['.mp3', '.wav', '.ogg', '.m4a', '.aac'].includes(ext)) {
            sounds.push({
              filename: file,
              name: path.basename(file, ext),
              size: stats.size,
              url: `/sounds/${file}`,
              uploaded: stats.mtime
            });
          }
        }
      });
    }

    res.json({
      ok: true,
      sounds: sounds.sort((a, b) => b.uploaded - a.uploaded) // Sort by newest first
    });
  } catch (error) {
    console.error("Error listing sounds:", error);
    res.status(500).json({
      ok: false,
      error: error.message || "Failed to list sounds"
    });
  }
});

// Delete sound file
router.delete("/sound/:filename", (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(soundsDir, filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Sound deleted: ${filename}`);
      
      res.json({
        ok: true,
        message: "Sound deleted successfully"
      });
    } else {
      res.status(404).json({
        ok: false,
        error: "Sound file not found"
      });
    }
  } catch (error) {
    console.error("Sound deletion error:", error);
    res.status(500).json({
      ok: false,
      error: error.message || "Failed to delete sound"
    });
  }
});

// Serve sound files
router.get("/sounds/:filename", (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(soundsDir, filename);
    
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({
        ok: false,
        error: "Sound file not found"
      });
    }
  } catch (error) {
    console.error("Sound serving error:", error);
    res.status(500).json({
      ok: false,
      error: error.message || "Failed to serve sound"
    });
  }
});

export default router;
