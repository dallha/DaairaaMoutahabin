import React, { useState } from 'react';
import {
  History,
  Search,
  Clock,
  User,
  ShieldCheck,
  Filter,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { ActivityLogItem, Language } from '../types';
import { useTranslation } from '../i18n/translations';

interface ActivityLogViewProps {
  activityLogs: ActivityLogItem[];
  currentLang: Language;
}

export const ActivityLogView: React.FC<ActivityLogViewProps> = ({
  activityLogs,
  currentLang,
}) => {
  const t = useTranslation(currentLang);
  const [search, setSearch] = useState('');

  const filtered = activityLogs.filter((log) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.userName.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
          <History className="w-5 h-5 text-[#335A79]" />
          <span>{t.navActivityLog}</span>
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
          Historique des modifications, créations, suppressions et imports effectués dans le système
        </p>
      </div>

      {/* Search bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher dans les journaux..."
          className="w-full pl-10 pr-4 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#335A79] text-xs text-stone-900 bg-white"
        />
      </div>

      {/* Log list */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs divide-y divide-stone-100 overflow-hidden">
        {filtered.map((log) => (
          <div key={log.id} className="p-4 sm:p-5 flex items-start justify-between gap-4 hover:bg-stone-50/70 transition">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-600 flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-4 h-4 text-[#335A79]" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-xs sm:text-sm text-stone-900">
                  {log.action}
                </h3>
                <p className="text-xs text-stone-600">
                  {log.details}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-stone-400">
                  <span className="flex items-center gap-1 font-medium text-stone-600">
                    <User className="w-3 h-3 text-stone-400" />
                    {log.userName}
                  </span>
                  <span>•</span>
                  <span>{log.timestamp}</span>
                </div>
              </div>
            </div>

            <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-stone-100 text-stone-600 shrink-0">
              AUDIT-OK
            </span>
          </div>
        ))}
      </div>

    </div>
  );
};
