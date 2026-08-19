# Simple Posts

A minimal full-stack media-posting app with email/password and Google authentication, likes, edit/delete, video support, and an infinite-scroll feed.

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
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
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

### Google OAuth setup

1. Create an OAuth client of type **Web application** in Google Cloud Console.
2. Add `http://localhost:5173` as an authorized JavaScript origin.
3. Add `http://localhost:3000/auth/google/callback` as an authorized redirect URI.
4. For an external app in testing mode, add your Google account under **Test users**.
5. Copy the client ID and secret into `backend/.env` and restart the backend.

New Google users choose their account name after Google verifies their email. Existing users with the same email are signed in automatically.

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
| GET | `/auth/google` | No | Start Google OAuth login |
| GET | `/auth/google/callback` | No | Handle Google OAuth callback |
| POST | `/auth/google/complete` | No | Complete a new Google account with a chosen `{ signupToken, name }` |
| POST | `/create-post` | Yes | Create image/video post with multipart form data: `caption`, `image` (max 25 MB) |
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
- `mediaType` (image or video MIME type)
- `caption`
- `author` (ref User)
- `likes`
- `likedBy[]`

## Notes

- Media is uploaded using Multer memory storage with a 25 MB limit. Images are resized with Sharp to a max width of 1200px, converted to JPEG quality 80, and uploaded to ImageKit. Videos are uploaded unchanged.
- The frontend is a single-page React app in `frontend/src/App.jsx` and includes a `/my-posts` view for signed-in users.
- JWTs are issued for 7 days and verified with `JWT_SECRET`.
- `IMAGEKIT_PRIVATE_KEY` must remain server-side only.
- Google login uses a short-lived signed signup token while a new user chooses their name.
- Uploads accept images and videos up to 25 MB. Images are resized and converted to JPEG; videos are uploaded without image processing.
- Configure Google OAuth with a web application client in Google Cloud Console and add `http://localhost:3000/auth/google/callback` as an authorized redirect URI.

## Troubleshooting

- **MongoDB errors** → verify `MONGODB_URI` and database connectivity.
- **Authentication errors** → verify `JWT_SECRET` is consistent between start and environment.
- **Upload failures** → verify `IMAGEKIT_PRIVATE_KEY` and file size (max 25MB for images and videos).
- **CORS errors** → set `FRONTEND_URL` to the actual frontend origin.
