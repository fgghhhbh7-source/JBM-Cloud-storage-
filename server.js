require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const TelegramBot = require('node-telegram-bot-api');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

const BOT_TOKEN = process.env.BOT_TOKEN;
const STORAGE_CHAT_ID = process.env.STORAGE_CHAT_ID || '-1004432286903';

if (!BOT_TOKEN) {
  console.error('Missing BOT_TOKEN in environment');
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: false });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ ok: true, service: 'jbm-storage-backend' });
});

// UPLOAD
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const phone = String(req.body.phone || '').trim();
    if (!phone) {
      return res.status(400).json({ success: false, message: 'phone required' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'file required' });
    }

    const file = req.file;
    const filename = file.originalname || 'file';
    let mediaType = 'document';
    if (file.mimetype.startsWith('image/')) mediaType = 'photo';
    else if (file.mimetype.startsWith('video/')) mediaType = 'video';

    let sent;
    if (mediaType === 'photo') {
      sent = await bot.sendPhoto(STORAGE_CHAT_ID, file.buffer, {}, {
        filename,
        contentType: file.mimetype
      });
    } else if (mediaType === 'video') {
      sent = await bot.sendVideo(STORAGE_CHAT_ID, file.buffer, {}, {
        filename,
        contentType: file.mimetype
      });
    } else {
      sent = await bot.sendDocument(STORAGE_CHAT_ID, file.buffer, {}, {
        filename,
        contentType: file.mimetype
      });
    }

    let fileId = null;
    if (sent.photo) fileId = sent.photo[sent.photo.length - 1].file_id;
    else if (sent.video) fileId = sent.video.file_id;
    else if (sent.document) fileId = sent.document.file_id;

    if (!fileId) {
      return res.status(500).json({ success: false, message: 'No file_id from Telegram' });
    }

    const id = uuidv4();
    const now = Date.now();

    db.insert({
      id,
      phone,
      file_id: fileId,
      name: filename,
      type: mediaType,
      mime: file.mimetype,
      size: file.size,
      created_at: now
    });

    res.json({
      success: true,
      file: {
        id,
        name: filename,
        type: mediaType,
        mime: file.mimetype,
        size: file.size,
        at: now
      }
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, message: err.message || 'Upload failed' });
  }
});

// LIST
app.get('/files', (req, res) => {
  try {
    const phone = String(req.query.phone || '').trim();
    if (!phone) {
      return res.status(400).json({ success: false, message: 'phone required' });
    }

    const rows = db.findByPhone(phone).map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      mime: r.mime,
      size: r.size,
      at: r.created_at
    }));

    res.json({ success: true, files: rows });
  } catch (err) {
    console.error('List error:', err);
    res.status(500).json({ success: false, message: err.message || 'List failed' });
  }
});

// DOWNLOAD
app.get('/download/:id', async (req, res) => {
  try {
    const phone = String(req.query.phone || '').trim();
    if (!phone) {
      return res.status(400).json({ success: false, message: 'phone required' });
    }

    const row = db.findOne(req.params.id, phone);
    if (!row) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    const tgFile = await bot.getFile(row.file_id);
    const fileUrl =
      'https://api.telegram.org/file/bot' + BOT_TOKEN + '/' + tgFile.file_path;

    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch file from Telegram');
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    res.setHeader('Content-Type', row.mime || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="' + encodeURIComponent(row.name) + '"'
    );
    res.send(buffer);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ success: false, message: err.message || 'Download failed' });
  }
});

// DELETE
app.delete('/files/:id', (req, res) => {
  try {
    const phone = String(req.query.phone || '').trim();
    if (!phone) {
      return res.status(400).json({ success: false, message: 'phone required' });
    }

    const ok = db.remove(req.params.id, phone);
    if (!ok) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ success: false, message: err.message || 'Delete failed' });
  }
});

app.listen(PORT, () => {
  console.log('JBM Storage backend running on port ' + PORT);
});
