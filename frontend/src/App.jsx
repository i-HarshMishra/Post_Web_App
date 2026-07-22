import { useEffect, useState } from 'react';

function App() {
  const [caption, setCaption] = useState('');
  const [image, setImage] = useState(null);
  const [posts, setPosts] = useState([]);
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingCaption, setEditingCaption] = useState('');

  const fetchPosts = async () => {
    try {
      const res = await fetch('http://localhost:3000/posts');
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

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
      fetchPosts();
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
      fetchPosts();
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
      fetchPosts();
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
        {posts.length === 0 ? (
          <p>No posts yet.</p>
        ) : (
          posts.map((post) => (
            <div key={post._id} className="card post-card">
              {post.image && <img src={post.image} alt={post.caption || 'Post'} />}
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
      </div>
    </div>
  );
}

export default App;
