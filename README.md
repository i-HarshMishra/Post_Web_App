# Posts Web App

This project is a simple full-stack app for creating, viewing, editing, and deleting posts. Users can add a caption and an image, and the app stores the post in MongoDB while uploading the image through ImageKit.

## What this project does
- The frontend is built with React.
- The backend is built with Node.js and Express.
- Posts are stored in MongoDB.
- Images are uploaded using ImageKit.
- Users can create, view, edit, and delete posts from the UI.

## API endpoints
The backend provides these routes:

- POST /create-post
  - Creates a new post
  - Accepts a caption and an image file
- GET /posts
  - Returns all posts
- PUT /posts/:id
  - Updates a post caption
- DELETE /posts/:id
  - Deletes a post by its ID

The frontend calls these APIs from the browser.

## Project structure

```text
backend/
  server.js
  src/
    app.js
    db/
    models/
    services/
frontend/
  src/
  index.html
  package.json
  vite.config.js
```

## Requirements
- Node.js
- npm
- MongoDB database
- ImageKit account for image uploads

## Dependencies to install
### Backend
Run this inside the backend folder:
```bash
cd backend
npm install
```

Installed backend packages include:
- express
- cors
- dotenv
- mongoose
- multer
- @imagekit/nodejs

### Frontend
Run this inside the frontend folder:
```bash
cd frontend
npm install
```

Installed frontend packages include:
- react
- react-dom
- vite
- @vitejs/plugin-react

## How to run the project
### 1. Start the backend
```bash
cd backend
node server.js
```
The backend will run on port 3000.

### 2. Start the frontend
Open a new terminal and run:
```bash
cd frontend
npm run dev
```
The frontend will run on port 5173.

## Environment variables
Create a `.env` file inside the backend folder and add your configuration values:

```env
MONGO_URI=your_mongodb_connection_string
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
```

## Notes
- Make sure the backend is running before using the frontend.
- The app uses MongoDB to store post details.
- Image uploads depend on your ImageKit configuration.
