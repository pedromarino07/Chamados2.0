import { useState, useEffect } from 'react';
import { TicketHistory, TicketStatus } from '../types';
import { Clock, ArrowRight, User, MessageSquare } from 'lucide-react';

interface TicketHistoryListProps {
  ticketId: number;
}

export default function TicketHistoryList({ ticketId }: TicketHistoryListProps) {
  const [history, setHistory] = useState<TicketHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/tickets/${ticketId}/history`)
      .then(res => res.json())
      .then(data => setHistory(data))
      .finally(() => setLoading(false));
  }, [ticketId]);

  const getStatusLabel = (status: TicketStatus | null) => {
    if (!status) return '---';
    switch (status) {
      case 'pending': return 'Pendente';
      case 'in_progress': return 'Em Andamento';
      case 'on_hold': return 'Em Espera';
      case 'resolved': return 'Resolvido';
      case 'finished': return 'Finalizado';
      default: return status;
    }
  };

  const getStatusColor = (status: TicketStatus | null) => {
    if (!status) return 'text-gray-400';
    switch (status) {
      case 'pending': return 'text-amber-600';
      case 'in_progress': return 'text-blue-600';
      case 'on_hold': return 'text-orange-600';
      case 'resolved': return 'text-indigo-600';
      case 'finished': return 'text-emerald-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) return <div className="py-4 text-center text-xs text-gray-400 animate-pulse uppercase font-bold tracking-widest">Carregando histórico...</div>;

  return (
    <div className="space-y-4">
      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Histórico de Movimentações</h4>
      <div className="relative space-y-6 before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-gray-200 before:via-gray-100 before:to-transparent">
        {history.length === 0 ? (
          <p className="text-xs text-gray-400 italic pl-8">Nenhuma movimentação registrada.</p>
        ) : (
          history.map((item) => (
            <div key={item.id} className="relative flex items-start group pl-8">
              <div className="absolute left-0 mt-1.5 w-5 h-5 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center group-hover:border-emerald-500 transition-colors z-10">
                <Clock className="w-2.5 h-2.5 text-gray-400 group-hover:text-emerald-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`font-bold ${getStatusColor(item.old_status)}`}>{getStatusLabel(item.old_status)}</span>
                    <ArrowRight className="w-3 h-3 text-gray-300" />
                    <span className={`font-bold ${getStatusColor(item.new_status)}`}>{getStatusLabel(item.new_status)}</span>
                  </div>
                  <span className="text-[10px] text-gray-400">{new Date(item.timestamp).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-1">
                  <User className="w-3 h-3" />
                  <span className="font-medium">{item.changed_by_name}</span>
                </div>
                {item.comment && (
                  <div className="bg-gray-50 p-2 rounded-lg border border-gray-100 flex gap-2 items-start">
                    <MessageSquare className="w-3 h-3 text-gray-400 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-gray-600 italic leading-relaxed">{item.comment}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
