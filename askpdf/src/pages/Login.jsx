import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, Info } from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';
import Field from '../components/auth/Field';
import Button from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';

/** Only follow in-app redirect targets ("//host" and "/\host" are other sites) */
const safeNext = (next) => (next && /^\/(?![/\\])/.test(next) ? next : '/dashboard');

export default function Login() {
  const { login, notice } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState(null);
  const [busy, setBusy]         = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue your research."
      footer={<>New to Insight? <Link to={`/signup${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-medium text-indigo-600 hover:text-indigo-800">Create an account</Link></>}
    >
      {notice && !error && (
        <div className="flex items-start gap-2 mb-5 px-3.5 py-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" /> {notice}
        </div>
      )}
      {error && (
        <div role="alert" className="flex items-start gap-2 mb-5 px-3.5 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
        </div>
      )}

      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoFocus
        />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="Your password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <Button type="submit" size="lg" className="w-full !h-11" loading={busy} disabled={!email.trim() || !password}>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
