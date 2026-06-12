import React from 'react';
import { Star } from 'lucide-react';
import PlayerAvatar from '../common/PlayerAvatar';
import { getNotaColor } from '../../utils/calculations';
import { getTextColor } from '../../utils/helpers';

const SoccerField = ({ 
  players, 
  type, 
  sourceRatings, 
  isHighlights = false, 
  users, 
  registeredPlayers, 
  registeredGoleiros, 
  setViewingPlayerId, 
  setShowProfile,
  onPlayerClick
}) => {
  const count = players.length;
  if (count === 0) return <div style={{ height: 60 }}></div>;

  const allRatings = sourceRatings.length > 0 ? sourceRatings : (players.map(p => ({ name: p.name, nota: p.mvpScore || 0 })));
  const maxNota = Math.max(...allRatings.map(r => r.nota || 0));
  const isInitialState = allRatings.every(r => r.nota === 7.0);
  const showMVP = !isInitialState && maxNota > 0;

  let rowGap = '15px';
  if (count === 2) {
    if (type === 'Zagueiro') rowGap = '50px';
    else if (type === 'Meia') rowGap = '35px';
    else if (type === 'Atacante') rowGap = '25px';
  }

  return (
    <div className="field-row" style={{ position: 'relative', '--row-gap': rowGap }}>
      {players.map((p, idx) => {
        let style = { transition: 'all 0.3s ease' };
        let nota = 0;
        if (p.mvpScore !== undefined) {
          nota = p.mvpScore;
        } else {
          const pName = p.name || '';
          const r = sourceRatings.find(sr => (sr.name || '').trim().toLowerCase() === pName.trim().toLowerCase());
          nota = r ? r.nota : 0;
        }

        const isMVP = nota > 0 && nota === maxNota;

        if (type === 'Atacante') {
          if (count === 2) {
            style.transform = 'translateY(-3px)';
          } else if (count === 3) {
            if (idx === 1) style.transform = 'translateY(-8px)';
            else style.transform = 'translateY(5px)';
          } else if (count === 4) {
            if (idx === 1 || idx === 2) style.transform = 'translateY(-5px)';
            else {
              style.transform = 'translateY(12px)';
              style.margin = '0 10px';
            }
          }
        } else if (type === 'Meia') {
          if (count === 2) {
            style.transform = 'translateY(0)';
          } else if (count === 3) {
            if (idx === 1) style.transform = 'translateY(10px)';
            else style.transform = 'translateY(-5px)';
          }
        } else if (type === 'Zagueiro') {
          if (count === 2) {
            style.transform = 'translateY(3px)';
          } else if (count === 3) {
            if (idx === 1) style.transform = 'translateY(8px)';
            else style.transform = 'translateY(-5px)';
          } else if (count === 4) {
            if (idx === 1 || idx === 2) style.transform = 'translateY(8px)';
            else style.transform = 'translateY(-8px)';
          }
        }

        const hasGoals = p.goals > 0;
        const hasAssists = p.assists > 0;

        return (
          <div
            key={p.id || p.name}
            className="field-player"
            style={{ ...style, cursor: 'pointer' }}
            onClick={() => {
              const pObj = registeredPlayers.find(rp => (rp.name || '').trim().toLowerCase() === (p.name || '').trim().toLowerCase()) ||
                           registeredGoleiros.find(rg => (rg.name || '').trim().toLowerCase() === (p.name || '').trim().toLowerCase());
              if (pObj) {
                if (onPlayerClick) {
                  onPlayerClick(pObj);
                } else if (setViewingPlayerId && setShowProfile) {
                  setViewingPlayerId(pObj.id);
                  setShowProfile(true);
                }
              }
            }}
            title="Ver perfil"
          >
            <div style={{ position: 'relative', width: 45, height: 45, margin: '0 auto' }}>
              <PlayerAvatar 
                playerName={p.name} 
                size={45} 
                users={users}
                registeredPlayers={registeredPlayers}
                registeredGoleiros={registeredGoleiros}
                onClick={(e) => {
                  e.stopPropagation();
                  const pObj = registeredPlayers.find(rp => (rp.name || '').trim().toLowerCase() === (p.name || '').trim().toLowerCase()) ||
                               registeredGoleiros.find(rg => (rg.name || '').trim().toLowerCase() === (p.name || '').trim().toLowerCase());
                  if (pObj) {
                    if (onPlayerClick) {
                      onPlayerClick(pObj);
                    } else if (setViewingPlayerId && setShowProfile) {
                      setViewingPlayerId(pObj.id);
                      setShowProfile(true);
                    }
                  }
                }}
              />

              {!isHighlights && showMVP && isMVP && (
                <div style={{
                  position: 'absolute', top: -2, left: -8,
                  width: 16, height: 16, borderRadius: '50%',
                  backgroundColor: 'var(--gold)', border: '1.5px solid var(--surface-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 12, boxShadow: '0 2px 6px rgba(0,0,0,0.4)'
                }}>
                  <Star size={10} color="var(--text-dark)" fill="var(--text-dark)" />
                </div>
              )}

              {!isHighlights && hasGoals && (
                <div style={{
                  position: 'absolute', top: -4, left: 38,
                  display: 'flex', alignItems: 'center', gap: '2px',
                  zIndex: 11, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))'
                }}>
                  <span style={{ fontSize: '13px' }}>⚽</span>
                  {p.goals > 1 && <span style={{ fontSize: '10px', fontWeight: '900', color: '#fff', textShadow: '0 0 2px #000' }}>{p.goals}</span>}
                </div>
              )}

              {!isHighlights && hasAssists && (
                <div style={{
                  position: 'absolute', top: hasGoals ? 14 : -4, left: 38,
                  display: 'flex', alignItems: 'center', gap: '2px',
                  zIndex: 11, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))'
                }}>
                  <span style={{ fontSize: '13px' }}>🎯</span>
                  {p.assists > 1 && <span style={{ fontSize: '10px', fontWeight: '900', color: '#fff', textShadow: '0 0 2px #000' }}>{p.assists}</span>}
                </div>
              )}
            </div>

            <span className="field-player-name" style={{ marginTop: '14px', fontSize: '10px' }}>{p.name}</span>
            <span className="field-player-nota" style={{
              backgroundColor: getNotaColor(nota),
              color: getTextColor(getNotaColor(nota)),
              boxShadow: (!isHighlights && showMVP && isMVP) ? '0 0 10px var(--gold)' : 'none',
              zIndex: 10,
              fontSize: '10.5px',
              padding: '2px 6px'
            }}>{nota.toFixed(1)}</span>
          </div>
        );
      })}
    </div>
  );
};

export default SoccerField;
