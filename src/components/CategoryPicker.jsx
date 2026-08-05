import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useCategories } from '../context/CategoriesContext';

export default function CategoryPicker({ value, onChange }) {
  const { categoryOptions, addCategory, removeCategory, ehCustomizada } = useCategories();
  const [adding, setAdding] = useState(false);
  const [nova, setNova] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const options = categoryOptions();
  const podeExcluir = value && ehCustomizada(value);

  // Sem <form> aqui de propósito: este componente vive dentro do form do
  // lançamento, e formulários aninhados fazem o navegador associar o botão
  // ao form de fora — o clique salvava o lançamento em vez de criar a
  // categoria. Por isso o envio é por clique/Enter, com type="button".
  async function confirmar() {
    if (!nova.trim() || salvando) return;
    setSalvando(true);
    setErro('');
    try {
      const chave = await addCategory(nova.trim());
      onChange(chave);
      setNova('');
      setAdding(false);
    } catch (err) {
      console.error(err);
      setErro(err.message || 'Não foi possível criar a categoria.');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    setErro('');
    try {
      await removeCategory(value);
      const restantes = categoryOptions().filter((o) => o.value !== value);
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
            placeholder="Nome da nova categoria"
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
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {podeExcluir && (
          <button type="button" className="add-button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); excluir(); }} aria-label="Excluir categoria">
            <Trash2 size={13} />
          </button>
        )}
        <button type="button" className="add-button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAdding(true); }} aria-label="Nova categoria">
          <Plus size={14} />
        </button>
      </div>
      {erro && <p className="field-error" style={{ marginTop: 4 }}>{erro}</p>}
    </div>
  );
}
