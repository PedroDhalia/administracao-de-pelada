export const getNormalizedTeams = (session) => {
  const teams = session?.teams || [];
  if (!session || !session.matches || session.matches.length === 0) return teams;

  return teams.map(t => {
    let wins = 0, draws = 0, losses = 0;
    session.matches.forEach(m => {
      if (String(m.team1Id) === String(t.id)) {
        if (m.score1 > m.score2) wins++;
        else if (m.score1 === m.score2) draws++;
        else if (m.score1 < m.score2) losses++;
      } else if (String(m.team2Id) === String(t.id)) {
        if (m.score2 > m.score1) wins++;
        else if (m.score2 === m.score1) draws++;
        else if (m.score2 < m.score1) losses++;
      }
    });
    return { ...t, wins, draws, losses };
  });
};

export const calculateSessionPlayerRatings = (session, registeredPlayers = []) => {
  if (!session || !session.teams || session.teams.length === 0) return [];

  const cleanSheetsByTeam = {};
  if (session.matches) {
    session.matches.forEach(m => {
      if (!cleanSheetsByTeam[m.team1Id]) cleanSheetsByTeam[m.team1Id] = 0;
      if (!cleanSheetsByTeam[m.team2Id]) cleanSheetsByTeam[m.team2Id] = 0;

      if (m.score2 === 0) cleanSheetsByTeam[m.team1Id]++;
      if (m.score1 === 0) cleanSheetsByTeam[m.team2Id]++;
    });
  }

  let allPlayers = [];
  const normalizedTeams = getNormalizedTeams(session);
  normalizedTeams.forEach(t => {
    const pList = t.players || [];
    const teamCleanSheets = cleanSheetsByTeam[t.id] || 0;

    pList.forEach(p => {
      const pName = p.name || '';
      const rp = registeredPlayers.find(reg => (reg.name || '').trim().toLowerCase() === pName.trim().toLowerCase());
      const isZagueiro = rp?.posicao === 'Zagueiro';

      allPlayers.push({
        ...p,
        teamId: t.id,
        teamName: t.name,
        teamWins: t.wins || 0,
        teamLosses: t.losses || 0,
        cleanSheetsBonus: isZagueiro ? (teamCleanSheets * 2) : (teamCleanSheets * 0.5)
      });
    });
  });

  if (allPlayers.length === 0) return [];

  const maxGoals = Math.max(0, ...allPlayers.map(p => p.goals || 0));
  const maxAssists = Math.max(0, ...allPlayers.map(p => p.assists || 0));

  allPlayers.forEach(p => {
    const artilheiroBonus = (maxGoals > 0 && (p.goals || 0) === maxGoals) ? 3 : 0;
    const garcomBonus = (maxAssists > 0 && (p.assists || 0) === maxAssists) ? 3 : 0;

    p.rawScore = ((p.goals || 0) * 5) + ((p.assists || 0) * 4) + (p.teamWins * 2.5) + (p.teamLosses * -1) + (p.cleanSheetsBonus || 0) + artilheiroBonus + garcomBonus;
  });

  const minScore = Math.min(...allPlayers.map(p => p.rawScore));
  const maxScore = Math.max(...allPlayers.map(p => p.rawScore));

  allPlayers.forEach(p => {
    if (minScore === maxScore) {
      p.nota = 7.0;
    } else {
      const normalized = (p.rawScore - minScore) / (maxScore - minScore);
      p.nota = 4 + (normalized * 6);
    }
  });

  allPlayers.sort((a, b) => b.nota - a.nota || (b.goals || 0) - (a.goals || 0) || (b.assists || 0) - (a.assists || 0));
  return allPlayers;
};

