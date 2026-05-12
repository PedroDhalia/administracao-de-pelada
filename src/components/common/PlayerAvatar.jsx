import React from 'react';
import { Star } from 'lucide-react';

const PlayerAvatar = ({ playerName, userId, users = [], registeredPlayers = [], registeredGoleiros = [], size = 32, onClick, setSelectedAvatar }) => {
  let avatarUrl = null;
  let initial = '?';

  if (userId) {
    const u = users.find(us => us.id == userId);
    if (u) {
      initial = (u.name || '').charAt(0).toUpperCase();
      if (u.avatar) avatarUrl = u.avatar;
    }
  }

  if (!avatarUrl && playerName) {
    const searchName = String(playerName).trim().toLowerCase();
    initial = searchName.charAt(0).toUpperCase();
    const rp = registeredPlayers.find(r => (r.name || '').trim().toLowerCase() === searchName) ||
               registeredGoleiros.find(r => (r.name || '').trim().toLowerCase() === searchName);
    if (rp && rp.userId) {
      const u = users.find(us => us.id == rp.userId);
      if (u && u.avatar) avatarUrl = u.avatar;
    }
  }

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={playerName || ''}
        onClick={(e) => { 
          if (onClick) {
            onClick(e);
          } else if (setSelectedAvatar) {
            e.stopPropagation(); 
            setSelectedAvatar(avatarUrl); 
          }
        }}
        style={{ 
          width: size, 
          height: size, 
          borderRadius: '50%', 
          objectFit: 'cover', 
          flexShrink: 0, 
          border: '2px solid rgba(255,255,255,0.1)', 
          cursor: 'pointer', 
          boxSizing: 'border-box' 
        }}
        loading="lazy"
      />
    );
  }

  return (
    <div style={{ 
      width: size, 
      height: size, 
      borderRadius: '50%', 
      backgroundColor: 'rgba(255,255,255,0.1)', 
      color: '#fff', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      fontWeight: 'bold', 
      fontSize: size * 0.45, 
      flexShrink: 0, 
      border: '2px solid rgba(255,255,255,0.1)', 
      boxSizing: 'border-box' 
    }}>
      {initial}
    </div>
  );
};

export default PlayerAvatar;
