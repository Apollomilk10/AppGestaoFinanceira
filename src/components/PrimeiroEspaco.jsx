import { useState } from 'react';
import { User, Users, ArrowLeft, Copy, Check, KeyRound } from 'lucide-react';
import Logo from './Logo';
import Spinner from './Spinner';
import { useOrcamentos } from '../context/OrcamentosContext';

/**
 * Primeira escolha de quem acabou de entrar: usar sozinho ou dividir.
 *
 * De propósito não fala em "casal". Quem divide as contas pode ser
 * cônjuge, irmão, filho, colega de república ou sócio — o modelo de
 * dados é o mesmo (um espaço com membros e um código de convite), e o
 * texto não deve excluir ninguém. O rótulo do espaço é livre, então
 * cada grupo se nomeia como quiser.
 */
export default function PrimeiroEspaco() {
  const { criarOrcamento, entrarOrcamento } = useOrcamentos();

  const [etapa, setEtapa] = useState('escolha'); // escolha | individual | compartilhado | codigo | pronto
  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [criado, setCriado] = useState(null);
  const [copiado, setCopiado] = useState(false);

  async function criar(nomeEspaco, compartilhado) {
    setSalvando(true);
    setErro('');
    try {
      const resultado = await criarOrcamento(nomeEspaco.trim());
      if (compartilhado) {
        setCriado(resultado);
        setEtapa('pronto');
      }
      // No modo individual não há nada a mostrar: o app já abre sozinho
      // assim que a lista de espaços recarrega.
    } catch (e) {
      setErro(e.message || 'Não foi possível criar o espaço.');
    } finally {
      setSalvando(false);
    }
  }

  async function entrar() {
    setSalvando(true);
    setErro('');
    try {
      await entrarOrcamento(codigo.trim().toUpperCase());
    } catch (e) {
      setErro(e.message || 'Código não encontrado. Confira com quem te convidou.');
      setSalvando(false);
    }
  }

  function copiar(texto) {
    navigator.clipboard?.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="onboarding onboarding--fluxo">
      {etapa !== 'escolha' && etapa !== 'pronto' && (
        <button className="onboarding__pular onboarding__voltar" onClick={() => { setEtapa('escolha'); setErro(''); }}>
          <ArrowLeft size={16} /> Voltar
        </button>
      )}

      {etapa === 'escolha' && (
        <>
          <Logo size={44} />
          <h1 className="onboarding__titulo">Com quem você divide suas finanças?</h1>
          <p className="onboarding__texto">
            Dá pra usar o Casa+ sozinho ou junto com quem divide as contas com você — parceiro,
            família, república, sócio. Você pode mudar isso depois.
          </p>

          <div className="escolhas">
            <button className="escolha" onClick={() => { setNome('Meu espaço'); setEtapa('individual'); }}>
              <span className="escolha__icone"><User size={20} strokeWidth={2.2} /></span>
              <span className="escolha__nome">Só eu</span>
              <span className="escolha__desc">Um espaço privado, só com os seus lançamentos.</span>
            </button>

            <button className="escolha escolha--destaque" onClick={() => { setNome(''); setEtapa('compartilhado'); }}>
              <span className="escolha__icone"><Users size={20} strokeWidth={2.2} /></span>
              <span className="escolha__nome">Com outras pessoas</span>
              <span className="escolha__desc">
                Um espaço em comum: cada um lança o que gastou e todo mundo vê o mesmo total.
              </span>
            </button>
          </div>

          <button className="ghost-button" onClick={() => setEtapa('codigo')}>
            <KeyRound size={16} /> Já tenho um código de convite
          </button>
        </>
      )}

      {etapa === 'individual' && (
        <>
          <h1 className="onboarding__titulo">Como quer chamar seu espaço?</h1>
          <p className="onboarding__texto">É só um nome pra você se achar. Dá pra mudar depois.</p>
          <label className="field">
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Meu espaço"
              maxLength={40}
            />
          </label>
          {erro && <p className="field-error">{erro}</p>}
          <div className="onboarding__rodape">
            <button
              className="primary-button primary-button--full"
              disabled={salvando || !nome.trim()}
              onClick={() => criar(nome || 'Meu espaço', false)}
            >
              {salvando ? <Spinner size={16} /> : 'Criar espaço'}
            </button>
          </div>
        </>
      )}

      {etapa === 'compartilhado' && (
        <>
          <h1 className="onboarding__titulo">Dê um nome ao espaço de vocês</h1>
          <p className="onboarding__texto">
            O nome aparece pra todo mundo que entrar. Ex.: Nossa casa, Família Tavares, Apê 42,
            Viagem do grupo.
          </p>
          <label className="field">
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nossa casa"
              maxLength={40}
              autoFocus
            />
          </label>
          {erro && <p className="field-error">{erro}</p>}
          <div className="onboarding__rodape">
            <button
              className="primary-button primary-button--full"
              disabled={salvando || !nome.trim()}
              onClick={() => criar(nome, true)}
            >
              {salvando ? <Spinner size={16} /> : 'Criar espaço compartilhado'}
            </button>
          </div>
        </>
      )}

      {etapa === 'codigo' && (
        <>
          <h1 className="onboarding__titulo">Entrar com um código</h1>
          <p className="onboarding__texto">
            Peça o código pra quem já criou o espaço. Ele aparece no menu lateral, ao lado do nome.
          </p>
          <label className="field">
            <input
              className="mono"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={12}
              autoFocus
            />
          </label>
          {erro && <p className="field-error">{erro}</p>}
          <div className="onboarding__rodape">
            <button
              className="primary-button primary-button--full"
              disabled={salvando || codigo.trim().length < 4}
              onClick={entrar}
            >
              {salvando ? <Spinner size={16} /> : 'Entrar no espaço'}
            </button>
          </div>
        </>
      )}

      {etapa === 'pronto' && (
        <>
          <Logo size={44} />
          <h1 className="onboarding__titulo">Espaço criado</h1>
          <p className="onboarding__texto">
            Mande este código pra quem vai dividir as contas com você. Quem tiver o código entra
            direto — não precisa de convite por e-mail.
          </p>

          <div className="codigo-convite">
            <span className="codigo-convite__valor mono">{criado?.codigo || '—'}</span>
            <button className="codigo-convite__copiar" onClick={() => copiar(criado?.codigo || '')}>
              {copiado ? <Check size={15} /> : <Copy size={15} />}
              {copiado ? 'Copiado' : 'Copiar'}
            </button>
          </div>

          <div className="onboarding__rodape">
            <button className="primary-button primary-button--full" onClick={() => window.location.reload()}>
              Ir para o app
            </button>
          </div>
        </>
      )}
    </div>
  );
}
