import { useState } from 'react';
import { User, Ticket, Category } from '../types';
import { Clock, CheckCircle2, AlertCircle, PauseCircle, UserPlus, ExternalLink, PlusCircle, History, RotateCcw } from 'lucide-react';
import TicketModal from './TicketModal';
import TicketHistoryList from './TicketHistoryList';

interface TecnicoViewProps {
  user: User;
  tickets: Ticket[];
  categories: Category[];
  onUpdate: () => void;
  onSearch: (term: string) => void;
}

export default function TecnicoView({ user, tickets, categories, onUpdate, onSearch }: TecnicoViewProps) {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [justification, setJustification] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'queue' | 'history'>('queue');
  const [classification, setClassification] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [localSearch, setLocalSearch] = useState('');

  const handleAction = async (ticketId: number, action: string, extraData: any = {}) => {
    setLoading(true);
    setError('');
    
    try {
      let body: any = { 
        status: action,
        changed_by: user.id,
        comment: action === 'on_hold' ? justification : 
                 action === 'resolved' ? 'Chamado marcado como resolvido.' :
                 action === 'finished' ? 'Chamado encerrado definitivamente.' :
                 action === 'in_progress' ? 'Atendimento retomado/iniciado.' : null
      };
      if (action === 'in_progress') {
        body.technician_id = user.id;
      }
      if (action === 'on_hold') {
        body.hold_justification = justification;
      }
      if (classification) {
        body.category_id = parseInt(classification);
      }
      
      console.log('Enviando atualização de chamado:', { ticketId, body, ...extraData });

      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, ...extraData }),
      });

      if (response.ok) {
        const updatedTicket = await response.json();
        console.log('Chamado atualizado com sucesso:', updatedTicket);
        onUpdate();
        setSelectedTicket(updatedTicket);
        setJustification('');
        setClassification('');
      } else {
        const errorData = await response.json();
        console.error('Erro na resposta do servidor:', errorData);
        setError('Erro ao atualizar chamado: ' + (errorData.error || 'Erro desconhecido'));
      }
    } catch (err) {
      console.error('Erro de conexão ao atualizar chamado:', err);
      setError('Erro de conexão ao atualizar chamado.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-md text-[10px] font-bold uppercase">Pendente</span>;
      case 'in_progress':
        return <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-md text-[10px] font-bold uppercase">Em Andamento</span>;
      case 'on_hold':
        return <span className="flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded-md text-[10px] font-bold uppercase">Em Espera</span>;
      case 'finished':
        return <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-[10px] font-bold uppercase">Finalizado</span>;
      case 'resolved':
        return <span className="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md text-[10px] font-bold uppercase">Resolvido</span>;
      default:
        return null;
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (activeTab === 'queue') return t.status !== 'finished';
    return t.status === 'finished' && t.technician_id === user.id;
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Painel do Técnico</h2>
          <p className="text-gray-500 italic serif">Bem-vindo, {user.name}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="relative flex-1 sm:min-w-[250px]">
            <input 
              type="text" 
              placeholder="Buscar por descrição..." 
              value={localSearch}
              onChange={(e) => {
                setLocalSearch(e.target.value);
                onSearch(e.target.value);
              }}
              className="w-full pl-10 pr-4 py-3 text-sm border border-black/5 bg-white rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm transition-all"
            />
            <RotateCcw className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 rotate-90" />
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
          >
            <PlusCircle className="w-5 h-5" />
            + Abrir Chamado
          </button>
          <div className="flex bg-white rounded-xl p-1 border border-black/5 shadow-sm">
            <button 
              onClick={() => setActiveTab('queue')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'queue' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Fila Ativa
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Meu Histórico
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Ticket List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-700">{activeTab === 'queue' ? 'Chamados em Aberto' : 'Meus Chamados Finalizados'}</h3>
              <div className="flex gap-2">
                <span className="text-[10px] bg-gray-50 text-gray-500 px-2 py-1 rounded-full font-bold">{filteredTickets.length} Itens</span>
              </div>
            </div>
            <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto custom-scrollbar">
              {filteredTickets.length === 0 ? (
                <div className="p-12 text-center text-gray-400 italic">Nenhum chamado encontrado.</div>
              ) : (
                filteredTickets.map((ticket) => (
                  <div 
                    key={ticket.id} 
                    onClick={() => {
                      setSelectedTicket(ticket);
                      // On mobile, we might want to scroll to details or open a modal, 
                      // but for now let's just let it stack and the user can scroll down.
                    }}
                    className={`p-4 hover:bg-gray-50 transition-all cursor-pointer flex items-center justify-between group ${selectedTicket?.id === ticket.id ? 'bg-emerald-50/50 border-l-4 border-emerald-500' : ''}`}
                  >
                    <div className="flex gap-3 md:gap-4 items-center overflow-hidden">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        ticket.status === 'pending' ? 'bg-amber-100 text-amber-600' : 
                        ticket.status === 'finished' ? 'bg-emerald-100 text-emerald-600' :
                        ticket.status === 'resolved' ? 'bg-indigo-100 text-indigo-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        {ticket.status === 'pending' ? <Clock className="w-5 h-5" /> : 
                         ticket.status === 'finished' ? <CheckCircle2 className="w-5 h-5" /> :
                         ticket.status === 'resolved' ? <CheckCircle2 className="w-5 h-5" /> :
                         <AlertCircle className="w-5 h-5" />}
                      </div>
                      <div className="overflow-hidden">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[10px] text-gray-400">#{ticket.id}</span>
                          <h4 className="font-bold text-gray-800 truncate max-w-[120px] sm:max-w-none">{ticket.requester_name}</h4>
                          <span className="text-[10px] text-gray-400 bg-gray-100 px-1 rounded shrink-0">{ticket.sector}</span>
                        </div>
                        <p className="text-sm text-gray-500 truncate max-w-[200px] sm:max-w-xs break-all">{ticket.description}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                      {getStatusBadge(ticket.status)}
                      <span className="text-[10px] text-gray-400">{new Date(ticket.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Ticket Details / Actions */}
        <div className="space-y-6">
          {selectedTicket ? (
            <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-xl lg:sticky lg:top-8 content-container min-h-[500px]">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Detalhes do Chamado</p>
                  <h3 className="text-xl font-bold text-gray-900">#{selectedTicket.id}</h3>
                </div>
                {getStatusBadge(selectedTicket.status)}
              </div>

              <div className="space-y-4 mb-8">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Solicitante</label>
                    <p className="text-sm font-semibold truncate break-all">{selectedTicket.requester_name}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Ramal</label>
                    <p className="text-sm font-semibold">{selectedTicket.extension}</p>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Urgência</label>
                  <p className="text-sm">
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${
                      selectedTicket.urgency === 'alta' ? 'bg-red-100 text-red-600' : 
                      selectedTicket.urgency === 'media' ? 'bg-orange-100 text-orange-600' : 
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {selectedTicket.urgency}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Categoria Atual</label>
                  <p className="text-sm font-semibold truncate">{selectedTicket.category_name || 'Não classificado'}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Descrição</label>
                  <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100 break-all min-h-[60px]">{selectedTicket.description}</div>
                </div>
                {selectedTicket.hold_justification && (
                  <div>
                    <label className="text-[10px] font-bold text-orange-400 uppercase">Justificativa de Espera</label>
                    <p className="text-sm text-orange-700 bg-orange-50 p-3 rounded-xl border border-orange-100 italic break-all">{selectedTicket.hold_justification}</p>
                  </div>
                )}
                {selectedTicket.reopening_reason && (
                  <div>
                    <label className="text-[10px] font-bold text-red-400 uppercase flex items-center gap-1">
                      <RotateCcw className="w-3 h-3" /> Motivo da Reabertura
                    </label>
                    <p className="text-sm text-red-700 bg-red-50 p-3 rounded-xl border border-red-100 italic break-all">{selectedTicket.reopening_reason}</p>
                  </div>
                )}
              </div>

              <div className="mb-8">
                <TicketHistoryList ticketId={selectedTicket.id} />
              </div>

              {selectedTicket.status !== 'finished' && (
                <div className="space-y-3">
                  <div className="pb-4 border-b border-gray-100">
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Classificação (Categoria)</label>
                    <select 
                      value={classification}
                      onChange={(e) => setClassification(e.target.value)}
                      className="w-full p-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option value="">Manter atual...</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl">
                      {error}
                    </div>
                  )}

                  {selectedTicket.status === 'pending' && (
                    <button 
                      onClick={() => handleAction(selectedTicket.id, 'in_progress')}
                      disabled={loading}
                      className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
                    >
                      <UserPlus className="w-5 h-5" /> Assumir Chamado
                    </button>
                  )}

                  {selectedTicket.status === 'in_progress' && (
                    <>
                      <button 
                        onClick={() => handleAction(selectedTicket.id, 'resolved')}
                        disabled={loading}
                        className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                      >
                        <CheckCircle2 className="w-5 h-5" /> Marcar como Resolvido
                      </button>
                      
                      <div className="pt-4 border-t border-gray-100">
                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Pausar Atendimento</label>
                        <textarea 
                          value={justification}
                          onChange={(e) => setJustification(e.target.value)}
                          placeholder="Justificativa técnica..."
                          className="w-full p-3 text-sm border border-gray-200 rounded-xl mb-2 focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                        />
                        <button 
                          onClick={() => handleAction(selectedTicket.id, 'on_hold')}
                          disabled={loading || !justification}
                          className="w-full bg-orange-50 text-orange-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-orange-100 transition-all"
                        >
                          <PauseCircle className="w-5 h-5" /> Colocar em Espera
                        </button>
                      </div>
                    </>
                  )}

                  {selectedTicket.status === 'resolved' && (
                    <button 
                      onClick={() => handleAction(selectedTicket.id, 'finished', { comment: 'Encerramento Administrativo' })}
                      disabled={loading}
                      className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
                    >
                      <CheckCircle2 className="w-5 h-5" /> Encerrar Definitivamente
                    </button>
                  )}

                  {selectedTicket.status === 'on_hold' && (
                    <button 
                      onClick={() => handleAction(selectedTicket.id, 'in_progress')}
                      disabled={loading}
                      className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                    >
                      <AlertCircle className="w-5 h-5" /> Retomar Atendimento
                    </button>
                  )}
                  
                  {selectedTicket.status !== 'pending' && selectedTicket.technician_id !== user.id && (
                    <button 
                      onClick={() => handleAction(selectedTicket.id, 'in_progress')}
                      disabled={loading}
                      className="w-full bg-purple-50 text-purple-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-purple-100 transition-all border border-purple-100"
                    >
                      <UserPlus className="w-5 h-5" /> Assumir de {selectedTicket.technician_name}
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-300 flex flex-col items-center justify-center text-center">
              <div className="bg-gray-50 p-4 rounded-full mb-4">
                <ExternalLink className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="font-bold text-gray-400">Selecione um chamado</h3>
              <p className="text-sm text-gray-400">Clique em um item da lista para ver detalhes e agir.</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <TicketModal 
          user={user}
          categories={categories}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            onUpdate();
          }}
        />
      )}
    </div>
  );
}
