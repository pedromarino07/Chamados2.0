import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../../types';
import { UserPlus, Trash2, Shield, Briefcase, Key, User as UserIcon } from 'lucide-react';
import { motion } from 'motion/react';

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [sectors, setSectors] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    login: '',
    password: '',
    role: 'colaborador' as UserRole,
    sector: '',
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchData = async () => {
    try {
      const [usersRes, sectorsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/sectors')
      ]);
      const usersData = await usersRes.json();
      const sectorsData = await sectorsRes.json();
      setUsers(usersData);
      setSectors(sectorsData);
    } catch (err) {
      console.error('Erro ao buscar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!/^[a-zA-Z]+$/.test(formData.login)) {
      setError('O login deve conter apenas letras.');
      return;
    }

    try {
      const url = editingId ? `/api/users/${editingId}` : '/api/users';
      const method = editingId ? 'PATCH' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSuccess(editingId ? 'Usuário atualizado com sucesso!' : 'Usuário cadastrado com sucesso!');
        setFormData({
          name: '',
          login: '',
          password: '',
          role: 'colaborador',
          sector: '',
        });
        setEditingId(null);
        fetchData();
      } else {
        const data = await response.json();
        setError(data.error || 'Erro ao cadastrar usuário');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    }
  };

  const handleEdit = (user: User) => {
    setEditingId(user.id);
    setFormData({
      name: user.name,
      login: user.login,
      password: '', // Don't show password
      role: user.role,
      sector: user.sector,
    });
    setSuccess('');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;

    try {
      const response = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Erro ao excluir');
    }
  };

  if (loading) return <div className="animate-pulse text-center p-8">Carregando usuários...</div>;

  return (
    <div className="space-y-8">
      {/* Form Card */}
      <div className="bg-white p-8 rounded-2xl border border-black/5 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <UserPlus className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">{editingId ? 'Editar Usuário' : 'Novo Usuário'}</h3>
          </div>
          {editingId && (
            <button 
              onClick={() => {
                setEditingId(null);
                setFormData({ name: '', login: '', password: '', role: 'colaborador', sector: '' });
              }}
              className="text-xs font-bold text-gray-400 uppercase hover:text-gray-600"
            >
              Cancelar Edição
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nome Completo</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="Ex: João Silva"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Login (Apenas Letras)</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                required
                value={formData.login}
                onChange={(e) => setFormData({ ...formData, login: e.target.value.toUpperCase().replace(/[^A-Z]/g, '') })}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="Ex: JOAOS"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              {editingId ? 'Nova Senha (Opcional)' : 'Senha (Alfanumérica)'}
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="password"
                required={!editingId}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value.toLowerCase() })}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder={editingId ? "Deixe em branco para manter" : "••••••••"}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Setor</label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <select
                required
                value={formData.sector}
                onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all appearance-none bg-white"
              >
                <option value="">Selecione um setor</option>
                {sectors.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nível de Acesso</label>
            <div className="relative">
              <Shield className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <select
                required
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all appearance-none bg-white"
              >
                <option value="colaborador">Colaborador</option>
                <option value="tecnico">Suporte Técnico</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ramal</label>
            <input
              type="text"
              required
              value={formData.extension}
              onChange={(e) => setFormData({ ...formData, extension: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              placeholder="Ex: 2005"
            />
          </div>

          <div className="md:col-span-2 lg:col-span-3 flex flex-col gap-4">
            {error && <p className="text-red-500 text-sm font-bold bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}
            {success && <p className="text-emerald-600 text-sm font-bold bg-emerald-50 p-3 rounded-xl border border-emerald-100">{success}</p>}
            
            <button
              type="submit"
              className="bg-gray-900 text-white px-8 py-4 rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg shadow-gray-900/20 w-fit"
            >
              {editingId ? 'Salvar Alterações' : 'Cadastrar Usuário'}
            </button>
          </div>
        </form>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="font-bold text-gray-700">Usuários Cadastrados</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nome</th>
                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Login</th>
                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Setor</th>
                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nível</th>
                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => (
                <tr key={u.id} className="text-sm hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-medium text-gray-900">{u.name}</td>
                  <td className="p-4 font-mono text-xs text-gray-500">{u.login}</td>
                  <td className="p-4 text-gray-500">{u.sector}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                      u.role === 'admin' ? 'bg-purple-50 text-purple-600' :
                      u.role === 'tecnico' ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-600'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4 flex gap-2">
                    <button 
                      onClick={() => handleEdit(u)}
                      className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-[10px] font-bold uppercase"
                    >
                      <Key className="w-3 h-3" />
                      Editar
                    </button>
                    <button 
                      onClick={() => handleDelete(u.id)}
                      className="flex items-center gap-1 px-3 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-[10px] font-bold uppercase"
                    >
                      <Trash2 className="w-3 h-3" />
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
