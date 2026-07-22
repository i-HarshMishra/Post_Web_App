const mongoose = require('mongoose');


const postSchema = new mongoose.Schema({
    image: String,
    caption: String,
}, { timestamps: true });

postSchema.index({ createdAt: -1 });

const postModel = mongoose.model('Post', postSchema);

module.exports = postModel;