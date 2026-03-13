import { useState, useEffect } from 'react';
import { Category } from '../../types';
import { Settings as SettingsIcon, Plus, Trash2, Edit2, Check, X } from 'lucide-react';

interface SettingsProps {
  categories: Category[];
  onUpdate: () => void;
}

export default function Settings({ categories, onUpdate }: SettingsProps) {
  const [sectors, setSectors] = useState<{ id: number; name: string }[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [newSector, setNewSector] = useState('');
  const [editingCategory, setEditingCategory] = useState<{ id: number; name: string } | null>(null);
  const [editingSector, setEditingSector] = useState<{ id: number; name: string } | null>(null);

  const fetchSectors = async () => {
    const res = await fetch('/api/sectors');
    const data = await res.json();
    setSectors(data);
  };

  useEffect(() => {
    fetchSectors();
  }, []);

  const handleAddCategory = async () => {
    if (!newCategory) return;
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCategory })
    });
    if (res.ok) {
      setNewCategory('');
      onUpdate();
    }
  };

  const handleAddSector = async () => {
    if (!newSector) return;
    const res = await fetch('/api/sectors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newSector })
    });
    if (res.ok) {
      setNewSector('');
      fetchSectors();
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Excluir esta categoria?')) return;
    await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    onUpdate();
  };

  const handleDeleteSector = async (id: number) => {
    if (!confirm('Excluir este setor?')) return;
    await fetch(`/api/sectors/${id}`, { method: 'DELETE' });
    fetchSectors();
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
    fetchSectors();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Categories Management */}
      <div className="bg-white p-8 rounded-2xl border border-black/5 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Categorias de Chamado</h3>
        </div>

        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            placeholder="Nova categoria..."
          />
          <button 
            onClick={handleAddCategory}
            className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-2">
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-50 hover:bg-gray-50 transition-colors">
              {editingCategory?.id === cat.id ? (
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={editingCategory.name}
                    onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                    className="flex-1 px-3 py-1 rounded-lg border border-blue-200 outline-none"
                  />
                  <button onClick={handleUpdateCategory} className="text-emerald-500"><Check className="w-5 h-5" /></button>
                  <button onClick={() => setEditingCategory(null)} className="text-red-500"><X className="w-5 h-5" /></button>
                </div>
              ) : (
                <>
                  <span className="font-medium text-gray-700">{cat.name}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingCategory(cat)} className="p-2 text-gray-400 hover:text-blue-500 transition-colors">
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
      </div>

      {/* Sectors Management */}
      <div className="bg-white p-8 rounded-2xl border border-black/5 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Setores do Hospital</h3>
        </div>

        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={newSector}
            onChange={(e) => setNewSector(e.target.value)}
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
            placeholder="Novo setor..."
          />
          <button 
            onClick={handleAddSector}
            className="bg-purple-600 text-white p-3 rounded-xl hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-2">
          {sectors.map(sec => (
            <div key={sec.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-50 hover:bg-gray-50 transition-colors">
              {editingSector?.id === sec.id ? (
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={editingSector.name}
                    onChange={(e) => setEditingSector({ ...editingSector, name: e.target.value })}
                    className="flex-1 px-3 py-1 rounded-lg border border-purple-200 outline-none"
                  />
                  <button onClick={handleUpdateSector} className="text-emerald-500"><Check className="w-5 h-5" /></button>
                  <button onClick={() => setEditingSector(null)} className="text-red-500"><X className="w-5 h-5" /></button>
                </div>
              ) : (
                <>
                  <span className="font-medium text-gray-700">{sec.name}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingSector(sec)} className="p-2 text-gray-400 hover:text-purple-500 transition-colors">
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
      </div>
    </div>
  );
}