export const getPlayerStats = (playerName, sessions = [], registeredPlayers = [], registeredGoleiros = []) => {
  let peladasJogadas = 0;
  let totalGoals = 0;
  let totalAssists = 0;
  let peladasGanhas = 0;
  let artilheiroCount = 0;
  let garcomCount = 0;
  let mvpCount = 0;
  let puskasWins = 0;
  let cleanSheetsCount = 0;
  let matchHistory = [];

  const pNameForStats = playerName || '';
  const normName = pNameForStats.trim().toLowerCase();

  const partnerWins = {};
  const partnerMatches = {};

  sessions.forEach(session => {
    if (session.puskas && typeof session.puskas === 'string' && session.puskas.trim().toLowerCase() === normName) {
      puskasWins++;
    }

    const teams = getNormalizedTeams(session);
    if (teams.length === 0) return;

    const teamsWithPoints = teams.map(t => ({
      ...t,
      points: (t.wins || 0) * 3 + (t.draws || 0) * 1
    })).sort((a, b) => b.points - a.points || (b.wins || 0) - (a.wins || 0));

    // Support multiple champion teams in case of equal points and wins
    const maxPoints = teamsWithPoints.length > 0 ? teamsWithPoints[0].points : 0;
    const maxWins = teamsWithPoints.length > 0 && teamsWithPoints[0].points === maxPoints ? (teamsWithPoints[0].wins || 0) : 0;
    const championTeamIds = teamsWithPoints
      .filter(t => t.points === maxPoints && (t.wins || 0) === maxWins && maxPoints > 0)
      .map(t => t.id);

    let playedInSession = false;
    let wonThisSession = false;
    let teammates = [];

    const sessionMaxGoals = Math.max(0, ...teams.flatMap(t => t.players || []).map(p => p.goals || 0));
    const sessionMaxAssists = Math.max(0, ...teams.flatMap(t => t.players || []).map(p => p.assists || 0));

    teams.forEach(team => {
      const players = team.players || [];
      const playerInTeam = players.find(p => (p.name || '').trim().toLowerCase() === normName);
      if (playerInTeam) {
        playedInSession = true;
        const playerGoals = playerInTeam.goals || 0;
        const playerAssists = playerInTeam.assists || 0;
        totalGoals += playerGoals;
        totalAssists += playerAssists;

        if (playerGoals > 0 && playerGoals === sessionMaxGoals) {
          artilheiroCount++;
        }
        if (playerAssists > 0 && playerAssists === sessionMaxAssists) {
          garcomCount++;
        }

        if (championTeamIds.includes(team.id)) {
          wonThisSession = true;
        }

        teammates = players.filter(p => (p.name || '').trim().toLowerCase() !== normName);
      }
    });

    if (playedInSession) {
      peladasJogadas++;
      if (wonThisSession) peladasGanhas++;

      const ratings = calculateSessionPlayerRatings(session, registeredPlayers);
      const playerRating = ratings.find(r => (r.name || '').trim().toLowerCase() === normName);

      if (ratings && ratings.length > 0) {
        const isInitialState = ratings.every(r => r.nota === 7.0);
        const isSoleMVP = ratings[0].name.trim().toLowerCase() === normName;
        if (isSoleMVP && !isInitialState) {
          mvpCount++;
        }
      }

      if (playerRating) {
        matchHistory.push({
          sessionId: session.id,
          sessionName: session.name || 'Pelada',
          sessionDate: session.date || '',
          nota: playerRating.nota,
          goals: playerRating.goals || 0,
          assists: playerRating.assists || 0,
          won: wonThisSession
        });

        // Calculate clean sheets for this player
        if (session.matches) {
          session.matches.forEach(m => {
            if (String(m.team1Id) === String(playerRating.teamId) && m.score2 === 0) cleanSheetsCount++;
            if (String(m.team2Id) === String(playerRating.teamId) && m.score1 === 0) cleanSheetsCount++;
          });
        }
      }

      teammates.forEach(tm => {
        const tmName = tm.name;
        partnerMatches[tmName] = (partnerMatches[tmName] || 0) + 1;
        if (wonThisSession) {
          partnerWins[tmName] = (partnerWins[tmName] || 0) + 1;
        }
      });
    }
  });

  const goalAvg = peladasJogadas > 0 ? (totalGoals / peladasJogadas).toFixed(2) : '0.00';
  const assistAvg = peladasJogadas > 0 ? (totalAssists / peladasJogadas).toFixed(2) : '0.00';
  const winRate = peladasJogadas > 0 ? Math.round((peladasGanhas / peladasJogadas) * 100) : 0;

  const recentForm = [...matchHistory].sort((a, b) => {
    const d1 = new Date(a.sessionDate.split('/').reverse().join('-'));
    const d2 = new Date(b.sessionDate.split('/').reverse().join('-'));
    return d2 - d1;
  }).slice(0, 5);

  let bestPartners = [];
  const partners = Object.keys(partnerMatches).filter(name => partnerMatches[name] >= 1);
  if (partners.length > 0) {
    bestPartners = partners.map(name => ({
      name,
      matches: partnerMatches[name],
      wins: partnerWins[name] || 0,
      rate: Math.round(((partnerWins[name] || 0) / partnerMatches[name]) * 100)
    })).sort((a, b) => b.rate - a.rate || b.matches - a.matches).slice(0, 3);
  }

  return {
    peladasJogadas,
    totalGoals,
    totalAssists,
    peladasGanhas,
    goalAvg,
    assistAvg,
    winRate,
    artilheiroCount,
    garcomCount,
    mvpCount,
    puskasWins,
    cleanSheetsCount,
    matchHistory,
    recentForm,
    bestPartners
  };
};

