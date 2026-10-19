# Simple Posts

A full-stack social media app with email/password and Google authentication, password-reset OTPs, user profiles, follow-based feeds, image/video posts, likes, and comments.

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

Create `backend/.env` with your values. Get `MONGODB_URI` from your MongoDB Atlas
cluster using **Connect → Drivers**, or use the connection string for your own
MongoDB server:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
FRONTEND_URL=http://localhost:5173
PORT=3000
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
GMAIL_USER=your_gmail_address
GMAIL_APP_PASSWORD=your_16_character_google_app_password
```

Create `frontend/.env` if you need a custom API URL:

```env
VITE_API_URL=http://localhost:3000
```

Run the backend and frontend in separate terminal windows:

Backend:

```bash
cd backend
node server.js
```

Frontend:

```bash
cd frontend
npm run dev
```

## Features

- **Authentication:** Register and sign in with email/password or Google. Forgot-password codes are emailed through Gmail and expire after 10 minutes.
- **Posts:** Upload images or videos with captions, edit or delete your own posts, and browse the public feed with infinite scrolling.
- **Interactions:** Like posts and add comments. Comment text is limited to 1,000 characters.
- **Profiles:** Visit `/users/:id` to view a user's profile and posts. Your own profile lets you update your bio and profile photo.
- **Following:** Follow or unfollow users from their profiles. **My Feed** shows posts from accounts you follow.
- **Account management:** Change your email or password, or delete your account from the account-settings section on your own profile. Account deletion also removes your posts, comments, and likes.
- **Navigation:** Signed-in users have a collapsible sidebar for **Feed**, **My Feed**, and **Profile**. Use **Create post** at the bottom-right to open the post composer.

### Google OAuth setup

1. Create an OAuth client of type **Web application** in Google Cloud Console.
2. Add `http://localhost:5173` as an authorized JavaScript origin.
3. Add `http://localhost:3000/auth/google/callback` as an authorized redirect URI.
4. For an external app in testing mode, add your Google account under **Test users**.
5. Copy the client ID and secret into `backend/.env` and restart the backend.

New Google users choose their account name after Google verifies their email. Existing users with the same email are signed in automatically.

### Gmail password reset setup

1. Enable 2-Step Verification on the Gmail account that will send reset emails.
2. Create an App Password in your Google Account security settings.
3. Set `GMAIL_USER` and `GMAIL_APP_PASSWORD` in `backend/.env` and restart the backend. Use the 16-character App Password, not your regular Gmail password.
4. On the login page, select **Forgot password?**, enter the account email, and submit the six-digit code sent to that inbox with a new password.

Reset codes expire after 10 minutes and allow up to five verification attempts. The request response does not reveal whether an email address has an account.

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
           ├── email.service.js
           └── storage.service.js
 frontend/
    ├── .env
    ├── package.json
    ├── package-lock.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── App.jsx
        ├── components/
        │   ├── AccountSettings.jsx
        │   └── ProfilePage.jsx
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
- Uses React Router for the public feed, personalized `/my-posts` feed, and public `/users/:id` profiles. Profile editing and account settings appear on your own profile.
- The signed-in layout has a collapsible navigation sidebar and a bottom-right post-composer button.
- Stores auth token and user info in `localStorage`
- Uses `VITE_API_URL` or defaults to `http://localhost:3000`

