import { useEffect, useState } from 'react';

function App() {
  const [caption, setCaption] = useState('');
  const [image, setImage] = useState(null);
  const [posts, setPosts] = useState([]);
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingCaption, setEditingCaption] = useState('');

  // New states for pagination
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchPosts = async (pageNumber) => {
    if (!hasMore) return;
    
    setLoading(true);
    try {
      // Request 15 posts for the specific page
      const res = await fetch(`http://localhost:3000/posts?page=${pageNumber}&limit=15`);
      const data = await res.json();
      
      const newPosts = data.posts || [];
      
      // If we receive fewer than 15 posts, we know we've reached the end
      if (newPosts.length < 15) {
        setHasMore(false);
      }

      setPosts(prev => {
        if (pageNumber === 1) return newPosts;
        
        // Prevent duplicate posts from showing up if a new post was added while scrolling
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

  // Fetch posts whenever the 'page' state changes
  useEffect(() => {
    fetchPosts(page);
  }, [page]);

  // Listen for scrolling to trigger the next page load
  useEffect(() => {
    const handleScroll = () => {
      // Calculate if the user has scrolled to the bottom of the page
      const scrolledToBottom = window.innerHeight + document.documentElement.scrollTop + 1 >= document.documentElement.scrollHeight;
      
      if (scrolledToBottom && hasMore && !loading) {
        setPage(prev => prev + 1);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!image) {
      setMessage('Please choose an image');
      return;
    }

    const formData = new FormData();
    formData.append('caption', caption);
    formData.append('image', image);

    try {
      const res = await fetch('http://localhost:3000/create-post', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      setMessage(data.message || 'Post created');
      setCaption('');
      setImage(null);
      
      // Reset to page 1 so the new post appears at the top
      setPage(1);
      setHasMore(true);
      fetchPosts(1);
    } catch (error) {
      setMessage('Failed to create post');
      console.error(error);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`http://localhost:3000/posts/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      setMessage(data.message || 'Post deleted');
      setPosts(prev => prev.filter(p => p._id !== id));
    } catch (error) {
      setMessage('Failed to delete post');
      console.error(error);
    }
  };

  const handleEdit = async (id) => {
    try {
      const res = await fetch(`http://localhost:3000/posts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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

  return (
    <div className="app">
      <h1>Simple Posts</h1>
      <p>Create a post and view recent uploads.</p>

      <form onSubmit={handleSubmit} className="card">
        <input
          type="text"
          placeholder="Caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />
        <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files[0])} />
        <button type="submit">Create Post</button>
      </form>

      {message && <p className="message">{message}</p>}

      <div className="posts">
        {posts.length === 0 && !loading ? (
          <p>No posts yet.</p>
        ) : (
          posts.map((post) => (
            <div key={post._id} className="card post-card">
              {post.image && <img src={post.image} alt={post.caption || 'Post'} loading="lazy" />}
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
                <button onClick={() => {
                  setEditingId(post._id);
                  setEditingCaption(post.caption || '');
                }} className="secondary">Edit</button>
                <button onClick={() => handleDelete(post._id)} className="danger">Delete</button>
              </div>
            </div>
          ))
        )}
        {loading && <p style={{ textAlign: 'center', margin: '20px' }}>Loading more posts...</p>}
        {!hasMore && posts.length > 0 && <p style={{ textAlign: 'center', margin: '20px' }}>You've reached the end!</p>}
      </div>
    </div>
  );
}

export default App;