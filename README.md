# Simple Posts

A minimal full-stack image-posting app with auth, likes, edit/delete, and infinite-scroll feed.

**Stack:**
- Backend: Node.js, Express, MongoDB/Mongoose, JWT, bcryptjs, Multer, Sharp, ImageKit
- Frontend: React, Vite, React Router

## Setup

```bash
# Backend
cd backend && npm install

# Frontend
cd frontend && npm install
```

Create `backend/.env` with your values:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
FRONTEND_URL=http://localhost:5173
PORT=3000
```

Create `frontend/.env` if you need a custom API URL:

```env
VITE_API_URL=http://localhost:3000
```

Run the app:

```bash
# Start backend
cd backend && node server.js

# Start frontend
cd frontend && npm run dev
```

## Folder structure

```text

 backend/
   ├── .env
   ├── package.json
   ├── package-lock.json
   ├── server.js
   └── src/
       ├── app.js
       ├── db/
       │   └── db.js
       ├── middlewares/
       │   └── Auth.middleware.js
       ├── models/
       │   ├── post.model.js
       │   └── user.model.js
       └── services/
           └── storage.service.js
 frontend/
    ├── .env
    ├── package.json
    ├── package-lock.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── App.jsx
        ├── index.css
        └── main.jsx
```

## Backend

- Entry point: `backend/server.js`
- App module: `backend/src/app.js`
- Auth middleware: `backend/src/middlewares/Auth.middleware.js`
- Image upload service: `backend/src/services/storage.service.js`
- MongoDB models: `backend/src/models/user.model.js`, `backend/src/models/post.model.js`
- CORS origin is read from `FRONTEND_URL` with fallback to `*`

## Frontend

- Main app: `frontend/src/App.jsx`
- Uses React Router for `/` and `/my-posts`
- Stores auth token and user info in `localStorage`
- Uses `VITE_API_URL` or defaults to `http://localhost:3000`

## API

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | No | Register with `{ name, email, password }` |
| POST | `/auth/login` | No | Login with `{ email, password }` |
| POST | `/create-post` | Yes | Create post with multipart form data: `caption`, `image` |
| GET | `/posts?page=&limit=` | No | Paginated feed, author populated |
| POST | `/posts/:id/like` | Yes | Toggle like for a post |
| PUT | `/posts/:id` | Yes | Update caption or replace image |
| DELETE | `/posts/:id` | Yes | Delete a post |

## Data Models

**User**
- `name`
- `email` (unique)
- `password` (hashed)

**Post**
- `image` (ImageKit URL)
- `caption`
- `author` (ref User)
- `likes`
- `likedBy[]`

## Notes

- Images are uploaded using Multer memory storage, resized with Sharp to a max width of 1200px, converted to JPEG quality 80, and uploaded to ImageKit.
- The frontend is a single-page React app in `frontend/src/App.jsx` and includes a `/my-posts` view for signed-in users.
- JWTs are issued for 7 days and verified with `JWT_SECRET`.
- `IMAGEKIT_PRIVATE_KEY` must remain server-side only.

## Troubleshooting

- **MongoDB errors** → verify `MONGODB_URI` and database connectivity.
- **Authentication errors** → verify `JWT_SECRET` is consistent between start and environment.
- **Upload failures** → verify `IMAGEKIT_PRIVATE_KEY` and file size (max 25MB for images and videos).
- **CORS errors** → set `FRONTEND_URL` to the actual frontend origin.
