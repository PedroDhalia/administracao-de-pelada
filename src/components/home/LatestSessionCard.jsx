import { ChevronRight, Trophy } from 'lucide-react';
import PlayerAvatar from '../common/PlayerAvatar';
import { getTeamColor } from '../../utils/helpers';
import './Home.css';

const plural = (count, singular, pluralWord) => `${count} ${count === 1 ? singular : pluralWord}`;

const RoundStat = ({ label, tone, player, value, avatarProps, onOpenPlayer }) => (
  <button
    type="button"
    className={`home-round-stat tone-${tone}`}
    onClick={() => player && onOpenPlayer(player.name)}
    disabled={!player}
    title={player ? 'Ver perfil' : undefined}
  >
    <span className="home-round-label">{label}</span>
    <PlayerAvatar {...avatarProps} playerName={player?.name} size={38} />
    <span className="home-round-name">{player ? player.name : '-'}</span>
    <span className="home-round-value">{player ? value : '-'}</span>
  </button>
);

// Card principal da Home: resultado + destaques da pelada mais recente, juntos.
const LatestSessionCard = ({ data, avatarProps, onOpenSession, onOpenPlayer }) => {
  if (!data) return null;
  const { champions = [], mvp, topScorer, topAssister } = data;
  const hasPlayers = data.playersCount > 0;
  const hasHighlights = !!(mvp || topScorer || topAssister);

  const metaParts = [
    data.sessionDate && `📅 ${data.sessionDate}`,
    data.teamsCount > 0 && plural(data.teamsCount, 'time', 'times'),
    data.matchesCount > 0 && plural(data.matchesCount, 'jogo', 'jogos'),
    data.matchesCount > 0 && plural(data.totalGoals, 'gol', 'gols')
  ].filter(Boolean);

  return (
    <div className="card home-latest-card">
      <button type="button" className="home-latest-head" onClick={onOpenSession}>
        <div className="home-latest-info">
          <span className="home-latest-name">{data.sessionName || 'Pelada'}</span>
          <span className="home-latest-meta">
            {metaParts.map((part, i) => <span key={i}>{part}</span>)}
          </span>
        </div>
        <span className="home-latest-cta">Detalhes <ChevronRight size={14} /></span>
      </button>

      {champions.length > 0 && (
        <div className="home-champion">
          <Trophy size={16} className="home-champion-icon" />
          <div className="home-champion-info">
            <span className="home-champion-label">{champions.length > 1 ? 'Campeões (empate)' : 'Campeão da rodada'}</span>
            <span className="home-champion-teams">
              {champions.map(team => (
                <span key={team.id} className="home-champion-team">
                  <span className="home-team-dot" style={{ background: getTeamColor(team.name) }} />
                  {team.name}
                </span>
              ))}
            </span>
          </div>
          <span className="home-champion-record">
            {champions[0].points} pts
            <small>{champions[0].wins || 0}V {champions[0].draws || 0}E {champions[0].losses || 0}D</small>
          </span>
        </div>
      )}

      {!hasPlayers ? (
        <p className="home-muted">Times ainda não definidos para esta pelada.</p>
      ) : hasHighlights ? (
        <div className="home-round-grid">
          <RoundStat label="👑 MVP" tone="gold" player={mvp} value={mvp ? `Nota ${mvp.nota.toFixed(1)}` : ''} avatarProps={avatarProps} onOpenPlayer={onOpenPlayer} />
          <RoundStat label="⚽ Artilheiro" tone="green" player={topScorer} value={topScorer ? plural(topScorer.goals, 'gol', 'gols') : ''} avatarProps={avatarProps} onOpenPlayer={onOpenPlayer} />
          <RoundStat label="🎯 Garçom" tone="purple" player={topAssister} value={topAssister ? plural(topAssister.assists, 'assist.', 'assist.') : ''} avatarProps={avatarProps} onOpenPlayer={onOpenPlayer} />
        </div>
      ) : (
        <p className="home-muted">Os destaques aparecem assim que gols e resultados forem lançados.</p>
      )}
    </div>
  );
};

export default LatestSessionCard;
