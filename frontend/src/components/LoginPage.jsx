import { useState } from 'react';

const LoginPage = ({
  authMode,
  setAuthMode,
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
  handleAuthSubmit,
  handleGoogleLogin,
  handleRequestPasswordReset,
  handleResetPassword,
  googleSignup,
  handleGoogleSignup,
}) => {
  const [resetMode, setResetMode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (event) => {
    if (googleSignup) {
      handleGoogleSignup(event);
      return;
    }
    if (!resetMode) {
      handleAuthSubmit(event);
      return;
    }

    event.preventDefault();
    if (!codeSent) {
      if (await handleRequestPasswordReset(email)) setCodeSent(true);
      return;
    }

    if (newPassword !== confirmPassword) {
      return;
    }

    if (await handleResetPassword(email, resetCode, newPassword)) {
      setResetMode(false);
      setCodeSent(false);
      setResetCode('');
      setNewPassword('');
      setConfirmPassword('');
      setPassword('');
    }
  };

  return (
    <div className="auth-page">
      <form onSubmit={handleSubmit} className="card auth-card">
        <h2>
          {googleSignup
            ? 'Choose your name'
            : resetMode
              ? 'Reset password'
              : authMode === 'register'
                ? 'Register'
                : 'Login'}
        </h2>

        {(authMode === 'register' || googleSignup) && (
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}

        {!googleSignup && (
          <>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            {resetMode && codeSent ? (
              <>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="6-digit email code"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                />
                <input
                  type="password"
                  placeholder="New password (at least 8 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  autoComplete="new-password"
                  required
                />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={8}
                  autoComplete="new-password"
                  required
                />
                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <p role="alert">Passwords do not match.</p>
                )}
              </>
            ) : !resetMode && (
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                required
              />
            )}
          </>
        )}

        <button type="submit">
          {googleSignup
            ? 'Continue'
            : resetMode
              ? codeSent ? 'Reset password' : 'Send code'
              : authMode === 'register' ? 'Register' : 'Login'}
        </button>

        {!googleSignup && !resetMode && (
          <button type="button" className="secondary" onClick={handleGoogleLogin}>
            Continue with Google
          </button>
        )}

        {!googleSignup && !resetMode && authMode === 'login' && (
          <button type="button" className="secondary" onClick={() => setResetMode(true)}>
            Forgot password?
          </button>
        )}

        {!googleSignup && resetMode && (
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setResetMode(false);
              setCodeSent(false);
              setResetCode('');
              setNewPassword('');
              setConfirmPassword('');
            }}
          >
            Back to login
          </button>
        )}

        {!googleSignup && !resetMode && (
          <button
            type="button"
            className="secondary"
            onClick={() => setAuthMode(authMode === 'register' ? 'login' : 'register')}
          >
            {authMode === 'register' ? 'Switch to login' : 'Switch to register'}
          </button>
        )}
      </form>
    </div>
  );
};

export default LoginPage;
