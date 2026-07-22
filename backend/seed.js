const dns = require('node:dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

require('dotenv').config();
const mongoose = require('mongoose');
const postModel = require('./src/models/post.model');

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI);
    const dummyPosts = Array.from({ length: 1000 }, (_, i) => ({
        caption: `Seed post ${i}`,
        image: 'https://via.placeholder.com/300'
    }));
    await postModel.insertMany(dummyPosts);
    console.log('Seeded 1000 posts');
    process.exit();
}

seed();