import React from 'react';
import { Trophy, Shield } from 'lucide-react';

const PlayerBadges = ({ playerName, stats, isPodium = false, monthKey = null }) => {
  if (!playerName || !stats) return null;
  
  const hasBadges = stats.artilheiroCount > 0 || stats.garcomCount > 0 || stats.mvpCount > 0 || stats.puskasWins > 0 || playerName.trim().toLowerCase() === 'digaum';

  const badgeStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontFamily: "'Outfit', sans-serif",
    border: '1px solid transparent',
    transition: 'transform 0.2s'
  };

  if (isPodium) {
    return (
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        justifyContent: 'center', 
        alignContent: 'flex-start', 
        gap: '4px', 
        marginBottom: '4px', 
        width: '100%', 
        height: '52px', 
        overflow: 'hidden',
        padding: '0 2px' 
      }}>
        <div style={{ 
          ...badgeStyle, 
          backgroundColor: 'var(--badge-gold-bg)', 
          color: 'var(--badge-gold)', 
          borderColor: 'var(--badge-gold-border)',
          padding: '2px 6px',
          fontSize: '9px',
          gap: '3px'
        }} title={"Vitórias: " + (stats.peladasGanhas || 0) + " | Win Rate: " + (stats.winRate || 0) + "%"}>
          <Trophy size={10} color="var(--badge-gold)" />
          <strong>{(stats.peladasGanhas || 0)}V</strong>
        </div>
        {stats.artilheiroCount > 0 && (
          <div style={{ 
            ...badgeStyle, 
            backgroundColor: 'var(--badge-artilheiro-bg)', 
            color: 'var(--badge-artilheiro)', 
            borderColor: 'var(--badge-artilheiro-border)',
            padding: '2px 6px',
            fontSize: '9px',
            gap: '3px'
          }} title="Artilheiro">
            <span>⚽</span><strong>{stats.artilheiroCount}x</strong>
          </div>
        )}
        {stats.garcomCount > 0 && (
          <div style={{ 
            ...badgeStyle, 
            backgroundColor: 'var(--badge-garcom-bg)', 
            color: 'var(--badge-garcom)', 
            borderColor: 'var(--badge-garcom-border)',
            padding: '2px 6px',
            fontSize: '9px',
            gap: '3px'
          }} title="Garçom">
            <span>🎯</span><strong>{stats.garcomCount}x</strong>
          </div>
        )}
        {stats.mvpCount > 0 && (
          <div style={{ 
            ...badgeStyle, 
            backgroundColor: 'var(--badge-mvp-bg)', 
            color: 'var(--badge-mvp)', 
            borderColor: 'var(--badge-mvp-border)',
            padding: '2px 6px',
            fontSize: '9px',
            gap: '3px'
          }} title="MVP">
            <span>⭐</span><strong>{stats.mvpCount}x</strong>
          </div>
        )}
        {stats.puskasWins > 0 && (
          <div style={{ 
            ...badgeStyle, 
            backgroundColor: 'var(--badge-puskas-bg)', 
            color: 'var(--badge-puskas)', 
            borderColor: 'var(--badge-puskas-border)',
            padding: '2px 6px',
            fontSize: '9px',
            gap: '3px'
          }} title="Puskas">
            <span>👟</span><strong>{stats.puskasWins}x</strong>
          </div>
        )}
        {playerName.trim().toLowerCase() === 'digaum' && (
          <div style={{ 
            ...badgeStyle, 
            backgroundColor: 'var(--badge-contra-bg)', 
            color: 'var(--badge-contra)', 
            borderColor: 'var(--badge-contra-border)',
            padding: '2px 6px',
            fontSize: '9px',
            gap: '3px'
          }} title="Gol Contra">
            <span>❌</span><strong>{monthKey === '05/2026' ? '1x' : '2x'}</strong>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexWrap: 'wrap', 
      justifyContent: 'center', 
      alignItems: 'center', 
      gap: '8px', 
      borderTop: '1px solid var(--border)', 
      paddingTop: '12px' 
    }}>
      <div style={{ 
        ...badgeStyle, 
        backgroundColor: 'var(--badge-gold-bg)', 
        color: 'var(--badge-gold)', 
        borderColor: 'var(--badge-gold-border)' 
      }}>
        <Trophy size={14} color="var(--badge-gold)" />
        <span>Vitórias: <strong style={{ color: '#fff' }}>{stats.peladasGanhas || 0}</strong> | Win Rate: <strong style={{ color: '#fff' }}>{stats.winRate || 0}%</strong></span>
      </div>
      
      {stats.cleanSheetsCount > 0 && (
        <div style={{ 
          ...badgeStyle, 
          backgroundColor: 'var(--badge-clean-sheets-bg)', 
          color: 'var(--badge-clean-sheets)', 
          borderColor: 'var(--badge-clean-sheets-border)' 
        }}>
          <Shield size={14} color="var(--badge-clean-sheets)" />
          <span>Clean Sheets: <strong style={{ color: '#fff' }}>{stats.cleanSheetsCount}</strong></span>
        </div>
      )}

      {hasBadges && (
        <div style={{ width: '1px', height: '14px', backgroundColor: 'var(--border)', margin: '0 4px' }}></div>
      )}

      {stats.artilheiroCount > 0 && (
        <div style={{ 
          ...badgeStyle, 
          backgroundColor: 'var(--badge-artilheiro-bg)', 
          color: 'var(--badge-artilheiro)', 
          borderColor: 'var(--badge-artilheiro-border)' 
        }} title="Artilheiro (Mais gols numa pelada)">
          <span>⚽</span>
          <span>Artilheiro</span>
          <strong style={{ color: '#fff' }}>{stats.artilheiroCount}x</strong>
        </div>
      )}

      {stats.garcomCount > 0 && (
        <div style={{ 
          ...badgeStyle, 
          backgroundColor: 'var(--badge-garcom-bg)', 
          color: 'var(--badge-garcom)', 
          borderColor: 'var(--badge-garcom-border)' 
        }} title="Garçom (Mais assistências numa pelada)">
          <span>🎯</span>
          <span>Garçom</span>
          <strong style={{ color: '#fff' }}>{stats.garcomCount}x</strong>
        </div>
      )}

      {stats.mvpCount > 0 && (
        <div style={{ 
          ...badgeStyle, 
          backgroundColor: 'var(--badge-mvp-bg)', 
          color: 'var(--badge-mvp)', 
          borderColor: 'var(--badge-mvp-border)' 
        }} title="MVP (Maior nota na pelada)">
          <span>⭐</span>
          <span>MVP</span>
          <strong style={{ color: '#fff' }}>{stats.mvpCount}x</strong>
        </div>
      )}

      {stats.puskasWins > 0 && (
        <div style={{ 
          ...badgeStyle, 
          backgroundColor: 'var(--badge-puskas-bg)', 
          color: 'var(--badge-puskas)', 
          borderColor: 'var(--badge-puskas-border)' 
        }} title="Prêmio Puskas (Melhor Gol)">
          <span>👟</span>
          <span>Puskas</span>
          <strong style={{ color: '#fff' }}>{stats.puskasWins}x</strong>
        </div>
      )}

      {playerName.trim().toLowerCase() === 'digaum' && (
        <div style={{ 
          ...badgeStyle, 
          backgroundColor: 'var(--badge-contra-bg)', 
          color: 'var(--badge-contra)', 
          borderColor: 'var(--badge-contra-border)' 
        }} title="Gol Contra">
          <span>❌</span>
          <span>Contra</span>
          <strong style={{ color: '#fff' }}>{monthKey === '05/2026' ? '1x' : '2x'}</strong>
        </div>
      )}
    </div>
  );
};

export default PlayerBadges;
