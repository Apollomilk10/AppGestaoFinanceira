import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useCategories } from '../context/CategoriesContext';

export default function CategoryPicker({ value, onChange }) {
  const { categoryOptions, addCategory } = useCategories();
  const [adding, setAdding] = useState(false);
  const [novaCategoria, setNovaCategoria] = useState('');
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');

  const options = categoryOptions();

  async function handleAdd(e) {
    e.preventDefault();
    if (!novaCategoria.trim()) return;
    setSaving(true);
    setErro('');
    try {
      const chave = await addCategory(novaCategoria.trim());
      onChange(chave);
      setNovaCategoria('');
      setAdding(false);
    } catch (err) {
      console.error(err);
      setErro(err.message || 'Não foi possível criar a categoria.');
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
            value={novaCategoria}
            onChange={(e) => setNovaCategoria(e.target.value)}
            placeholder="Nome da nova categoria"
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
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <button type="button" className="add-button" onClick={() => setAdding(true)} aria-label="Nova categoria">
        <Plus size={14} />
      </button>
    </div>
  );
}
