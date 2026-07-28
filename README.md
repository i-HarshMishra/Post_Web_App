# Posts Web App

A simple full-stack web app with authentication, image posts, and like functionality.

## What this project does
- Frontend: React + Vite
- Backend: Node.js + Express
- Data store: MongoDB
- Image upload: ImageKit via private key
- Auth: email, name, password registration and login
- Post actions: create, view, edit, delete, like/unlike
- UI features: protected route for user posts, infinite scroll pagination

## API endpoints
The backend exposes these routes:

- `POST /auth/register`
  - Creates a new user account
  - Accepts JSON: `name`, `email`, `password`
- `POST /auth/login`
  - Authenticates a user and returns a JWT token
  - Accepts JSON: `email`, `password`
- `POST /create-post`
  - Creates a new post (authenticated)
  - Accepts `caption` and an image file named `image`
- `GET /posts`
  - Returns posts with pagination support via `page` and `limit` query params
- `PUT /posts/:id`
  - Updates a post caption and optionally uploads a new image (authenticated, author-only)
- `DELETE /posts/:id`
  - Deletes a post by ID (authenticated, author-only)
- `POST /posts/:id/like`
  - Toggles like/unlike for the authenticated user

## Project structure

```text
backend/
  package.json
  server.js
  src/
    app.js
    db/
      db.js
    middlewares/
      auth.middleware.js
    models/
      post.model.js
      user.model.js
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
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
FRONTEND_URL=http://localhost:5173
```

## Notes
- The backend must be running before using the frontend.
- Uploaded images are resized and compressed in the backend before upload.
- The backend enforces a 5MB maximum image size for uploads.
- The frontend stores auth tokens in `localStorage` and uses JWT for protected requests.
- Only the post author can edit or delete a post.
- The `My Posts` route is protected and only available to signed-in users.
