import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { errMsg } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Eyebrow from '../components/Eyebrow.jsx';
import Field from '../components/Field.jsx';
import Icon from '../components/Icon.jsx';

export default function StaffLogin() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/staff" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(form.email, form.password);
      navigate('/staff');
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="container narrow page-pad">
      <Eyebrow>Staff only</Eyebrow>
      <h1 className="page-title">Sign in to the schedule</h1>
      <p className="lede">For the Smilo team. Patients don’t need an account. Use the link in your confirmation email instead.</p>
      <form className="card lookup" onSubmit={submit}>
        {error && (
          <p className="banner banner-error" role="alert">
            <Icon name="alert" /> {error}
          </p>
        )}
        <Field label="Work email" type="email" autoComplete="username" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Field label="Password" type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </section>
  );
}
