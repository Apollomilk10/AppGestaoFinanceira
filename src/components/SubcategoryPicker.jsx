import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useCategories } from '../context/CategoriesContext';

export default function SubcategoryPicker({ categoria, value, onChange }) {
  const { subcategoryOptions, addSubcategory, removeCategory, ehCustomizada } = useCategories();
  const [adding, setAdding] = useState(false);
  const [nova, setNova] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const options = subcategoryOptions(categoria);
  const podeExcluir = value && ehCustomizada(categoria, value);

  // Mesmo motivo do CategoryPicker: nada de <form> aninhado.
  async function confirmar() {
    if (!nova.trim() || salvando) return;
    setSalvando(true);
    setErro('');
    try {
      const chave = await addSubcategory(categoria, nova.trim());
      onChange(chave);
      setNova('');
      setAdding(false);
    } catch (err) {
      console.error(err);
      setErro(err.message || 'Não foi possível criar a subcategoria.');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    setErro('');
    try {
      await removeCategory(categoria, value);
      const restantes = subcategoryOptions(categoria).filter((o) => o.value !== value);
      onChange(restantes[0]?.value || '');
    } catch (err) {
      setErro(err.message);
    }
  }

  if (adding) {
    return (
      <div>
        <div className="inline-add">
          <input
            type="text"
            value={nova}
            onChange={(e) => setNova(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                confirmar();
              }
              if (e.key === 'Escape') setAdding(false);
            }}
            placeholder="Nome da nova subcategoria"
            autoFocus
          />
          <button type="button" className="inline-add__confirm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); confirmar(); }} disabled={salvando}>
            {salvando ? '...' : 'ok'}
          </button>
          <button type="button" className="inline-add__cancel" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAdding(false); setErro(''); }}>
            x
          </button>
        </div>
        {erro && <p className="field-error" style={{ marginTop: 4 }}>{erro}</p>}
      </div>
    );
  }

  return (
    <div>
      <div className="field-with-add">
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          {options.length === 0 && <option value="">Nenhuma ainda — toque em +</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {podeExcluir && (
          <button type="button" className="add-button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); excluir(); }} aria-label="Excluir subcategoria">
            <Trash2 size={13} />
          </button>
        )}
        <button type="button" className="add-button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAdding(true); }} aria-label="Nova subcategoria">
          <Plus size={14} />
        </button>
      </div>
      {erro && <p className="field-error" style={{ marginTop: 4 }}>{erro}</p>}
    </div>
  );
}
