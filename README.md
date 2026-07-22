# Posts Web App

This project is a simple full-stack web app for creating, viewing, editing, and deleting posts. Users can add a caption and upload an image. The backend stores post data in MongoDB and uploads images to ImageKit.

## What this project does
- Frontend: React + Vite
- Backend: Node.js + Express
- Data store: MongoDB
- Image upload: ImageKit via private key
- File upload handling: multer + image resize/compression
- UI features: create, view, edit, delete posts, plus infinite scroll pagination

## API endpoints
The backend exposes these routes:

- `POST /create-post`
  - Creates a new post
  - Accepts `caption` and an image file named `image`
- `GET /posts`
  - Returns posts with pagination support via `page` and `limit` query params
- `PUT /posts/:id`
  - Updates a post caption and optionally uploads a new image
- `DELETE /posts/:id`
  - Deletes a post by ID

## Project structure

```text
backend/
  package.json
  server.js
  src/
    app.js
    db/
      db.js
    models/
      post.model.js
    services/
      storage.service.js
frontend/
  package.json
  vite.config.js
  index.html
  src/
    App.jsx
    main.jsx
    index.css
```

## Requirements
- Node.js
- npm
- MongoDB database or Atlas cluster
- ImageKit account and private key

## Install dependencies
### Backend
```bash
cd backend
npm install
```

### Frontend
```bash
cd frontend
npm install
```

## Run the project
### Start the backend
```bash
cd backend
node server.js
```
The backend listens on `http://localhost:3000`.

### Start the frontend
Open a second terminal and run:
```bash
cd frontend
npm run dev
```
The frontend runs on `http://localhost:5173` by default.

## Environment variables
Create a `.env` file inside the `backend/` folder with:

```env
MONGO_URI=your_mongodb_connection_string
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
```

## Notes
- The backend must be running before using the frontend.
- Uploaded images are resized and compressed in the backend before upload.
- The backend enforces a 5MB maximum image size.
- Frontend requests use `http://localhost:3000` to reach the API.
