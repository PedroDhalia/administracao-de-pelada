import React from 'react';
import { Plus, Camera } from 'lucide-react';
import PlayerAvatar from '../components/common/PlayerAvatar';

const Auth = ({
  authMode,
  setAuthMode,
  handleLogin,
  handleRegisterUser,
  dbError,
  currentUser,
  handleOnboardingCreate,
  handleOnboardingSelect,
  registeredPlayers,
  handleAvatarUpload,
  isUploading,
  users,
  registeredGoleiros
}) => {
  if (!currentUser) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="card animated" style={{ padding: 32, width: '100%', maxWidth: 400 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <img src="/logo.png" alt="Logo" style={{ width: 80, height: 80, marginBottom: 16 }} />
            <h2 style={{ color: 'var(--primary)', margin: 0 }}>{authMode === 'login' ? 'Entrar' : 'Cadastro'}</h2>
          </div>

          {dbError && (
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', borderRadius: '8px', padding: '12px', marginBottom: '20px', fontSize: '13px', color: 'var(--danger)', textAlign: 'center' }}>
              <p style={{ margin: 0, fontWeight: 'bold' }}>Erro de conexão com o banco:</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '11px', opacity: 0.8 }}>{dbError}</p>
              <p style={{ margin: '8px 0 0 0', fontSize: '11px' }}>Verifique as Regras de Segurança no Console do Firebase.</p>
            </div>
          )}

          {authMode === 'login' ? (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <input name="email" type="email" placeholder="Email" required className="input-field" style={{ marginBottom: 0 }} />
              <input name="password" type="password" placeholder="Senha" required className="input-field" style={{ marginBottom: 0 }} />
              <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Entrar</button>
              <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-muted)' }}>
                Não tem conta? <span style={{ color: 'var(--primary)', cursor: 'pointer' }} onClick={() => setAuthMode('register')}>Cadastre-se</span>
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegisterUser} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <input name="name" type="text" placeholder="Seu Nome (como quer ser chamado)" required className="input-field" style={{ marginBottom: 0 }} />
              <input name="email" type="email" placeholder="Email" required className="input-field" style={{ marginBottom: 0 }} />
              <input name="password" type="password" placeholder="Senha" required className="input-field" style={{ marginBottom: 0 }} />
              <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Criar Conta</button>
              <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-muted)' }}>
                Já tem conta? <span style={{ color: 'var(--primary)', cursor: 'pointer' }} onClick={() => setAuthMode('login')}>Entrar</span>
              </p>
            </form>
          )}
        </div>
      </div>
    );
  }

  if (!currentUser.jogadorId) {
    return (
      <div className="app-container" style={{ padding: 24, maxWidth: 600, margin: '0 auto', justifyContent: 'center' }}>
        <h2 style={{ textAlign: 'center', color: 'var(--primary)', marginBottom: 24 }}>Bem-vindo, {currentUser.name}!</h2>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24, gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <PlayerAvatar 
              playerName={currentUser.name} 
              userId={currentUser.id} 
              size={90} 
              users={users}
              registeredPlayers={registeredPlayers}
              registeredGoleiros={registeredGoleiros}
            />
            {isUploading && (
              <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="spinner">⏳</span>
              </div>
            )}
          </div>
          <label className="btn-primary" style={{ cursor: 'pointer', padding: '6px 12px', fontSize: 13, backgroundColor: 'rgba(255,255,255,0.1)' }}>
            <Camera size={14} style={{ marginRight: 6 }} /> Adicionar foto (opcional)
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
          </label>
        </div>
        <p style={{ textAlign: 'center', marginBottom: 24, color: 'var(--text-muted)' }}>Precisamos vincular sua conta a um jogador na nossa base para contabilizar suas estatísticas.</p>

        <div className="card animated" style={{ padding: 24, marginBottom: 24 }}>
          <h3 style={{ marginBottom: 8 }}>Nunca joguei com essa rapaziada</h3>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>Primeira vez nas peladas? Crie seu jogador agora para entrar nos times.</p>
          <button className="btn-primary" onClick={handleOnboardingCreate} style={{ width: '100%', justifyContent: 'center' }}>
            <Plus size={18} /> Criar meu jogador
          </button>
        </div>

        <div className="card animated" style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 8 }}>Já joguei (Selecionar da lista)</h3>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>Seu nome já deve estar listado se você já participou antes. Selecione abaixo:</p>
          <div className="player-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
            {registeredPlayers.filter(p => !p.userId).length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: 14, gridColumn: '1 / -1', textAlign: 'center', padding: '20px 0' }}>Nenhum jogador sem dono encontrado.</p>
            )}
            {registeredPlayers.filter(p => !p.userId).sort((a, b) => a.name.localeCompare(b.name)).map(p => (
              <button key={p.id} className="btn-primary" onClick={() => handleOnboardingSelect(p.id)} style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text-main)', justifyContent: 'center', paddingTop: 12, paddingBottom: 12 }}>
                {p.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default Auth;
