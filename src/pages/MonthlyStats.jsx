import React from 'react';
import { ChevronLeft, Trophy, Star } from 'lucide-react';
import PlayerAvatar from '../components/common/PlayerAvatar';
import PlayerBadges from '../components/player/PlayerBadges';
import SoccerField from '../components/session/SoccerField';
import { getPlayerStatsForMonth, getPlayersStatsForMonth } from '../utils/calculations';

const MonthlyStats = ({ 
  sessions, 
  registeredPlayers, 
  registeredGoleiros,
  selectedMonthKey, 
  setSelectedMonthKey,
  currentMonthKey,
  months,
  monthNames,
  onBack,
  expandedPlayerStats,
  togglePlayerStats,
  setViewingPlayerId,
  setShowProfile,
  isGlobalAdmin,
  updateManualBadge,
  handleRemoveBadge
}) => {
  const monthKey = selectedMonthKey || currentMonthKey;
  const monthSessions = sessions.filter(s => {
    if (!s.date || typeof s.date !== 'string') return false;
    const parts = s.date.split('/');
    if (parts.length !== 3) return false;
    const mY = `${(parts[1] || '').padStart(2, '0')}/${parts[2]}`;
    return mY === monthKey;
  });

  const monthStats = getPlayersStatsForMonth(sessions, registeredPlayers, monthKey);

  const teamOfMonth = (() => {
    if (!monthStats || monthStats.length === 0) return null;
    const playersArray = monthStats.map(p => ({
      ...p,
      mvpScore: p.media_nota
    }));
    const atacantes = playersArray.filter(p => p.posicao === 'Atacante').sort((a, b) => (b.mvpScore || 0) - (a.mvpScore || 0)).slice(0, 2);
    const meias = playersArray.filter(p => p.posicao === 'Meia').sort((a, b) => (b.mvpScore || 0) - (a.mvpScore || 0)).slice(0, 2);
    const zagueiros = playersArray.filter(p => p.posicao === 'Zagueiro').sort((a, b) => (b.mvpScore || 0) - (a.mvpScore || 0)).slice(0, 2);

    if (atacantes.length === 0 && meias.length === 0 && zagueiros.length === 0) {
      const sorted = [...playersArray].sort((a, b) => (b.mvpScore || 0) - (a.mvpScore || 0));
      return {
        atacantes: sorted.slice(0, 2),
        meias: sorted.slice(2, 4),
        zagueiros: sorted.slice(4, 6)
      };
    }

    return { atacantes, meias, zagueiros };
  })();

  const currentMonthLabel = monthKey ? `${monthNames[monthKey.split('/')[0]] || monthKey.split('/')[0]} ${monthKey.split('/')[1]}` : '';

  return (
    <div className="app-container">
      <header className="header" style={{ gap: '16px' }}>
        <button className="back-btn" onClick={onBack}>
          <ChevronLeft size={28} />
        </button>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h1 style={{ margin: 0, fontSize: '20px' }}>Estatísticas por Mês</h1>
          {monthKey && <span style={{ fontSize: 13, color: 'var(--primary)', fontWeight: '600' }}>{monthNames[monthKey.split('/')[0]]} {monthKey.split('/')[1]}</span>}
        </div>
      </header>

      <main className="main-content animated">
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '16px', marginBottom: '8px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
          {months.map(m => (
            <button
              key={m.key}
              onClick={() => setSelectedMonthKey(m.key)}
              style={{
                padding: '10px 20px',
                borderRadius: '12px',
                whiteSpace: 'nowrap',
                backgroundColor: (monthKey === m.key) ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                color: (monthKey === m.key) ? '#fff' : 'var(--text-muted)',
                border: '1px solid rgba(255,255,255,0.1)',
                fontSize: 14,
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Time do Mês */}
        {teamOfMonth && (teamOfMonth.atacantes?.length > 0 || teamOfMonth.meias?.length > 0 || teamOfMonth.zagueiros?.length > 0) && (
          <div className="soccer-field-container animated" style={{ marginBottom: 24 }}>
            <h4 style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Time do Mês — {currentMonthLabel}
            </h4>
            <div className="soccer-field">
              <div className="field-line field-center-line"></div>
              <div className="field-line field-center-circle"></div>
              <div className="field-line field-penalty-area-top"></div>
              <div className="field-line field-penalty-area-bottom"></div>

              <SoccerField
                players={teamOfMonth.atacantes || []}
                type="Atacante"
                sourceRatings={[]}
                isHighlights={true}
                registeredPlayers={registeredPlayers}
                registeredGoleiros={registeredGoleiros}
                onPlayerClick={(pObj) => {
                  setViewingPlayerId(pObj.id);
                  setShowProfile(true);
                }}
              />
              <SoccerField
                players={teamOfMonth.meias || []}
                type="Meia"
                sourceRatings={[]}
                isHighlights={true}
                registeredPlayers={registeredPlayers}
                registeredGoleiros={registeredGoleiros}
                onPlayerClick={(pObj) => {
                  setViewingPlayerId(pObj.id);
                  setShowProfile(true);
                }}
              />
              <SoccerField
                players={teamOfMonth.zagueiros || []}
                type="Zagueiro"
                sourceRatings={[]}
                isHighlights={true}
                registeredPlayers={registeredPlayers}
                registeredGoleiros={registeredGoleiros}
                onPlayerClick={(pObj) => {
                  setViewingPlayerId(pObj.id);
                  setShowProfile(true);
                }}
              />
            </div>
          </div>
        )}

        {/* Similar logic to ranking in App.jsx but filtered by month */}
        <div className="card animated" style={{ padding: 24, marginBottom: 24 }}>
           <h3 style={{ marginBottom: 16 }}>Ranking do Mês</h3>
           {monthStats.length === 0 ? (
             <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Nenhuma pelada registrada neste mês.</p>
           ) : (
             <div className="player-list">
               {monthStats.map(p => (
                 <div key={p.id} className="player-card animated" onClick={() => togglePlayerStats(p.id)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <PlayerAvatar playerName={p.name} size={40} onClick={(e) => {
                          e.stopPropagation();
                          setViewingPlayerId(p.id);
                          setShowProfile(true);
                        }} />
                        <div>
                          <div style={{ fontWeight: 'bold' }}>{p.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.total_vitorias}V | {p.total_gols}G | {p.total_assistencias}A</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                       <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{p.media_nota.toFixed(2)}</span>
                    </div>
                 </div>
               ))}
             </div>
           )}
        </div>
      </main>
    </div>
  );
};

export default MonthlyStats;