export const getPlayerStatsForMonth = (sessions, playerName, monthKey, registeredPlayers) => {
  const monthSessions = sessions.filter(s => {
    if (!s.date) return false;
    const parts = s.date.split('/');
    if (parts.length !== 3) return false;
    const mKey = `${parts[1].padStart(2, '0')}/${parts[2]}`;
    return mKey === monthKey;
  });
  return getPlayerStats(playerName, monthSessions, registeredPlayers);
};

export const getPlayersStatsForMonth = (sessions, registeredPlayers, monthKey) => {
  const monthSessions = sessions.filter(s => {
    if (!s.date) return false;
    const parts = s.date.split('/');
    if (parts.length !== 3) return false;
    const mKey = `${parts[1].padStart(2, '0')}/${parts[2]}`;
    return mKey === monthKey;
  });

  const playerStatsMap = {};

  monthSessions.forEach(session => {
    const teams = getNormalizedTeams(session);
    if (teams.length === 0) return;

    const teamsWithPoints = teams.map(t => ({
      ...t,
      points: (t.wins || 0) * 3 + (t.draws || 0) * 1
    })).sort((a, b) => b.points - a.points || (b.wins || 0) - (a.wins || 0));

    // Support multiple champion teams in case of a tie
    const maxPoints = teamsWithPoints.length > 0 ? teamsWithPoints[0].points : 0;
    const maxWins = teamsWithPoints.length > 0 && teamsWithPoints[0].points === maxPoints ? (teamsWithPoints[0].wins || 0) : 0;
    const championTeamIds = teamsWithPoints
      .filter(t => t.points === maxPoints && (t.wins || 0) === maxWins && maxPoints > 0)
      .map(t => t.id);

    const allPlayersInSession = teams.flatMap(t => t.players || []);
    const sessionMaxGoals = Math.max(0, ...allPlayersInSession.map(p => p.goals || 0));
    const sessionMaxAssists = Math.max(0, ...allPlayersInSession.map(p => p.assists || 0));

    const ratings = calculateSessionPlayerRatings(session, registeredPlayers);
    const maxNota = ratings.length > 0 ? ratings[0].nota : 0;
    const isInitialState = ratings.every(r => r.nota === 7.0);

    const cleanSheetsByTeam = {};
    if (session.matches) {
      session.matches.forEach(m => {
        if (!cleanSheetsByTeam[m.team1Id]) cleanSheetsByTeam[m.team1Id] = 0;
        if (!cleanSheetsByTeam[m.team2Id]) cleanSheetsByTeam[m.team2Id] = 0;
        if (m.score2 === 0) cleanSheetsByTeam[m.team1Id]++;
        if (m.score1 === 0) cleanSheetsByTeam[m.team2Id]++;
      });
    }

    ratings.forEach(r => {
      const normName = r.name.trim().toLowerCase();
      if (!playerStatsMap[normName]) {
        const rp = registeredPlayers.find(reg => reg.name.trim().toLowerCase() === normName);
        playerStatsMap[normName] = {
          id: rp?.id || r.name,
          name: r.name,
          total_gols: 0,
          total_assistencias: 0,
          total_vitorias: 0,
          artilheiroCount: 0,
          garcomCount: 0,
          mvpCount: 0,
          cleanSheetsCount: 0,
          matchesForNota: 0,
          isGuest: rp ? rp.isGuest : true,
          posicao: rp?.posicao || ''
        };
      }
      playerStatsMap[normName].total_gols += (r.goals || 0);
      playerStatsMap[normName].total_assistencias += (r.assists || 0);
      playerStatsMap[normName].matchesForNota += 1;

      if (championTeamIds.includes(r.teamId)) playerStatsMap[normName].total_vitorias += 1;
      if (sessionMaxGoals > 0 && (r.goals || 0) === sessionMaxGoals) playerStatsMap[normName].artilheiroCount += 1;
      if (sessionMaxAssists > 0 && (r.assists || 0) === sessionMaxAssists) playerStatsMap[normName].garcomCount += 1;

      const isSoleMVP = ratings.length > 0 && ratings[0].name.trim().toLowerCase() === normName;
      if (!isInitialState && isSoleMVP && maxNota > 0) playerStatsMap[normName].mvpCount += 1;

      playerStatsMap[normName].cleanSheetsCount += (cleanSheetsByTeam[r.teamId] || 0);
    });
  });

  const playersWithRaw = Object.values(playerStatsMap).map(p => {
    const csWeight = p.posicao === 'Zagueiro' ? 2 : 0.5;
    const rawScore = (p.total_gols * 5) + (p.total_assistencias * 4) + (p.total_vitorias * 2.5) + (p.artilheiroCount * 3) + (p.garcomCount * 3) + (p.mvpCount * 4) + (p.cleanSheetsCount * csWeight);
    return { ...p, rawScore };
  });

  const regularPlayersRaw = playersWithRaw.filter(p => !p.isGuest).map(x => x.rawScore);
  const minRaw = regularPlayersRaw.length > 0 ? Math.min(...regularPlayersRaw) : 0;
  const maxRaw = regularPlayersRaw.length > 0 ? Math.max(...regularPlayersRaw) : 0;

  return playersWithRaw.map(p => {
    let media_nota = 0;
    if (p.matchesForNota > 0) {
      if (maxRaw !== minRaw) {
        const normalized = (p.rawScore - minRaw) / (maxRaw - minRaw);
        media_nota = parseFloat((4 + (normalized * 6)).toFixed(2));
      } else {
        media_nota = 7.0;
      }
    }
    return { ...p, media_nota };
  }).sort((a, b) => b.media_nota - a.media_nota);
};

