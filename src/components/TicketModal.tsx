import React, { useState, useEffect } from 'react';
import { User, Category, Ticket } from '../types';
import { X, Send, Clock, AlertCircle, PauseCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

interface TicketModalProps {
  user: User;
  categories: Category[];
  ticket?: Ticket | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TicketModal({ user, categories, ticket, onClose, onSuccess }: TicketModalProps) {
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<'baixa' | 'media' | 'alta'>('baixa');
  const [extension, setExtension] = useState(user.extension || '');
  const [requesterName, setRequesterName] = useState(user.name);
  const [sectorManual, setSectorManual] = useState(user.sector);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [technicians, setTechnicians] = useState<User[]>([]);

  const isViewMode = !!ticket;

  useEffect(() => {
    if (ticket) {
      setCategoryId(ticket.category_id.toString());
      setDescription(ticket.description);
      setUrgency(ticket.urgency);
      setExtension(ticket.extension);
    }
  }, [ticket]);

  useEffect(() => {
    if (user.role === 'admin') {
      fetch('/api/users')
        .then(res => res.json())
        .then(data => setTechnicians(data.filter((u: User) => u.role === 'tecnico' || u.role === 'admin')));
    }
  }, [user]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extension,
          urgency,
          category_id: parseInt(categoryId),
          technician_id: ticket.technician_id // This should be updated if we add a tech selector
        }),
      });

      if (response.ok) {
        onSuccess();
      } else {
        setError('Erro ao atualizar chamado.');
      }
    } catch (err) {
      setError('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewMode) return;

    if (!description || !extension || !urgency) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requester_id: user.role === 'admin' ? null : user.id,
          requester_name: user.role === 'admin' ? requesterName : user.name,
          sector: user.role === 'admin' ? sectorManual : user.sector,
          category_id: user.role === 'colaborador' ? 1 : parseInt(categoryId), // Default or hidden for colaborador
          description,
          urgency,
          extension,
        }),
      });

      if (response.ok) {
        onSuccess();
      } else {
        setError('Erro ao criar chamado. Tente novamente.');
      }
    } catch (err) {
      setError('Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-md text-xs font-bold uppercase"><Clock className="w-3 h-3"/> Pendente</span>;
      case 'in_progress':
        return <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-md text-xs font-bold uppercase"><AlertCircle className="w-3 h-3"/> Em Atendimento</span>;
      case 'on_hold':
        return <span className="flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded-md text-xs font-bold uppercase"><PauseCircle className="w-3 h-3"/> Em Espera</span>;
      case 'finished':
        return <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-xs font-bold uppercase"><CheckCircle2 className="w-3 h-3"/> Finalizado</span>;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-black/5 flex flex-col max-h-[90vh]"
      >
        <div className="bg-gray-900 p-6 text-white flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-xl font-bold">{isViewMode ? `Chamado #${ticket.id}` : 'Abrir Novo Chamado'}</h3>
            <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">Suporte de TI</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={isEditMode ? handleUpdate : handleSubmit} className="p-8 space-y-6 overflow-y-auto content-container">
          {isViewMode && (
            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status Atual</span>
              {getStatusBadge(ticket.status)}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Solicitante</label>
              {user.role === 'admin' && !isViewMode ? (
                <input 
                  type="text" 
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  className="w-full p-3 rounded-xl text-sm border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" 
                  placeholder="Nome do Solicitante"
                  required
                />
              ) : (
                <input type="text" disabled value={isViewMode ? ticket.requester_name : user.name} className="w-full bg-gray-50 p-3 rounded-xl text-sm border border-gray-100 text-gray-500" />
              )}
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Setor</label>
              {user.role === 'admin' && !isViewMode ? (
                <input 
                  type="text" 
                  value={sectorManual}
                  onChange={(e) => setSectorManual(e.target.value)}
                  className="w-full p-3 rounded-xl text-sm border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" 
                  placeholder="Setor"
                  required
                />
              ) : (
                <input type="text" disabled value={isViewMode ? ticket.sector : user.sector} className="w-full bg-gray-50 p-3 rounded-xl text-sm border border-gray-100 text-gray-500" />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Ramal</label>
              <input 
                type="text" 
                value={extension}
                onChange={(e) => setExtension(e.target.value)}
                disabled={isViewMode && !isEditMode}
                placeholder="Ex: 1234"
                className="w-full p-3 rounded-xl text-sm border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500" 
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Grau de Urgência</label>
              <select 
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as any)}
                disabled={isViewMode && !isEditMode}
                className="w-full p-3 rounded-xl text-sm border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500"
                required
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
              </select>
            </div>
          </div>

          {(!isViewMode && user.role !== 'colaborador') || (isViewMode && (ticket.category_name || user.role === 'admin')) ? (
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Categoria</label>
              <select 
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                disabled={isViewMode && !isEditMode}
                className="w-full p-3 rounded-xl text-sm border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500"
                required
              >
                <option value="">Selecione uma categoria...</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          ) : null}

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Descrição do Pedido</label>
            <div className={`w-full p-4 rounded-xl text-sm border border-gray-200 ${isViewMode ? 'bg-gray-50 text-gray-700 break-text' : 'focus:ring-2 focus:ring-emerald-500 outline-none transition-all'}`}>
              {isViewMode ? (
                description
              ) : (
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Descreva o problema com o máximo de detalhes possível..."
                  className="w-full bg-transparent outline-none resize-none"
                  required
                />
              )}
            </div>
          </div>

          {isViewMode && ticket.status === 'on_hold' && ticket.hold_justification && (
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
              <label className="block text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-2">Justificativa Técnica</label>
              <p className="text-sm text-orange-800 break-text">{ticket.hold_justification}</p>
            </div>
          )}

          {error && (
            <p className="text-red-500 text-sm font-medium bg-red-50 p-3 rounded-lg border border-red-100">
              {error}
            </p>
          )}

          <div className="flex gap-4 pt-4 shrink-0">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
            >
              {isViewMode ? 'Fechar' : 'Cancelar'}
            </button>
            {!isViewMode && (
              <button 
                type="submit"
                disabled={loading}
                className="flex-1 bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
              >
                {loading ? 'Enviando...' : (
                  <>
                    <Send className="w-5 h-5" />
                    Enviar Chamado
                  </>
                )}
              </button>
            )}
            {isViewMode && user.role === 'admin' && (
              <button 
                type="button"
                onClick={() => isEditMode ? handleUpdate(new Event('submit') as any) : setIsEditMode(true)}
                disabled={loading}
                className={`flex-1 ${isEditMode ? 'bg-emerald-600' : 'bg-blue-600'} text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg`}
              >
                {loading ? 'Salvando...' : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    {isEditMode ? 'Salvar' : 'Editar'}
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
}
