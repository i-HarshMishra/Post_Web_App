const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization token missing' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'change_this_secret');
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'Invalid auth token' });
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name
    };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid auth token', error: error.message });
  }
};

module.exports = { authenticate };
