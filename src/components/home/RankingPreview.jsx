import PlayerAvatar from '../common/PlayerAvatar';
import './Home.css';

const getRankingColor = (nota) => {
  if (nota >= 9) return '#22c55e';
  if (nota >= 7) return '#4ade80';
  if (nota >= 5) return '#eab308';
  return '#ef4444';
};

const RankingRow = ({ position, player, isMe, avatarProps, onOpenPlayer }) => (
  <button type="button" className={`home-ranking-row ${isMe ? 'is-me' : ''}`} onClick={() => onOpenPlayer(player)}>
    <span className="home-ranking-pos">{position}º</span>
    <PlayerAvatar {...avatarProps} playerName={player.name} size={32} />
    <span className="home-ranking-info">
      <span className="home-ranking-name">{player.name}{isMe && <span className="home-me-tag">você</span>}</span>
      {player.posicao && <span className="home-ranking-sub">{player.posicao}</span>}
    </span>
    <span className="home-ranking-nota" style={{ color: getRankingColor(player.media_nota || 0) }}>
      {(player.media_nota || 0).toFixed(2)}
    </span>
  </button>
);

// Top 5 geral + a posição de quem está logado (quando fora do top 5).
const RankingPreview = ({ players = [], currentUserRanking, avatarProps, onOpenPlayer }) => {
  if (players.length === 0) {
    return <div className="card home-empty-card">Nenhum jogador pontuou ainda.</div>;
  }
  const myId = currentUserRanking?.player?.id;
  const showMyRow = currentUserRanking && currentUserRanking.position > players.length;

  return (
    <div className="card home-ranking-card">
      {players.map((p, idx) => (
        <RankingRow key={p.id} position={idx + 1} player={p} isMe={p.id === myId} avatarProps={avatarProps} onOpenPlayer={onOpenPlayer} />
      ))}
      {showMyRow && (
        <>
          <div className="home-ranking-divider">Sua posição</div>
          <RankingRow position={currentUserRanking.position} player={currentUserRanking.player} isMe avatarProps={avatarProps} onOpenPlayer={onOpenPlayer} />
        </>
      )}
    </div>
  );
};

export default RankingPreview;
