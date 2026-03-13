import React, { useState } from 'react';
import { User } from '../types';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface ResetPasswordProps {
  user: User;
  onSuccess: (updatedUser: User) => void;
}

export default function ResetPassword({ user, onSuccess }: ResetPasswordProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Sanitization
    const sanitizePassword = (pw: string) => {
      return pw
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^a-zA-Z]/g, "")      // Keep ONLY letters
        .toLowerCase();
    };

    const sanitizedPw = sanitizePassword(newPassword);
    const sanitizedConfirm = sanitizePassword(confirmPassword);

    if (sanitizedPw.length < 4) {
      setError('A senha deve ter pelo menos 4 letras.');
      return;
    }

    if (sanitizedPw !== sanitizedConfirm) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, newPassword: sanitizedPw }),
      });

      if (response.ok) {
        onSuccess({ ...user, is_first_login: false });
      } else {
        setError('Erro ao redefinir senha.');
      }
    } catch (err) {
      setError('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#E4E3E0] flex items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-black/5"
      >
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="bg-amber-100 p-3 rounded-xl mb-4">
            <KeyRound className="text-amber-600 w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Primeiro Acesso</h1>
          <p className="text-gray-500 text-sm mt-2">
            Por segurança, você deve redefinir sua senha temporária antes de continuar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
              Nova Senha (apenas letras)
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
              placeholder="Mínimo 4 letras"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
              Confirmar Nova Senha
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
              placeholder="Repita a senha"
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
            className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all disabled:opacity-50"
          >
            {loading ? 'Processando...' : (
              <>
                <ShieldCheck className="w-5 h-5" />
                Atualizar e Acessar
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
