import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Shield, Trash2, Users, BookOpen, FileText, Sun, Moon } from 'lucide-react';
import { getApiUrl } from '../firebase';

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export function AdminDashboard({ user, onLogout, darkMode, onToggleDarkMode }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'courses' | 'exams'>('users');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab]);

  const fetchData = async (tab: string) => {
    setLoading(true);
    try {
      const resp = await fetch(getApiUrl(`/api/admin/${tab}`));
      if (resp.ok) {
        const json = await resp.json();
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) return;
    
    try {
      const resp = await fetch(getApiUrl(`/api/admin/${activeTab}/${id}`), {
        method: 'DELETE'
      });
      if (resp.ok) {
        fetchData(activeTab);
      } else {
        const err = await resp.json();
        alert(err.error || 'Erreur lors de la suppression.');
      }
    } catch (e) {
      console.error(e);
      alert('Erreur réseau.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors">
      <header className="bg-white dark:bg-slate-900 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center sticky top-0 z-10 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 rounded-lg">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Administration</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Superviseur EduQuiz</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end mr-2">
            <span className="text-sm font-medium text-slate-900 dark:text-slate-200">{user.email}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full mt-1 border border-slate-200 dark:border-slate-700">
              Administrateur
            </span>
          </div>
          {onToggleDarkMode && (
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
              title={darkMode ? "Activer le mode clair" : "Activer le mode sombre"}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={onLogout}
            className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            Déconnexion
          </button>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
              activeTab === 'users' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            } border shadow-sm`}
          >
            <Users className="w-4 h-4" />
            Utilisateurs
          </button>
          <button
            onClick={() => setActiveTab('courses')}
            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
              activeTab === 'courses' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            } border shadow-sm`}
          >
            <BookOpen className="w-4 h-4" />
            Cours
          </button>
          <button
            onClick={() => setActiveTab('exams')}
            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
              activeTab === 'exams' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            } border shadow-sm`}
          >
            <FileText className="w-4 h-4" />
            Examens
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Chargement...</div>
          ) : data.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Aucune donnée trouvée.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">ID</th>
                    {activeTab === 'users' && <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>}
                    {activeTab === 'users' && <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Rôle</th>}
                    {activeTab === 'courses' && <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Titre</th>}
                    {activeTab === 'courses' && <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Code</th>}
                    {activeTab === 'exams' && <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Titre</th>}
                    {activeTab === 'exams' && <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Durée</th>}
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.map((item: any) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900 font-mono text-xs">{item.id}</td>
                      {activeTab === 'users' && <td className="px-6 py-4 text-sm text-gray-900">{item.email}</td>}
                      {activeTab === 'users' && (
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                            item.role === 'teacher' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {item.role}
                          </span>
                        </td>
                      )}
                      {activeTab === 'courses' && <td className="px-6 py-4 text-sm text-gray-900 font-medium">{item.title}</td>}
                      {activeTab === 'courses' && <td className="px-6 py-4 text-sm text-gray-500">{item.code}</td>}
                      {activeTab === 'exams' && <td className="px-6 py-4 text-sm text-gray-900 font-medium">{item.title}</td>}
                      {activeTab === 'exams' && <td className="px-6 py-4 text-sm text-gray-500">{item.durationMinutes} min</td>}
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-900 hover:bg-red-50 p-2 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
