const express = require('express');
const multer = require('multer');
const cors = require('cors');
const uploadFile = require('./services/storage.service');
const sharp = require('sharp');
const postModel = require('./models/post.model');


const compression = require('compression'); 
const app = express();
app.use(compression()); 
app.use(cors());
app.use(express.json());


const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB max file size
});


app.post('/create-post', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Image file is required' });
        }

        const sharp = require('sharp'); // ADD this require at the top of the file, with your other requires

        // ... inside the route handler, replace the uploadFile line with:
        const resizedBuffer = await sharp(req.file.buffer)
            .resize({ width: 1200, withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toBuffer();

        const result = await uploadFile(resizedBuffer);

        const post = await postModel.create({
            image: result.url,
            caption: req.body.caption
        });

        return res.status(201).json({
            message: "Post created successfully",
            post: post
        });
    } catch (error) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ message: 'Image exceeds 5MB size limit' });
        }
        return res.status(500).json({ message: 'Failed to create post', error: error.message });
    }
});

app.get("/posts", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const posts = await postModel
            .find()
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        return res.status(200).json({
            message: "Posts retrieved successfully",
            posts: posts
        });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to retrieve posts', error: error.message });
    }
});

app.put('/posts/:id', upload.single('image'), async (req, res) => {
    try {
        const update = {};

        if (req.body.caption !== undefined) {
            update.caption = req.body.caption;
        }

        if (req.file) {
            const result = await uploadFile(req.file.buffer);
            update.image = result.url;
        }

        const post = await postModel.findByIdAndUpdate(req.params.id, update, { new: true });

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        return res.status(200).json({
            message: 'Post updated successfully',
            post
        });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to update post', error: error.message });
    }
});

app.delete('/posts/:id', async (req, res) => {
    try {
        const post = await postModel.findByIdAndDelete(req.params.id);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        return res.status(200).json({
            message: 'Post deleted successfully'
        });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to delete post', error: error.message });
    }
});

module.exports = app;