import { useState, useEffect, useCallback, useRef } from 'react';
import { Ticket, User } from '../../types';
import { BarChart3, PieChart as PieChartIcon, TrendingUp, CheckCircle2, Calendar, Filter, Clock, AlertCircle, FileDown, LayoutGrid, List } from 'lucide-react';
import { motion } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Stats {
  bySector: { sector: string; count: number }[];
  byCategory: { category: string; count: number }[];
  byStatus: { status: string; count: number }[];
  counts: {
    pending: number;
    in_progress: number;
    on_hold: number;
    resolved: number;
    finished: number;
  };
  byTechnician: { technician: string; count: number }[];
  total: number;
}

interface ReportsProps {
  stats: Stats | null;
  tickets: Ticket[];
  user: User;
}

const COLORS = ['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1'];

export default function Reports({ stats: initialStats, tickets, user }: ReportsProps) {
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [filteredStats, setFilteredStats] = useState<Stats | null>(initialStats);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Chart toggles
  const [sectorView, setSectorView] = useState<'bar' | 'pie'>('bar');
  const [categoryView, setCategoryView] = useState<'bar' | 'pie'>('pie');
  const [techView, setTechView] = useState<'bar' | 'list'>('list');

  // Refs for PDF capture
  const sectorRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
  const techRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  const handleExportPDF = async () => {
    if (!filteredStats) return;
    setExporting(true);
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      
      const addHeaderFooter = (p: jsPDF, pageNum: number, totalPages: number) => {
        // Header
        p.setFontSize(10);
        p.setTextColor(150, 150, 150);
        p.text('Helpdesk IT - Relatório de Performance', 20, 15);
        p.text(new Date().toLocaleDateString(), pageWidth - 40, 15);
        p.line(20, 18, pageWidth - 20, 18);
        
        // Footer
        p.line(20, pageHeight - 15, pageWidth - 20, pageHeight - 15);
        p.text(`Página ${pageNum} de ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      };

      // 1. Cover Page
      pdf.setFillColor(15, 23, 42); // Slate 900
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(28);
      pdf.text('Relatório de Performance', pageWidth / 2, 100, { align: 'center' });
      pdf.setFontSize(22);
      pdf.text('Helpdesk IT', pageWidth / 2, 115, { align: 'center' });
      
      pdf.setFontSize(14);
      pdf.text(`Emitido por: ${user.name}`, pageWidth / 2, 160, { align: 'center' });
      pdf.text(`Período: ${startDate} até ${endDate}`, pageWidth / 2, 170, { align: 'center' });
      pdf.text(`Data de Emissão: ${new Date().toLocaleString()}`, pageWidth / 2, 180, { align: 'center' });
      
      // 2. Summary Page
      pdf.addPage();
      addHeaderFooter(pdf, 2, 5);
      pdf.setTextColor(15, 23, 42);
      pdf.setFontSize(18);
      pdf.text('Resumo Geral', margin, 40);
      
      if (summaryRef.current) {
        const canvas = await html2canvas(summaryRef.current, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const imgHeight = (canvas.height * contentWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', margin, 50, contentWidth, imgHeight);
      }
      
      // 3. Sector Page
      pdf.addPage();
      addHeaderFooter(pdf, 3, 5);
      pdf.text('Distribuição por Setor', margin, 40);
      if (sectorRef.current) {
        const canvas = await html2canvas(sectorRef.current, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const imgHeight = (canvas.height * contentWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', margin, 50, contentWidth, imgHeight);
      }
      
      // 4. Category Page
      pdf.addPage();
      addHeaderFooter(pdf, 4, 5);
      pdf.text('Distribuição por Categoria', margin, 40);
      if (categoryRef.current) {
        const canvas = await html2canvas(categoryRef.current, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const imgHeight = (canvas.height * contentWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', margin, 50, contentWidth, imgHeight);
      }
      
      // 5. Technician Page
      pdf.addPage();
      addHeaderFooter(pdf, 5, 5);
      pdf.text('Performance por Técnico', margin, 40);
      if (techRef.current) {
        const canvas = await html2canvas(techRef.current, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const imgHeight = (canvas.height * contentWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', margin, 50, contentWidth, imgHeight);
      }
      
      pdf.save(`Relatorio_Helpdesk_${startDate}_${endDate}.pdf`);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
    } finally {
      setExporting(false);
    }
  };

  const fetchFilteredStats = useCallback(async () => {
    // Only show loading if we don't have data yet to prevent flashing
    if (!filteredStats) setLoading(true);
    
    try {
      const response = await fetch(`/api/stats?startDate=${startDate}&endDate=${endDate}`);
      if (!response.ok) throw new Error('Erro na resposta do servidor');
      const data = await response.json();
      setFilteredStats(data);
    } catch (err) {
      console.error('Erro ao buscar estatísticas filtradas:', err);
      if (!filteredStats) {
        setFilteredStats({
          bySector: [],
          byCategory: [],
          byStatus: [],
          counts: { pending: 0, in_progress: 0, on_hold: 0, resolved: 0, finished: 0 },
          byTechnician: [],
          total: 0
        });
      }
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]); // Only recreate if dates change

  useEffect(() => {
    fetchFilteredStats();
  }, [fetchFilteredStats]);

  const getStatusCount = (status: string | string[]) => {
    if (!filteredStats) return 0;
    if (Array.isArray(status)) {
      return status.reduce((acc, s) => acc + ((filteredStats.counts as any)[s] || 0), 0);
    }
    return (filteredStats.counts as any)[status] || 0;
  };
  // Stable container to prevent layout shift
  return (
    <div className="space-y-8 min-h-[600px]">
      {/* Date Filter Bar */}
      <div className="bg-white p-4 md:p-6 rounded-2xl border border-black/5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4 w-full lg:w-auto">
          <div className="flex items-center gap-2 shrink-0">
            <Calendar className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-bold text-gray-600 uppercase tracking-tight">Período:</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full md:w-36 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
            <span className="text-gray-400 shrink-0 hidden sm:inline">até</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full md:w-36 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          <button 
            onClick={fetchFilteredStats}
            disabled={loading}
            className="w-full md:w-auto bg-gray-900 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-all disabled:opacity-50"
          >
            <Filter className="w-4 h-4" />
            {loading ? 'Filtrando...' : 'Filtrar'}
          </button>
        </div>

        <button 
          onClick={handleExportPDF}
          disabled={exporting || loading || !filteredStats}
          className="w-full lg:w-auto bg-emerald-600 text-white px-6 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-lg shadow-emerald-600/20"
        >
          {exporting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Gerando Relatório...
            </>
          ) : (
            <>
              <FileDown className="w-4 h-4" />
              Exportar PDF
            </>
          )}
        </button>
      </div>

      {loading && !filteredStats ? (
        <div className="flex items-center justify-center h-64 text-gray-400 font-bold uppercase tracking-widest animate-pulse">
          Carregando indicadores...
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div ref={summaryRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gray-50 rounded-lg text-gray-600">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total no Período</span>
              </div>
              <p className="text-4xl font-light text-gray-900">{filteredStats?.total || 0}</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">A Iniciar</span>
              </div>
              <p className="text-4xl font-light text-amber-600">{getStatusCount('pending')}</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Em Andamento</span>
              </div>
              <p className="text-4xl font-light text-blue-600">{getStatusCount(['in_progress', 'on_hold'])}</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Finalizados</span>
              </div>
              <p className="text-4xl font-light text-emerald-600">{getStatusCount('finished')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Sector Chart */}
            <div ref={sectorRef} className="bg-white p-8 rounded-2xl border border-black/5 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-gray-400" />
                  Setores Atendidos
                </h3>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                  <button 
                    onClick={() => setSectorView('bar')}
                    className={`p-1.5 rounded-md transition-all ${sectorView === 'bar' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <BarChart3 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setSectorView('pie')}
                    className={`p-1.5 rounded-md transition-all ${sectorView === 'pie' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <PieChartIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="h-[300px] w-full">
                {filteredStats?.bySector.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-400 italic">Nenhum dado disponível.</div>
                ) : sectorView === 'bar' ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={filteredStats?.bySector}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="sector" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        cursor={{ fill: '#f8fafc' }}
                      />
                      <Bar dataKey="count" fill="#0f172a" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={filteredStats?.bySector}
                        dataKey="count"
                        nameKey="sector"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                      >
                        {filteredStats?.bySector.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Technician Performance */}
            <div ref={techRef} className="bg-white p-8 rounded-2xl border border-black/5 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  Performance por Técnico
                </h3>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                  <button 
                    onClick={() => setTechView('list')}
                    className={`p-1.5 rounded-md transition-all ${techView === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setTechView('bar')}
                    className={`p-1.5 rounded-md transition-all ${techView === 'bar' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <BarChart3 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="h-[300px] w-full overflow-y-auto custom-scrollbar">
                {filteredStats?.byTechnician && filteredStats.byTechnician.length > 0 ? (
                  techView === 'list' ? (
                    <div className="space-y-4">
                      {filteredStats.byTechnician.map((t, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs">
                              {t.technician.charAt(0)}
                            </div>
                            <span className="text-sm font-bold text-gray-700">{t.technician}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-emerald-600 block">
                              {t.count} finalizados
                            </span>
                            <span className="text-[10px] text-gray-400 uppercase font-bold">Produtividade</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={filteredStats?.byTechnician} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis dataKey="technician" type="category" fontSize={12} tickLine={false} axisLine={false} width={100} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  )
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 italic">Nenhum chamado finalizado.</div>
                )}
              </div>
            </div>
          </div>

          {/* Category Chart */}
          <div ref={categoryRef} className="bg-white p-8 rounded-2xl border border-black/5 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-bold text-gray-700 flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-gray-400" />
                Distribuição por Categoria
              </h3>
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button 
                  onClick={() => setCategoryView('pie')}
                  className={`p-1.5 rounded-md transition-all ${categoryView === 'pie' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <PieChartIcon className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setCategoryView('bar')}
                  className={`p-1.5 rounded-md transition-all ${categoryView === 'bar' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="h-[350px] w-full">
              {categoryView === 'pie' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={filteredStats?.byCategory}
                      dataKey="count"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={5}
                    >
                      {filteredStats?.byCategory.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {filteredStats?.byCategory.map((c, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">{c.category}</span>
                      <span className="text-sm font-bold bg-white px-3 py-1 rounded-lg border border-gray-100 shadow-sm">{c.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
