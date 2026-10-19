const express = require('express');
const multer = require('multer');
const cors = require('cors');
const compression = require('compression');
const sharp = require('sharp');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const mongoose = require('mongoose');

const uploadFile = require('./services/storage.service');
const { isEmailConfigured, sendPasswordResetCode } = require('./services/email.service');
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

const profilePhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (!file.mimetype.startsWith('image/')) {
      return callback(new Error('Profile photo must be an image'));
    }
    return callback(null, true);
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

const getGoogleConfig = () => ({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback'
});

const createGoogleSignupToken = (email, googleName) => jwt.sign(
  { purpose: 'google-signup', email, googleName },
  process.env.JWT_SECRET || 'change_this_secret',
  { expiresIn: '10m' }
);

const hashPasswordResetCode = (code) => crypto
  .createHmac('sha256', process.env.JWT_SECRET || 'change_this_secret')
  .update(code)
  .digest('hex');

app.get('/auth/google', (req, res) => {
  const { clientId, redirectUri } = getGoogleConfig();
  if (!clientId) {
    return res.status(503).json({ message: 'Google login is not configured' });
  }

  const googleUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleUrl.searchParams.set('client_id', clientId);
  googleUrl.searchParams.set('redirect_uri', redirectUri);
  googleUrl.searchParams.set('response_type', 'code');
  googleUrl.searchParams.set('scope', 'openid email profile');
  googleUrl.searchParams.set('access_type', 'offline');
  googleUrl.searchParams.set('prompt', 'select_account');

  return res.redirect(googleUrl.toString());
});

app.get('/auth/google/callback', async (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  try {
    if (req.query.error) {
      return res.redirect(`${frontendUrl}/?error=Google+login+was+cancelled`);
    }

    const { clientId, clientSecret, redirectUri } = getGoogleConfig();
    if (!clientId || !clientSecret || !req.query.code) {
      return res.redirect(`${frontendUrl}/?error=Google+login+is+not+configured`);
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: req.query.code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new Error(tokenData.error_description || 'Google token exchange failed');
    }

    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const profile = await profileResponse.json();
    if (!profileResponse.ok || !profile.email || !profile.email_verified) {
      throw new Error('Google account email could not be verified');
    }

    const email = profile.email.toLowerCase().trim();
    const user = await User.findOne({ email });

    if (!user) {
      const redirectUrl = new URL('/', frontendUrl);
      redirectUrl.searchParams.set('googleSignup', createGoogleSignupToken(email, profile.name || ''));
      return res.redirect(redirectUrl.toString());
    }

    const redirectUrl = new URL('/', frontendUrl);
    redirectUrl.searchParams.set('token', createToken(user));
    redirectUrl.searchParams.set('user', JSON.stringify(user.toJSON()));
    return res.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('Google login failed:', error.message);
    return res.redirect(`${frontendUrl}/?error=Google+login+failed`);
  }
});

app.post('/auth/google/complete', async (req, res) => {
  try {
    const { signupToken, name } = req.body;
    const payload = jwt.verify(signupToken, process.env.JWT_SECRET || 'change_this_secret');

    if (payload.purpose !== 'google-signup' || !payload.email || !name?.trim()) {
      return res.status(400).json({ message: 'A valid name is required' });
    }

    let user = await User.findOne({ email: payload.email });
    if (!user) {
      user = await User.create({
        name: name.trim(),
        email: payload.email,
        password: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10)
      });
    }

    return res.status(200).json({
      message: 'Logged in with Google',
      token: createToken(user),
      user: user.toJSON()
    });
  } catch (error) {
    return res.status(400).json({ message: 'Google signup expired. Please try again.' });
  }
});

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