export const getMonthlyHighlights = (sessions, registeredPlayers) => {
  const grouped = {};
  sessions.forEach(s => {
    if (!s.date || typeof s.date !== 'string') return;
    const parts = s.date.split('/');
    if (parts.length === 3) {
      const monthYear = `${(parts[1] || '').padStart(2, '0')}/${parts[2]}`;
      if (!grouped[monthYear]) grouped[monthYear] = [];
      grouped[monthYear].push(s);
    }
  });

  const results = [];
  const sortedMonths = Object.keys(grouped).sort((a, b) => {
    const [m1, y1] = a.split('/');
    const [m2, y2] = b.split('/');
    return new Date(y2, m2 - 1) - new Date(y1, m1 - 1);
  });

  const monthNamesAbbr = {
    '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr', '05': 'Mai', '06': 'Jun',
    '07': 'Jul', '08': 'Ago', '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez'
  };

  sortedMonths.forEach(monthKey => {
    const monthSessions = grouped[monthKey];

    // Use the same logic as the monthly ranking
    const playerStatsList = getPlayersStatsForMonth(sessions, registeredPlayers, monthKey);

    if (playerStatsList.length > 0) {
      // Map to the field names expected by the highlights logic
      const playersArray = playerStatsList.map(p => ({
        ...p,
        goals: p.total_gols,
        assists: p.total_assistencias,
        champWins: p.total_vitorias,
        mvpScore: p.media_nota // Use media_nota as the monthly MVP score
      }));

      const getTop = (arr, key) => {
        const maxVal = Math.max(0, ...arr.map(p => p[key]));
        if (maxVal === 0) return { name: '-', [key]: 0, tied: [] };
        const tops = arr.filter(p => p[key] === maxVal);
        let finalName = tops[0].name;
        if (tops.length === 2) {
          finalName = `${tops[0].name} e ${tops[1].name}`;
        } else if (tops.length > 2) {
          finalName = `${tops[0].name}, ${tops[1].name} e +${tops.length - 2}`;
        }
        return { name: finalName, [key]: maxVal, tied: tops };
      };

      const topScorer = getTop(playersArray, 'goals');
      const topAssister = getTop(playersArray, 'assists');
      const topMonthlyMVP = getTop(playersArray, 'mvpScore');
      const topChamp = getTop(playersArray, 'champWins');

      const attackers = playersArray.filter(p => p.posicao === 'Atacante').sort((a, b) => b.mvpScore - a.mvpScore).slice(0, 2);
      const midfielders = playersArray.filter(p => p.posicao === 'Meia').sort((a, b) => b.mvpScore - a.mvpScore).slice(0, 2);
      const defenders = playersArray.filter(p => p.posicao === 'Zagueiro').sort((a, b) => b.mvpScore - a.mvpScore).slice(0, 2);
      const allGoleiros = playersArray.filter(p => p.posicao === 'Goleiro').sort((a, b) => b.mvpScore - a.mvpScore);

      const [mNum, yNum] = monthKey.split('/');
      const labelText = `${monthNamesAbbr[mNum] || mNum} ${yNum}`;

      if (topScorer.goals > 0 || topAssister.assists > 0 || topChamp.champWins > 0) {
        results.push({
          monthKey,
          label: labelText,
          topScorer,
          topAssister,
          mvp: topMonthlyMVP, // This now contains mvpScore
          topChamp,
          teamOfMonth: {
            atacantes: attackers,
            meias: midfielders,
            zagueiros: defenders,
            goleiro: allGoleiros[0] || null
          }
        });
      }
    }
  });

  return results;
};


