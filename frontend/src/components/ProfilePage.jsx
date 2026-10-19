import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formatDate } from '../utils/formatDate.js';
import AccountSettings from './AccountSettings.jsx';

const ProfilePage = ({ apiUrl, token, user, onUserUpdated, onAccountDeleted, setMessage }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [bio, setBio] = useState('');
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const isOwnProfile = id === (user?.id || user?._id);

  const handleAccountDeleted = (message) => {
    onAccountDeleted(message);
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    let active = true;
    setLoading(true);

    const loadProfile = async () => {
      try {
        const requests = [fetch(`${apiUrl}/users/${id}`)];
        if (user && !isOwnProfile) {
          requests.push(fetch(`${apiUrl}/users/${id}/follow-status`, {
            headers: { Authorization: `Bearer ${token}` }
          }));
        }

        const [profileResponse, followResponse] = await Promise.all(requests);
        const profileData = await profileResponse.json();
        if (!profileResponse.ok) throw new Error(profileData.message || 'Failed to load profile');
        if (active) {
          setProfile(profileData.profile);
          setPosts(profileData.posts);
          setBio(profileData.profile.bio || '');
        }

        if (followResponse) {
          const followData = await followResponse.json();
          if (!followResponse.ok) throw new Error(followData.message || 'Failed to load follow status');
          if (active) {
            setIsFollowing(followData.isFollowing);
            setProfile((current) => current && ({
              ...current,
              followersCount: followData.followersCount,
              followingCount: followData.followingCount
            }));
          }
        } else if (active) {
          setIsFollowing(false);
        }
      } catch (error) {
        if (active) setMessage(error.message);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, [apiUrl, id, token, user, isOwnProfile, setMessage]);

  const handleFollow = async () => {
    if (!token) {
      setMessage('Log in to follow users');
      return;
    }

    setFollowBusy(true);
    try {
      const response = await fetch(`${apiUrl}/users/${id}/follow`, {
        method: isFollowing ? 'DELETE' : 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.message || 'Failed to update follow');
        return;
      }

      setIsFollowing(data.isFollowing);
      setProfile((current) => current && ({ ...current, followersCount: data.followersCount }));
      setMessage(data.message);
    } catch (error) {
      setMessage('Failed to update follow');
      console.error(error);
    } finally {
      setFollowBusy(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (bio.trim().length > 300) {
      setMessage('Bio must be 300 characters or fewer');
      return;
    }
    if (photo && photo.size > 5 * 1024 * 1024) {
      setMessage('Profile photo must be 5MB or smaller');
      return;
    }

    const formData = new FormData();
    formData.append('bio', bio);
    if (photo) formData.append('profilePhoto', photo);

    setSaving(true);
    try {
      const response = await fetch(`${apiUrl}/me/profile`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.message || 'Failed to update profile');
        return;
      }

      setProfile((current) => ({ ...current, ...data.user }));
      setBio(data.user.bio || '');
      setPhoto(null);
      onUserUpdated(data.user);
      setMessage(data.message);
      event.target.reset();
    } catch (error) {
      setMessage('Failed to update profile');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p>Loading profile...</p>;
  if (!profile) return <p>Profile not found.</p>;

  return (
    <section className="profile-page">
      <div className="card profile-card">
        {profile.profilePhoto ? (
          <img className="profile-photo" src={profile.profilePhoto} alt={`${profile.name}'s profile`} />
        ) : (
          <div className="profile-photo profile-photo-placeholder" aria-label="No profile photo">
            {profile.name?.slice(0, 1).toUpperCase()}
          </div>
        )}
        <h2>{profile.name}</h2>
        <p className="profile-follow-counts">
          {profile.followersCount || 0} followers · {profile.followingCount || 0} following
        </p>
        <p className="profile-bio">{profile.bio || 'No bio yet.'}</p>
        {!isOwnProfile && user && (
          <button type="button" onClick={handleFollow} disabled={followBusy}>
            {followBusy ? 'Updating...' : isFollowing ? 'Unfollow' : 'Follow'}
          </button>
        )}
        {isOwnProfile && (
          <form className="profile-edit-form" onSubmit={handleSubmit}>
            <label>
              Bio
              <textarea
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                maxLength={300}
                rows={3}
              />
            </label>
            <label>
              Profile photo
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setPhoto(event.target.files?.[0] || null)}
              />
            </label>
            <button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save profile'}
            </button>
          </form>
        )}
        {isOwnProfile && (
          <details className="profile-settings">
            <summary>Account settings</summary>
            <AccountSettings
              apiUrl={apiUrl}
              token={token}
              user={user}
              onUserUpdated={onUserUpdated}
              onAccountDeleted={handleAccountDeleted}
              setMessage={setMessage}
            />
          </details>
        )}
      </div>

      <h2>{isOwnProfile ? 'Your posts' : `${profile.name}'s posts`}</h2>
      {posts.length === 0 ? (
        <p>No posts yet.</p>
      ) : (
        <div className="posts">
          {posts.map((post) => (
            <article key={post._id} className="card post-card">
              <p className="profile-post-date">{formatDate(post.createdAt)}</p>
              {post.mediaType?.startsWith('video/') ? (
                <video className="post-image" src={post.image} controls preload="metadata" />
              ) : (
                <img className="post-image" src={post.image} alt={post.caption || 'Post'} loading="lazy" />
              )}
              {post.caption && <p>{post.caption}</p>}
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default ProfilePage;
