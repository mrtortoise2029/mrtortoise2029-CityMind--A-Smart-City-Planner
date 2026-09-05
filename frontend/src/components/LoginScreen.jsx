import { useState } from 'react';
import { Building2, LockKeyhole, MapPinned, UserRound } from 'lucide-react';
import { login, register, setAuthToken } from '../api/client.js';

export function LoginScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({
    name: '',
    email: import.meta.env.DEV ? '' : '',
    password: import.meta.env.DEV ? '' : '',
  });
  const [state, setState] = useState({ loading: false, error: '' });

  const submit = async (event) => {
    event.preventDefault();
    setState({ loading: true, error: '' });
    try {
      const result = mode === 'login'
        ? await login({ email: form.email, password: form.password })
        : await register(form);
      setAuthToken(result.token);
      onAuthenticated(result.user);
    } catch (error) {
      const message = error.response?.data?.error?.message
        ?? (error.code === 'ECONNABORTED'
          ? 'The CityMind API did not respond. Confirm the backend is running on port 5001.'
          : error.request
            ? 'Cannot reach the CityMind API. Start the backend and check the configured API URL.'
            : 'Unable to authenticate');
      setState({ loading: false, error: message });
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-product-panel">
        <div className="brand"><span className="brand-mark"><Building2 size={20} /></span><div><strong>CITYMIND</strong><small>Urban Planning Intelligence</small></div></div>
        <div><p className="eyebrow">Project-based planning platform</p><h1>Plan development areas with spatial evidence.</h1><p>Define boundaries, organize land use, analyze service gaps, and compare transparent planning options in one professional workspace.</p></div>
        <div className="auth-capabilities"><span><MapPinned size={15} />Project GIS canvas</span><span><LockKeyhole size={15} />Private project ownership</span></div>
      </section>
      <section className="auth-form-panel">
        <form onSubmit={submit}>
          <span className="auth-icon"><UserRound size={20} /></span>
          <p className="eyebrow">Planner access</p>
          <h2>{mode === 'login' ? 'Sign in to CityMind' : 'Create planner account'}</h2>
          <p>Access only the planning projects owned by your account.</p>
          {mode === 'register' && <label><span>Full name</span><input autoComplete="name" onChange={(event) => setForm({ ...form, name: event.target.value })} required value={form.name} /></label>}
          <label><span>Email</span><input autoComplete="email" onChange={(event) => setForm({ ...form, email: event.target.value })} required type="email" value={form.email} /></label>
          <label><span>Password</span><input autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} onChange={(event) => setForm({ ...form, password: event.target.value })} required type="password" value={form.password} /></label>
          {state.error && <p className="auth-error">{state.error}</p>}
          <button className="auth-submit" disabled={state.loading} type="submit">{state.loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
          <button className="auth-switch" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setState({ loading: false, error: '' }); }} type="button">{mode === 'login' ? 'New planner? Create an account' : 'Already registered? Sign in'}</button>
          {import.meta.env.DEV && <small className="demo-credential">Demo access is pre-filled for local development.</small>}
        </form>
      </section>
    </main>
  );
}