## API

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | No | Register with `{ name, email, password }` |
| POST | `/auth/login` | No | Login with `{ email, password }` |
| POST | `/auth/forgot-password` | No | Email a six-digit reset code with `{ email }` |
| POST | `/auth/reset-password` | No | Reset a password with `{ email, code, password }` |
| PUT | `/auth/change-email` | Yes | Change email with `{ email, currentPassword }` |
| PUT | `/auth/change-password` | Yes | Change password with `{ currentPassword, newPassword }` |
| DELETE | `/auth/account` | Yes | Delete account and associated posts, comments, and likes with `{ currentPassword }` |
| GET | `/auth/google` | No | Start Google OAuth login |
| GET | `/auth/google/callback` | No | Handle Google OAuth callback |
| POST | `/auth/google/complete` | No | Complete a new Google account with a chosen `{ signupToken, name }` |
| GET | `/users/:id` | No | Get a public profile and its posts |
| GET | `/users/:id/follow-status` | Yes | Get whether the signed-in user follows this profile |
| PUT | `/users/:id/follow` | Yes | Follow a user |
| DELETE | `/users/:id/follow` | Yes | Unfollow a user |
| PATCH | `/me/profile` | Yes | Update `{ bio }` and optional `profilePhoto` image (max 5 MB) |
| POST | `/create-post` | Yes | Create image/video post with multipart form data: `caption`, `image` (max 25 MB) |
| GET | `/posts?page=&limit=` | No | Paginated feed, post and comment authors populated |
| GET | `/posts/following?page=&limit=` | Yes | Paginated personalized feed of posts from followed accounts |
| POST | `/posts/:id/like` | Yes | Toggle like for a post |
| POST | `/posts/:id/comments` | Yes | Add a comment with `{ text }` (up to 1000 characters) |
| PUT | `/posts/:id` | Yes | Update caption or replace image |
| DELETE | `/posts/:id` | Yes | Delete a post |

## Data Models

**User**
- `name`
- `email` (unique)
- `password` (hashed)
- `bio` (up to 300 characters)
- `profilePhoto` (ImageKit URL)
- `following[]` (references to followed users)

**Post**
- `image` (ImageKit URL)
- `mediaType` (image or video MIME type)
- `caption`
- `author` (ref User)
- `likes`
- `likedBy[]`
- `comments[]` (comment text, author, and timestamps)

## Notes

- Media is uploaded using Multer memory storage with a 25 MB limit. Images are resized with Sharp to a max width of 1200px, converted to JPEG quality 80, and uploaded to ImageKit. Videos are uploaded unchanged.
- The frontend is a single-page React app in `frontend/src/App.jsx` and includes a `/my-posts` view for signed-in users.
- JWTs are issued for 7 days and verified with `JWT_SECRET`.
- `IMAGEKIT_PRIVATE_KEY` must remain server-side only.
- Public profile pages show a user's bio, profile photo, and posts. Profile photos are resized and converted to JPEG before they are uploaded to ImageKit.
- Follow and unfollow users from their public profiles; **My Feed** shows paginated posts from followed accounts.
- Account settings require the current password for email changes, password changes, and account deletion. Google-only users can set a password through the email reset flow first.
- Deleting an account also deletes that user's posts, comments on other posts, and likes. This operation uses MongoDB transactions and requires a replica set, as provided by MongoDB Atlas.
- Follow lists are stored on user accounts; deleting an account also removes it from other users' follow lists.
- Google login uses a short-lived signed signup token while a new user chooses their name.
- Uploads accept images and videos up to 25 MB. Images are resized and converted to JPEG; videos are uploaded without image processing.
- Configure Google OAuth with a web application client in Google Cloud Console and add `http://localhost:3000/auth/google/callback` as an authorized redirect URI.

## Troubleshooting

- **MongoDB `ENOTFOUND` errors** → the hostname in `MONGODB_URI` could not be
  resolved. Copy the current connection string from Atlas (**Connect → Drivers**)
  and replace the value in `backend/.env`; check that the cluster hostname and
  credentials are correct. Do not share or commit the connection string.
- **MongoDB connection timeouts** → verify the cluster is available and that
  your current IP address is allowed in the Atlas network access list.
- **Authentication errors** → verify `JWT_SECRET` is consistent between start and environment.
- **Upload failures** → verify `IMAGEKIT_PRIVATE_KEY` and file size (max 25MB for images and videos).
- **CORS errors** → set `FRONTEND_URL` to the actual frontend origin.
