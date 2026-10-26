import { lazy, useEffect, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import AuthProvider from './context/AuthProvider';
import { RequireAuth, PublicOnly } from './components/auth/RouteGuards';

// Each page is its own chunk, so the first screen only downloads what it needs.
const loaders = {
  Landing:        () => import('./pages/Landing'),
  Login:          () => import('./pages/Login'),
  Signup:         () => import('./pages/Signup'),
  Dashboard:      () => import('./pages/Dashboard'),
  Documents:      () => import('./pages/Documents'),
  DocumentDetail: () => import('./pages/DocumentDetail'),
  Chat:           () => import('./pages/Chat'),
  Settings:       () => import('./pages/Settings'),
  FactCheck:      () => import('./pages/FactCheck'),
  Study:          () => import('./pages/Study'),
  Notebook:       () => import('./pages/Notebook'),
};

const Landing        = lazy(loaders.Landing);
const Login          = lazy(loaders.Login);
const Signup         = lazy(loaders.Signup);
const Dashboard      = lazy(loaders.Dashboard);
const Documents      = lazy(loaders.Documents);
const DocumentDetail = lazy(loaders.DocumentDetail);
const Chat           = lazy(loaders.Chat);
const Settings       = lazy(loaders.Settings);
const FactCheck      = lazy(loaders.FactCheck);
const Study          = lazy(loaders.Study);
const Notebook       = lazy(loaders.Notebook);

/** Once the first page is up, fetch the other chunks while the browser is idle. */
function usePrefetchRoutes() {
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((fn) => setTimeout(fn, 1500));
    const cancel = window.cancelIdleCallback ?? clearTimeout;
    const handle = idle(() => Object.values(loaders).forEach(load => load().catch(() => {})));
    return () => cancel(handle);
  }, []);
}

function FullPageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <span className="w-6 h-6 border-2 border-gray-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  usePrefetchRoutes();

  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<FullPageLoader />}>
          <Routes>
            {/* Public */}
            <Route index element={<Landing />} />
            <Route element={<PublicOnly />}>
              <Route path="login" element={<Login />} />
              <Route path="signup" element={<Signup />} />
            </Route>

            {/* Signed-in workspace */}
            <Route element={<RequireAuth />}>
              <Route element={<AppLayout />}>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="documents" element={<Documents />} />
                <Route path="documents/:id" element={<DocumentDetail />} />
                <Route path="chat" element={<Chat />} />
                <Route path="verify" element={<FactCheck />} />
                <Route path="study" element={<Study />} />
                <Route path="notebook" element={<Notebook />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
