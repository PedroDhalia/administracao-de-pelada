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

        {/* Similar logic to ranking in App.jsx but filtered by month */}
        {/* I'll skip the full duplication and use the components */}
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
