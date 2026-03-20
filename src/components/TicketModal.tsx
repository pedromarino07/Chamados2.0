import React, { useState, useEffect } from 'react';
import { User, Category, Ticket } from '../types';
import { X, Send, Clock, AlertCircle, PauseCircle, CheckCircle2, RotateCcw, History } from 'lucide-react';
import { motion } from 'motion/react';
import TicketHistoryList from './TicketHistoryList';

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
  const [sectors, setSectors] = useState<{id: number, name: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [reopeningReason, setReopeningReason] = useState('');
  const [showReopenForm, setShowReopenForm] = useState(false);

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
    fetch('/api/sectors')
      .then(res => res.json())
      .then(data => setSectors(data));
  }, []);

  useEffect(() => {
    if (user.role === 'admin' || user.role === 'tecnico') {
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
          requester_id: (user.role === 'admin' || user.role === 'tecnico') ? null : user.id,
          requester_name: (user.role === 'admin' || user.role === 'tecnico') ? requesterName : user.name,
          sector: (user.role === 'admin' || user.role === 'tecnico') ? sectorManual : user.sector,
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
        return <span className="flex items-center gap-1 text-brand-orange bg-brand-orange/10 px-2 py-1 rounded-md text-xs font-bold uppercase"><Clock className="w-3 h-3"/> Pendente</span>;
      case 'in_progress':
        return <span className="flex items-center gap-1 text-brand-blue bg-brand-blue/10 px-2 py-1 rounded-md text-xs font-bold uppercase"><AlertCircle className="w-3 h-3"/> Em Andamento</span>;
      case 'on_hold':
        return <span className="flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded-md text-xs font-bold uppercase"><PauseCircle className="w-3 h-3"/> Em Espera</span>;
      case 'finished':
        return <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-xs font-bold uppercase"><CheckCircle2 className="w-3 h-3"/> Finalizado</span>;
      case 'resolved':
        return <span className="flex items-center gap-1 text-brand-blue bg-brand-blue/10 px-2 py-1 rounded-md text-xs font-bold uppercase"><CheckCircle2 className="w-3 h-3"/> Resolvido</span>;
      default:
        return null;
    }
  };

  const handleRequesterAction = async (action: 'finished' | 'pending', customComment?: string) => {
    if (action === 'pending' && !reopeningReason) {
      setShowReopenForm(true);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/tickets/${ticket?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: action,
          changed_by: user.id,
          comment: customComment || (action === 'pending' ? reopeningReason : 'Chamado finalizado pelo solicitante.'),
          reopening_reason: action === 'pending' ? reopeningReason : null
        }),
      });

      if (response.ok) {
        onSuccess();
      } else {
        setError('Erro ao processar ação.');
      }
    } catch (err) {
      setError('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-black/5 flex flex-col max-h-[90vh]"
      >
        <div className="bg-brand-blue p-6 text-white flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-xl font-bold">{isViewMode ? `Chamado #${ticket.id}` : 'Abrir Novo Chamado'}</h3>
            <p className="text-xs text-white/60 uppercase tracking-widest mt-1">Suporte de TI</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={isEditMode ? handleUpdate : handleSubmit} className="p-8 space-y-6 overflow-y-auto content-container pb-10">
          {isViewMode && (
            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status Atual</span>
              {getStatusBadge(ticket.status)}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Solicitante</label>
              {(user.role === 'admin' || user.role === 'tecnico') && !isViewMode ? (
                <input 
                  type="text" 
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  className="w-full p-3 rounded-xl text-sm border border-gray-200 focus:ring-2 focus:ring-brand-orange outline-none transition-all" 
                  placeholder="Nome do Solicitante"
                  required
                />
              ) : (
                <input type="text" disabled value={isViewMode ? ticket.requester_name : user.name} className="w-full bg-gray-50 p-3 rounded-xl text-sm border border-gray-100 text-gray-500" />
              )}
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Setor</label>
              {(user.role === 'admin' || user.role === 'tecnico') && !isViewMode ? (
                <select 
                  value={sectorManual}
                  onChange={(e) => setSectorManual(e.target.value)}
                  className="w-full p-3 rounded-xl text-sm border border-gray-200 focus:ring-2 focus:ring-brand-orange outline-none transition-all" 
                  required
                >
                  <option value="">Selecione o setor...</option>
                  {sectors.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              ) : (
                <input type="text" disabled value={isViewMode ? ticket.sector : user.sector} className="w-full bg-gray-50 p-3 rounded-xl text-sm border border-gray-100 text-gray-500" />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Ramal</label>
              <input 
                type="text" 
                value={extension}
                onChange={(e) => setExtension(e.target.value)}
                disabled={isViewMode && !isEditMode}
                placeholder="Ex: 1234"
                className="w-full p-3 rounded-xl text-sm border border-gray-200 focus:ring-2 focus:ring-brand-orange outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500" 
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Grau de Urgência</label>
              <select 
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as any)}
                disabled={isViewMode && !isEditMode}
                className="w-full p-3 rounded-xl text-sm border border-gray-200 focus:ring-2 focus:ring-brand-orange outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500"
                required
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
              </select>
            </div>
          </div>

          {(!isViewMode && user.role !== 'colaborador') || (isViewMode && (ticket.category_name || user.role === 'admin' || user.role === 'tecnico')) ? (
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Categoria</label>
              <select 
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                disabled={isViewMode && !isEditMode}
                className="w-full p-3 rounded-xl text-sm border border-gray-200 focus:ring-2 focus:ring-brand-orange outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500"
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
            <div className={`w-full p-4 rounded-xl text-sm border border-gray-200 min-h-[100px] ${isViewMode ? 'bg-gray-50 text-gray-700 break-text overflow-y-visible' : 'focus:ring-2 focus:ring-brand-orange outline-none transition-all'}`}>
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

          {isViewMode && ticket.reopening_reason && (
            <div className="bg-red-50 p-4 rounded-xl border border-red-100">
              <label className="block text-[10px] font-bold text-red-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                <RotateCcw className="w-3 h-3" /> Motivo da Reabertura
              </label>
              <p className="text-sm text-red-800 break-text">{ticket.reopening_reason}</p>
            </div>
          )}

          {isViewMode && (
            <div className="pt-4 border-t border-gray-100">
              <TicketHistoryList ticketId={ticket.id} />
            </div>
          )}

          {error && (
            <p className="text-red-500 text-sm font-medium bg-red-50 p-3 rounded-lg border border-red-100">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-4 pt-4 shrink-0">
            {isViewMode && ticket.status === 'resolved' && (user.role === 'admin' || user.role === 'tecnico') && (
              <div className="bg-brand-orange/5 p-4 rounded-2xl border border-brand-orange/10">
                <p className="text-xs text-brand-orange font-medium text-center mb-3">Aguardando validação do solicitante. Deseja encerrar administrativamente?</p>
                <button 
                  type="button"
                  onClick={() => handleRequesterAction('finished', 'Encerramento Administrativo')}
                  disabled={loading}
                  className="w-full bg-brand-orange text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-brand-orange/90 transition-all shadow-lg shadow-brand-orange/20"
                >
                  <CheckCircle2 className="w-5 h-5" /> Encerrar Definitivamente
                </button>
              </div>
            )}

            {isViewMode && ticket.status === 'resolved' && (ticket.requester_id === user.id) && (
              <div className="space-y-4 bg-brand-blue/5 p-4 rounded-2xl border border-brand-blue/10">
                <p className="text-xs text-brand-blue font-medium text-center">O técnico marcou este chamado como resolvido. Você confirma a solução?</p>
                
                {showReopenForm ? (
                  <div className="space-y-2">
                    <textarea 
                      value={reopeningReason}
                      onChange={(e) => setReopeningReason(e.target.value)}
                      placeholder="Descreva por que o problema não foi resolvido..."
                      className="w-full p-3 text-sm border border-red-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none resize-none bg-white"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => setShowReopenForm(false)}
                        className="flex-1 px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleRequesterAction('pending')}
                        disabled={loading || !reopeningReason}
                        className="flex-1 bg-red-600 text-white px-4 py-2 text-xs font-bold rounded-lg hover:bg-red-700 transition-all disabled:opacity-50"
                      >
                        Confirmar Reabertura
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <button 
                      type="button"
                      onClick={() => handleRequesterAction('finished')}
                      disabled={loading}
                      className="flex-1 bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
                    >
                      <CheckCircle2 className="w-5 h-5" /> Sim, Finalizar
                    </button>
                    <button 
                      type="button"
                      onClick={() => setShowReopenForm(true)}
                      disabled={loading}
                      className="flex-1 bg-red-50 text-red-600 px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-all border border-red-100"
                    >
                      <RotateCcw className="w-5 h-5" /> Não, Reabrir
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-4">
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
                  className="flex-1 bg-brand-orange text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-brand-orange/90 transition-all shadow-lg shadow-brand-orange/20"
                >
                  {loading ? 'Enviando...' : (
                    <>
                      <Send className="w-5 h-5" />
                      Enviar Chamado
                    </>
                  )}
                </button>
              )}
              {isViewMode && (user.role === 'admin' || user.role === 'tecnico') && (
                <button 
                  type="button"
                  onClick={() => isEditMode ? handleUpdate(new Event('submit') as any) : setIsEditMode(true)}
                  disabled={loading}
                  className={`flex-1 ${isEditMode ? 'bg-brand-orange' : 'bg-brand-blue'} text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg`}
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
          </div>
        </form>
      </motion.div>
    </div>
  );
}
