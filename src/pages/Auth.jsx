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
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px' }}>
        <div className="card animated" style={{ padding: '40px 32px', width: '100%', maxWidth: 400, boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: 80, 
              height: 80, 
              borderRadius: '24px', 
              backgroundColor: 'var(--primary-glow)', 
              color: 'var(--primary)',
              marginBottom: 16,
              fontSize: 32,
              fontWeight: 800,
              fontFamily: "'Outfit', sans-serif",
              border: '1.5px solid var(--border-active)'
            }}>
              🏟️
            </div>
            <h2 style={{ color: 'var(--text-main)', margin: 0, fontSize: 24, fontFamily: "'Outfit', sans-serif", fontWeight: 800 }}>
              {authMode === 'login' ? 'Área do Atleta' : 'Novo Cadastro'}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
              {authMode === 'login' ? 'Acesse suas estatísticas de pelada' : 'Crie sua conta para participar'}
            </p>
          </div>

          {dbError && (
            <div style={{ 
              backgroundColor: 'var(--danger-bg)', 
              border: '1px solid rgba(255, 69, 58, 0.3)', 
              borderRadius: '10px', 
              padding: '14px', 
              marginBottom: '20px', 
              fontSize: '13px', 
              color: 'var(--danger)', 
              textAlign: 'center' 
            }}>
              <p style={{ margin: 0, fontWeight: 'bold' }}>Erro de conexão com o banco:</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '11px', opacity: 0.8 }}>{dbError}</p>
            </div>
          )}

          {authMode === 'login' ? (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <input name="email" type="email" placeholder="Seu email" required className="input-field" />
              <input name="password" type="password" placeholder="Sua senha" required className="input-field" />
              <button type="submit" className="btn-primary" style={{ width: '100%', height: 46, fontSize: 15 }}>Entrar</button>
              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
                Não tem conta? <span style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }} onClick={() => setAuthMode('register')}>Cadastre-se</span>
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegisterUser} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <input name="name" type="text" placeholder="Nome Completo" required className="input-field" />
              <input name="email" type="email" placeholder="Email" required className="input-field" />
              <input name="password" type="password" placeholder="Senha de Acesso" required className="input-field" />
              <button type="submit" className="btn-primary" style={{ width: '100%', height: 46, fontSize: 15 }}>Criar Conta</button>
              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
                Já tem conta? <span style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }} onClick={() => setAuthMode('login')}>Fazer Login</span>
              </p>
            </form>
          )}
        </div>
      </div>
    );
  }

  if (!currentUser.jogadorId) {
    return (
      <div className="app-container" style={{ padding: '32px 20px', maxWidth: 540, margin: '0 auto', justifyContent: 'center', minHeight: '100vh' }}>
        <h2 style={{ textAlign: 'center', color: 'var(--text-main)', fontSize: 24, fontWeight: 800, fontFamily: "'Outfit', sans-serif", marginBottom: 8 }}>
          Quase lá, {currentUser.name.split(' ')[0]}! ⚽
        </h2>
        <p style={{ textAlign: 'center', marginBottom: 32, color: 'var(--text-muted)', fontSize: 14 }}>
          Precisamos vincular seu perfil de usuário a um jogador cadastrado para exibir suas estatísticas.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32, gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <PlayerAvatar 
              playerName={currentUser.name} 
              userId={currentUser.id} 
              size={100} 
              users={users}
              registeredPlayers={registeredPlayers}
              registeredGoleiros={registeredGoleiros}
            />
            {isUploading && (
              <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                <span style={{ fontSize: 18 }}>⏳</span>
              </div>
            )}
          </div>
          <label className="icon-btn" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', fontSize: 13, fontWeight: '600', color: 'var(--primary)', border: '1px solid var(--border-active)', borderRadius: '20px', backgroundColor: 'var(--primary-glow)' }}>
            <Camera size={14} /> Carregar Foto de Perfil
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
          </label>
        </div>

        <div className="card animated" style={{ padding: 24, marginBottom: 20 }}>
          <h3 style={{ marginBottom: 6, fontSize: 16, fontFamily: "'Outfit', sans-serif" }}>Novo Jogador</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
            Se você nunca jogou com essa galera antes, crie um novo jogador associado à sua conta.
          </p>
          <button className="btn-primary" onClick={handleOnboardingCreate} style={{ width: '100%', height: 42 }}>
            <Plus size={16} /> Criar meu jogador
          </button>
        </div>

        <div className="card animated" style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 6, fontSize: 16, fontFamily: "'Outfit', sans-serif" }}>Já joguei (Vincular Nome)</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
            Se você já participou das peladas, seu nome já deve estar cadastrado na lista abaixo. Selecione-o:
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
            {registeredPlayers.filter(p => !p.userId).length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: 13, gridColumn: '1 / -1', textAlign: 'center', padding: '20px 0' }}>
                Nenhum jogador disponível para vinculação.
              </p>
            )}
            {registeredPlayers.filter(p => !p.userId).sort((a, b) => a.name.localeCompare(b.name)).map(p => (
              <button 
                key={p.id} 
                className="icon-btn" 
                onClick={() => handleOnboardingSelect(p.id)} 
                style={{ 
                  backgroundColor: 'var(--surface-light)', 
                  border: '1px solid var(--border)', 
                  color: 'var(--text-main)', 
                  justifyContent: 'center', 
                  padding: '12px 8px',
                  borderRadius: '12px',
                  fontWeight: '600',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
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
