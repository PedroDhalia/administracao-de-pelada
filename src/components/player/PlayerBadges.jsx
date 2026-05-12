import React from 'react';
import { Trophy } from 'lucide-react';

const PlayerBadges = ({ playerName, stats, isPodium = false, monthKey = null }) => {
  if (!playerName || !stats) return null;
  
  const hasBadges = stats.artilheiroCount > 0 || stats.garcomCount > 0 || stats.mvpCount > 0 || stats.puskasWins > 0 || playerName.trim().toLowerCase() === 'digaum';

  if (isPodium) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '4px', marginBottom: '8px', maxWidth: '100%', padding: '0 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', backgroundColor: 'rgba(255,255,255,0.05)', padding: '2px 4px', borderRadius: '4px', fontSize: 10 }} title={"Vitorias: " + (stats.peladasGanhas || 0) + " | Win Rate: " + (stats.winRate || 0) + "%"}>
          <Trophy size={10} color="#eab308" />
          <strong style={{ color: '#eab308' }}>{(stats.peladasGanhas || 0)}V ({(stats.winRate || 0)}%)</strong>
        </div>
        {stats.artilheiroCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', backgroundColor: 'rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: '4px', fontSize: 10 }} title="Artilheiro">
            <span>⚽</span><strong style={{ color: 'var(--text-main)' }}>{stats.artilheiroCount}x</strong>
          </div>
        )}
        {stats.garcomCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', backgroundColor: 'rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: '4px', fontSize: 10 }} title="Garçom">
            <span>🎯</span><strong style={{ color: 'var(--text-main)' }}>{stats.garcomCount}x</strong>
          </div>
        )}
        {stats.mvpCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', backgroundColor: 'rgba(234, 179, 8, 0.2)', padding: '2px 4px', borderRadius: '4px', border: '1px solid rgba(234, 179, 8, 0.3)', fontSize: 10 }} title="MVP">
            <span>⭐</span><strong style={{ color: '#eab308' }}>{stats.mvpCount}x</strong>
          </div>
        )}
        {stats.puskasWins > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', backgroundColor: 'rgba(234, 179, 8, 0.2)', padding: '2px 4px', borderRadius: '4px', border: '1px solid rgba(234, 179, 8, 0.3)', fontSize: 10 }} title="Puskas">
            <span>👟</span><strong style={{ color: '#eab308' }}>{stats.puskasWins}x</strong>
          </div>
        )}
        {playerName.trim().toLowerCase() === 'digaum' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', backgroundColor: 'rgba(239, 68, 68, 0.2)', padding: '2px 4px', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: 10 }} title="Gol Contra">
            <span>❌</span><strong style={{ color: '#ef4444' }}>{monthKey === '05/2026' ? '1x' : '2x'}</strong>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: 14, color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <Trophy size={16} color="#eab308" />
        <span>Vitorias: <strong style={{ color: '#eab308' }}>{stats.peladasGanhas || 0}</strong> | Win Rate: <strong style={{ color: '#eab308' }}>{stats.winRate || 0}%</strong></span>
      </div>

      {hasBadges && (
        <div style={{ width: '1px', height: '14px', backgroundColor: 'rgba(255,255,255,0.1)', margin: '0 4px' }}></div>
      )}

      {stats.artilheiroCount > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px' }} title="Artilheiro (Mais gols numa pelada)">
          <span style={{ fontSize: 14 }}>⚽</span>
          <span style={{ fontSize: 12, color: 'var(--text-main)' }}>Artilheiro</span>
          <span style={{ fontWeight: 'bold', color: 'var(--text-main)', fontSize: 12 }}>{stats.artilheiroCount}x</span>
        </div>
      )}

      {stats.garcomCount > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px' }} title="Garçom (Mais assistências numa pelada)">
          <span style={{ fontSize: 14 }}>🎯</span>
          <span style={{ fontSize: 12, color: 'var(--text-main)' }}>Garçom</span>
          <span style={{ fontWeight: 'bold', color: 'var(--text-main)', fontSize: 12 }}>{stats.garcomCount}x</span>
        </div>
      )}

      {stats.mvpCount > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(234, 179, 8, 0.2)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(234, 179, 8, 0.3)' }} title="MVP (Maior nota na pelada)">
          <span style={{ fontSize: 14 }}>⭐</span>
          <span style={{ fontSize: 12, color: '#eab308' }}>MVP</span>
          <span style={{ fontWeight: 'bold', color: '#eab308', fontSize: 12 }}>{stats.mvpCount}x</span>
        </div>
      )}

      {stats.puskasWins > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(234, 179, 8, 0.2)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(234, 179, 8, 0.3)' }} title="Prêmio Puskas (Melhor Gol)">
          <span style={{ fontSize: 14 }}>👟</span>
          <span style={{ fontSize: 12, color: '#eab308' }}>Puskas</span>
          <span style={{ fontWeight: 'bold', color: '#eab308', fontSize: 12 }}>{stats.puskasWins}x</span>
        </div>
      )}

      {playerName.trim().toLowerCase() === 'digaum' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(239, 68, 68, 0.2)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.3)' }} title="Gol Contra">
          <span style={{ fontSize: 14 }}>❌</span>
          <span style={{ fontSize: 12, color: '#ef4444' }}>Gol Contra</span>
          <span style={{ fontWeight: 'bold', color: '#ef4444', fontSize: 12 }}>{monthKey === '05/2026' ? '1x' : '2x'}</span>
        </div>
      )}
    </div>
  );
};

export default PlayerBadges;
