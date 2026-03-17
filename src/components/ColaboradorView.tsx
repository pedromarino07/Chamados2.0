import { useState } from 'react';
import { User, Ticket, Category } from '../types';
import { Plus, Clock, CheckCircle2, AlertCircle, PauseCircle } from 'lucide-react';
import TicketModal from './TicketModal';

interface ColaboradorViewProps {
  user: User;
  tickets: Ticket[];
  categories: Category[];
  onUpdate: () => void;
  onSearch: (term: string) => void;
}

export default function ColaboradorView({ user, tickets, categories, onUpdate, onSearch }: ColaboradorViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [activeTab, setActiveTab] = useState<'status' | 'history'>('status');
  const [localSearch, setLocalSearch] = useState('');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-md text-xs font-bold uppercase"><Clock className="w-3 h-3"/> Pendente</span>;
      case 'in_progress':
        return <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-md text-xs font-bold uppercase"><AlertCircle className="w-3 h-3"/> Em Andamento</span>;
      case 'on_hold':
        return <span className="flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded-md text-xs font-bold uppercase"><PauseCircle className="w-3 h-3"/> Em Espera</span>;
      case 'finished':
        return <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-xs font-bold uppercase"><CheckCircle2 className="w-3 h-3"/> Finalizado</span>;
      case 'resolved':
        return <span className="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md text-xs font-bold uppercase"><CheckCircle2 className="w-3 h-3"/> Resolvido</span>;
      default:
        return null;
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (activeTab === 'status') return t.status !== 'finished';
    return t.status === 'finished';
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Meus Chamados</h2>
          <p className="text-gray-500 italic serif">Setor: {user.sector} | Ramal: {user.extension}</p>
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
            <Clock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
          <button 
            onClick={() => {
              setSelectedTicket(null);
              setIsModalOpen(true);
            }}
            className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
          >
            <Plus className="w-5 h-5" />
            Abrir Novo Chamado
          </button>
        </div>
      </header>

      <div className="flex border-b border-gray-200 overflow-x-auto custom-scrollbar">
        <button 
          onClick={() => setActiveTab('status')}
          className={`px-6 py-3 font-bold text-sm uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${activeTab === 'status' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          Status (Ativos)
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`px-6 py-3 font-bold text-sm uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${activeTab === 'history' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          Meu Histórico
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total de Chamados</p>
          <p className="text-4xl font-light">{tickets.length}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Em Aberto</p>
          <p className="text-4xl font-light text-amber-600">{tickets.filter(t => t.status !== 'finished').length}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Finalizados</p>
          <p className="text-4xl font-light text-emerald-600">{tickets.filter(t => t.status === 'finished').length}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
        <div className="hidden md:block overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-bottom border-gray-100">
                <th className="p-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">ID</th>
                <th className="p-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Urgência</th>
                <th className="p-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Descrição</th>
                <th className="p-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="p-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Técnico</th>
                <th className="p-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400 italic">Nenhum chamado encontrado nesta aba.</td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => (
                  <tr 
                    key={ticket.id} 
                    onClick={() => {
                      setSelectedTicket(ticket);
                      setIsModalOpen(true);
                    }}
                    className="hover:bg-gray-50 transition-colors cursor-pointer group"
                  >
                    <td className="p-4 font-mono text-xs text-gray-400">#{ticket.id}</td>
                    <td className="p-4">
                      <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${
                        ticket.urgency === 'alta' ? 'bg-red-100 text-red-600' : 
                        ticket.urgency === 'media' ? 'bg-orange-100 text-orange-600' : 
                        'bg-blue-100 text-blue-600'
                      }`}>
                        {ticket.urgency}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-600 max-w-xs truncate">{ticket.description}</td>
                    <td className="p-4">{getStatusBadge(ticket.status)}</td>
                    <td className="p-4 text-sm text-gray-500">{ticket.technician_name || 'Aguardando...'}</td>
                    <td className="p-4 text-xs text-gray-400">{new Date(ticket.created_at).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-100">
          {filteredTickets.length === 0 ? (
            <div className="p-12 text-center text-gray-400 italic">Nenhum chamado encontrado nesta aba.</div>
          ) : (
            filteredTickets.map((ticket) => (
              <div 
                key={ticket.id} 
                onClick={() => {
                  setSelectedTicket(ticket);
                  setIsModalOpen(true);
                }}
                className="p-4 space-y-3 active:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <span className="font-mono text-[10px] text-gray-400">#{ticket.id}</span>
                  {getStatusBadge(ticket.status)}
                </div>
                <div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${
                    ticket.urgency === 'alta' ? 'bg-red-100 text-red-600' : 
                    ticket.urgency === 'media' ? 'bg-orange-100 text-orange-600' : 
                    'bg-blue-100 text-blue-600'
                  }`}>
                    Urgência: {ticket.urgency}
                  </span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2 break-all">{ticket.description}</p>
                <div className="flex justify-between items-center text-[10px] text-gray-400">
                  <span>Técnico: {ticket.technician_name || 'Aguardando...'}</span>
                  <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {isModalOpen && (
        <TicketModal 
          user={user} 
          categories={categories} 
          ticket={selectedTicket}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedTicket(null);
          }} 
          onSuccess={() => {
            setIsModalOpen(false);
            setSelectedTicket(null);
            onUpdate();
          }} 
        />
      )}
    </div>
  );
}
