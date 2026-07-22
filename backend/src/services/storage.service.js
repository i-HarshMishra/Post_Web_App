const ImageKit = require("@imagekit/nodejs");

const imagekit = new ImageKit({

    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
});


async function uploadImage(buffer) {
    const result = await imagekit.files.upload({
        file: buffer.toString('base64'),
        fileName: "image.jpg",
    });

    return result;
}

module.exports = uploadImage;