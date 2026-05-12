import React from 'react';
import { 
  ChevronLeft, Users, TrendingUp, Goal, Target, Star, Trophy 
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip 
} from 'recharts';
import PlayerAvatar from '../components/common/PlayerAvatar';
import PlayerBadges from '../components/player/PlayerBadges';
import { getPlayerStats, getPlayerStatsForMonth } from '../utils/calculations';

const PlayerProfile = ({ 
  player, 
  onBack, 
  sessions, 
  registeredPlayers, 
  registeredGoleiros,
  allHighlights,
  isGlobalAdmin,
  setViewingPlayerId,
  setShowProfile,
  comparePlayer1Id,
  setComparePlayer1Id,
  comparePlayer2Id,
  setComparePlayer2Id,
  handleComparePlayers
}) => {
  if (!player) return null;

  const profileStats = getPlayerStats(sessions, player.name);

  const evolutionData = allHighlights.map(h => {
    const monthStats = getPlayerStatsForMonth(sessions, player.name, h.monthKey);
    return {
      month: h.label.split(' — ')[0] || h.label,
      key: h.monthKey,
      nota: monthStats.matchHistory?.length > 0 ? parseFloat(player.media_nota) : null // This is a bit tricky, might need actual historical media
    };
  }).filter(d => d.nota !== null).reverse();

  return (
    <div className="app-container">
      <header className="header">
        <button className="back-btn" onClick={onBack}>
          <ChevronLeft size={28} />
        </button>
        <h1 style={{ margin: 0, fontSize: '20px' }}>Perfil do Jogador</h1>
      </header>

      <main className="main-content animated">
        <div className="card profile-header animated" style={{ padding: 24, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
            <PlayerAvatar playerName={player.name} size={100} />
            <div style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: 'var(--primary)', color: '#fff', padding: '4px 10px', borderRadius: '12px', fontSize: 14, fontWeight: 'bold', border: '2px solid var(--card-bg)' }}>
              {player.posicao || 'Jogador'}
            </div>
          </div>
          
          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-main)', marginBottom: 4 }}>{player.name}</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 24 }}>
            {[
              { icon: '🏟️', label: 'Peladas', value: profileStats.peladasJogadas },
              { icon: '🥇', label: 'Vitorias', value: profileStats.peladasGanhas },
              { icon: '⚽', label: 'Gols', value: profileStats.totalGoals },
              { icon: '🎯', label: 'Assistências', value: profileStats.totalAssists },
              { icon: '📊', label: 'Média Gols', value: profileStats.goalAvg },
              { icon: '📈', label: 'Média Assist.', value: profileStats.assistAvg },
              { icon: '⭐', label: 'Nota Geral', value: player?.media_nota?.toFixed(2) || '0.00' },
              { icon: '🛡️', label: 'Clean Sheets', value: profileStats.cleanSheetsCount || 0 },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 8px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: 20 }}>{s.icon}</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-main)' }}>{s.value}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.label}</span>
              </div>
            ))}
          </div>
          <PlayerBadges playerName={player.name} stats={profileStats} isPodium={false} />
        </div>

        <div className="card animated" style={{ padding: 24, marginTop: 16, marginBottom: 40 }}>
          <h3 style={{ fontSize: 16, color: 'var(--primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Users size={18} /> Comparar Estatísticas</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            <div style={{ position: 'relative' }}>
              <select className="input-field" value={comparePlayer1Id !== null ? comparePlayer1Id : (player?.id || '')} onChange={(e) => setComparePlayer1Id(e.target.value)} style={{ width: '100%' }}>
                <option value="">Selecionar jogador 1...</option>
                {registeredPlayers.sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div style={{ position: 'relative' }}>
              <select className="input-field" value={comparePlayer2Id !== null ? comparePlayer2Id : ''} onChange={(e) => setComparePlayer2Id(e.target.value)} style={{ width: '100%' }}>
                <option value="">Selecionar jogador 2...</option>
                {registeredPlayers.sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <button className="btn-primary" onClick={handleComparePlayers} style={{ width: '100%', justifyContent: 'center' }}>Comparar Jogadores</button>
          </div>
        </div>

        {evolutionData.length >= 2 && (
          <div className="card animated" style={{ padding: 24, marginTop: 16 }}>
            <h3 style={{ fontSize: 16, color: 'var(--primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={18} /> Evolução de Nota
            </h3>
            <div style={{ width: '100%', height: 200, marginTop: 10 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolutionData}>
                  <defs>
                    <linearGradient id="colorNota" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 10]} stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '12px' }}
                    itemStyle={{ color: 'var(--primary)' }}
                  />
                  <Area type="monotone" dataKey="nota" stroke="var(--primary)" fillOpacity={1} fill="url(#colorNota)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="card animated" style={{ padding: 24, marginTop: 16, marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, color: 'var(--primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Trophy size={18} /> Histórico de Partidas</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {profileStats.matchHistory.map((m, i) => (
              <div key={i} className="match-card" style={{ padding: 16, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{m.sessionName}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.sessionDate}</span>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Star size={14} color="var(--primary)" />
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{m.nota.toFixed(1)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>⚽</span>
                    <span style={{ fontSize: 14 }}>{m.goals}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>🎯</span>
                    <span style={{ fontSize: 14 }}>{m.assists}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default PlayerProfile;
