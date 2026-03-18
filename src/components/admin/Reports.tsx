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
  avgServiceTime: number | null;
}

interface ReportsProps {
  stats: Stats | null;
  tickets: Ticket[];
  user: User;
}

const COLORS = ['#f15a22', '#336699', '#414042', '#ffe6cb', '#f47b4e', '#5c85ad'];

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

  // Configurable letterhead path
  const LETTERHEAD_PATH = '/Timbrado.jpg'; // Using .jpg for better compatibility with jsPDF

  const handleExportPDF = async () => {
    if (!filteredStats) return;
    setExporting(true);
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Colors from requirements
      const colorBlue = [51, 102, 153]; // #336699
      const colorGray = [65, 64, 66]; // #414042
      
      // Margins to respect the letterhead header and footer
      const marginTop = 50; 
      const marginBottom = 40;
      const marginLeft = 25;
      const marginRight = 25;
      const contentWidth = pageWidth - marginLeft - marginRight;
      
      const addLetterhead = async (p: jsPDF) => {
        try {
          // Add the background image (letterhead)
          // Using .jpg as it's more compatible with jspdf addImage
          p.addImage(LETTERHEAD_PATH, 'JPEG', 0, 0, pageWidth, pageHeight);
        } catch (e) {
          console.error("Could not load letterhead image", e);
          // Fallback: draw a simple border or just continue
        }
      };

      const addFooter = (p: jsPDF) => {
        p.setFontSize(8);
        p.setTextColor(colorGray[0], colorGray[1], colorGray[2]);
        p.setFont('helvetica', 'normal');
        p.text('Rua Barão do Rio Branco, 20, Centro', pageWidth / 2, pageHeight - 15, { align: 'center' });
      };

      const cleanupOklab = (clonedDoc: Document) => {
        const elements = clonedDoc.getElementsByTagName('*');
        
        // Helper to convert oklch/oklab to rgb (simplified fallback)
        const convertColor = (val: string) => {
          if (!val) return val;
          const lowerVal = val.toLowerCase();
          if (lowerVal.includes('oklab') || lowerVal.includes('oklch')) {
            // Very simplified conversion: if it's brand orange, use hex
            // Tailwind v4 oklch values for orange/blue
            if (lowerVal.includes('0.627 0.194 31.01') || lowerVal.includes('0.627 0.194 31')) return '#f15a22';
            if (lowerVal.includes('0.45 0.05 250')) return '#336699';
            if (lowerVal.includes('0.967 0.001 286.375')) return '#f8fafc'; // slate-50
            if (lowerVal.includes('0.922 0.011 290.588')) return '#f1f5f9'; // slate-100
            if (lowerVal.includes('0.869 0.022 292.24')) return '#e2e8f0'; // slate-200
            return '#414042'; // Default gray for everything else
          }
          return val;
        };

        for (let i = 0; i < elements.length; i++) {
          const el = elements[i] as HTMLElement;
          
          // Force remove any oklch/oklab classes from tailwind
          const classes = Array.from(el.classList);
          classes.forEach(cls => {
            if (cls.includes('oklch') || cls.includes('oklab')) {
              el.classList.remove(cls);
            }
          });

          // Also check for inline styles and computed styles
          const style = el.style;
          ['backgroundColor', 'color', 'borderColor', 'outlineColor', 'fill', 'stroke'].forEach(prop => {
            const val = (style as any)[prop];
            if (val && (val.toLowerCase().includes('oklab') || val.toLowerCase().includes('oklch'))) {
              el.style[prop as any] = convertColor(val);
            }
          });

          // Check computed style for any oklch/oklab and override it
          const computedStyle = window.getComputedStyle(el);
          ['backgroundColor', 'color', 'borderColor', 'outlineColor', 'fill', 'stroke'].forEach(prop => {
            const val = (computedStyle as any)[prop];
            if (val && (val.toLowerCase().includes('oklab') || val.toLowerCase().includes('oklch'))) {
              el.style[prop as any] = convertColor(val);
            }
          });

          // Also check for tailwind-style variables if any
          for (let j = 0; j < computedStyle.length; j++) {
            const key = computedStyle[j];
            if (key.startsWith('--')) {
              const val = computedStyle.getPropertyValue(key);
              if (val.toLowerCase().includes('oklab') || val.toLowerCase().includes('oklch')) {
                el.style.setProperty(key, convertColor(val));
              }
            }
          }
        }
      };

      const html2canvasOptions = {
        scale: 2, 
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc: Document) => cleanupOklab(clonedDoc),
        ignoreElements: (element: Element) => {
          // Ignore complex icons or elements that might cause issues
          return element.classList.contains('lucide') || 
                 element.tagName.toLowerCase() === 'svg' && !element.closest('.recharts-wrapper');
        }
      };

      // 1. Summary Page
      await addLetterhead(pdf);
      
      // Title
      pdf.setFontSize(20);
      pdf.setTextColor(colorBlue[0], colorBlue[1], colorBlue[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.text('INDICADORES DE DESEMPENHO - HELPDESK', pageWidth / 2, marginTop - 15, { align: 'center' });
      
      // Period
      pdf.setFontSize(11);
      pdf.setTextColor(colorGray[0], colorGray[1], colorGray[2]);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Período: ${new Date(startDate).toLocaleDateString('pt-BR')} até ${new Date(endDate).toLocaleDateString('pt-BR')}`, marginLeft, marginTop - 5);
      
      // Summary Cards
      if (summaryRef.current) {
        const canvas = await html2canvas(summaryRef.current, html2canvasOptions);
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = contentWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', marginLeft, marginTop, imgWidth, imgHeight);
        
        let currentY = marginTop + imgHeight + 20;

        // Sector Chart (on same page if fits, else new page)
        if (sectorRef.current) {
          const sectorCanvas = await html2canvas(sectorRef.current, html2canvasOptions);
          const sectorImg = sectorCanvas.toDataURL('image/png');
          const sectorHeight = (sectorCanvas.height * contentWidth) / sectorCanvas.width;
          
          if (currentY + sectorHeight > pageHeight - marginBottom) {
            pdf.addPage();
            await addLetterhead(pdf);
            addFooter(pdf);
            currentY = marginTop;
          }

          pdf.setFontSize(14);
          pdf.setTextColor(colorBlue[0], colorBlue[1], colorBlue[2]);
          pdf.setFont('helvetica', 'bold');
          pdf.text('Setores Atendidos', marginLeft, currentY - 5);
          
          pdf.addImage(sectorImg, 'PNG', marginLeft, currentY, contentWidth, sectorHeight);
          currentY += sectorHeight + 20;
        }

        // Technician Performance
        if (techRef.current) {
          const techCanvas = await html2canvas(techRef.current, html2canvasOptions);
          const techImg = techCanvas.toDataURL('image/png');
          const techHeight = (techCanvas.height * contentWidth) / techCanvas.width;

          if (currentY + techHeight > pageHeight - marginBottom) {
            pdf.addPage();
            await addLetterhead(pdf);
            addFooter(pdf);
            currentY = marginTop;
          }

          pdf.setFontSize(14);
          pdf.setTextColor(colorBlue[0], colorBlue[1], colorBlue[2]);
          pdf.setFont('helvetica', 'bold');
          pdf.text('Performance por Técnico', marginLeft, currentY - 5);
          
          pdf.addImage(techImg, 'PNG', marginLeft, currentY, contentWidth, techHeight);
        }
      }

      addFooter(pdf);

      const dateStr = new Date().toLocaleDateString('pt-BR').replace(/\//g, '_');
      pdf.save(`Relatorio_Helpdesk_SantaCasa_${dateStr}.pdf`);
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
          total: 0,
          avgServiceTime: null
        });
      }
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, filteredStats]); // Only recreate if dates change

  const formatAvgTime = (seconds: number | null) => {
    if (seconds === null) return '---';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

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
      <div className="bg-white p-4 md:p-6 rounded-2xl border border-[#eeeeee] shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4 w-full lg:w-auto">
          <div className="flex items-center gap-2 shrink-0">
            <Calendar className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-bold text-gray-600 uppercase tracking-tight">Período:</span>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full sm:flex-1 md:w-40 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-orange outline-none"
            />
            <span className="text-gray-400 shrink-0 text-center hidden sm:inline">até</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full sm:flex-1 md:w-40 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-orange outline-none"
            />
          </div>
          <button 
            onClick={fetchFilteredStats}
            disabled={loading}
            className="w-full md:w-auto bg-brand-blue text-white px-6 py-3 md:py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#2e5c8a] transition-all disabled:opacity-50"
          >
            <Filter className="w-4 h-4" />
            {loading ? 'Filtrando...' : 'Filtrar'}
          </button>
        </div>

        <button 
          onClick={handleExportPDF}
          disabled={exporting || loading || !filteredStats}
          className="w-full lg:w-auto bg-brand-orange text-white px-6 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#d9511f] transition-all disabled:opacity-50 shadow-md"
        >
          {exporting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
          <div ref={summaryRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-[#eeeeee] shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-[#f9fafb] rounded-lg text-[#414042]">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total no Período</span>
              </div>
              <p className="text-4xl font-light text-gray-900">{filteredStats?.total || 0}</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#eeeeee] shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-[#fffbeb] rounded-lg text-[#d97706]">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">A Iniciar</span>
              </div>
              <p className="text-4xl font-light text-[#d97706]">{getStatusCount('pending')}</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#eeeeee] shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-[#eff6ff] rounded-lg text-[#2563eb]">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Em Andamento</span>
              </div>
              <p className="text-4xl font-light text-[#2563eb]">{getStatusCount(['in_progress', 'on_hold'])}</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#eeeeee] shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-[#fef2ee] rounded-lg text-[#f15a22]">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Finalizados</span>
              </div>
              <p className="text-4xl font-light text-[#f15a22]">{getStatusCount('finished')}</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#eeeeee] shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-[#ebf0f5] rounded-lg text-[#336699]">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tempo Médio</span>
              </div>
              <p className="text-4xl font-light text-[#336699]">{formatAvgTime(filteredStats?.avgServiceTime || null)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Sector Chart */}
            <div ref={sectorRef} className="bg-white p-8 rounded-2xl border border-[#eeeeee] shadow-sm">
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
                  <ResponsiveContainer width={exporting ? 800 : "100%"} height="100%">
                    <BarChart data={filteredStats?.bySector}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="sector" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                        cursor={{ fill: '#f8fafc' }}
                      />
                      <Bar dataKey="count" fill="#336699" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width={exporting ? 800 : "100%"} height="100%">
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
            <div ref={techRef} className="bg-white p-8 rounded-2xl border border-[#eeeeee] shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-brand-orange" />
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
                            <div className="w-8 h-8 rounded-full bg-[#fef2ee] text-[#f15a22] flex items-center justify-center font-bold text-xs">
                              {t.technician.charAt(0)}
                            </div>
                            <span className="text-sm font-bold text-gray-700">{t.technician}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-[#f15a22] block">
                              {t.count} finalizados
                            </span>
                            <span className="text-[10px] text-gray-400 uppercase font-bold">Produtividade</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <ResponsiveContainer width={exporting ? 800 : "100%"} height="100%">
                      <BarChart data={filteredStats?.byTechnician} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis dataKey="technician" type="category" fontSize={12} tickLine={false} axisLine={false} width={100} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                        />
                        <Bar dataKey="count" fill="#f15a22" radius={[0, 4, 4, 0]} barSize={20} />
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
          <div ref={categoryRef} className="bg-white p-8 rounded-2xl border border-[#eeeeee] shadow-sm">
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
                <ResponsiveContainer width={exporting ? 800 : "100%"} height="100%">
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