app.post('/auth/forgot-password', async (req, res) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.toLowerCase().trim() : '';
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    if (!isEmailConfigured()) {
      return res.status(503).json({ message: 'Password reset email is not configured' });
    }

    const genericMessage = 'If an account exists for this email, a password reset code has been sent.';
    const now = new Date();
    const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
    const codeHash = hashPasswordResetCode(code);
    const user = await User.findOneAndUpdate(
      {
        email,
        $or: [
          { passwordResetRequestedAt: { $exists: false } },
          { passwordResetRequestedAt: { $lte: new Date(now.getTime() - 60_000) } }
        ]
      },
      {
        $set: {
          passwordResetCodeHash: codeHash,
          passwordResetExpiresAt: new Date(now.getTime() + 10 * 60_000),
          passwordResetRequestedAt: now,
          passwordResetAttempts: 0
        }
      },
      { returnDocument: 'after' }
    ).select('email');

    if (!user) {
      return res.status(200).json({ message: genericMessage });
    }

    try {
      await sendPasswordResetCode(user.email, code);
    } catch (error) {
      await User.updateOne(
        { _id: user._id, passwordResetCodeHash: codeHash },
        {
          $unset: {
            passwordResetCodeHash: 1,
            passwordResetExpiresAt: 1,
            passwordResetRequestedAt: 1
          },
          $set: { passwordResetAttempts: 0 }
        }
      );
      console.error('Password reset email failed:', error.message);
      return res.status(503).json({ message: 'Unable to send password reset email. Check Gmail SMTP configuration.' });
    }

    return res.status(200).json({ message: genericMessage });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to request password reset', error: error.message });
  }
});

app.post('/auth/reset-password', async (req, res) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.toLowerCase().trim() : '';
    const code = typeof req.body.code === 'string' ? req.body.code.trim() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!email || !/^\d{6}$/.test(code) || !password) {
      return res.status(400).json({ message: 'Email, a valid six-digit code, and a new password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters long' });
    }

    const now = new Date();
    const codeHash = hashPasswordResetCode(code);
    const user = await User.findOne({
      email,
      passwordResetExpiresAt: { $gt: now },
      passwordResetAttempts: { $lt: 5 }
    }).select('+passwordResetCodeHash +passwordResetExpiresAt +passwordResetAttempts');

    if (!user) {
      return res.status(400).json({ message: 'The reset code is invalid or expired. Request a new code and try again.' });
    }

    if (user.passwordResetCodeHash !== codeHash) {
      await User.updateOne(
        {
          _id: user._id,
          passwordResetCodeHash: user.passwordResetCodeHash,
          passwordResetExpiresAt: { $gt: now },
          passwordResetAttempts: { $lt: 5 }
        },
        { $inc: { passwordResetAttempts: 1 } }
      );
      return res.status(400).json({ message: 'The reset code is invalid or expired. Request a new code and try again.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await User.updateOne(
      {
        _id: user._id,
        passwordResetCodeHash: codeHash,
        passwordResetExpiresAt: { $gt: now },
        passwordResetAttempts: { $lt: 5 }
      },
      {
        $set: { password: hashedPassword, passwordResetAttempts: 0 },
        $unset: {
          passwordResetCodeHash: 1,
          passwordResetExpiresAt: 1,
          passwordResetRequestedAt: 1
        }
      }
    );

    if (!result.modifiedCount) {
      return res.status(400).json({ message: 'The reset code is invalid or expired. Request a new code and try again.' });
    }

    return res.status(200).json({ message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to reset password', error: error.message });
  }
});

app.put('/auth/change-email', authenticate, async (req, res) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.toLowerCase().trim() : '';
    const currentPassword = typeof req.body.currentPassword === 'string' ? req.body.currentPassword : '';

    if (!email || !currentPassword) {
      return res.status(400).json({ message: 'New email and current password are required' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Enter a valid email address' });
    }

    const user = await User.findById(req.user.id);
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    if (email === user.email) {
      return res.status(400).json({ message: 'New email must be different from your current email' });
    }
    if (await User.exists({ email, _id: { $ne: user._id } })) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    user.email = email;
    await user.save();
    return res.status(200).json({ message: 'Email updated successfully', user: user.toJSON() });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Email already in use' });
    }
    return res.status(500).json({ message: 'Failed to update email', error: error.message });
  }
});

app.put('/auth/change-password', authenticate, async (req, res) => {
  try {
    const currentPassword = typeof req.body.currentPassword === 'string' ? req.body.currentPassword : '';
    const newPassword = typeof req.body.newPassword === 'string' ? req.body.newPassword : '';
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new passwords are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters long' });
    }

    const user = await User.findById(req.user.id);
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordResetCodeHash = undefined;
    user.passwordResetExpiresAt = undefined;
    user.passwordResetRequestedAt = undefined;
    user.passwordResetAttempts = 0;
    await user.save();

    return res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update password', error: error.message });
  }
});

