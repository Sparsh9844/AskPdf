import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, LogOut, AlertCircle } from 'lucide-react';
import Button from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { authApi } from '../../services/api';
import { formatDate } from '../../utils/helpers';

const inputCls = 'h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 w-full sm:w-60';

function Row({ label, description, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 py-4 border-b border-gray-100 last:border-0">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5 max-w-sm">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

/** Profile: name (editable), email and account dates. */
export function ProfileSettings() {
  const { user, updateUser } = useAuth();
  const [name, setName]   = useState(user?.name ?? '');
  const [state, setState] = useState('idle');   // idle | saving | saved
  const [error, setError] = useState(null);

  const save = async () => {
    setState('saving'); setError(null);
    try {
      updateUser(await authApi.updateProfile({ name: name.trim() }));
      setState('saved');
      setTimeout(() => setState('idle'), 2000);
    } catch (err) {
      setError(err.message);
      setState('idle');
    }
  };

  return (
    <div>
      <Row label="Name" description="Shown in the sidebar and on your dashboard.">
        <div className="flex items-center gap-2">
          <input value={name} onChange={e => setName(e.target.value)} className={inputCls} maxLength={80} />
          <Button
            size="sm"
            onClick={save}
            loading={state === 'saving'}
            icon={state === 'saved' ? Check : undefined}
            disabled={!name.trim() || name.trim() === user?.name}
          >
            {state === 'saved' ? 'Saved' : 'Save'}
          </Button>
        </div>
      </Row>
      <Row label="Email" description="Used to sign in.">
        <p className="text-sm text-gray-700">{user?.email}</p>
      </Row>
      <Row label="Member since">
        <p className="text-sm text-gray-700">{user?.createdAt ? formatDate(user.createdAt) : '—'}</p>
      </Row>
      {error && <p className="flex items-center gap-1.5 text-xs text-red-600 pb-3"><AlertCircle className="w-3.5 h-3.5" /> {error}</p>}
    </div>
  );
}

/** Security: change password, sign out. */
export function SecuritySettings() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [next, setNext]       = useState('');
  const [state, setState]     = useState('idle');
  const [error, setError]     = useState(null);

  const change = async (e) => {
    e.preventDefault();
    setState('saving'); setError(null);
    try {
      await authApi.changePassword(current, next);
      setCurrent(''); setNext('');
      setState('saved');
      setTimeout(() => setState('idle'), 2500);
    } catch (err) {
      setError(err.message);
      setState('idle');
    }
  };

  return (
    <div>
      <Row label="Password" description="At least 8 characters, with a letter and a number.">
        <form onSubmit={change} className="flex flex-col gap-2 w-full sm:w-60">
          <input type="password" autoComplete="current-password" placeholder="Current password" value={current} onChange={e => setCurrent(e.target.value)} className={inputCls} />
          <input type="password" autoComplete="new-password" placeholder="New password" value={next} onChange={e => setNext(e.target.value)} className={inputCls} />
          <Button
            type="submit"
            size="sm"
            loading={state === 'saving'}
            icon={state === 'saved' ? Check : undefined}
            disabled={!current || next.length < 8}
          >
            {state === 'saved' ? 'Password changed' : 'Change password'}
          </Button>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </form>
      </Row>
      <Row label="Sign out" description="Ends your session on this browser.">
        <Button variant="secondary" size="sm" icon={LogOut} onClick={() => { logout(); navigate('/login', { replace: true }); }}>
          Sign out
        </Button>
      </Row>
    </div>
  );
}
