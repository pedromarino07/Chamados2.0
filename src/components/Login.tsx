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
        .replace(/[^a-zA-Z0-9@.]/g, "") // Keep letters, numbers, @ and .
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
        const data = await response.json();
        setError(data.error || 'Credenciais inválidas. Tente novamente.');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-beige flex items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-brand-gray/10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="bg-brand-orange p-3 rounded-xl mb-4">
            <Hospital className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-brand-gray tracking-tight">HELPDESK</h1>
          <p className="text-brand-gray/60 text-sm italic serif">Acesso Restrito ao Staff</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-brand-gray uppercase tracking-widest mb-2">
              LOGIN
            </label>
            <input
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value.toUpperCase().replace(/[^A-Z0-9@.]/g, ''))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-orange focus:border-transparent transition-all outline-none uppercase"
              placeholder="LOGIN"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-brand-gray uppercase tracking-widest mb-2">
              SENHA
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value.toLowerCase())}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-orange focus:border-transparent transition-all outline-none"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm font-medium bg-red-50 p-3 rounded-lg border border-red-100">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-orange text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-brand-orange/90 transition-colors disabled:opacity-50 shadow-lg shadow-brand-orange/20"
          >
            {loading ? 'Entrando...' : (
              <>
                <LogIn className="w-5 h-5" />
                Entrar no Sistema
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
