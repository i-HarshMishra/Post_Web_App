import { useState } from 'react';

const AccountSettings = ({ apiUrl, token, user, onUserUpdated, onAccountDeleted, setMessage }) => {
  const [newEmail, setNewEmail] = useState(user.email || '');
  const [emailPassword, setEmailPassword] = useState('');
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [saving, setSaving] = useState(false);

  const sendRequest = async (path, method, body) => {
    const response = await fetch(`${apiUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Request failed');
    return data;
  };

  const handleEmailChange = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const data = await sendRequest('/auth/change-email', 'PUT', {
        email: newEmail,
        currentPassword: emailPassword
      });
      onUserUpdated(data.user);
      setEmailPassword('');
      setMessage(data.message);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage('New passwords do not match');
      return;
    }

    setSaving(true);
    try {
      const data = await sendRequest('/auth/change-password', 'PUT', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMessage(data.message);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async (event) => {
    event.preventDefault();
    if (deleteConfirmation !== 'DELETE') {
      setMessage('Type DELETE to confirm account deletion');
      return;
    }
    if (!window.confirm('Permanently delete your account, posts, comments, and likes? This cannot be undone.')) {
      return;
    }

    setSaving(true);
    try {
      const data = await sendRequest('/auth/account', 'DELETE', { currentPassword: deletePassword });
      onAccountDeleted(data.message);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="settings-page">
      <h3>Account settings</h3>
      <p>For Google-only accounts, use Forgot password? on the login page to set a password before changing credentials or deleting the account.</p>

      <form className="card settings-form" onSubmit={handleEmailChange}>
        <h3>Change email</h3>
        <label>
          New email
          <input
            type="email"
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
            required
          />
        </label>
        <label>
          Current password
          <input
            type="password"
            value={emailPassword}
            onChange={(event) => setEmailPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <button type="submit" disabled={saving}>Update email</button>
      </form>

      <form className="card settings-form" onSubmit={handlePasswordChange}>
        <h3>Change password</h3>
        <label>
          Current password
          <input
            type="password"
            value={passwordForm.currentPassword}
            onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })}
            autoComplete="current-password"
            required
          />
        </label>
        <label>
          New password
          <input
            type="password"
            value={passwordForm.newPassword}
            onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })}
            minLength={8}
            autoComplete="new-password"
            required
          />
        </label>
        <label>
          Confirm new password
          <input
            type="password"
            value={passwordForm.confirmPassword}
            onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })}
            minLength={8}
            autoComplete="new-password"
            required
          />
        </label>
        <button type="submit" disabled={saving}>Update password</button>
      </form>

      <form className="card settings-form delete-account-form" onSubmit={handleDeleteAccount}>
        <h3>Delete account</h3>
        <p>This permanently deletes your account, posts, comments, and likes.</p>
        <label>
          Current password
          <input
            type="password"
            value={deletePassword}
            onChange={(event) => setDeletePassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <label>
          Type DELETE to confirm
          <input
            type="text"
            value={deleteConfirmation}
            onChange={(event) => setDeleteConfirmation(event.target.value)}
            required
          />
        </label>
        <button type="submit" className="danger" disabled={saving}>Delete account permanently</button>
      </form>
    </section>
  );
};

export default AccountSettings;
