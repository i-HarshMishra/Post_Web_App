import { formatDate } from '../utils/formatDate.js';

const PostList = ({
  posts,
  onlyAuthor,
  isAuthor,
  user,
  loading,
  hasMore,
  editingId,
  editingCaption,
  setEditingId,
  setEditingCaption,
  handleEdit,
  handleDelete,
  handleToggleLike,
  setLightbox,
}) => {
  const visiblePosts = onlyAuthor ? posts.filter((post) => isAuthor(post)) : posts;

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
            {editingId === post._id?.toString() ? (
              <div className="edit-box">
                <input
                  type="text"
                  value={editingCaption}
                  onChange={(e) => setEditingCaption(e.target.value)}
                  autoFocus
                />
                <div className="button-row">
                  <button type="button" onClick={() => handleEdit(post._id)}>Save</button>
                  <button type="button" onClick={() => setEditingId(null)} className="secondary">Cancel</button>
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
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(post._id?.toString());
                    setEditingCaption(post.caption || '');
                  }}
                  className="secondary"
                >
                  Edit
                </button>
                <button type="button" onClick={() => handleDelete(post._id)} className="danger">Delete</button>
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

export default PostList;