app.delete('/auth/account', authenticate, async (req, res) => {
  const currentPassword = typeof req.body.currentPassword === 'string' ? req.body.currentPassword : '';
  if (!currentPassword) {
    return res.status(400).json({ message: 'Current password is required to delete your account' });
  }

  let session;
  try {
    session = await mongoose.startSession();
    const user = await User.findById(req.user.id);
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    await session.withTransaction(async () => {
      const userId = user._id;
      await postModel.updateMany(
        { author: { $ne: userId }, likedBy: userId },
        [
          {
            $set: {
              likedBy: {
                $filter: {
                  input: { $ifNull: ['$likedBy', []] },
                  as: 'likedById',
                  cond: { $ne: ['$$likedById', userId] }
                }
              }
            }
          },
          { $set: { likes: { $size: '$likedBy' } } }
        ],
        { session }
      );
      await postModel.updateMany(
        { author: { $ne: userId }, 'comments.author': userId },
        { $pull: { comments: { author: userId } } },
        { session }
      );
      await postModel.deleteMany({ author: userId }, { session });
      await User.deleteOne({ _id: userId }, { session });
    });

    return res.status(200).json({ message: 'Account and associated content deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete account', error: error.message });
  } finally {
    if (session) await session.endSession();
  }
});

app.get('/users/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const user = await User.findById(req.params.id).select('name bio profilePhoto createdAt').lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const posts = await postModel.find({ author: user._id })
      .populate('author', 'name email profilePhoto')
      .populate('comments.author', 'name email profilePhoto')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ profile: user, posts });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to retrieve profile', error: error.message });
  }
});

app.patch(
  '/me/profile',
  authenticate,
  (req, res, next) => {
    profilePhotoUpload.single('profilePhoto')(req, res, (error) => {
      if (error) {
        const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
        return res.status(status).json({
          message: error.code === 'LIMIT_FILE_SIZE'
            ? 'Profile photo must be 5MB or smaller'
            : error.message === 'Profile photo must be an image'
              ? error.message
              : 'Unable to process profile photo'
        });
      }
      return next();
    });
  },
  async (req, res) => {
    try {
      const bio = typeof req.body.bio === 'string' ? req.body.bio.trim() : '';
      if (bio.length > 300) {
        return res.status(400).json({ message: 'Bio must be 300 characters or fewer' });
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (req.file) {
        const photoBuffer = await sharp(req.file.buffer)
          .resize({ width: 600, height: 600, fit: 'cover' })
          .jpeg({ quality: 85 })
          .toBuffer();
        const result = await uploadFile(photoBuffer, `profile-${user._id}.jpg`);
        user.profilePhoto = result.url;
      }
      user.bio = bio;
      await user.save();

      return res.status(200).json({ message: 'Profile updated successfully', user: user.toJSON() });
    } catch (error) {
      return res.status(500).json({ message: 'Failed to update profile', error: error.message });
    }
  }
);

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

    await post.populate('author', 'name email profilePhoto');
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
      .populate('author', 'name email profilePhoto')
      .populate('comments.author', 'name email profilePhoto')
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
    const updatedPost = await postModel.findById(req.params.id)
      .populate('author', 'name email profilePhoto')
      .populate('comments.author', 'name email profilePhoto')
      .lean();

    return res.status(200).json({ message: 'Post like updated', post: updatedPost });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update like', error: error.message });
  }
});

app.post('/posts/:id/comments', authenticate, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
    if (!text) {
      return res.status(400).json({ message: 'Comment cannot be empty' });
    }
    if (text.length > 1000) {
      return res.status(400).json({ message: 'Comment must be 1000 characters or fewer' });
    }

    const post = await postModel.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    post.comments.push({ text, author: req.user.id });
    await post.save();

    const updatedPost = await postModel.findById(post._id)
      .populate('author', 'name email profilePhoto')
      .populate('comments.author', 'name email profilePhoto')
      .lean();

    return res.status(201).json({ message: 'Comment added successfully', post: updatedPost });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to add comment', error: error.message });
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

    const updatedPost = await postModel.findByIdAndUpdate(req.params.id, update, { returnDocument: 'after' })
      .populate('author', 'name email profilePhoto')
      .populate('comments.author', 'name email profilePhoto');
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
