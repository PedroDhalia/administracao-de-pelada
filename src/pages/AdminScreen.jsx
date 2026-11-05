import { useState } from 'react';
import { ChevronRight, Check, Plus, UserPlus, Hand } from 'lucide-react';
import HomeSection from '../components/home/HomeSection';
import FinanceHomeCard from '../components/finance/FinanceHomeCard';
import './AdminScreen.css';

// Aba "Admin" (só admin global): todas as ferramentas de gestão num lugar só,
// no mesmo formato da aba Rankings.
const AdminScreen = ({
  sessions,
  registeredPlayers,
  finance,
  isFinanceLoaded,
  onOpenFinance,
  onOpenDraw,
  onOpenSystem,
  onOpenSession,
  newSessionName,
  setNewSessionName,
  onAddSession,
  onRegisterPlayer,
  onRegisterGoleiro
}) => {
  const [activeForm, setActiveForm] = useState(null);
  const [feedback, setFeedback] = useState(null); // { section, text, sessionId? }

  const toggleForm = (key) => {
    setActiveForm(prev => (prev === key ? null : key));
    setFeedback(null);
  };

  const handleAddSession = (e) => {
    const name = newSessionName.trim();
    const sessionId = onAddSession(e);
    if (sessionId) {
      setActiveForm(null);
      setFeedback({ section: 'peladas', text: `Pelada "${name}" criada.`, sessionId });
    }
  };

  const handleRegister = (e, field, handler, label) => {
    const name = e.target.elements[field]?.value.trim();
    if (handler(e)) setFeedback({ section: 'cadastros', text: `${name} cadastrado como ${label}.` });
  };

  const renderFeedback = (section) => feedback?.section === section && (
    <div className="admin-feedback animated">
      <Check size={16} />
      <span>{feedback.text}</span>
      {feedback.sessionId && (
        <span className="admin-feedback-actions">
          <button type="button" onClick={() => onOpenSession(feedback.sessionId)}>Abrir</button>
          <button type="button" onClick={onOpenDraw}>Sortear times</button>
        </span>
      )}
    </div>
  );

  const renderAction = ({ icon, label, formKey, onClick }) => (
    <button
      key={label}
      type="button"
      className={`menu-compact-btn ${formKey && activeForm === formKey ? 'is-active' : ''}`}
      onClick={onClick || (() => toggleForm(formKey))}
      aria-expanded={formKey ? activeForm === formKey : undefined}
    >
      <span className="menu-compact-icon" style={{ fontSize: '24px' }}>{icon}</span>
      <span>{label}</span>
    </button>
  );

  return (
    <div className="main-content animated admin-screen">
      <header className="header" style={{ padding: '8px 0', borderBottom: 'none' }}>
        <h1 style={{ margin: 0 }}>Admin</h1>
      </header>

      <HomeSection icon="💰" title="Financeiro">
        <FinanceHomeCard
          sessions={sessions}
          registeredPlayers={registeredPlayers}
          finance={finance}
          isLoaded={isFinanceLoaded}
          onOpen={onOpenFinance}
        />
      </HomeSection>

      <HomeSection icon="⚽" title="Peladas">
        <div className="menu-compact-grid admin-grid">
          {renderAction({ icon: '🎲', label: 'Sortear Times', onClick: onOpenDraw })}
          {renderAction({ icon: '➕', label: 'Nova Pelada', formKey: 'session' })}
        </div>
        {activeForm === 'session' && (
          <form className="input-group animated" onSubmit={handleAddSession}>
            <input
              type="text"
              className="input-field"
              placeholder="Nome da nova pelada..."
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              autoFocus
            />
            <button type="submit" className="btn-primary" title="Criar pelada"><Plus size={20} /></button>
          </form>
        )}
        {renderFeedback('peladas')}
      </HomeSection>

      <HomeSection icon="👥" title="Cadastros">
        <div className="menu-compact-grid admin-grid">
          {renderAction({ icon: '👤', label: 'Novo Jogador', formKey: 'player' })}
          {renderAction({ icon: '🧤', label: 'Novo Goleiro', formKey: 'goleiro' })}
        </div>
        {activeForm === 'player' && (
          <form className="input-group animated" onSubmit={(e) => handleRegister(e, 'playerName', onRegisterPlayer, 'jogador')}>
            <input type="text" name="playerName" className="input-field" placeholder="Nome do novo jogador..." autoFocus />
            <button type="submit" className="btn-primary" title="Cadastrar jogador"><UserPlus size={20} /></button>
          </form>
        )}
        {activeForm === 'goleiro' && (
          <form className="input-group animated" onSubmit={(e) => handleRegister(e, 'goleiroName', onRegisterGoleiro, 'goleiro')}>
            <input type="text" name="goleiroName" className="input-field" placeholder="Nome do novo goleiro..." autoFocus />
            <button type="submit" className="btn-primary" title="Cadastrar goleiro"><Hand size={20} /></button>
          </form>
        )}
        {renderFeedback('cadastros')}
      </HomeSection>

      <HomeSection icon="⚙️" title="Sistema">
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <button type="button" className="menu-item-btn" onClick={onOpenSystem}>
            <span style={{ fontSize: '18px' }}>🔐</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold' }}>Painel de Controle</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Usuários, senhas, admins e recálculo de estatísticas</div>
            </div>
            <ChevronRight size={18} color="var(--text-muted)" />
          </button>
        </div>
      </HomeSection>
    </div>
  );
};

export default AdminScreen;
