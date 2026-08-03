import { useState, useEffect } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { db } from '../api/firebase';
import { CURRENT_FORMULA_VERSION } from '../constants';
import { calculateSessionPlayerRatings } from '../utils/calculations';

export const useDatabase = () => {
  const [sessions, setSessions] = useState([]);
  const [registeredPlayers, setRegisteredPlayers] = useState([]);
  const [registeredGoleiros, setRegisteredGoleiros] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [dbError, setDbError] = useState(null);
  const [dataSynced, setDataSynced] = useState(false);

  useEffect(() => {
    let timeout;
    try {
      const unsubscribeSessions = onValue(ref(db, 'sessions'), (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setSessions(Array.isArray(data) ? data : Object.values(data));
        } else {
          setSessions([]);
        }
        setIsLoaded(true);
      }, (error) => {
        setDbError(error.message);
        setIsLoaded(true);
      });

      const unsubscribePlayers = onValue(ref(db, 'players'), (snapshot) => {
        const val = snapshot.val();
        setRegisteredPlayers(Array.isArray(val) ? val : (val ? Object.values(val) : []));
      });

      const unsubscribeUsers = onValue(ref(db, 'users'), (snapshot) => {
        const val = snapshot.val();
        setUsers(Array.isArray(val) ? val : (val ? Object.values(val) : []));
      });

      const unsubscribeGoleiros = onValue(ref(db, 'goleiros'), (snapshot) => {
        const val = snapshot.val();
        setRegisteredGoleiros(Array.isArray(val) ? val : (val ? Object.values(val) : []));
      });

      timeout = setTimeout(() => setIsLoaded(true), 4000);

      return () => {
        if (timeout) clearTimeout(timeout);
        unsubscribeSessions();
        unsubscribePlayers();
        unsubscribeUsers();
        unsubscribeGoleiros();
      };
    } catch (err) {
      console.error("Database initialization error:", err);
      setIsLoaded(true);
    }
  }, []);

  const updateSessionsAndStats = (newSessionsList, currentPlayers = registeredPlayers, currentGoleiros = registeredGoleiros) => {
    // 1. Automatically calculate team stats from matches for sessions that have matches registered in memory first
    newSessionsList.forEach(session => {
      if (session.matches) {
        (session.teams || []).forEach(t => {
          let wins = 0, draws = 0, losses = 0;
          (session.matches || []).forEach(m => {
            if (m.team1Id === t.id) {
              if (m.score1 > m.score2) wins++;
              else if (m.score1 === m.score2) draws++;
              else if (m.score1 < m.score2) losses++;
            } else if (m.team2Id === t.id) {
              if (m.score2 > m.score1) wins++;
              else if (m.score2 === m.score1) draws++;
              else if (m.score2 < m.score1) losses++;
            }
          });
          t.wins = wins;
          t.draws = draws;
          t.losses = losses;
        });
      }
    });

    // 2. Write the fully updated sessions list to database
    set(ref(db, 'sessions'), newSessionsList);

    const statsByName = {};
    const statsGoleiroByName = {};

    newSessionsList.forEach(session => {
      const teams = session.teams || [];
      if (teams.length === 0) return;

      const teamsWithPoints = teams.map(t => ({
        ...t,
        points: (t.wins || 0) * 3 + (t.draws || 0) * 1
      })).sort((a, b) => b.points - a.points || (b.wins || 0) - (a.wins || 0));

      const maxPoints = teamsWithPoints.length > 0 ? teamsWithPoints[0].points : 0;
      const maxWins = teamsWithPoints.length > 0 && teamsWithPoints[0].points === maxPoints ? (teamsWithPoints[0].wins || 0) : 0;
      const championTeamIds = teamsWithPoints
        .filter(t => t.points === maxPoints && (t.wins || 0) === maxWins && maxPoints > 0)
        .map(t => t.id);

      teams.forEach(team => {
        const isWinner = championTeamIds.includes(team.id);
        const players = team.players || [];
        players.forEach(p => {
          const normName = p.name.trim().toLowerCase();
          if (!statsByName[normName]) {
            statsByName[normName] = { goals: 0, assists: 0, wins: 0, matchesForNota: 0, artilheiroCount: 0, garcomCount: 0, mvpCount: 0, cleanSheetsCount: 0 };
          }
          statsByName[normName].goals += (p.goals || 0);
          statsByName[normName].assists += (p.assists || 0);
          if (isWinner) statsByName[normName].wins += 1;
        });
      });

      const cleanSheetsByTeam = {};
      if (session.matches) {
        session.matches.forEach(m => {
          if (!cleanSheetsByTeam[m.team1Id]) cleanSheetsByTeam[m.team1Id] = 0;
          if (!cleanSheetsByTeam[m.team2Id]) cleanSheetsByTeam[m.team2Id] = 0;
          if (m.score2 === 0) cleanSheetsByTeam[m.team1Id]++;
          if (m.score1 === 0) cleanSheetsByTeam[m.team2Id]++;
        });
      }

      teams.forEach(team => {
        const teamCS = cleanSheetsByTeam[team.id] || 0;
        if (teamCS > 0) {
          const players = team.players || [];
          players.forEach(p => {
            const normName = p.name.trim().toLowerCase();
            if (!statsByName[normName]) {
              statsByName[normName] = { goals: 0, assists: 0, wins: 0, matchesForNota: 0, artilheiroCount: 0, garcomCount: 0, mvpCount: 0, cleanSheetsCount: 0 };
            }
            statsByName[normName].cleanSheetsCount += teamCS;
          });
        }
      });

      const allPlayersInSession = teams.flatMap(t => t.players || []);
      const sessionMaxGoals = Math.max(0, ...allPlayersInSession.map(p => p.goals || 0));
      const sessionMaxAssists = Math.max(0, ...allPlayersInSession.map(p => p.assists || 0));

      const ratings = calculateSessionPlayerRatings(session, currentPlayers);
      const maxNota = ratings.length > 0 ? ratings[0].nota : 0;
      const isInitialState = ratings.every(r => r.nota === 7.0);

      ratings.forEach(r => {
        const normName = r.name.trim().toLowerCase();
        if (!statsByName[normName]) {
          statsByName[normName] = { goals: 0, assists: 0, wins: 0, matchesForNota: 0, artilheiroCount: 0, garcomCount: 0, mvpCount: 0, cleanSheetsCount: 0 };
        }
        statsByName[normName].matchesForNota += 1;

        if (sessionMaxGoals > 0 && (r.goals || 0) === sessionMaxGoals) statsByName[normName].artilheiroCount += 1;
        if (sessionMaxAssists > 0 && (r.assists || 0) === sessionMaxAssists) statsByName[normName].garcomCount += 1;

        const isSoleMVP = ratings.length > 0 && ratings[0].name.trim().toLowerCase() === normName;
        if (!isInitialState && isSoleMVP && maxNota > 0) statsByName[normName].mvpCount += 1;
      });

      const goleiros = session.goleiros || [];
      goleiros.forEach(g => {
        const normName = g.name.trim().toLowerCase();
        if (!statsGoleiroByName[normName]) statsGoleiroByName[normName] = { wins: 0, saves: 0 };
        statsGoleiroByName[normName].wins += (g.wins || 0);
        statsGoleiroByName[normName].saves += (g.saves || 0);
      });
    });

    const playerStatsWithRaw = currentPlayers.map(p => {
      const normName = (p.name || '').trim().toLowerCase();
      const s = statsByName[normName] || { goals: 0, assists: 0, wins: 0, matchesForNota: 0, artilheiroCount: 0, garcomCount: 0, mvpCount: 0, cleanSheetsCount: 0 };
      const csWeight = p.posicao === 'Zagueiro' ? 2 : 0.5;
      const rawScore = (s.goals * 5) + (s.assists * 4) + (s.wins * 2.5) + (s.artilheiroCount * 3) + (s.garcomCount * 3) + (s.mvpCount * 4) + (s.cleanSheetsCount * csWeight);
      return { p, s, rawScore };
    });

    const allRawValues = playerStatsWithRaw.filter(x => x.s.matchesForNota > 0).map(x => x.rawScore);
    const minRaw = allRawValues.length > 0 ? Math.min(...allRawValues) : 0;
    const maxRaw = allRawValues.length > 0 ? Math.max(...allRawValues) : 0;

    let changed = false;
    const newPlayersList = playerStatsWithRaw.map(({ p, s, rawScore }) => {
      let mediaCalculada = 0;
      if (s.matchesForNota > 0) {
        if (maxRaw !== minRaw) {
          const normalized = (rawScore - minRaw) / (maxRaw - minRaw);
          mediaCalculada = parseFloat((4 + (normalized * 6)).toFixed(2));
        } else {
          mediaCalculada = 7.0;
        }
      }

      if ((p.total_gols || 0) !== s.goals || (p.total_assistencias || 0) !== s.assists || (p.total_vitorias || 0) !== s.wins || (p.media_nota || 0) !== mediaCalculada || (p.formula_version || 0) < CURRENT_FORMULA_VERSION) {
        changed = true;
        return { ...p, total_gols: s.goals, total_assistencias: s.assists, total_vitorias: s.wins, media_nota: mediaCalculada, formula_version: CURRENT_FORMULA_VERSION };
      }
      return p;
    });

    if (changed) set(ref(db, 'players'), newPlayersList);

    let changedGoleiros = false;
    const newGoleirosList = currentGoleiros.map(g => {
      const normName = g.name.trim().toLowerCase();
      const s = statsGoleiroByName[normName] || { wins: 0, saves: 0 };
      if ((g.total_vitorias || 0) !== s.wins || (g.total_defesas_dificeis || 0) !== s.saves) {
        changedGoleiros = true;
        return { ...g, total_vitorias: s.wins, total_defesas_dificeis: s.saves };
      }
      return g;
    });

    if (changedGoleiros) set(ref(db, 'goleiros'), newGoleirosList);
  };

  useEffect(() => {
    if (isLoaded && sessions.length > 0 && registeredPlayers.length > 0 && !dataSynced) {
      const needsSync = registeredPlayers.some(p => p.total_gols === undefined || p.media_nota === undefined || (p.formula_version || 0) < CURRENT_FORMULA_VERSION);
      if (needsSync) updateSessionsAndStats(sessions);
      setDataSynced(true);
    }
  }, [isLoaded, sessions, registeredPlayers, dataSynced]);

  return {
    sessions,
    registeredPlayers,
    registeredGoleiros,
    users,
    isLoaded,
    dbError,
    updateSessionsAndStats
  };
};
