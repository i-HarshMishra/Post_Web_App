import { useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, NavLink, useLocation } from 'react-router-dom';
import LoginPage from './components/LoginPage.jsx';
import PostList from './components/PostList.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import ProfilePage from './components/ProfilePage.jsx';
import { useInfiniteScroll } from './hooks/useInfiniteScroll.js';

function AppContent() {
  const location = useLocation();
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
  const [sidebarOpen, setSidebarOpen] = useState(() => !window.matchMedia('(max-width: 760px)').matches);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [googleSignup, setGoogleSignup] = useState('');
  const [processingGoogleAuth, setProcessingGoogleAuth] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return Boolean(params.get('token') || params.get('googleSignup') || params.get('error'));
  });

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

    try {
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
    } catch (error) {
      setMessage('Google login response was invalid');
      window.history.replaceState({}, document.title, '/login');
    } finally {
      setProcessingGoogleAuth(false);
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

  const activeFeed = location.pathname === '/my-posts' ? 'following' : 'all';
  const previousFeed = useRef(activeFeed);
  const feedRequest = useRef(0);

  useEffect(() => {
    const requestId = ++feedRequest.current;
    const feedChanged = previousFeed.current !== activeFeed;
    previousFeed.current = activeFeed;

    if (feedChanged) {
      setPosts([]);
      setHasMore(true);
      if (page !== 1) {
        setPage(1);
        return () => {
          if (feedRequest.current === requestId) feedRequest.current += 1;
        };
      }
    }

    const loadPosts = async () => {
      setLoading(true);
      try {
        const endpoint = activeFeed === 'following' ? '/posts/following' : '/posts';
        const res = await fetch(`${API_URL}${endpoint}?page=${page}&limit=15`, {
          headers: getAuthHeaders()
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load posts');
        if (feedRequest.current !== requestId) return;

        const newPosts = data.posts || [];
        setHasMore(newPosts.length === 15);
        setPosts((prev) => {
          if (page === 1) return newPosts;
          const existingIds = new Set(prev.map((post) => post._id));
          return [...prev, ...newPosts.filter((post) => !existingIds.has(post._id))];
        });
      } catch (error) {
        if (feedRequest.current === requestId) {
          console.error(error);
          setMessage(error.message);
        }
      } finally {
        if (feedRequest.current === requestId) setLoading(false);
      }
    };

    loadPosts();
    return () => {
      if (feedRequest.current === requestId) feedRequest.current += 1;
    };
  }, [page, activeFeed, token]);

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

  const handleRequestPasswordReset = async (resetEmail) => {
    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail })
      });
      const data = await res.json();
      setMessage(data.message || (res.ok ? 'Check your email for a reset code.' : 'Failed to send reset code'));
      return res.ok;
    } catch (error) {
      setMessage('Failed to send reset code');
      console.error(error);
      return false;
    }
  };

  const handleResetPassword = async (resetEmail, code, newPassword) => {
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, code, password: newPassword })
      });
      const data = await res.json();
      setMessage(data.message || (res.ok ? 'Password reset successfully.' : 'Failed to reset password'));
      return res.ok;
    } catch (error) {
      setMessage('Failed to reset password');
      console.error(error);
      return false;
    }
  };

  const handleLogout = () => {
    setUser(null);
    setToken('');
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    setMessage('Logged out');
  };

  const handleUserUpdated = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('authUser', JSON.stringify(updatedUser));
  };

  const handleAccountDeleted = (successMessage) => {
    setUser(null);
    setToken('');
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    setPosts([]);
    setMessage(successMessage);
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
      setShowCreatePost(false);
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

  const handleAddComment = async (id, text) => {
    if (!token) {
      setMessage('You must log in to comment');
      return null;
    }

    try {
      const res = await fetch(`${API_URL}/posts/${id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.message || 'Failed to add comment');
        return null;
      }

      setPosts(prev => prev.map(post => post._id === id ? data.post : post));
      setMessage(data.message || 'Comment added');
      return data.post;
    } catch (error) {
      setMessage('Failed to add comment');
      console.error(error);
      return null;
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
      <div className={`app${user ? ` app-shell${sidebarOpen ? ' sidebar-open' : ' sidebar-closed'}` : ''}`}>
        {user ? (
          <aside id="main-sidebar" className="sidebar" aria-hidden={!sidebarOpen} inert={!sidebarOpen}>
            <Link to="/" className="sidebar-brand">Simple Posts</Link>
            <nav className="sidebar-nav" aria-label="Main navigation">
              <NavLink to="/" end>Feed</NavLink>
              <NavLink to="/my-posts">My Feed</NavLink>
              <NavLink to={`/users/${user.id || user._id}`}>Profile</NavLink>
            </nav>
            <div className="sidebar-account">
              <Link to={`/users/${user.id || user._id}`} className="sidebar-user">
                {user.profilePhoto ? (
                  <img src={user.profilePhoto} alt="" />
                ) : (
                  <span className="sidebar-avatar">{user.name?.slice(0, 1).toUpperCase()}</span>
                )}
                <span>
                  <strong>{user.name}</strong>
                  <small>{user.email}</small>
                </span>
              </Link>
              <button type="button" onClick={handleLogout} className="secondary">
                Logout
              </button>
            </div>
          </aside>
        ) : (
          <header className="guest-header">
            <Link to="/" className="sidebar-brand">Simple Posts</Link>
            <Link to="/login">Login</Link>
          </header>
        )}

        {user && sidebarOpen && (
          <button
            type="button"
            className="sidebar-backdrop"
            aria-label="Close navigation menu"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className={user ? 'main-content' : 'guest-content'}>
          {user && (
            <div className="main-toolbar">
              <button
                type="button"
                className="sidebar-toggle secondary"
                aria-label={sidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={sidebarOpen}
                aria-controls="main-sidebar"
                onClick={() => setSidebarOpen((open) => !open)}
              >
                <span aria-hidden="true">{sidebarOpen ? '×' : '☰'}</span>
                <span className="sidebar-toggle-label">{sidebarOpen ? 'Close menu' : 'Menu'}</span>
              </button>
            </div>
          )}
          {!user && (
            <>
              <h1>Simple Posts</h1>
              <p>Create a post and view recent uploads.</p>
            </>
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
                  handleRequestPasswordReset={handleRequestPasswordReset}
                  handleResetPassword={handleResetPassword}
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
                  handleAddComment={handleAddComment}
                  setLightbox={setLightbox}
                />
              ) : processingGoogleAuth ? (
                <p>Signing in with Google...</p>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/my-posts"
            element={
              <ProtectedRoute user={user}>
                <>
                  <h2>My Feed</h2>
                  <PostList
                    posts={posts}
                    onlyAuthor={false}
                    emptyMessage="Your feed is empty. Visit a post author’s profile and follow them to see their posts here."
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
                    handleAddComment={handleAddComment}
                    setLightbox={setLightbox}
                  />
                </>
              </ProtectedRoute>
            }
          />
          <Route
            path="/users/:id"
            element={
              <ProfilePage
                apiUrl={API_URL}
                token={token}
                user={user}
                onUserUpdated={handleUserUpdated}
                onAccountDeleted={handleAccountDeleted}
                setMessage={setMessage}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          {user && (
            <button
              type="button"
              className="create-post-fab"
              onClick={() => setShowCreatePost(true)}
            >
              <span aria-hidden="true">+</span> Create post
            </button>
          )}
        </main>

        {showCreatePost && user && (
          <div
            className="create-post-overlay"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setShowCreatePost(false);
            }}
          >
            <section className="create-post-dialog" role="dialog" aria-modal="true" aria-labelledby="create-post-title">
              <button
                type="button"
                className="create-post-close secondary"
                aria-label="Close create post"
                onClick={() => setShowCreatePost(false)}
              >
                ×
              </button>
              <h2 id="create-post-title">Create a post</h2>
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
                  required
                />
                <button type="submit" disabled={isUploading}>
                  {isUploading ? 'Uploading...' : 'Create Post'}
                </button>
              </form>
            </section>
          </div>
        )}

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
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;