export const getNotaColor = (nota) => {
  if (nota >= 9.0) return '#30d158'; // Verde premium
  if (nota >= 8.0) return '#0084ff'; // Azul premium
  if (nota >= 7.0) return '#ffd60a'; // Ouro/Amarelo premium
  if (nota >= 6.0) return '#ff9f0a'; // Laranja premium
  return '#ff453a'; // Vermelho premium
};

export const getSeasonInfo = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  if (isNaN(month) || isNaN(year)) return null;

  if (month >= 1 && month <= 7) {
    return {
      key: `${year}-T1`,
      year,
      seasonNumber: 1,
      label: `1ª Temporada ${year}`,
      period: `Jan - Jul ${year}`,
      shortLabel: `1ª Temp. ${year}`
    };
  } else if (month >= 8 && month <= 12) {
    return {
      key: `${year}-T2`,
      year,
      seasonNumber: 2,
      label: `2ª Temporada ${year}`,
      period: `Ago - Dez ${year}`,
      shortLabel: `2ª Temp. ${year}`
    };
  }
  return null;
};

export const getAvailableSeasons = (sessions = []) => {
  const seasonsMap = {};

  sessions.forEach(s => {
    const info = getSeasonInfo(s?.date);
    if (info && !seasonsMap[info.key]) {
      seasonsMap[info.key] = info;
    }
  });

  const now = new Date();
  const currentYear = now.getFullYear();

  const t1Key = `${currentYear}-T1`;
  const t2Key = `${currentYear}-T2`;
  if (!seasonsMap[t1Key]) {
    seasonsMap[t1Key] = {
      key: t1Key,
      year: currentYear,
      seasonNumber: 1,
      label: `1ª Temporada ${currentYear}`,
      period: `Jan - Jul ${currentYear}`,
      shortLabel: `1ª Temp. ${currentYear}`
    };
  }
  if (!seasonsMap[t2Key]) {
    seasonsMap[t2Key] = {
      key: t2Key,
      year: currentYear,
      seasonNumber: 2,
      label: `2ª Temporada ${currentYear}`,
      period: `Ago - Dez ${currentYear}`,
      shortLabel: `2ª Temp. ${currentYear}`
    };
  }

  const list = Object.values(seasonsMap).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.seasonNumber - a.seasonNumber;
  });

  list.push({
    key: 'all',
    year: 0,
    seasonNumber: 0,
    label: 'Geral (Todas)',
    period: 'Todas as peladas',
    shortLabel: 'Geral'
  });

  return list;
};

export const filterSessionsBySeason = (sessions = [], seasonKey = 'all') => {
  if (!seasonKey || seasonKey === 'all') return sessions;
  return sessions.filter(s => {
    const info = getSeasonInfo(s?.date);
    return info && info.key === seasonKey;
  });
};

