import { useState } from 'react';
import { MessageCircleHeart } from 'lucide-react';
import { sendFeedback } from '../services/appsScript';

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [errorMessage, setErrorMessage] = useState('');

  function handleClose() {
    setOpen(false);
    setStatus('idle');
    setMensagem('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!mensagem.trim()) return;

    setStatus('sending');
    try {
      await sendFeedback(mensagem.trim());
      setStatus('sent');
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message);
      setStatus('error');
    }
  }

  if (!open) {
    return (
      <button className="fab fab--feedback" onClick={() => setOpen(true)}>
        <MessageCircleHeart size={16} />
        <span>Ajude-nos a Melhorar!</span>
      </button>
    );
  }

  return (
    <div className="sheet-backdrop" onClick={handleClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__header">
          <h2>Ajude-nos a melhorar</h2>
          <button type="button" className="link-button mono" onClick={handleClose}>
            fechar
          </button>
        </div>

        {status === 'sent' ? (
          <div className="feedback-sent">
            <p>Obrigado! Sua mensagem foi registrada. 🙌</p>
            <button className="primary-button primary-button--full" onClick={handleClose}>
              fechar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="field">
              <span>O que podemos melhorar, corrigir ou adicionar?</span>
              <textarea
                className="feedback-textarea"
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                placeholder="Conta pra gente…"
                rows={5}
                autoFocus
                required
              />
            </label>

            {status === 'error' && <p className="field-error">{errorMessage}</p>}

            <button
              type="submit"
              className="primary-button primary-button--full"
              disabled={status === 'sending'}
            >
              {status === 'sending' ? 'enviando…' : 'enviar feedback'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
