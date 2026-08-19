const express = require('express');
const multer = require('multer');
const cors = require('cors');
const compression = require('compression');
const sharp = require('sharp');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const uploadFile = require('./services/storage.service');
const postModel = require('./models/post.model');
const User = require('./models/user.model');
const { authenticate } = require('./middlewares/Auth.middleware');

const app = express();
app.use(compression());
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*'
}));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    callback(null, file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/'));
  }
});

const createToken = (user) => {
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      name: user.name
    },
    process.env.JWT_SECRET || 'change_this_secret',
    { expiresIn: '7d' }
  );
};

app.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword
    });

    const token = createToken(user);
    return res.status(201).json({ message: 'User registered successfully', token, user: user.toJSON() });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to register user', error: error.message });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = createToken(user);
    return res.status(200).json({ message: 'Logged in successfully', token, user: user.toJSON() });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to log in', error: error.message });
  }
});

app.post('/create-post', authenticate, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Image or video file is required' });
    }

    const mediaBuffer = req.file.mimetype.startsWith('image/')
      ? await sharp(req.file.buffer)
        .resize({ width: 1200, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer()
      : req.file.buffer;

    const result = await uploadFile(mediaBuffer, req.file.originalname);

    const post = await postModel.create({
      image: result.url,
      mediaType: req.file.mimetype,
      caption: req.body.caption,
      author: req.user.id
    });

    return res.status(201).json({ message: 'Post created successfully', post });
  } catch (error) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'Media exceeds 25MB size limit' });
    }
    return res.status(500).json({ message: 'Failed to create post', error: error.message });
  }
});

app.get('/posts', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const posts = await postModel
      .find()
      .populate('author', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return res.status(200).json({ message: 'Posts retrieved successfully', posts });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to retrieve posts', error: error.message });
  }
});

app.post('/posts/:id/like', authenticate, async (req, res) => {
  try {
    const post = await postModel.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const userId = req.user.id;
    const likedIndex = post.likedBy.findIndex((id) => id.toString() === userId);

    if (likedIndex >= 0) {
      post.likedBy.splice(likedIndex, 1);
      post.likes = Math.max(0, post.likes - 1);
    } else {
      post.likedBy.push(userId);
      post.likes += 1;
    }

    await post.save();
    const updatedPost = await postModel.findById(req.params.id).populate('author', 'name email').lean();

    return res.status(200).json({ message: 'Post like updated', post: updatedPost });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update like', error: error.message });
  }
});

app.put('/posts/:id', authenticate, upload.single('image'), async (req, res) => {
  try {
    const post = await postModel.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to edit this post' });
    }

    const update = {};
    if (req.body.caption !== undefined) {
      update.caption = req.body.caption;
    }

    if (req.file) {
      const mediaBuffer = req.file.mimetype.startsWith('image/')
        ? await sharp(req.file.buffer)
          .resize({ width: 1200, withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toBuffer()
        : req.file.buffer;

      const result = await uploadFile(mediaBuffer, req.file.originalname);
      update.image = result.url;
      update.mediaType = req.file.mimetype;
    }

    const updatedPost = await postModel.findByIdAndUpdate(req.params.id, update, { returnDocument: 'after' }).populate('author', 'name email');
    return res.status(200).json({ message: 'Post updated successfully', post: updatedPost });
  } catch (error) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'Media exceeds 25MB size limit' });
    }
    return res.status(500).json({ message: 'Failed to update post', error: error.message });
  }
});

app.delete('/posts/:id', authenticate, async (req, res) => {
  try {
    const post = await postModel.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to delete this post' });
    }

    await postModel.findByIdAndDelete(req.params.id);
    return res.status(200).json({ message: 'Post deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete post', error: error.message });
  }
});

module.exports = app;
