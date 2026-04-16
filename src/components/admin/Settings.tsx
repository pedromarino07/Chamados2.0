import { useState, useEffect } from 'react';
import { Category } from '../../types';
import { Settings as SettingsIcon, Plus, Trash2, Edit2, Check, X } from 'lucide-react';

interface SettingsProps {
  categories: Category[];
  onUpdate: () => void;
}

export default function Settings({ categories: globalCategories, onUpdate }: SettingsProps) {
  const [sectors, setSectors] = useState<{ id: number; name: string }[]>([]);
  const [localCategories, setLocalCategories] = useState<{ id: number; name: string }[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [newSector, setNewSector] = useState('');
  const [editingCategory, setEditingCategory] = useState<{ id: number; name: string } | null>(null);
  const [editingSector, setEditingSector] = useState<{ id: number; name: string } | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isAddingSector, setIsAddingSector] = useState(false);

  const [catPagination, setCatPagination] = useState({ currentPage: 1, totalPages: 1 });
  const [secPagination, setSecPagination] = useState({ currentPage: 1, totalPages: 1 });

  const fetchSectors = async (page: number = 1) => {
    const res = await fetch(`/api/sectors?page=${page}&limit=5`);
    const data = await res.json();
    if (data.sectors) {
      setSectors(data.sectors);
      setSecPagination({ currentPage: data.currentPage, totalPages: data.totalPages });
    } else {
      setSectors(data);
    }
  };

  const fetchCategories = async (page: number = 1) => {
    const res = await fetch(`/api/categories?page=${page}&limit=5`);
    const data = await res.json();
    if (data.categories) {
      setLocalCategories(data.categories);
      setCatPagination({ currentPage: data.currentPage, totalPages: data.totalPages });
    }
  };

  useEffect(() => {
    fetchSectors(secPagination.currentPage);
    fetchCategories(catPagination.currentPage);
  }, []);

  const handleAddCategory = async () => {
    if (!newCategory || isAddingCategory) return;
    try {
      setIsAddingCategory(true);
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategory })
      });
      if (res.ok) {
        setNewCategory('');
        onUpdate();
        // Fetch the last page to show the new category
        const totalRes = await fetch('/api/categories?limit=5');
        const totalData = await totalRes.json();
        fetchCategories(totalData.totalPages || 1);
      } else {
        const errorData = await res.json();
        console.error('Erro ao adicionar categoria:', errorData.error);
        alert(`Erro ao adicionar categoria: ${errorData.error}`);
      }
    } catch (err) {
      console.error('Erro de conexão ao adicionar categoria:', err);
      alert('Erro de conexão ao tentar adicionar categoria.');
    } finally {
      setIsAddingCategory(false);
    }
  };

  const handleAddSector = async () => {
    if (!newSector || isAddingSector) return;
    try {
      setIsAddingSector(true);
      const res = await fetch('/api/sectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSector })
      });
      if (res.ok) {
        setNewSector('');
        // Fetch the last page to show the new sector
        const totalRes = await fetch('/api/sectors?limit=5');
        const totalData = await totalRes.json();
        fetchSectors(totalData.totalPages || 1);
      } else {
        const errorData = await res.json();
        console.error('Erro ao adicionar setor:', errorData.error);
        alert(`Erro ao adicionar setor: ${errorData.error}`);
      }
    } catch (err) {
      console.error('Erro de conexão ao adicionar setor:', err);
      alert('Erro de conexão ao tentar adicionar setor.');
    } finally {
      setIsAddingSector(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Excluir esta categoria?')) return;
    await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    onUpdate();
    
    // Check if we need to go back a page
    const res = await fetch('/api/categories?limit=5');
    const data = await res.json();
    const newPage = Math.min(catPagination.currentPage, data.totalPages || 1);
    fetchCategories(newPage);
  };

  const handleDeleteSector = async (id: number) => {
    if (!confirm('Excluir este setor?')) return;
    await fetch(`/api/sectors/${id}`, { method: 'DELETE' });
    
    // Check if we need to go back a page
    const res = await fetch('/api/sectors?limit=5');
    const data = await res.json();
    const newPage = Math.min(secPagination.currentPage, data.totalPages || 1);
    fetchSectors(newPage);
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory) return;
    await fetch(`/api/categories/${editingCategory.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editingCategory.name })
    });
    setEditingCategory(null);
    onUpdate();
  };

  const handleUpdateSector = async () => {
    if (!editingSector) return;
    await fetch(`/api/sectors/${editingSector.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editingSector.name })
    });
    setEditingSector(null);
    fetchSectors(secPagination.currentPage);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Categories Management */}
      <div className="bg-white p-8 rounded-2xl border border-black/5 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-brand-blue/10 rounded-lg text-brand-blue">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-brand-gray">Categorias de Chamado</h3>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-6">
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-orange outline-none transition-all"
            placeholder="Nova categoria..."
          />
          <button 
            onClick={handleAddCategory}
            disabled={isAddingCategory}
            className="bg-brand-orange text-white p-3 rounded-xl hover:bg-brand-orange/90 disabled:opacity-50 transition-colors flex justify-center items-center"
          >
            {isAddingCategory ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Plus className="w-6 h-6" />
            )}
          </button>
        </div>

        <div className="space-y-2 mb-6">
          {localCategories.map(cat => (
            <div key={cat.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-50 hover:bg-gray-50 transition-colors">
              {editingCategory?.id === cat.id ? (
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={editingCategory.name}
                    onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                    className="flex-1 px-3 py-1 rounded-lg border border-brand-orange/20 outline-none"
                  />
                  <button onClick={handleUpdateCategory} className="text-brand-orange"><Check className="w-5 h-5" /></button>
                  <button onClick={() => setEditingCategory(null)} className="text-red-500"><X className="w-5 h-5" /></button>
                </div>
              ) : (
                <>
                  <span className="font-medium text-gray-700">{cat.name}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingCategory(cat)} className="p-2 text-gray-400 hover:text-brand-blue transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {catPagination.totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/30 rounded-xl">
            <button 
              onClick={() => fetchCategories(catPagination.currentPage - 1)}
              disabled={catPagination.currentPage === 1}
              className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-brand-blue hover:text-brand-orange disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Página {catPagination.currentPage} de {catPagination.totalPages}
            </span>
            <button 
              onClick={() => fetchCategories(catPagination.currentPage + 1)}
              disabled={catPagination.currentPage === catPagination.totalPages}
              className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-brand-blue hover:text-brand-orange disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Próximo
            </button>
          </div>
        )}
      </div>

      {/* Sectors Management */}
      <div className="bg-white p-8 rounded-2xl border border-black/5 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-brand-blue/10 rounded-lg text-brand-blue">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-brand-gray">Setores do Hospital</h3>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-6">
          <input
            type="text"
            value={newSector}
            onChange={(e) => setNewSector(e.target.value)}
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-blue outline-none transition-all"
            placeholder="Novo setor..."
          />
          <button 
            onClick={handleAddSector}
            disabled={isAddingSector}
            className="bg-brand-blue text-white p-3 rounded-xl hover:bg-brand-blue/90 disabled:opacity-50 transition-colors flex justify-center items-center"
          >
            {isAddingSector ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Plus className="w-6 h-6" />
            )}
          </button>
        </div>

        <div className="space-y-2 mb-6">
          {sectors.map(sec => (
            <div key={sec.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-50 hover:bg-gray-50 transition-colors">
              {editingSector?.id === sec.id ? (
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={editingSector.name}
                    onChange={(e) => setEditingSector({ ...editingSector, name: e.target.value })}
                    className="flex-1 px-3 py-1 rounded-lg border border-brand-blue/20 outline-none"
                  />
                  <button onClick={handleUpdateSector} className="text-brand-orange"><Check className="w-5 h-5" /></button>
                  <button onClick={() => setEditingSector(null)} className="text-red-500"><X className="w-5 h-5" /></button>
                </div>
              ) : (
                <>
                  <span className="font-medium text-gray-700">{sec.name}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingSector(sec)} className="p-2 text-gray-400 hover:text-brand-blue transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteSector(sec.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {secPagination.totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/30 rounded-xl">
            <button 
              onClick={() => fetchSectors(secPagination.currentPage - 1)}
              disabled={secPagination.currentPage === 1}
              className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-brand-blue hover:text-brand-orange disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Página {secPagination.currentPage} de {secPagination.totalPages}
            </span>
            <button 
              onClick={() => fetchSectors(secPagination.currentPage + 1)}
              disabled={secPagination.currentPage === secPagination.totalPages}
              className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-brand-blue hover:text-brand-orange disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Próximo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
