import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import LoginPage from './components/LoginPage.jsx';
import PostList from './components/PostList.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { useInfiniteScroll } from './hooks/useInfiniteScroll.js';

function App() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('authUser');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState(localStorage.getItem('authToken') || '');
  const [caption, setCaption] = useState('');
  const [image, setImage] = useState(null);
  const [posts, setPosts] = useState([]);
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingCaption, setEditingCaption] = useState('');
  const [lightbox, setLightbox] = useState(null);
  const [googleSignup, setGoogleSignup] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const getAuthHeaders = () => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const isAuthor = (post) => {
    if (!user || !post.author) return false;
    const authorId = typeof post.author === 'string' ? post.author : post.author._id || post.author.id;
    return authorId === (user.id || user._id);
  };

  // Pagination states
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Uploading state to show user feedback during slow uploads
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleToken = params.get('token');
    const googleUser = params.get('user');
    const googleSignupToken = params.get('googleSignup');
    const googleError = params.get('error');

    if (googleSignupToken) {
      setGoogleSignup(googleSignupToken);
      setMessage('Choose the name to use for your account');
      window.history.replaceState({}, document.title, '/login');
    } else if (googleToken && googleUser) {
      const parsedUser = JSON.parse(googleUser);
      setToken(googleToken);
      setUser(parsedUser);
      localStorage.setItem('authToken', googleToken);
      localStorage.setItem('authUser', JSON.stringify(parsedUser));
      setMessage('Logged in with Google');
      window.history.replaceState({}, document.title, '/');
    } else if (googleError) {
      setMessage(googleError);
      window.history.replaceState({}, document.title, '/login');
    }
  }, []);

  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/auth/google`;
  };

  const handleGoogleSignup = async (event) => {
    event.preventDefault();
    if (!name.trim()) {
      setMessage('Please enter your name');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/auth/google/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signupToken: googleSignup, name })
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.message || 'Google signup failed');
        return;
      }

      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('authUser', JSON.stringify(data.user));
      setGoogleSignup('');
      setName('');
      setMessage(data.message);
    } catch (error) {
      setMessage('Google signup failed');
      console.error(error);
    }
  };

  const fetchPosts = async (pageNumber) => {
    if (!hasMore) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/posts?page=${pageNumber}&limit=15`, { headers: getAuthHeaders() });
      const data = await res.json();

      const newPosts = data.posts || [];

      if (newPosts.length < 15) {
        setHasMore(false);
      }

      setPosts(prev => {
        if (pageNumber === 1) return newPosts;
        const existingIds = new Set(prev.map(p => p._id));
        const uniqueNewPosts = newPosts.filter(p => !existingIds.has(p._id));
        return [...prev, ...uniqueNewPosts];
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts(page);
  }, [page]);

  useInfiniteScroll(loading, hasMore, () => setPage((prev) => prev + 1));

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    const endpoint = authMode === 'register' ? 'register' : 'login';
    const body = authMode === 'register'
      ? { name, email, password }
      : { email, password };

    try {
      const res = await fetch(`${API_URL}/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage(data.message || 'Authentication failed');
        return;
      }

      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('authUser', JSON.stringify(data.user));
      setMessage(data.message || `Successfully ${authMode === 'register' ? 'registered' : 'logged in'}`);
      setEmail('');
      setPassword('');
      setName('');
    } catch (error) {
      setMessage('Authentication failed');
      console.error(error);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setToken('');
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    setMessage('Logged out');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setMessage('You must log in to create posts');
      return;
    }
    if (!image) {
      setMessage('Please choose an image or video');
      return;
    }
    if (image.size > 25 * 1024 * 1024) {
      setMessage('Media must be 25MB or smaller');
      return;
    }

    setIsUploading(true);
    setMessage('Uploading post... please wait.');

    const formData = new FormData();
    formData.append('caption', caption);
    formData.append('image', image);

    try {
      const res = await fetch(`${API_URL}/create-post`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage(data.message || 'Failed to create post');
        return;
      }

      setMessage(data.message || 'Post created');
      setCaption('');
      setImage(null);
      setPosts((prev) => [data.post, ...prev]);
      setPage(1);
      setHasMore(true);
      e.target.reset();
    } catch (error) {
      setMessage('Failed to create post');
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleLike = async (id) => {
    if (!token) {
      setMessage('You must log in to like posts');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/posts/${id}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.message || 'Failed to update like');
        return;
      }
      setPosts(prev => prev.map(p => p._id === id ? data.post : p));
    } catch (error) {
      setMessage('Failed to update like');
      console.error(error);
    }
  };

  const handleEdit = async (id) => {
    if (!token) {
      setMessage('You must be logged in to edit a post');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/posts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ caption: editingCaption }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage(data.message || 'Failed to update post');
        return;
      }

      setMessage(data.message || 'Post updated');
      setEditingId(null);
      setEditingCaption('');
      setPosts(prev => prev.map(p => p._id === id ? data.post : p));
    } catch (error) {
      setMessage('Failed to update post');
      console.error(error);
    }
  };

  const handleDelete = async (id) => {
    if (!token) {
      setMessage('You must be logged in to delete a post');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/posts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage(data.message || 'Failed to delete post');
        return;
      }

      setMessage(data.message || 'Post deleted');
      setPosts(prev => prev.filter(p => p._id !== id));
    } catch (error) {
      setMessage('Failed to delete post');
      console.error(error);
    }
  };

  return (
    <Router>
      <div className="app">
        {user && (
          <button type="button" onClick={handleLogout} className="logout-button secondary">
            Logout
          </button>
        )}

        <h1>Simple Posts</h1>
        <p>Create a post and view recent uploads.</p>

        <nav className="nav-links" style={{ marginBottom: '20px' }}>
          <Link to="/" style={{ marginRight: '12px' }}>Feed</Link>
          {user && <Link to="/my-posts" style={{ marginRight: '12px' }}>My Posts</Link>}
          {!user && <Link to="/login">Login</Link>}
        </nav>

        {user && (
          <div className="card">
            <p>Signed in as <strong>{user.name}</strong> ({user.email})</p>
          </div>
        )}

        {user && (
          <form onSubmit={handleSubmit} className="card">
            <input
              type="text"
              placeholder="Caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              disabled={isUploading}
            />
            <input
              type="file"
              accept="image/*,video/*"
              onChange={(e) => setImage(e.target.files[0])}
              disabled={isUploading}
            />
            <button type="submit" disabled={isUploading}>
              {isUploading ? 'Uploading...' : 'Create Post'}
            </button>
          </form>
        )}

        {message && <p className="message">{message}</p>}

        <Routes>
          <Route
            path="/login"
            element={
              user ? <Navigate to="/" replace /> : (
                <LoginPage
                  authMode={authMode}
                  setAuthMode={setAuthMode}
                  name={name}
                  setName={setName}
                  email={email}
                  setEmail={setEmail}
                  password={password}
                  setPassword={setPassword}
                  handleAuthSubmit={handleAuthSubmit}
                  handleGoogleLogin={handleGoogleLogin}
                  googleSignup={googleSignup}
                  handleGoogleSignup={handleGoogleSignup}
                />
              )
            }
          />
          <Route
            path="/"
            element={
              user ? (
                <PostList
                  posts={posts}
                  onlyAuthor={false}
                  isAuthor={isAuthor}
                  user={user}
                  loading={loading}
                  hasMore={hasMore}
                  editingId={editingId}
                  editingCaption={editingCaption}
                  setEditingId={setEditingId}
                  setEditingCaption={setEditingCaption}
                  handleEdit={handleEdit}
                  handleDelete={handleDelete}
                  handleToggleLike={handleToggleLike}
                  setLightbox={setLightbox}
                />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/my-posts"
            element={
              <ProtectedRoute user={user}>
                <PostList
                  posts={posts}
                  onlyAuthor
                  isAuthor={isAuthor}
                  user={user}
                  loading={loading}
                  hasMore={hasMore}
                  editingId={editingId}
                  editingCaption={editingCaption}
                  setEditingId={setEditingId}
                  setEditingCaption={setEditingCaption}
                  handleEdit={handleEdit}
                  handleDelete={handleDelete}
                  handleToggleLike={handleToggleLike}
                  setLightbox={setLightbox}
                />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {lightbox && (
          <div className="lightbox-overlay" onClick={() => setLightbox(null)}>
            <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
              <button type="button" className="lightbox-close" onClick={() => setLightbox(null)}>
                ×
              </button>
              {lightbox.mediaType?.startsWith('video/') ? (
                <video className="lightbox-image" src={lightbox.src} controls autoPlay />
              ) : (
                <img className="lightbox-image" src={lightbox.src} alt={lightbox.caption} />
              )}
              <p className="lightbox-caption">{lightbox.caption}</p>
            </div>
          </div>
        )}
      </div>
    </Router>
  );
}

export default App;