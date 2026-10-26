import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, Check } from 'lucide-react';
import clsx from 'clsx';
import AuthLayout from '../components/auth/AuthLayout';
import Field from '../components/auth/Field';
import Button from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';

const safeNext = (next) => (next && /^\/(?![/\\])/.test(next) ? next : '/dashboard');

// Mirrors the server's rules (routes/auth.js)
const RULES = [
  { test: (p) => p.length >= 8,                  label: 'At least 8 characters' },
  { test: (p) => /[A-Za-z]/.test(p) && /\d/.test(p), label: 'A letter and a number' },
];

export default function Signup() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState(null);
  const [busy, setBusy]         = useState(false);

  const passwordOk = RULES.every(r => r.test(password));
  const canSubmit  = name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()) && passwordOk;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setBusy(true);
    try {
      await register(name.trim(), email.trim(), password);
      navigate(safeNext(params.get('next')), { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start turning documents into verified answers."
      footer={<>Already have an account? <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-800">Sign in</Link></>}
    >
      {error && (
        <div role="alert" className="flex items-start gap-2 mb-5 px-3.5 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
        </div>
      )}

      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field
          label="Name"
          autoComplete="name"
          placeholder="Your name"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          autoFocus
        />
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <div>
          <Field
            label="Password"
            type="password"
            autoComplete="new-password"
            placeholder="Create a password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <ul className="mt-2 space-y-1">
            {RULES.map(r => {
              const ok = r.test(password);
              return (
                <li key={r.label} className={clsx('flex items-center gap-1.5 text-xs transition-colors', ok ? 'text-emerald-600' : 'text-gray-400')}>
                  <span className={clsx('w-3.5 h-3.5 rounded-full flex items-center justify-center', ok ? 'bg-emerald-500' : 'bg-gray-200')}>
                    {ok && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                  </span>
                  {r.label}
                </li>
              );
            })}
          </ul>
        </div>
        <Button type="submit" size="lg" className="w-full !h-11" loading={busy} disabled={!canSubmit}>
          Create account
        </Button>
        <p className="text-[11px] text-gray-400 text-center">
          Your password is hashed with bcrypt and never stored in plain text.
        </p>
      </form>
    </AuthLayout>
  );
}
