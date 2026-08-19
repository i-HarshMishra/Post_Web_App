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
  googleSignup,
  handleGoogleSignup,
}) => {
  return (
    <div className="auth-page">
      <form onSubmit={googleSignup ? handleGoogleSignup : handleAuthSubmit} className="card auth-card">
        <h2>{googleSignup ? 'Choose your name' : authMode === 'register' ? 'Register' : 'Login'}</h2>

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
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </>
        )}

        <button type="submit">{googleSignup ? 'Continue' : authMode === 'register' ? 'Register' : 'Login'}</button>

        {!googleSignup && (
          <button type="button" className="secondary" onClick={handleGoogleLogin}>
            Continue with Google
          </button>
        )}

        {!googleSignup && (
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
