import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';

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
  
  // NEW: Uploading state to show user feedback during slow uploads
  const [isUploading, setIsUploading] = useState(false);

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

  useEffect(() => {
    const handleScroll = () => {
      const scrolledToBottom = window.innerHeight + document.documentElement.scrollTop + 1 >= document.documentElement.scrollHeight;
      if (scrolledToBottom && hasMore && !loading) {
        setPage(prev => prev + 1);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, loading]);

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
      setMessage('Please choose an image');
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
      setMessage(data.message || 'Post created');
      setCaption('');
      setImage(null);
      setPage(1);
      setHasMore(true);
      fetchPosts(1);
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

  const handleDelete = async (id) => {
    if (!token) {
      setMessage('You must be logged in to delete a post');
      return;
    }
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
      setMessage(data.message || 'Post updated');
      setEditingId(null);
      setEditingCaption('');
      setPosts(prev => prev.map(p => p._id === id ? data.post : p));
    } catch (error) {
      setMessage('Failed to update post');
      console.error(error);
    }
  };

  // Helper function to format the date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const PostList = ({ onlyAuthor = false }) => {
    const visiblePosts = onlyAuthor ? posts.filter(post => isAuthor(post)) : posts;

    return (
      <div className="posts">
        {visiblePosts.length === 0 && !loading ? (
          <p>{onlyAuthor ? 'No posts found for your account.' : 'No posts yet.'}</p>
        ) : (
          visiblePosts.map((post) => (
            <div key={post._id} className="card post-card">
              <div style={{ color: '#666', fontSize: '0.85rem', marginBottom: '10px', textAlign: 'right' }}>
                {formatDate(post.createdAt)}
              </div>
              {post.author && (
                <div style={{ color: '#555', fontSize: '0.9rem', marginBottom: '8px' }}>
                  Posted by {typeof post.author === 'string' ? 'Unknown' : post.author.name || post.author.email}
                </div>
              )}
              {post.image && (
                <img
                  src={post.image}
                  alt={post.caption || 'Post'}
                  loading="lazy"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setLightbox({ src: post.image, caption: post.caption || 'Post image' })}
                />
              )}
              {editingId === post._id ? (
                <div className="edit-box">
                  <input
                    type="text"
                    value={editingCaption}
                    onChange={(e) => setEditingCaption(e.target.value)}
                  />
                  <div className="button-row">
                    <button onClick={() => handleEdit(post._id)}>Save</button>
                    <button onClick={() => setEditingId(null)} className="secondary">Cancel</button>
                  </div>
                </div>
              ) : (
                <p>{post.caption}</p>
              )}
              <div className="button-row">
                <button
                  type="button"
                  onClick={() => handleToggleLike(post._id)}
                  className={post.likedBy?.some((id) => id.toString() === (user?.id || user?._id)) ? 'primary' : 'secondary'}
                >
                  {post.likedBy?.some((id) => id.toString() === (user?.id || user?._id)) ? 'Unlike' : 'Like'}
                </button>
                <span style={{ alignSelf: 'center', marginLeft: '10px' }}>{post.likes || 0} {post.likes === 1 ? 'like' : 'likes'}</span>
              </div>
              {isAuthor(post) && (
                <div className="button-row">
                  <button onClick={() => {
                    setEditingId(post._id);
                    setEditingCaption(post.caption || '');
                  }} className="secondary">Edit</button>
                  <button onClick={() => handleDelete(post._id)} className="danger">Delete</button>
                </div>
              )}
            </div>
          ))
        )}
        {loading && <p style={{ textAlign: 'center', margin: '20px' }}>Loading more posts...</p>}
        {!hasMore && visiblePosts.length > 0 && <p style={{ textAlign: 'center', margin: '20px' }}>You've reached the end!</p>}
      </div>
    );
  };

  const ProtectedRoute = ({ children }) => {
    if (!user) {
      return <Navigate to="/" replace />;
    }
    return children;
  };

  return (
    <Router>
      <div className="app">
      <h1>Simple Posts</h1>
      <p>Create a post and view recent uploads.</p>

      <nav className="nav-links" style={{ marginBottom: '20px' }}>
        <Link to="/" style={{ marginRight: '12px' }}>Feed</Link>
        {user && <Link to="/my-posts">My Posts</Link>}
      </nav>

      {!user ? (
        <form onSubmit={handleAuthSubmit} className="card">
          <h2>{authMode === 'register' ? 'Register' : 'Login'}</h2>
          {authMode === 'register' && (
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit">{authMode === 'register' ? 'Register' : 'Login'}</button>
          <button
            type="button"
            className="secondary"
            onClick={() => setAuthMode(authMode === 'register' ? 'login' : 'register')}
          >
            {authMode === 'register' ? 'Switch to login' : 'Switch to register'}
          </button>
        </form>
      ) : (
        <div className="card">
          <p>Signed in as <strong>{user.name}</strong> ({user.email})</p>
          <button type="button" onClick={handleLogout} className="secondary">Logout</button>
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
            accept="image/*" 
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
          <Route path="/" element={<PostList />} />
          <Route path="/my-posts" element={<ProtectedRoute><PostList onlyAuthor /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {lightbox && (
          <div className="lightbox-overlay" onClick={() => setLightbox(null)}>
            <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
              <button type="button" className="lightbox-close" onClick={() => setLightbox(null)}>
                ×
              </button>
              <img className="lightbox-image" src={lightbox.src} alt={lightbox.caption} />
              <p className="lightbox-caption">{lightbox.caption}</p>
            </div>
          </div>
        )}
      </div>
    </Router>
  );
}

export default App;