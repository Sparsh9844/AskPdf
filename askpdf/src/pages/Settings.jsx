import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  User, Bell, Database, Zap, Shield, Trash2,
  Check,
} from 'lucide-react';
import Header from '../components/layout/Header';
import Button from '../components/ui/Button';
import clsx from 'clsx';
import { ProfileSettings, SecuritySettings } from '../components/settings/AccountSettings';

const SECTIONS = [
  { id: 'profile',        label: 'Profile',          icon: User      },
  { id: 'notifications',  label: 'Notifications',     icon: Bell      },
  { id: 'processing',     label: 'Processing',        icon: Zap       },
  { id: 'storage',        label: 'Storage',           icon: Database  },
  { id: 'security',       label: 'Security',          icon: Shield    },
];

function Toggle({ enabled, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={clsx(
        'relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2',
        enabled ? 'bg-gray-900' : 'bg-gray-200'
      )}
    >
      <span
        className={clsx(
          'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200',
          enabled && 'translate-x-4'
        )}
      />
    </button>
  );
}

function SettingRow({ label, description, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-gray-100 last:border-0">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5 max-w-sm">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

export default function Settings() {
  const { onMenuClick } = useOutletContext();
  const [active, setActive]   = useState('profile');

  // Toggles / form state
  const [notifications, setNotifications] = useState({
    uploadComplete: true,
    processingFailed: true,
    weeklyDigest: false,
    productUpdates: true,
  });
  const [processing, setProcessing] = useState({
    autoIndex: true,
    highAccuracyMode: false,
    chunkOverlap: true,
  });

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const renderSection = () => {
    switch (active) {
      case 'profile':
        return <ProfileSettings />;

      case 'notifications':
        return (
          <div className="space-y-0">
            <SettingRow label="Upload complete" description="Notify when a document finishes processing.">
              <Toggle enabled={notifications.uploadComplete} onChange={v => setNotifications(n => ({ ...n, uploadComplete: v }))} />
            </SettingRow>
            <SettingRow label="Processing failed" description="Alert on errors during indexing or embedding.">
              <Toggle enabled={notifications.processingFailed} onChange={v => setNotifications(n => ({ ...n, processingFailed: v }))} />
            </SettingRow>
            <SettingRow label="Weekly digest" description="Summary of your usage and documents every Monday.">
              <Toggle enabled={notifications.weeklyDigest} onChange={v => setNotifications(n => ({ ...n, weeklyDigest: v }))} />
            </SettingRow>
            <SettingRow label="Product updates" description="New features and improvements from Insight.">
              <Toggle enabled={notifications.productUpdates} onChange={v => setNotifications(n => ({ ...n, productUpdates: v }))} />
            </SettingRow>
          </div>
        );

      case 'processing':
        return (
          <div className="space-y-0">
            <SettingRow label="Auto-index on upload" description="Automatically start chunking and embedding after upload.">
              <Toggle enabled={processing.autoIndex} onChange={v => setProcessing(p => ({ ...p, autoIndex: v }))} />
            </SettingRow>
            <SettingRow label="High accuracy mode" description="Use larger chunks with higher overlap. Slower but more precise.">
              <Toggle enabled={processing.highAccuracyMode} onChange={v => setProcessing(p => ({ ...p, highAccuracyMode: v }))} />
            </SettingRow>
            <SettingRow label="Chunk overlap" description="Enable overlap between adjacent chunks to improve context.">
              <Toggle enabled={processing.chunkOverlap} onChange={v => setProcessing(p => ({ ...p, chunkOverlap: v }))} />
            </SettingRow>
            <SettingRow label="Embedding model" description="Vector model used to embed document chunks.">
              <select className="h-8 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 bg-white">
                <option>nomic-embed-text-v1.5</option>
                <option>text-embedding-3-small</option>
                <option>all-minilm-l6-v2</option>
              </select>
            </SettingRow>
            <SettingRow label="LLM" description="Language model used to generate answers.">
              <select className="h-8 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 bg-white">
                <option>llama-3.3-70b-versatile</option>
                <option>mixtral-8x7b-32768</option>
                <option>gemma2-9b-it</option>
              </select>
            </SettingRow>
          </div>
        );

      case 'storage':
        return (
          <div className="space-y-0">
            <SettingRow label="Storage used" description="Vector store and document storage.">
              <div className="flex flex-col items-end gap-1">
                <span className="text-sm font-semibold text-gray-900">17.4 MB</span>
                <span className="text-xs text-gray-500">of 1 GB (Free)</span>
              </div>
            </SettingRow>
            <div className="py-3">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gray-900 rounded-full" style={{ width: '1.7%' }} />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-[11px] text-gray-500">17.4 MB used</span>
                <span className="text-[11px] text-gray-500">1 GB total</span>
              </div>
            </div>
            <SettingRow label="Clear all vectors" description="Remove all embeddings from the vector store. Documents remain.">
              <Button variant="secondary" size="sm" icon={Trash2}>Clear</Button>
            </SettingRow>
            <SettingRow label="Delete all documents" description="Permanently delete all uploaded PDFs and their data.">
              <Button variant="danger" size="sm" icon={Trash2}>Delete All</Button>
            </SettingRow>
          </div>
        );

      case 'security':
        return <SecuritySettings />;

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Settings"
        subtitle="Manage your account and preferences"
        onMenuClick={onMenuClick}
        actions={
          <Button size="sm" onClick={handleSave} icon={saved ? Check : undefined} loading={false}>
            {saved ? 'Saved!' : 'Save Changes'}
          </Button>
        }
      />

      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-6">
            {/* Nav */}
            <nav className="hidden sm:flex flex-col gap-0.5 w-40 flex-shrink-0">
              {SECTIONS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActive(id)}
                  className={clsx(
                    'flex items-center gap-2.5 px-3 h-9 rounded-lg text-sm font-medium transition-colors text-left',
                    active === id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
                  {label}
                </button>
              ))}
            </nav>

            {/* Mobile nav (horizontal) */}
            <div className="flex sm:hidden gap-2 mb-4 overflow-x-auto pb-1 w-full">
              {SECTIONS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActive(id)}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-medium transition-colors flex-shrink-0',
                    active === id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {/* Panel */}
            <div className="flex-1 bg-white border border-gray-200 rounded-xl px-5 animate-fade-in" key={active}>
              <div className="py-1">
                {renderSection()}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
