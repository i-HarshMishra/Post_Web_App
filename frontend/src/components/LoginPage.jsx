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
}) => {
  return (
    <div className="auth-page">
      <form onSubmit={handleAuthSubmit} className="card auth-card">
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
    </div>
  );
};

export default LoginPage;
