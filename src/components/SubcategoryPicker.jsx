import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useCategories } from '../context/CategoriesContext';

export default function SubcategoryPicker({ categoria, value, onChange }) {
  const { subcategoryOptions, addSubcategory } = useCategories();
  const [adding, setAdding] = useState(false);
  const [novaSubcategoria, setNovaSubcategoria] = useState('');
  const [saving, setSaving] = useState(false);

  const options = subcategoryOptions(categoria);

  async function handleAdd(e) {
    e.preventDefault();
    if (!novaSubcategoria.trim()) return;
    setSaving(true);
    try {
      const chave = await addSubcategory(categoria, novaSubcategoria.trim());
      onChange(chave);
      setNovaSubcategoria('');
      setAdding(false);
    } catch (err) {
      console.error(err);
      alert('Não foi possível criar a subcategoria: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (adding) {
    return (
      <form className="inline-add" onSubmit={handleAdd}>
        <input
          type="text"
          value={novaSubcategoria}
          onChange={(e) => setNovaSubcategoria(e.target.value)}
          placeholder="Nome da nova subcategoria"
          autoFocus
        />
        <button type="submit" className="inline-add__confirm" disabled={saving}>
          {saving ? '...' : 'ok'}
        </button>
        <button type="button" className="inline-add__cancel" onClick={() => setAdding(false)}>
          x
        </button>
      </form>
    );
  }

  return (
    <div className="field-with-add">
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={options.length === 0 && !value}>
        {options.length === 0 && <option value="">Nenhuma ainda</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <button type="button" className="add-button" onClick={() => setAdding(true)} aria-label="Nova subcategoria">
        <Plus size={14} />
      </button>
    </div>
  );
}
