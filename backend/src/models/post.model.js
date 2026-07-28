const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  image: String,
  caption: String,
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  likes: {
    type: Number,
    default: 0
  },
  likedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { timestamps: true });

postSchema.index({ createdAt: -1 });

const postModel = mongoose.model('Post', postSchema);

module.exports = postModel;