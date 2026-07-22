const express = require('express');
const multer = require('multer');
const cors = require('cors');
const uploadFile = require('./services/storage.service');
const postModel = require('./models/post.model');


const app = express();
app.use(cors());
app.use(express.json());


const upload = multer({storage: multer.memoryStorage()});


app.post('/create-post',upload.single('image'), async (req, res) => {
    console.log(req.body);
    console.log(req.file);

    const result = await uploadFile(req.file.buffer);

    console.log(result);

    const post=await postModel.create({
        image: result.url,
        caption: req.body.caption
    })

    return res.status(201).json({
        message: "Post created successfully",
        post: post
    });
});

app.get("/posts", async (req, res) => {
    const posts = await postModel.find();
    return res.status(200).json({
        message: "Posts retrieved successfully",
        posts: posts
    });
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