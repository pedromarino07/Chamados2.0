import { Ticket } from '../../types';
import { BarChart3, PieChart, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';

interface ReportsProps {
  stats: {
    bySector: { sector: string; count: number }[];
    byCategory: { category: string; count: number }[];
    byStatus: { status: string; count: number }[];
  } | null;
  tickets: Ticket[];
}

export default function Reports({ stats, tickets }: ReportsProps) {
  if (!stats) return null;

  const totalTickets = tickets.length;

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-2xl border border-black/5 shadow-sm text-center">
          <TrendingUp className="w-8 h-8 text-emerald-500 mx-auto mb-4" />
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total de Chamados</p>
          <p className="text-5xl font-light text-gray-900">{totalTickets}</p>
        </div>
        <div className="bg-white p-8 rounded-2xl border border-black/5 shadow-sm text-center">
          <BarChart3 className="w-8 h-8 text-blue-500 mx-auto mb-4" />
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Setores Atendidos</p>
          <p className="text-5xl font-light text-gray-900">{stats.bySector.length}</p>
        </div>
        <div className="bg-white p-8 rounded-2xl border border-black/5 shadow-sm text-center">
          <PieChart className="w-8 h-8 text-purple-500 mx-auto mb-4" />
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Categorias Ativas</p>
          <p className="text-5xl font-light text-gray-900">{stats.byCategory.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sector Chart */}
        <div className="bg-white p-8 rounded-2xl border border-black/5 shadow-sm">
          <h3 className="font-bold text-gray-700 mb-8 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-gray-400" />
            Chamados por Setor
          </h3>
          <div className="space-y-6">
            {stats.bySector.map((s, idx) => (
              <div key={idx}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-gray-600">{s.sector}</span>
                  <span className="font-bold text-gray-900">{s.count} chamados</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(s.count / totalTickets) * 100}%` }}
                    className="bg-emerald-500 h-3 rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Chart */}
        <div className="bg-white p-8 rounded-2xl border border-black/5 shadow-sm">
          <h3 className="font-bold text-gray-700 mb-8 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-gray-400" />
            Chamados por Categoria
          </h3>
          <div className="space-y-6">
            {stats.byCategory.map((c, idx) => (
              <div key={idx}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-gray-600">{c.category}</span>
                  <span className="font-bold text-gray-900">{c.count} chamados</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(c.count / totalTickets) * 100}%` }}
                    className="bg-blue-500 h-3 rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="bg-white p-8 rounded-2xl border border-black/5 shadow-sm">
        <h3 className="font-bold text-gray-700 mb-8">Distribuição por Status</h3>
        <div className="flex flex-wrap gap-8">
          {stats.byStatus.map((s, idx) => (
            <div key={idx} className="flex-1 min-w-[150px] p-6 rounded-2xl bg-gray-50 border border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{s.status}</p>
              <p className="text-3xl font-bold text-gray-900">{s.count}</p>
              <p className="text-xs text-gray-500 mt-1">{((s.count / totalTickets) * 100).toFixed(1)}% do total</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
