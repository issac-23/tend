import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Today from './pages/Today';
import Insights from './pages/Insights';
import Weekly from './pages/Weekly';
import Settings from './pages/Settings';
import OnDeck from './pages/OnDeck';
import Nav from './components/Nav';
import { db, seedIfEmpty } from './db';
import { maybeFireDailyReminder } from './lib/notify';
import { registerServiceWorker, type SwUpdate } from './lib/sw';
import { RefreshCw } from 'lucide-react';

export default function App() {
  const [update, setUpdate] = useState<SwUpdate | null>(null);

  useEffect(() => {
    seedIfEmpty();

    async function checkReminder() {
      const [habits, entries] = await Promise.all([
        db.habits.filter((h) => !h.archivedAt && !h.onDeckAt).toArray(),
        db.entries.toArray(),
      ]);
      maybeFireDailyReminder(habits, entries);
    }

    checkReminder();
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) checkReminder();
    });

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (e) => {
        if (e.data?.type === 'check-reminder') checkReminder();
      });
    }

    const id = setInterval(checkReminder, 60 * 60 * 1000);

    registerServiceWorker((u) => setUpdate(u));

    return () => clearInterval(id);
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col max-w-md mx-auto safe-top">
        <main className="flex-1 pb-24">
          <Routes>
            <Route path="/" element={<Today />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/weekly" element={<Weekly />} />
            <Route path="/on-deck" element={<OnDeck />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Nav />

        {update && (
          <button
            onClick={() => update.skip()}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-white text-black text-xs font-medium px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-fade-in active:scale-95 transition-transform"
          >
            <RefreshCw size={12} />
            New version — tap to update
          </button>
        )}
      </div>
    </BrowserRouter>
  );
}
