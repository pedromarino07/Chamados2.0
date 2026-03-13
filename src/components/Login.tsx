import React, { useState } from 'react';
import { User } from '../types';
import { LogIn, Hospital } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginProps {
  onLogin: (user: User) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Front-end Sanitization
    const sanitizeLogin = (str: string) => {
      return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^a-zA-Z]/g, "")      // Keep ONLY letters
        .toUpperCase();
    };

    const sanitizePassword = (pw: string) => {
      return pw
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^a-zA-Z0-9]/g, "")    // Keep letters and numbers
        .toLowerCase();
    };

    const sanitizedLogin = sanitizeLogin(login);
    const sanitizedPassword = sanitizePassword(password);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: sanitizedLogin, password: sanitizedPassword }),
      });

      if (response.ok) {
        const user = await response.json();
        onLogin(user);
      } else {
        setError('Credenciais inválidas. Tente novamente.');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#E4E3E0] flex items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-black/5"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="bg-emerald-600 p-3 rounded-xl mb-4">
            <Hospital className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Helpdesk Hospitalar</h1>
          <p className="text-gray-500 text-sm italic serif">Acesso Restrito ao Staff</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Login Único
            </label>
            <input
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none"
              placeholder="ex: JOAO"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value.toLowerCase())}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm font-medium bg-red-50 p-3 rounded-lg border border-red-100">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {loading ? 'Entrando...' : (
              <>
                <LogIn className="w-5 h-5" />
                Entrar no Sistema
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">
            Dica: Use <span className="font-mono bg-gray-100 px-1">ADMIN</span> / <span className="font-mono bg-gray-100 px-1">admin123</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
