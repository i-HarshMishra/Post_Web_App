import { formatDate } from '../utils/formatDate.js';
import { useState } from 'react';

const CommentForm = ({ postId, onAddComment }) => {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!text.trim() || submitting) return;

    setSubmitting(true);
    try {
      const post = await onAddComment(postId, text);
      if (post) setText('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="comment-form" onSubmit={handleSubmit}>
      <textarea
        aria-label="Write a comment"
        placeholder="Write a comment..."
        value={text}
        onChange={(event) => setText(event.target.value)}
        maxLength={1000}
        rows={2}
        disabled={submitting}
      />
      <button type="submit" disabled={!text.trim() || submitting}>
        {submitting ? 'Posting...' : 'Comment'}
      </button>
    </form>
  );
};

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
  handleAddComment,
  setLightbox,
}) => {
  const visiblePosts = onlyAuthor ? posts.filter((post) => isAuthor(post)) : posts;

  return (
    <div className="posts">
      {visiblePosts.length === 0 && !loading ? (
        <p>{onlyAuthor ? 'No posts found for your account.' : 'No posts yet.'}</p>
      ) : (
        visiblePosts.map((post) => {
          const isVideo = post.mediaType?.startsWith('video/');

          return (
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
              <div className="post-image-wrapper">
                {isVideo ? (
                  <video
                    src={post.image}
                    controls
                    preload="metadata"
                    className="post-image"
                    onClick={() => setLightbox({ src: post.image, mediaType: post.mediaType, caption: post.caption || 'Post video' })}
                  />
                ) : (
                  <img
                    src={post.image}
                    alt={post.caption || 'Post'}
                    loading="lazy"
                    className="post-image"
                    onClick={() => setLightbox({ src: post.image, mediaType: post.mediaType, caption: post.caption || 'Post image' })}
                  />
                )}
              </div>
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
            <section className="comments" aria-label="Comments">
              <h3>Comments ({post.comments?.length || 0})</h3>
              {post.comments?.length ? (
                <ul className="comment-list">
                  {post.comments.map((comment) => (
                    <li key={comment._id}>
                      <strong>
                        {typeof comment.author === 'string'
                          ? 'User'
                          : comment.author?.name || comment.author?.email || 'User'}
                      </strong>
                      <p>{comment.text}</p>
                      <time dateTime={comment.createdAt}>{formatDate(comment.createdAt)}</time>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="no-comments">No comments yet.</p>
              )}
              {user && <CommentForm postId={post._id} onAddComment={handleAddComment} />}
            </section>
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
          );
        })
      )}
      {loading && <p style={{ textAlign: 'center', margin: '20px' }}>Loading more posts...</p>}
      {!hasMore && visiblePosts.length > 0 && <p style={{ textAlign: 'center', margin: '20px' }}>You've reached the end!</p>}
    </div>
  );
};

export default PostList;