export const getPlayersStatsForSessions = (targetSessions = [], registeredPlayers = []) => {
  const playerStatsMap = {};

  targetSessions.forEach(session => {
    const teams = getNormalizedTeams(session);
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

    const allPlayersInSession = teams.flatMap(t => t.players || []);
    const sessionMaxGoals = Math.max(0, ...allPlayersInSession.map(p => p.goals || 0));
    const sessionMaxAssists = Math.max(0, ...allPlayersInSession.map(p => p.assists || 0));

    const ratings = calculateSessionPlayerRatings(session, registeredPlayers);
    const maxNota = ratings.length > 0 ? ratings[0].nota : 0;
    const isInitialState = ratings.every(r => r.nota === 7.0);

    const cleanSheetsByTeam = {};
    if (session.matches) {
      session.matches.forEach(m => {
        if (!cleanSheetsByTeam[m.team1Id]) cleanSheetsByTeam[m.team1Id] = 0;
        if (!cleanSheetsByTeam[m.team2Id]) cleanSheetsByTeam[m.team2Id] = 0;
        if (m.score2 === 0) cleanSheetsByTeam[m.team1Id]++;
        if (m.score1 === 0) cleanSheetsByTeam[m.team2Id]++;
      });
    }

    ratings.forEach(r => {
      const normName = r.name.trim().toLowerCase();
      if (!playerStatsMap[normName]) {
        const rp = registeredPlayers.find(reg => reg.name.trim().toLowerCase() === normName);
        playerStatsMap[normName] = {
          id: rp?.id || r.name,
          name: r.name,
          total_gols: 0,
          total_assistencias: 0,
          total_vitorias: 0,
          artilheiroCount: 0,
          garcomCount: 0,
          mvpCount: 0,
          cleanSheetsCount: 0,
          matchesForNota: 0,
          isGuest: rp ? rp.isGuest : true,
          posicao: rp?.posicao || ''
        };
      }
      playerStatsMap[normName].total_gols += (r.goals || 0);
      playerStatsMap[normName].total_assistencias += (r.assists || 0);
      playerStatsMap[normName].matchesForNota += 1;

      if (championTeamIds.includes(r.teamId)) playerStatsMap[normName].total_vitorias += 1;
      if (sessionMaxGoals > 0 && (r.goals || 0) === sessionMaxGoals) playerStatsMap[normName].artilheiroCount += 1;
      if (sessionMaxAssists > 0 && (r.assists || 0) === sessionMaxAssists) playerStatsMap[normName].garcomCount += 1;

      const isSoleMVP = ratings.length > 0 && ratings[0].name.trim().toLowerCase() === normName;
      if (!isInitialState && isSoleMVP && maxNota > 0) playerStatsMap[normName].mvpCount += 1;

      playerStatsMap[normName].cleanSheetsCount += (cleanSheetsByTeam[r.teamId] || 0);
    });
  });

  const playersWithRaw = Object.values(playerStatsMap).map(p => {
    const csWeight = p.posicao === 'Zagueiro' ? 2 : 0.5;
    const rawScore = (p.total_gols * 5) + (p.total_assistencias * 4) + (p.total_vitorias * 2.5) + (p.artilheiroCount * 3) + (p.garcomCount * 3) + (p.mvpCount * 4) + (p.cleanSheetsCount * csWeight);
    return { ...p, rawScore };
  });

  const regularPlayersRaw = playersWithRaw.filter(p => !p.isGuest).map(x => x.rawScore);
  const minRaw = regularPlayersRaw.length > 0 ? Math.min(...regularPlayersRaw) : 0;
  const maxRaw = regularPlayersRaw.length > 0 ? Math.max(...regularPlayersRaw) : 0;

  return playersWithRaw.map(p => {
    let media_nota = 0;
    if (p.matchesForNota > 0) {
      if (maxRaw !== minRaw) {
        const normalized = (p.rawScore - minRaw) / (maxRaw - minRaw);
        media_nota = parseFloat((4 + (normalized * 6)).toFixed(2));
      } else {
        media_nota = 7.0;
      }
    }
    return { ...p, media_nota };
  }).sort((a, b) => b.media_nota - a.media_nota);
};

export const getPlayersStatsForSeason = (sessions, registeredPlayers, seasonKey) => {
  const targetSessions = filterSessionsBySeason(sessions, seasonKey);
  return getPlayersStatsForSessions(targetSessions, registeredPlayers);
};

export const getFullPlayersStatsForSeason = (sessions, registeredPlayers, seasonKey) => {
  const activeStats = getPlayersStatsForSeason(sessions, registeredPlayers, seasonKey);
  const statsMap = {};
  activeStats.forEach(p => {
    statsMap[p.name.trim().toLowerCase()] = p;
  });

  const fullList = registeredPlayers.map(rp => {
    const normName = rp.name.trim().toLowerCase();
    if (statsMap[normName]) {
      return { ...rp, ...statsMap[normName] };
    } else {
      return {
        ...rp,
        total_gols: 0,
        total_assistencias: 0,
        total_vitorias: 0,
        artilheiroCount: 0,
        garcomCount: 0,
        mvpCount: 0,
        cleanSheetsCount: 0,
        matchesForNota: 0,
        media_nota: 0,
        rawScore: 0
      };
    }
  });

  return fullList;
};



