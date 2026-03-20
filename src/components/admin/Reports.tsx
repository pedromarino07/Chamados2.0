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

const COLORS = [
  '#f15a22', // Brand Orange
  '#336699', // Brand Blue
  '#414042', // Dark Gray
  '#059669', // Emerald
  '#7c3aed', // Violet
  '#db2777', // Pink
  '#ea580c', // Orange-600
  '#2563eb', // Blue-600
  '#16a34a', // Green-600
  '#9333ea', // Purple-600
];

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
      // Landscape mode (Requirement 1)
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth(); // 297mm
      const pageHeight = pdf.internal.pageSize.getHeight(); // 210mm
      
      // Colors from requirements
      const colorBlue = [51, 102, 153]; // #336699
      const colorGray = [65, 64, 66]; // #414042
      
      // Margins for landscape
      const marginTop = 35; 
      const marginBottom = 15;
      const marginLeft = 15;
      const marginRight = 15;
      const contentWidth = pageWidth - marginLeft - marginRight;
      
      const addLetterhead = async (p: jsPDF, logoWidth: number = 40) => {
        try {
          // Add the logo with configurable width (Requirement 4)
          // Height is calculated assuming a roughly 3:1 aspect ratio for the logo
          const logoHeight = logoWidth * 0.375; 
          p.addImage(LETTERHEAD_PATH, 'JPEG', marginLeft, 10, logoWidth, logoHeight);
        } catch (e) {
          console.error("Could not load letterhead image", e);
        }
      };

      const addFooter = (p: jsPDF) => {
        p.setFontSize(8);
        p.setTextColor(colorGray[0], colorGray[1], colorGray[2]);
        p.setFont('helvetica', 'normal');
        // Simplified footer with only date (Requirement 3)
        const dateStr = new Date().toLocaleString('pt-BR');
        p.text(`Relatório gerado em: ${dateStr}`, pageWidth - marginRight, pageHeight - 10, { align: 'right' });
      };

      const cleanupOklab = (clonedDoc: Document) => {
        const elements = clonedDoc.getElementsByTagName('*');
        
        const convertColor = (val: string) => {
          if (!val) return val;
          const lowerVal = val.toLowerCase();
          if (lowerVal.includes('oklab') || lowerVal.includes('oklch')) {
            if (lowerVal.includes('0.627 0.194 31.01') || lowerVal.includes('0.627 0.194 31')) return '#f15a22';
            if (lowerVal.includes('0.45 0.05 250')) return '#336699';
            if (lowerVal.includes('0.967 0.001 286.375')) return '#f8fafc';
            if (lowerVal.includes('0.922 0.011 290.588')) return '#f1f5f9';
            if (lowerVal.includes('0.869 0.022 292.24')) return '#e2e8f0';
            return '#414042';
          }
          return val;
        };

        // Force 5 columns for summary cards in PDF regardless of screen size
        const summaryContainer = clonedDoc.querySelector('[data-pdf-section="summary"]');
        if (summaryContainer) {
          (summaryContainer as HTMLElement).style.display = 'grid';
          (summaryContainer as HTMLElement).style.gridTemplateColumns = 'repeat(5, minmax(0, 1fr))';
          (summaryContainer as HTMLElement).style.gap = '12px';
          (summaryContainer as HTMLElement).style.width = '1000px';
        }

        for (let i = 0; i < elements.length; i++) {
          const el = elements[i] as HTMLElement;
          
          const classes = Array.from(el.classList);
          classes.forEach(cls => {
            if (cls.includes('oklch') || cls.includes('oklab')) {
              el.classList.remove(cls);
            }
          });

          if (el.classList.contains('text-gray-700') || el.classList.contains('text-gray-600')) {
            el.style.color = '#111827';
            el.style.fontWeight = '700';
          }
          
          if (el.classList.contains('text-4xl') || el.classList.contains('text-3xl')) {
            el.style.fontSize = '32px'; // Adjusted for better fit in 5 cols
            el.style.fontWeight = '900';
            el.style.color = '#f15a22';
          }

          // Compact cards for PDF
          if (el.classList.contains('bg-white') && (el.classList.contains('p-4') || el.classList.contains('p-6'))) {
            el.style.padding = '12px';
            el.style.borderRadius = '12px';
            el.style.border = '1px solid #eeeeee';
          }

          // Force charts to fit PDF width
          if (el.classList.contains('recharts-responsive-container')) {
            el.style.width = '1000px';
            el.style.height = '400px';
            el.style.display = 'block';
            el.style.visibility = 'visible';
          }

          // Ensure labels are visible
          if (el.classList.contains('recharts-cartesian-axis-tick-value') || el.classList.contains('recharts-legend-item-text')) {
            el.style.fontSize = '12px';
            el.style.fill = '#414042';
          }

          const style = el.style;
          ['backgroundColor', 'color', 'borderColor', 'outlineColor', 'fill', 'stroke'].forEach(prop => {
            const val = (style as any)[prop];
            if (val && (val.toLowerCase().includes('oklab') || val.toLowerCase().includes('oklch'))) {
              el.style[prop as any] = convertColor(val);
            }
          });

          const computedStyle = window.getComputedStyle(el);
          ['backgroundColor', 'color', 'borderColor', 'outlineColor', 'fill', 'stroke'].forEach(prop => {
            const val = (computedStyle as any)[prop];
            if (val && (val.toLowerCase().includes('oklab') || val.toLowerCase().includes('oklch'))) {
              el.style[prop as any] = convertColor(val);
            }
          });

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
        scale: 1.5, // Reduced scale for better fit (Requirement 3)
        useCORS: true,
        backgroundColor: '#ffffff', // White background (Requirement 5)
        logging: false,
        onclone: (clonedDoc: Document) => cleanupOklab(clonedDoc),
        ignoreElements: (element: Element) => {
          return element.classList.contains('lucide') || 
                 (element.tagName.toLowerCase() === 'svg' && !element.closest('.recharts-wrapper'));
        }
      };

      // PAGE 1: Summary and Categories
      await addLetterhead(pdf, 40);
      
      // Title
      pdf.setFontSize(20);
      pdf.setTextColor(51, 102, 153);
      pdf.setFont('helvetica', 'bold');
      pdf.text('RELATÓRIO DE INDICADORES - HELPDESK', pageWidth / 2, marginTop - 18, { align: 'center' });
      
      // Period
      pdf.setFontSize(11);
      pdf.setTextColor(65, 64, 66);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Período: ${new Date(startDate).toLocaleDateString('pt-BR')} até ${new Date(endDate).toLocaleDateString('pt-BR')}`, marginLeft, marginTop - 8);
      
      // Summary Cards
      if (summaryRef.current) {
        await new Promise(resolve => requestAnimationFrame(resolve));
        const canvas = await html2canvas(summaryRef.current, html2canvasOptions);
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = contentWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', marginLeft, marginTop, imgWidth, imgHeight);
        
        let currentY = marginTop + imgHeight + 15;

        // Category Chart (Page 1)
        if (categoryRef.current) {
          pdf.setFontSize(16);
          pdf.setTextColor(51, 102, 153);
          pdf.setFont('helvetica', 'bold');
          pdf.text('DISTRIBUIÇÃO POR CATEGORIA', marginLeft, currentY - 5);

          await new Promise(resolve => requestAnimationFrame(resolve));
          const categoryCanvas = await html2canvas(categoryRef.current, html2canvasOptions);
          const categoryImg = categoryCanvas.toDataURL('image/png');
          const categoryHeight = (categoryCanvas.height * contentWidth) / categoryCanvas.width;
          
          // Ensure it doesn't overflow page 1
          if (currentY + categoryHeight > pageHeight - marginBottom) {
            pdf.addPage();
            await addLetterhead(pdf);
            addFooter(pdf);
            currentY = marginTop;
            pdf.text('DISTRIBUIÇÃO POR CATEGORIA (Cont.)', marginLeft, currentY - 5);
          }
          
          pdf.addImage(categoryImg, 'PNG', marginLeft, currentY, contentWidth, categoryHeight);
        }
      }
      
      addFooter(pdf);

      // PAGE 2: Sectors
      if (sectorRef.current) {
        pdf.addPage();
        await addLetterhead(pdf, 30); // Minimalist logo (Requirement 4)
        addFooter(pdf);

        pdf.setFontSize(16);
        pdf.setTextColor(51, 102, 153);
        pdf.setFont('helvetica', 'bold');
        pdf.text('DISTRIBUIÇÃO POR SETORES', pageWidth / 2, 25, { align: 'center' });

        await new Promise(resolve => requestAnimationFrame(resolve));
        const sectorCanvas = await html2canvas(sectorRef.current, html2canvasOptions);
        const sectorImg = sectorCanvas.toDataURL('image/png');
        
        // Rigorous constraints: 70% width, 60% height (Requirement 1)
        const maxWidth = pageWidth * 0.7;
        const maxHeight = pageHeight * 0.6;
        
        let imgWidth = maxWidth;
        let imgHeight = (sectorCanvas.height * imgWidth) / sectorCanvas.width;
        
        if (imgHeight > maxHeight) {
          imgHeight = maxHeight;
          imgWidth = (sectorCanvas.width * imgHeight) / sectorCanvas.height;
        }
        
        // Absolute centering (Requirement 2)
        const xPos = (pageWidth - imgWidth) / 2;
        const yPos = (pageHeight - imgHeight) / 2 + 10; // Slightly offset down to account for header
        
        pdf.addImage(sectorImg, 'PNG', xPos, yPos, imgWidth, imgHeight);
      }

      // PAGE 3: Technicians
      if (techRef.current) {
        pdf.addPage();
        await addLetterhead(pdf, 30); // Minimalist logo (Requirement 4)
        addFooter(pdf);

        pdf.setFontSize(16);
        pdf.setTextColor(51, 102, 153);
        pdf.setFont('helvetica', 'bold');
        pdf.text('PERFORMANCE POR TÉCNICO', pageWidth / 2, 25, { align: 'center' });

        await new Promise(resolve => requestAnimationFrame(resolve));
        const techCanvas = await html2canvas(techRef.current, html2canvasOptions);
        const techImg = techCanvas.toDataURL('image/png');
        
        // Rigorous constraints: 70% width, 60% height (Requirement 1)
        const maxWidth = pageWidth * 0.7;
        const maxHeight = pageHeight * 0.6;
        
        let imgWidth = maxWidth;
        let imgHeight = (techCanvas.height * imgWidth) / techCanvas.width;
        
        if (imgHeight > maxHeight) {
          imgHeight = maxHeight;
          imgWidth = (techCanvas.width * imgHeight) / techCanvas.height;
        }
        
        // Absolute centering (Requirement 2)
        const xPos = (pageWidth - imgWidth) / 2;
        const yPos = (pageHeight - imgHeight) / 2 + 10; // Slightly offset down to account for header
        
        pdf.addImage(techImg, 'PNG', xPos, yPos, imgWidth, imgHeight);
      }

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
  }, [startDate, endDate]); // Removed filteredStats to prevent infinite loop

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-[#eeeeee] shadow-sm animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-1/2 mb-4"></div>
              <div className="h-10 bg-gray-50 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div ref={summaryRef} data-pdf-section="summary" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
            <div className="bg-white p-4 md:p-6 rounded-2xl border border-[#eeeeee] shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-[#f9fafb] rounded-lg text-[#414042]">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total no Período</span>
              </div>
              <p className="text-3xl md:text-4xl font-light text-gray-900">{filteredStats?.total || 0}</p>
            </div>

            <div className="bg-white p-4 md:p-6 rounded-2xl border border-[#eeeeee] shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-[#fffbeb] rounded-lg text-[#d97706]">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">A Iniciar</span>
              </div>
              <p className="text-3xl md:text-4xl font-light text-[#d97706]">{getStatusCount('pending')}</p>
            </div>

            <div className="bg-white p-4 md:p-6 rounded-2xl border border-[#eeeeee] shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-[#eff6ff] rounded-lg text-[#2563eb]">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Em Andamento</span>
              </div>
              <p className="text-3xl md:text-4xl font-light text-[#2563eb]">{getStatusCount(['in_progress', 'on_hold'])}</p>
            </div>

            <div className="bg-white p-4 md:p-6 rounded-2xl border border-[#eeeeee] shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-[#fef2ee] rounded-lg text-[#f15a22]">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Finalizados</span>
              </div>
              <p className="text-3xl md:text-4xl font-light text-[#f15a22]">{getStatusCount('finished')}</p>
            </div>

            <div className="bg-white p-4 md:p-6 rounded-2xl border border-[#eeeeee] shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-[#ebf0f5] rounded-lg text-[#336699]">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tempo Médio</span>
              </div>
              <p className="text-3xl md:text-4xl font-light text-[#336699]">{formatAvgTime(filteredStats?.avgServiceTime || null)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Sector Chart */}
            <div ref={sectorRef} data-pdf-section="sector" className="bg-white p-4 md:p-8 rounded-2xl border border-[#eeeeee] shadow-sm">
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
              
              <div className="h-[300px] md:h-[400px] w-full">
                {filteredStats?.bySector.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-400 italic">Nenhum dado disponível.</div>
                ) : sectorView === 'bar' ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={filteredStats?.bySector}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="sector" 
                        fontSize={(window.innerWidth < 768 && !exporting) ? 8 : 10} 
                        tickLine={false} 
                        axisLine={false} 
                        textAnchor="middle" 
                        interval={0} 
                      />
                      <YAxis fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                        cursor={{ fill: '#f8fafc' }}
                      />
                      <Bar dataKey="count" fill="#336699" radius={[4, 4, 0, 0]} barSize={(window.innerWidth < 768 && !exporting) ? 20 : 40} isAnimationActive={false} />
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
                        innerRadius={(window.innerWidth < 768 && !exporting) ? 40 : 60}
                        outerRadius={(window.innerWidth < 768 && !exporting) ? 70 : 100}
                        paddingAngle={5}
                        isAnimationActive={false}
                      >
                        {filteredStats?.bySector.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36} 
                        iconSize={10} 
                        wrapperStyle={{ fontSize: (window.innerWidth < 768 && !exporting) ? '8px' : '10px' }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Technician Performance */}
            <div ref={techRef} data-pdf-section="technician" className="bg-white p-4 md:p-8 rounded-2xl border border-[#eeeeee] shadow-sm">
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

              <div className="h-[300px] md:h-[400px] w-full overflow-y-auto custom-scrollbar">
                {filteredStats?.byTechnician && filteredStats.byTechnician.length > 0 ? (
                  techView === 'list' ? (
                    <div className="space-y-4">
                      {filteredStats.byTechnician.map((t, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 md:p-4 rounded-xl bg-gray-50 border border-gray-100">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#fef2ee] text-[#f15a22] flex items-center justify-center font-bold text-xs">
                              {t.technician.charAt(0)}
                            </div>
                            <span className="text-xs md:text-sm font-bold text-gray-700 truncate max-w-[100px] md:max-w-none">{t.technician}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs md:text-sm font-bold text-[#f15a22] block">
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
                        <XAxis type="number" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis dataKey="technician" type="category" fontSize={10} tickLine={false} axisLine={false} width={(window.innerWidth < 768 && !exporting) ? 60 : 100} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                        />
                        <Bar dataKey="count" fill="#f15a22" radius={[0, 4, 4, 0]} barSize={20} isAnimationActive={false} />
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
          <div ref={categoryRef} data-pdf-section="category" className="bg-white p-4 md:p-8 rounded-2xl border border-[#eeeeee] shadow-sm">
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

            <div className="h-[350px] md:h-[450px] w-full mt-4">
              {categoryView === 'pie' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <Pie
                      data={filteredStats?.byCategory}
                      dataKey="count"
                      nameKey="category"
                      cx="50%"
                      cy="45%"
                      innerRadius={(window.innerWidth < 768 && !exporting) ? 50 : 70}
                      outerRadius={(window.innerWidth < 768 && !exporting) ? 80 : 110}
                      paddingAngle={5}
                      isAnimationActive={false}
                      label={(window.innerWidth < 768 && !exporting) ? false : ({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {filteredStats?.byCategory.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#fff" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    />
                    <Legend 
                      layout={(window.innerWidth < 768 && !exporting) ? "horizontal" : "vertical"} 
                      align={(window.innerWidth < 768 && !exporting) ? "center" : "right"} 
                      verticalAlign={(window.innerWidth < 768 && !exporting) ? "bottom" : "middle"} 
                      iconType="circle" 
                      wrapperStyle={{ fontSize: (window.innerWidth < 768 && !exporting) ? '10px' : '12px' }}
                    />
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
