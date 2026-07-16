import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useCategories } from '../context/CategoriesContext';

export default function SubcategoryPicker({ categoria, value, onChange }) {
  const { subcategoryOptions, addSubcategory } = useCategories();
  const [adding, setAdding] = useState(false);
  const [novaSubcategoria, setNovaSubcategoria] = useState('');
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');

  const options = subcategoryOptions(categoria);

  async function handleAdd(e) {
    e.preventDefault();
    if (!novaSubcategoria.trim()) return;
    setSaving(true);
    setErro('');
    try {
      const chave = await addSubcategory(categoria, novaSubcategoria.trim());
      onChange(chave);
      setNovaSubcategoria('');
      setAdding(false);
    } catch (err) {
      console.error(err);
      setErro(err.message || 'Não foi possível criar a subcategoria.');
    } finally {
      setSaving(false);
    }
  }

  if (adding) {
    return (
      <div>
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
          <button type="button" className="inline-add__cancel" onClick={() => { setAdding(false); setErro(''); }}>
            x
          </button>
        </form>
        {erro && <p className="field-error" style={{ marginTop: 4 }}>{erro}</p>}
      </div>
    );
  }

  return (
    <div className="field-with-add">
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.length === 0 && <option value="">Nenhuma ainda — toque em +</option>}
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
