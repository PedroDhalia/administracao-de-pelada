import { useState, useEffect, useMemo } from 'react';
import {
  Trophy, Users, Target, Plus, Minus, Trash2, User, Star, Info,
  Flag, Goal, Calendar, ChevronLeft, ChevronDown, ChevronUp, UserPlus, Flame, Medal, Circle, Pencil,
  LogOut, Shield, ShieldAlert, Key, Database, Camera, Hand, X, TrendingUp, TrendingDown
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import './index.css';
import './compare.css';

// Firebase
import { ref, set } from 'firebase/database';
import { db } from './api/firebase';

// Constants & Utils
import { CURRENT_FORMULA_VERSION, GENERATE_ID as generateId } from './constants';
import {
  calculateSessionPlayerRatings,
  getMonthlyHighlights,
  getPlayerStatsForMonth,
  getPlayerStats,
  getPlayersStatsForMonth
} from './utils/calculations';
import { getTextColor, getNotaColor, compressImage } from './utils/helpers';

// Hooks
import { useDatabase } from './hooks/useDatabase';
import { useAuth } from './hooks/useAuth';

// Components
import PlayerAvatar from './components/common/PlayerAvatar';
import SoccerField from './components/session/SoccerField';
import AuthPage from './pages/Auth';
import PlayerProfile from './pages/PlayerProfile';
import PlayerBadges from './components/player/PlayerBadges';

function App() {
  const {
    sessions, registeredPlayers, registeredGoleiros, users,
    isLoaded, dbError, updateSessionsAndStats
  } = useDatabase();

  const { loggedInUserId, login, logout } = useAuth();

  const [authMode, setAuthMode] = useState('login');
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showMatchesModal, setShowMatchesModal] = useState(false);
  const [showSupremeAdmin, setShowSupremeAdmin] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [viewingPlayerId, setViewingPlayerId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // States que permanecem no App por enquanto para UI
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [showPlayersScreen, setShowPlayersScreen] = useState(false);
  const [showGoleirosScreen, setShowGoleirosScreen] = useState(false);
  const [showAllSessionsScreen, setShowAllSessionsScreen] = useState(false);
  const [showAllHighlightsScreen, setShowAllHighlightsScreen] = useState(false);
  const [showMonthlyStatsScreen, setShowMonthlyStatsScreen] = useState(false);
  const [selectedMonthKey, setSelectedMonthKey] = useState(null);
  const [monthlyPlayerSearchQuery, setMonthlyPlayerSearchQuery] = useState('');
  const [monthlyPlayerSortConfig, setMonthlyPlayerSortConfig] = useState('media');
  const [newSessionName, setNewSessionName] = useState('');
  const [expandedTeams, setExpandedTeams] = useState({});
  const [expandedHighlights, setExpandedHighlights] = useState({});
  const [showNotaInfo, setShowNotaInfo] = useState(false);
  const [showInfoTooltip, setShowInfoTooltip] = useState({});
  const [playerSortConfig, setPlayerSortConfig] = useState('media');
  const [goleiroSortConfig, setGoleiroSortConfig] = useState('vitorias');
  const [expandedPlayerStats, setExpandedPlayerStats] = useState({});
  const [playerSearchQuery, setPlayerSearchQuery] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [teamViewModes, setTeamViewModes] = useState({}); // 'list' or 'field'
  const [comparePlayer1Id, setComparePlayer1Id] = useState(null);
  const [comparePlayer2Id, setComparePlayer2Id] = useState(null);
  const [compareMonthKey, setCompareMonthKey] = useState('');
  const [activeTab, setActiveTab] = useState('home');
  const [dirSearchQuery, setDirSearchQuery] = useState('');
  const [dirSortConfig, setDirSortConfig] = useState('nome');

  useEffect(() => {
    setComparePlayer2Id(null);
    setCompareMonthKey('');
  }, [viewingPlayerId]);

  const dashboardQuickStats = useMemo(() => {
    if (!sessions || sessions.length === 0) return { totalSessions: 0, totalGoals: 0, totalPlayers: 0, monthLabel: '' };
    const lastSession = sessions[0];
    if (!lastSession.date || typeof lastSession.date !== 'string') return { totalSessions: 0, totalGoals: 0, totalPlayers: 0, monthLabel: '' };
    const parts = lastSession.date.split('/');
    if (parts.length !== 3) return { totalSessions: 0, totalGoals: 0, totalPlayers: 0, monthLabel: '' };
    const targetMonthKey = `${parts[1].padStart(2, '0')}/${parts[2]}`;

    const monthSessions = sessions.filter(s => {
      if (!s.date || typeof s.date !== 'string') return false;
      const p = s.date.split('/');
      return p.length === 3 && `${p[1].padStart(2, '0')}/${p[2]}` === targetMonthKey;
    });

    const totalSessions = monthSessions.length;

    let totalGoals = 0;
    const uniquePlayers = new Set();

    monthSessions.forEach(s => {
      if (s.teams) {
        s.teams.forEach(t => {
          if (t.players) {
            t.players.forEach(p => {
              if (p.goals) totalGoals += p.goals;
              if (p.name) uniquePlayers.add(p.name.trim().toLowerCase());
            });
          }
        });
      }
    });

    const totalPlayers = uniquePlayers.size;

    const PortugueseMonths = {
      '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril', '05': 'Maio', '06': 'Junho',
      '07': 'Julho', '08': 'Agosto', '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro'
    };
    const monthLabel = `${PortugueseMonths[parts[1].padStart(2, '0')] || parts[1]}/${parts[2]}`;

    return { totalSessions, totalGoals, totalPlayers, monthLabel };
  }, [sessions]);

  const overallStats = useMemo(() => {
    const totalSessions = sessions ? sessions.length : 0;
    let totalGoals = 0;
    if (sessions) {
      sessions.forEach(s => {
        if (s.teams) {
          s.teams.forEach(t => {
            if (t.players) {
              t.players.forEach(p => {
                totalGoals += (p.goals || 0);
              });
            }
          });
        }
      });
    }
    const totalPlayers = registeredPlayers ? registeredPlayers.length : 0;
    return { totalSessions, totalGoals, totalPlayers };
  }, [sessions, registeredPlayers]);

  const latestSessionHighlights = useMemo(() => {
    if (!sessions || sessions.length === 0) return null;
    const latest = sessions[0];

    const ratedPlayers = calculateSessionPlayerRatings(latest, registeredPlayers);
    const mvp = ratedPlayers.length > 0 ? ratedPlayers[0] : null;

    const sessionPlayers = [];
    if (latest.teams) {
      latest.teams.forEach(t => {
        if (t.players) {
          t.players.forEach(p => {
            sessionPlayers.push({ ...p, teamName: t.name });
          });
        }
      });
    }

    const getPlayerNota = (playerName) => {
      const r = ratedPlayers.find(r => r.name.trim().toLowerCase() === playerName.trim().toLowerCase());
      return r ? r.nota : 0;
    };

    const topScorer = [...sessionPlayers]
      .filter(p => (p.goals || 0) > 0)
      .sort((a, b) => (b.goals || 0) - (a.goals || 0) || getPlayerNota(b.name) - getPlayerNota(a.name))[0] || null;

    const topAssister = [...sessionPlayers]
      .filter(p => (p.assists || 0) > 0)
      .sort((a, b) => (b.assists || 0) - (a.assists || 0) || getPlayerNota(b.name) - getPlayerNota(a.name))[0] || null;

    return {
      sessionName: latest.name,
      sessionDate: latest.date,
      mvp,
      topScorer,
      topAssister,
      matches: latest.matches || []
    };
  }, [sessions, registeredPlayers]);

  const summaryRanking = useMemo(() => {
    if (!registeredPlayers) return [];
    return [...registeredPlayers]
      .filter(p => (p.media_nota || 0) > 0)
      .sort((a, b) => (b.media_nota || 0) - (a.media_nota || 0))
      .slice(0, 5);
  }, [registeredPlayers]);

  const togglePlayerStats = (id) => {
    setExpandedPlayerStats(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleHighlight = (id) => {
    setExpandedHighlights(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleInfoTooltip = (id, e) => {
    e.stopPropagation();
    setShowInfoTooltip(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const activeSession = sessions.find(s => s.id === activeSessionId);

  const toggleTeam = (teamId) => {
    setExpandedTeams(prev => ({ ...prev, [teamId]: !prev[teamId] }));
  };

  const toggleTeamViewMode = (teamId, mode) => {
    setTeamViewModes(prev => ({ ...prev, [teamId]: mode }));
  };


  const currentUser = users?.find(u => u.id === loggedInUserId) || null;
  const isGlobalAdmin = currentUser?.is_admin === true;
  const canEditSession = (session) => isGlobalAdmin || session?.admins?.includes(currentUser?.id) || false;

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    const email = e.target.email.value.trim();
    const password = e.target.password.value.trim();
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
      login(user.id);
    } else {
      alert("Credenciais inválidas");
    }
  };

  const handleRegisterUserSubmit = (e) => {
    e.preventDefault();
    const name = e.target.name.value.trim();
    const email = e.target.email.value.trim();
    const password = e.target.password.value.trim();
    if (!name || !email || !password) return;
    if (users.some(u => u.email === email)) {
      alert("Email já em uso");
      return;
    }
    const isFirstUser = users.length === 0;
    const newUser = {
      id: generateId(),
      name, email, password,
      jogadorId: null,
      is_admin: isFirstUser
    };
    set(ref(db, 'users'), [...users, newUser]);
    login(newUser.id);
  };

  const handleChangePassword = (userId) => {
    const newPassword = prompt("Digite a nova senha para este usuário:");
    if (!newPassword || newPassword.trim() === '') return;
    const newUsers = users.map(u => u.id === userId ? { ...u, password: newPassword.trim() } : u);
    set(ref(db, 'users'), newUsers);
    alert("Senha alterada com sucesso!");
  };

  const promoteToGlobalAdmin = (userId) => {
    if (!confirm("Tem certeza que quer dar poder absoluto para este usuário?")) return;
    const newUsers = users.map(u => u.id === userId ? { ...u, is_admin: true } : u);
    set(ref(db, 'users'), newUsers);
  };

  const demoteFromGlobalAdmin = (userId) => {
    if (!confirm("Tem certeza que quer remover os poderes de admin supremo deste usuário?")) return;
    const newUsers = users.map(u => u.id === userId ? { ...u, is_admin: false } : u);
    set(ref(db, 'users'), newUsers);
  };

  const deleteUser = (userId) => {
    if (userId === currentUser.id) {
      alert("Você não pode excluir sua própria conta!");
      return;
    }
    const userToDelete = users.find(u => u.id === userId);
    if (!userToDelete) return;
    if (!confirm(`Tem certeza que deseja excluir o usuário "${userToDelete.name}"? Esta ação não pode ser desfeita.`)) return;

    // Desvincular jogador
    if (userToDelete.jogadorId) {
      const newPlayers = registeredPlayers.map(p => p.id === userToDelete.jogadorId ? { ...p, userId: null } : p);
      set(ref(db, 'players'), newPlayers);
    }

    // Remover de admins de todas as peladas
    const newSessions = sessions.map(s => ({
      ...s,
      admins: (s.admins || []).filter(id => id !== userId)
    }));
    set(ref(db, 'sessions'), newSessions);

    // Remover usuário
    const newUsers = users.filter(u => u.id !== userId);
    set(ref(db, 'users'), newUsers);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const compressedImageResult = await compressImage(file);
      const newUsers = users.map(u => u.id === currentUser.id ? { ...u, avatar: compressedImageResult } : u);
      set(ref(db, 'users'), newUsers);
    } catch (err) {
      alert("Erro ao enviar imagem");
    }
    setIsUploading(false);
  };

  const removeAvatar = () => {
    const newUsers = users.map(u => u.id === currentUser.id ? { ...u, avatar: null } : u);
    set(ref(db, 'users'), newUsers);
  };

  const handleLogout = () => {
    logout();
    setActiveSessionId(null);
    setShowPlayersScreen(false);
    setShowMonthlyStatsScreen(false);
    setShowGoleirosScreen(false);
    setShowProfile(false);
    setViewingPlayerId(null);
  };

  const handleEditLinkedPlayerName = () => {
    if (!currentUser?.jogadorId) {
      alert("Você ainda não vinculou um jogador à sua conta.");
      return;
    }
    const player = registeredPlayers.find(p => p.id === currentUser.jogadorId);
    if (!player) return;

    const currentName = player.name;
    const newName = prompt("Digite o novo nome para o seu jogador (Este nome aparecerá nas estatísticas, times, etc):", currentName);

    if (!newName || newName.trim() === '' || newName.trim().toLowerCase() === currentName.trim().toLowerCase()) {
      return;
    }

    const trimmedNewName = newName.trim();

    if (registeredPlayers.some(p => p.id !== player.id && p.name.toLowerCase() === trimmedNewName.toLowerCase())) {
      alert("Já existe outro jogador com este nome.");
      return;
    }

    if (!confirm(`Tem certeza que deseja mudar seu nome de jogador de "${currentName}" para "${trimmedNewName}"? Isso atualizará o nome em todas as peladas anteriores e estatísticas.`)) {
      return;
    }

    const newPlayersList = registeredPlayers.map(p => p.id === player.id ? { ...p, name: trimmedNewName } : p);

    const newGoleirosList = registeredGoleiros.map(g => g.name.trim().toLowerCase() === currentName.trim().toLowerCase() ? { ...g, name: trimmedNewName } : g);

    const newSessionsList = sessions.map(s => {
      let sessionUpdated = false;
      const updatedTeams = s.teams?.map(t => {
        let teamUpdated = false;
        const updatedPlayers = t.players?.map(p => {
          if (p.name.trim().toLowerCase() === currentName.trim().toLowerCase()) {
            teamUpdated = true;
            return { ...p, name: trimmedNewName };
          }
          return p;
        });
        if (teamUpdated) {
          sessionUpdated = true;
          return { ...t, players: updatedPlayers };
        }
        return t;
      });

      let updatedGoleiros = s.goleiros;
      if (s.goleiros) {
        updatedGoleiros = s.goleiros.map(g => {
          if (g.name.trim().toLowerCase() === currentName.trim().toLowerCase()) {
            sessionUpdated = true;
            return { ...g, name: trimmedNewName };
          }
          return g;
        });
      }

      let updatedPuskas = s.puskas;
      if (s.puskas?.trim().toLowerCase() === currentName.trim().toLowerCase()) {
        updatedPuskas = trimmedNewName;
        sessionUpdated = true;
      }

      if (sessionUpdated) {
        const updatedSession = {
          ...s,
          teams: updatedTeams || s.teams
        };
        if (updatedGoleiros !== undefined) {
          updatedSession.goleiros = updatedGoleiros;
        } else {
          delete updatedSession.goleiros;
        }
        if (updatedPuskas !== undefined) {
          updatedSession.puskas = updatedPuskas;
        } else {
          delete updatedSession.puskas;
        }
        return updatedSession;
      }
      return s;
    });

    set(ref(db, 'players'), newPlayersList);
    updateSessionsAndStats(newSessionsList, newPlayersList, newGoleirosList);
    alert("Nome atualizado com sucesso!");
  };

  const handleOnboardingSelect = (playerId) => {
    const player = registeredPlayers.find(p => p.id === playerId);
    if (!player) return;
    if (player.userId) {
      alert("Este jogador já está vinculado a outro usuário!");
      return;
    }

    // Atualiza todos os users
    const newUsersList = users.map(u => u.id === currentUser.id ? { ...u, jogadorId: playerId } : u);
    set(ref(db, 'users'), newUsersList);

    // Atualiza jogador
    const newPlayersList = registeredPlayers.map(p => p.id === playerId ? { ...p, userId: currentUser.id } : p);
    set(ref(db, 'players'), newPlayersList);
  };

  const handleOnboardingCreate = () => {
    const newPlayer = { id: generateId(), name: currentUser.name, userId: currentUser.id, criado_por_admin: false };
    const newPlayersList = [...registeredPlayers, newPlayer];
    set(ref(db, 'players'), newPlayersList);

    const newUsersList = users.map(u => u.id === currentUser.id ? { ...u, jogadorId: newPlayer.id } : u);
    set(ref(db, 'users'), newUsersList);
  };

  const promoteToAdmin = (userIdToPromote) => {
    if (!activeSessionId) return;
    const session = sessions.find(s => s.id === activeSessionId);
    if (!session) return;
    if (session.admins?.includes(userIdToPromote)) return;

    const newSessionsList = sessions.map(s => {
      if (s.id === activeSessionId) {
        return { ...s, admins: [...(s.admins || []), userIdToPromote] };
      }
      return s;
    });
    updateSessionsAndStats(newSessionsList);
  };

  const demoteFromAdmin = (userIdToDemote) => {
    if (!activeSessionId) return;
    const session = sessions.find(s => s.id === activeSessionId);
    if (!session || !session.admins) return;
    if (session.admins.length <= 1) {
      alert("A pelada precisa ter pelo menos 1 admin!");
      return;
    }
    const newSessionsList = sessions.map(s => {
      if (s.id === activeSessionId) {
        return { ...s, admins: s.admins.filter(id => id !== userIdToDemote) };
      }
      return s;
    });
    updateSessionsAndStats(newSessionsList);
  };

  const handleAddSession = (e) => {
    e.preventDefault();
    if (!newSessionName.trim()) return;
    const newSession = {
      id: generateId(),
      name: newSessionName.trim(),
      date: new Date().toLocaleDateString('pt-BR'),
      teams: [],
      criador: currentUser.id,
      admins: [currentUser.id],
      isAutomatic: true
    };
    const newSessionsList = [newSession, ...(sessions || [])];
    updateSessionsAndStats(newSessionsList);
    setNewSessionName('');
  };

  const removeSession = (id) => {
    if (confirm('Remover esta pelada e todos os times nela?')) {
      const newSessionsList = sessions.filter(s => s.id !== id);
      updateSessionsAndStats(newSessionsList);
      if (activeSessionId === id) setActiveSessionId(null);
    }
  };

  const editSessionName = (id, currentName) => {
    const newName = prompt("Editar nome da pelada:", currentName);
    if (!newName || newName.trim() === currentName) return;

    const newSessionsList = sessions.map(s => {
      if (s.id === id) {
        return { ...s, name: newName.trim() };
      }
      return s;
    });
    updateSessionsAndStats(newSessionsList);
  };

  const handleEditSessionDate = (id, newDateValue) => {
    if (!newDateValue) return;
    const [year, month, day] = newDateValue.split('-');
    const formattedDate = `${day}/${month}/${year}`;
    const newSessionsList = sessions.map(s => {
      if (s.id === id) {
        return { ...s, date: formattedDate };
      }
      return s;
    });
    updateSessionsAndStats(newSessionsList);
  };

  const handleRegisterPlayer = (e) => {
    e.preventDefault();
    const form = e.target;
    const pName = form.elements['playerName'].value.trim();
    if (!pName) return;

    if (registeredPlayers.some(p => p.name.toLowerCase() === pName.toLowerCase())) {
      alert("Já existe um jogador com este nome.");
      return;
    }

    const newPlayer = { id: generateId(), name: pName };
    const newList = [...registeredPlayers, newPlayer];
    set(ref(db, 'players'), newList);
    form.reset();
  };

  const removeRegisteredPlayer = (id) => {
    if (confirm("Remover este jogador do cadastro?")) {
      const newList = registeredPlayers.filter(p => p.id !== id);
      set(ref(db, 'players'), newList);
    }
  };

  const toggleGuestStatus = (id, currentStatus) => {
    const newList = registeredPlayers.map(p => {
      if (p.id === id) {
        return { ...p, isGuest: !currentStatus };
      }
      return p;
    });
    set(ref(db, 'players'), newList);
  };

  const handleRegisterGoleiro = (e) => {
    e.preventDefault();
    const form = e.target;
    const gName = form.elements['goleiroName'].value.trim();
    if (!gName) return;

    if (registeredGoleiros.some(p => p.name.toLowerCase() === gName.toLowerCase())) {
      alert("Já existe um goleiro com este nome.");
      return;
    }

    const newGoleiro = { id: generateId(), name: gName };
    const newList = [...registeredGoleiros, newGoleiro];
    set(ref(db, 'goleiros'), newList);
    form.reset();
  };

  const removeRegisteredGoleiro = (id) => {
    if (confirm("Remover este goleiro do cadastro?")) {
      const newList = registeredGoleiros.filter(p => p.id !== id);
      set(ref(db, 'goleiros'), newList);
    }
  };

  const handleAddGoleiroSession = (e) => {
    e.preventDefault();
    const form = e.target;
    const goleiroInput = form.elements['goleiroName'];
    const gName = goleiroInput.value.trim();
    if (!gName) return;

    const sessionToUpdate = sessions.find(s => s.id === activeSessionId);

    if (sessionToUpdate?.goleiros && sessionToUpdate.goleiros.some(g => g.name.toLowerCase() === gName.toLowerCase())) {
      alert("Este goleiro já está na pelada.");
      return;
    }

    const newSessionsList = sessions.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          goleiros: [...(s.goleiros || []), {
            id: generateId(),
            name: gName,
            wins: 0,
            saves: 0
          }]
        };
      }
      return s;
    });
    updateSessionsAndStats(newSessionsList);
    goleiroInput.value = '';
  };

  const editGoleiroNameSession = (goleiroId, currentName) => {
    const newName = prompt("Editar nome do goleiro:", currentName);
    if (!newName || newName.trim() === currentName) return;

    const newSessionsList = sessions.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          goleiros: (s.goleiros || []).map(g => {
            if (g.id === goleiroId) {
              return { ...g, name: newName.trim() };
            }
            return g;
          })
        };
      }
      return s;
    });
    updateSessionsAndStats(newSessionsList);
  };

  const updateGoleiroStatSession = (goleiroId, stat, delta) => {
    const newSessionsList = sessions.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          goleiros: (s.goleiros || []).map(g => {
            if (g.id === goleiroId) {
              return { ...g, [stat]: Math.max(0, (g[stat] || 0) + delta) };
            }
            return g;
          })
        };
      }
      return s;
    });
    updateSessionsAndStats(newSessionsList);
  };

  const removeGoleiroSession = (goleiroId) => {
    if (confirm('Remover este goleiro da pelada?')) {
      const newSessionsList = sessions.map(s => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            goleiros: (s.goleiros || []).filter(g => g.id !== goleiroId)
          };
        }
        return s;
      });
      updateSessionsAndStats(newSessionsList);
    }
  };

  const handleAddTeam = (e) => {
    e.preventDefault();
    const form = e.target;
    const teamNameInput = form.elements['teamName'];
    const title = teamNameInput.value.trim();
    if (!title) return;

    const sessionToUpdate = sessions.find(s => s.id === activeSessionId);
    if (sessionToUpdate && sessionToUpdate.teams && sessionToUpdate.teams.length >= 4) {
      alert("Esta pelada já tem 4 times no máximo.");
      return;
    }

    const newSessionsList = sessions.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          teams: [...(s.teams || []), {
            id: generateId(),
            name: title,
            wins: 0, draws: 0, losses: 0,
            players: []
          }]
        };
      }
      return s;
    });
    updateSessionsAndStats(newSessionsList);
    teamNameInput.value = '';
  };

  const removeTeam = (teamId) => {
    if (confirm('Remover este time e seus jogadores?')) {
      const newSessionsList = sessions.map(s => {
        if (s.id === activeSessionId) {
          return { ...s, teams: s.teams.filter(t => t.id !== teamId) };
        }
        return s;
      });
      updateSessionsAndStats(newSessionsList);
    }
  };

  const editTeamName = (teamId, currentName) => {
    const newName = prompt("Editar nome do time:", currentName);
    if (!newName || newName.trim() === currentName) return;

    const newSessionsList = sessions.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          teams: s.teams.map(t => {
            if (t.id === teamId) {
              return { ...t, name: newName.trim() };
            }
            return t;
          })
        };
      }
      return s;
    });
    updateSessionsAndStats(newSessionsList);
  };



  const handleAddMatch = (e) => {
    e.preventDefault();
    const form = e.target;
    const team1Id = form.elements['team1Id'].value;
    const team2Id = form.elements['team2Id'].value;

    if (!team1Id || !team2Id || team1Id === team2Id) {
      alert("Selecione dois times diferentes.");
      return;
    }

    const newSessionsList = sessions.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          matches: [...(s.matches || []), {
            id: generateId(),
            team1Id,
            team2Id,
            score1: 0,
            score2: 0,
            finished: false
          }]
        };
      }
      return s;
    });
    updateSessionsAndStats(newSessionsList);
  };

  const updateMatchScore = (matchId, teamKey, delta) => {
    const newSessionsList = sessions.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          matches: (s.matches || []).map(m => {
            if (m.id === matchId) {
              return { ...m, [teamKey]: Math.max(0, (m[teamKey] || 0) + delta) };
            }
            return m;
          })
        };
      }
      return s;
    });
    updateSessionsAndStats(newSessionsList);
  };

  const removeMatch = (matchId) => {
    if (confirm('Remover esta partida?')) {
      const newSessionsList = sessions.map(s => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            matches: (s.matches || []).filter(m => m.id !== matchId)
          };
        }
        return s;
      });
      updateSessionsAndStats(newSessionsList);
    }
  };

  const updatePuskas = (playerName) => {
    const newSessionsList = sessions.map(s => {
      if (s.id === activeSessionId) {
        return { ...s, puskas: playerName };
      }
      return s;
    });
    updateSessionsAndStats(newSessionsList);
  };

  const handleAddPlayer = (teamId, e) => {
    e.preventDefault();
    const form = e.target;
    const playerInput = form.elements['playerName'];
    const pName = playerInput.value.trim();
    if (!pName) return;

    const sessionToUpdate = sessions.find(s => s.id === activeSessionId);
    const targetTeam = sessionToUpdate?.teams?.find(t => t.id === teamId);
    if (targetTeam && targetTeam.players && targetTeam.players.length >= 5) {
      alert("Este time já tem 5 jogadores.");
      return;
    }

    const newSessionsList = sessions.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          teams: s.teams.map(t => {
            if (t.id === teamId) {
              return {
                ...t,
                players: [...(t.players || []), {
                  id: generateId(),
                  name: pName,
                  goals: 0,
                  assists: 0
                }]
              };
            }
            return t;
          })
        };
      }
      return s;
    });
    updateSessionsAndStats(newSessionsList);
    playerInput.value = '';
  };

  const editPlayerName = (teamId, playerId, currentName) => {
    const newName = prompt("Editar nome do jogador:", currentName);
    if (!newName || newName.trim() === currentName) return;

    const newSessionsList = sessions.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          teams: s.teams.map(t => {
            if (t.id === teamId) {
              return {
                ...t,
                players: t.players.map(p => {
                  if (p.id === playerId) {
                    return { ...p, name: newName.trim() };
                  }
                  return p;
                })
              };
            }
            return t;
          })
        };
      }
      return s;
    });
    updateSessionsAndStats(newSessionsList);
  };

  const updatePlayerStat = (teamId, playerId, stat, delta) => {
    const newSessionsList = sessions.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          teams: s.teams.map(t => {
            if (t.id === teamId) {
              return {
                ...t,
                players: t.players.map(p => {
                  if (p.id === playerId) {
                    return { ...p, [stat]: Math.max(0, p[stat] + delta) };
                  }
                  return p;
                })
              };
            }
            return t;
          })
        };
      }
      return s;
    });
    updateSessionsAndStats(newSessionsList);
  };

  const removePlayer = (teamId, playerId) => {
    if (confirm('Remover este jogador?')) {
      const newSessionsList = sessions.map(s => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            teams: s.teams.map(t => {
              if (t.id === teamId) {
                return { ...t, players: t.players.filter(p => p.id !== playerId) };
              }
              return t;
            })
          };
        }
        return s;
      });
      updateSessionsAndStats(newSessionsList);
    }
  };

  // --- RENDER HELPERS ---
  const getTeamColor = (teamName) => {
    if (!teamName) return 'var(--primary)';
    const lower = teamName.toLowerCase();
    if (lower.includes('branco')) return '#ffffff';
    if (lower.includes('preta') || lower.includes('preto')) return '#1a1a1a';
    if (lower.includes('verde')) return '#22c55e';
    if (lower.includes('azul')) return '#3b82f6';
    if (lower.includes('vermelho')) return '#ef4444';
    if (lower.includes('amarelo')) return '#eab308';
    if (lower.includes('roxo')) return '#a855f7';
    if (lower.includes('rosa')) return '#ec4899';
    if (lower.includes('laranja')) return '#f97316';
    if (lower.includes('cinza')) return '#9ca3af';
    if (lower.includes('sem camisa') || lower.includes('colete')) return '#fcd34d';
    return 'var(--primary)';
  };

  const SoccerBallIcon = ({ color, size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="rgba(0,0,0,0.4)" strokeWidth="1">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 12l3-3m0 0l4 1M15 9l-1-5M12 12l-3-3m0 0L5 10M9 9l1-5M12 12v5m0 0l-4 3M12 17l4 3" stroke="rgba(0,0,0,0.6)" strokeWidth="1.5" />
    </svg>
  );

  const CleatIcon = ({ color, size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M2,17 L2,18 C2,19.1 2.9,20 4,20 L18,20 C19.1,20 20,19.1 20,18 L20,17 L2,17 Z M21.3,10.7 C20.9,10.3 20.3,10.3 19.9,10.7 L15,15.6 L10.1,10.7 C9.7,10.3 9.1,10.3 8.7,10.7 L7.3,12.1 C6.9,12.5 6.9,13.1 7.3,13.5 L13.6,19.8 C14,20.2 14.6,20.2 15,19.8 L21.3,13.5 C21.7,13.1 21.7,12.5 21.3,12.1 L21.3,10.7 Z" />
      <rect x="5" y="20" width="2" height="2" />
      <rect x="9" y="21" width="2" height="2" />
      <rect x="13" y="21" width="2" height="2" />
      <rect x="17" y="20" width="2" height="2" />
    </svg>
  );



  const allHighlights = useMemo(() => getMonthlyHighlights(sessions, registeredPlayers), [sessions, registeredPlayers]);

  if (!isLoaded) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Conectando ao Banco de Dados...</p>
      </div>
    );
  }


  if (!loggedInUserId || !currentUser || !currentUser.jogadorId) {
    return (
      <AuthPage
        authMode={authMode}
        setAuthMode={setAuthMode}
        handleLogin={handleLoginSubmit}
        handleRegisterUser={handleRegisterUserSubmit}
        dbError={dbError}
        currentUser={currentUser}
        handleOnboardingCreate={handleOnboardingCreate}
        handleOnboardingSelect={handleOnboardingSelect}
        registeredPlayers={registeredPlayers}
        handleAvatarUpload={handleAvatarUpload}
        isUploading={isUploading}
        users={users}
        registeredGoleiros={registeredGoleiros}
      />
    );
  }


  const renderAvatarModal = () => selectedAvatar && (
    <div
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
      onClick={() => setSelectedAvatar(null)}
    >
      <img
        src={selectedAvatar}
        alt="Avatar Ampliado"
        style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: '16px', objectFit: 'contain', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}
        onClick={(e) => e.stopPropagation()}
      />
      <button
        style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: 8, borderRadius: '50%', cursor: 'pointer', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}
        onClick={(e) => { e.stopPropagation(); setSelectedAvatar(null); }}
      >
        ❌
      </button>
    </div>
  );

  const renderSupremeAdminModal = () => (
    <div className="admin-overlay" style={{ zIndex: 10000 }}>
      <div className="admin-panel card animated">
        <header className="admin-panel-header">
          <h2 className="admin-panel-title"><Database size={22} /> Área do Admin Supremo</h2>
          <button className="admin-close-btn" onClick={() => setShowSupremeAdmin(false)}>✕</button>
        </header>

        <div className="admin-user-grid">
          {users.sort((a, b) => a.name.localeCompare(b.name)).map(u => {
            const linkedPlayer = registeredPlayers.find(p => p.id === u.jogadorId);
            return (
              <div key={u.id} className="admin-user-card">
                <div className="admin-user-info">
                  <PlayerAvatar users={users} registeredPlayers={registeredPlayers} registeredGoleiros={registeredGoleiros} setSelectedAvatar={setSelectedAvatar} playerName={linkedPlayer?.name || ''} size={40} />
                  <div className="admin-user-details">
                    <span className="admin-user-name">
                      {u.name}
                      {u.is_admin && <Shield size={14} color="#eab308" title="Admin Global" />}
                    </span>
                    <span className="admin-user-email">{u.email}</span>
                    <span className="admin-user-linked">
                      Jogador: {linkedPlayer ? <span style={{ color: 'var(--primary)' }}>{linkedPlayer.name}</span> : <span style={{ color: 'var(--danger)' }}>Nenhum</span>}
                    </span>
                  </div>
                </div>
                <div className="admin-user-actions">
                  <button className="admin-action-btn admin-action-primary" onClick={() => handleChangePassword(u.id)}><Key size={13} /> Trocar Senha</button>
                  {!u.is_admin && <button className="admin-action-btn admin-action-promote" onClick={() => promoteToGlobalAdmin(u.id)}><Shield size={13} /> Promover</button>}
                  {u.is_admin && u.id !== currentUser.id && (currentUser?.id === users[0]?.id || (currentUser?.name && currentUser.name.toLowerCase().includes('pedro dhalia'))) && <button className="admin-action-btn" style={{backgroundColor: 'transparent', border: '1px solid rgba(239, 68, 68, 0.5)', color: 'var(--danger)'}} onClick={() => demoteFromGlobalAdmin(u.id)}><Shield size={13} /> Rebaixar</button>}
                  {u.id !== currentUser.id && <button className="admin-action-btn admin-action-danger" onClick={() => deleteUser(u.id)}><Trash2 size={13} /> Excluir</button>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderBottomNav = () => {
    const isHomeActive = activeTab === 'home' && !showPlayersScreen && !showMonthlyStatsScreen && !showGoleirosScreen && !showAllSessionsScreen && !showAllHighlightsScreen;
    const isPartidasActive = activeTab === 'partidas' || showAllSessionsScreen;
    const isRankingsActive = activeTab === 'ranking' || (activeTab !== 'menu' && (showPlayersScreen || showMonthlyStatsScreen));
    const isMenuActive = activeTab === 'menu' || activeTab === 'players' || showGoleirosScreen;

    return (
      <nav className="bottom-nav">
        <button
          className={`bottom-nav-item ${isHomeActive ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('home');
            setShowPlayersScreen(false);
            setShowMonthlyStatsScreen(false);
            setShowGoleirosScreen(false);
            setShowAllSessionsScreen(false);
            setShowAllHighlightsScreen(false);
            setShowProfile(false);
            setActiveSessionId(null);
          }}
        >
          <span className="bottom-nav-icon">🏠</span>
          <span>Home</span>
        </button>
        <button
          className={`bottom-nav-item ${isPartidasActive ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('partidas');
            setShowPlayersScreen(false);
            setShowMonthlyStatsScreen(false);
            setShowGoleirosScreen(false);
            setShowAllSessionsScreen(true);
            setShowAllHighlightsScreen(false);
            setShowProfile(false);
            setActiveSessionId(null);
          }}
        >
          <span className="bottom-nav-icon">⚽</span>
          <span>Peladas</span>
        </button>
        <button
          className={`bottom-nav-item ${isRankingsActive ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('ranking');
            setShowPlayersScreen(false);
            setShowMonthlyStatsScreen(false);
            setShowGoleirosScreen(false);
            setShowAllSessionsScreen(false);
            setShowAllHighlightsScreen(false);
            setShowProfile(false);
            setActiveSessionId(null);
          }}
        >
          <span className="bottom-nav-icon">📊</span>
          <span>Rankings</span>
        </button>
        <button
          className={`bottom-nav-item ${isMenuActive ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('menu');
            setShowPlayersScreen(false);
            setShowMonthlyStatsScreen(false);
            setShowGoleirosScreen(false);
            setShowAllSessionsScreen(false);
            setShowAllHighlightsScreen(false);
            setShowProfile(false);
            setActiveSessionId(null);
          }}
        >
          <span className="bottom-nav-icon">⚙️</span>
          <span>Menu</span>
        </button>
      </nav>
    );
  };

  const renderRankingsLandingScreen = () => {
    return (
      <div className="main-content animated" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
        <header className="header" style={{ padding: '8px 0', borderBottom: 'none' }}>
          <h1 style={{ margin: 0 }}>Rankings</h1>
        </header>

        <div className="menu-compact-grid" style={{ marginTop: '8px' }}>
          <button className="menu-compact-btn" onClick={() => {
            setShowPlayersScreen(true);
            setShowMonthlyStatsScreen(false);
          }}>
            <span className="menu-compact-icon" style={{ fontSize: '24px' }}>📊</span>
            <span>Ranking Geral</span>
          </button>

          <button className="menu-compact-btn" onClick={() => {
            setShowMonthlyStatsScreen(true);
            setShowPlayersScreen(false);
          }}>
            <span className="menu-compact-icon" style={{ fontSize: '24px' }}>📅</span>
            <span>Ranking do Mês</span>
          </button>
        </div>
      </div>
    );
  };

  const renderMenuScreen = () => (
    <div className="main-content animated" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
      <header className="header" style={{ padding: '8px 0', borderBottom: 'none' }}>
        <h1 style={{ margin: 0 }}>Menu</h1>
      </header>

      <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: 'rgba(255,255,255,0.02)' }}>
        <PlayerAvatar users={users} registeredPlayers={registeredPlayers} registeredGoleiros={registeredGoleiros} setSelectedAvatar={setSelectedAvatar} playerName={currentUser?.name} userId={currentUser?.id} size={60} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <strong style={{ fontSize: '18px', color: 'var(--text-main)' }}>{currentUser?.name}</strong>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{currentUser?.email}</span>
          {isGlobalAdmin && (
            <span style={{
              fontSize: '11px',
              color: 'var(--primary)',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              padding: '2px 8px',
              borderRadius: '12px',
              fontWeight: 'bold',
              width: 'fit-content',
              marginTop: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <Shield size={10} /> Admin Global
            </span>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <button className="menu-item-btn" onClick={() => { setViewingPlayerId(currentUser?.jogadorId); setShowProfile(true); }}>
          <span style={{ fontSize: '18px' }}>👤</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'bold' }}>Meu Perfil</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Veja suas estatísticas e evolução</div>
          </div>
        </button>

        <button className="menu-item-btn" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }} onClick={() => setShowGoleirosScreen(true)}>
          <span style={{ fontSize: '18px' }}>🧤</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'bold' }}>Goleiros Cadastrados</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Ranking e estatísticas de goleiros</div>
          </div>
        </button>

        <button className="menu-item-btn" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }} onClick={() => setActiveTab('players')}>
          <span style={{ fontSize: '18px' }}>👥</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'bold' }}>Jogadores Cadastrados</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Lista e estatísticas individuais de todos os jogadores</div>
          </div>
        </button>

        {isGlobalAdmin && (
          <button className="menu-item-btn" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }} onClick={() => setShowSupremeAdmin(true)}>
            <span style={{ fontSize: '18px' }}>⚙️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold' }}>Painel de Controle</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Gerencie senhas, admins e contas</div>
            </div>
          </button>
        )}

        <button className="menu-item-btn" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', color: 'var(--danger)' }} onClick={handleLogout}>
          <span style={{ fontSize: '18px' }}>🚪</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'bold' }}>Sair</div>
            <div style={{ fontSize: '12px', color: 'rgba(255, 69, 58, 0.6)' }}>Efetuar logout da conta</div>
          </div>
        </button>
      </div>
    </div>
  );

  const renderPlayersDirectoryScreen = () => {
    const filteredAndSorted = registeredPlayers
      .filter(p => p.name.toLowerCase().includes(dirSearchQuery.toLowerCase()))
      .sort((a, b) => {
        if (dirSortConfig === 'nome') return a.name.localeCompare(b.name);
        if (dirSortConfig === 'nota') return (b.media_nota || 0) - (a.media_nota || 0) || a.name.localeCompare(b.name);
        if (dirSortConfig === 'jogos') {
          const statsA = getPlayerStats(a.name, sessions, registeredPlayers, registeredGoleiros);
          const statsB = getPlayerStats(b.name, sessions, registeredPlayers, registeredGoleiros);
          return (statsB.peladasJogadas || 0) - (statsA.peladasJogadas || 0) || (b.media_nota || 0) - (a.media_nota || 0) || a.name.localeCompare(b.name);
        }
        return 0;
      });

    return (
      <div className="main-content animated" style={{ padding: '16px' }}>
        <header className="header" style={{ padding: '8px 0', borderBottom: 'none', gap: '12px', display: 'flex', alignItems: 'center' }}>
          <button className="back-btn" onClick={() => setActiveTab('menu')}>
            <ChevronLeft size={28} />
          </button>
          <h1 style={{ margin: 0 }}>Jogadores</h1>
        </header>

        <input
          type="text"
          className="input-field"
          placeholder="🔍 Buscar atleta..."
          value={dirSearchQuery}
          onChange={(e) => setDirSearchQuery(e.target.value)}
          style={{ marginBottom: '16px', backgroundColor: 'rgba(255,255,255,0.05)', width: '100%' }}
        />

        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {[
            { key: 'nome', label: 'Nome', icon: '🔤' },
            { key: 'nota', label: 'Nota', icon: '⭐' },
            { key: 'jogos', label: 'Jogos', icon: '👟' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setDirSortConfig(tab.key)}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: '10px',
                border: dirSortConfig === tab.key ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.08)',
                backgroundColor: dirSortConfig === tab.key ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.03)',
                color: dirSortConfig === tab.key ? 'var(--primary)' : 'var(--text-muted)',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {filteredAndSorted.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>Nenhum jogador encontrado.</p>
        ) : (
          <div className="player-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredAndSorted.map(p => {
              const stats = getPlayerStats(p.name, sessions, registeredPlayers, registeredGoleiros);
              return (
                <div
                  key={p.id}
                  className="card animated"
                  style={{
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    borderLeft: '4px solid var(--primary)',
                    backgroundColor: 'var(--surface)'
                  }}
                  onClick={() => {
                    setViewingPlayerId(p.id);
                    setShowProfile(true);
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <PlayerAvatar users={users} registeredPlayers={registeredPlayers} registeredGoleiros={registeredGoleiros} setSelectedAvatar={setSelectedAvatar} playerName={p.name} size={40} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text-main)' }}>{p.name}</span>
                      {p.posicao && (
                        <span style={{
                          fontSize: '10px',
                          color: 'var(--primary)',
                          backgroundColor: 'rgba(34, 197, 94, 0.1)',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontWeight: 'bold',
                          width: 'fit-content'
                        }}>
                          {p.posicao}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Jogos</span>
                      <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>{stats.peladasJogadas}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Nota</span>
                      <span style={{ fontSize: '14px', fontWeight: '800', color: '#eab308' }}>{p.media_nota ? p.media_nota.toFixed(2) : '0.00'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (showProfile) {
    const targetPlayerId = viewingPlayerId || currentUser?.jogadorId;
    const profilePlayer = registeredPlayers.find(p => p.id === targetPlayerId) || registeredGoleiros.find(p => p.id === targetPlayerId);
    const isGoleiro = registeredGoleiros.some(g => g.id === targetPlayerId);
    const profileStats = profilePlayer ? getPlayerStats(profilePlayer.name, sessions, registeredPlayers, registeredGoleiros) : null;
    const isOwnProfile = targetPlayerId === currentUser?.jogadorId;

    let comparisonUI = null;
    const p1Id = comparePlayer1Id !== null ? comparePlayer1Id : profilePlayer?.id;
    const p2Id = comparePlayer2Id;

    if (p1Id && p2Id) {
      const player1 = registeredPlayers.find(p => p.id === p1Id);
      const player2 = registeredPlayers.find(p => p.id === p2Id);
      if (player1 && player2) {
        const stats1 = compareMonthKey
          ? getPlayerStatsForMonth(sessions, player1.name, compareMonthKey, registeredPlayers)
          : getPlayerStats(player1.name, sessions, registeredPlayers, registeredGoleiros);
        const stats2 = compareMonthKey
          ? getPlayerStatsForMonth(sessions, player2.name, compareMonthKey, registeredPlayers)
          : getPlayerStats(player2.name, sessions, registeredPlayers, registeredGoleiros);

        let rating1 = 0;
        let rating2 = 0;
        if (compareMonthKey) {
          const monthStats = getPlayersStatsForMonth(sessions, registeredPlayers, compareMonthKey);
          const p1Month = monthStats.find(ps => ps.name === player1.name);
          const p2Month = monthStats.find(ps => ps.name === player2.name);
          rating1 = p1Month ? p1Month.media_nota : 0;
          rating2 = p2Month ? p2Month.media_nota : 0;
        } else {
          rating1 = player1.media_nota || 0;
          rating2 = player2.media_nota || 0;
        }

        const renderRow = (label, v1, v2, suffix = '') => {
          const val1 = parseFloat(v1);
          const val2 = parseFloat(v2);
          const win1 = val1 > val2;
          const win2 = val2 > val1;
          const maxVal = Math.max(val1, val2, 0.001);
          return (
            <div className="compare-row" key={label}>
              <div className="compare-val left">
                <div className={win1 ? 'winner-text' : ''}>{v1}{suffix}</div>
                <div className="stat-bar-bg"><div className="stat-bar-fill left" style={{ width: `${(val1 / maxVal) * 100}%`, opacity: win1 ? 1 : 0.4 }}></div></div>
              </div>
              <div className="compare-label">{label}</div>
              <div className="compare-val right">
                <div className={win2 ? 'winner-text' : ''}>{v2}{suffix}</div>
                <div className="stat-bar-bg"><div className="stat-bar-fill" style={{ width: `${(val2 / maxVal) * 100}%`, opacity: win2 ? 1 : 0.4 }}></div></div>
              </div>
            </div>
          );
        };
        const renderMiniBadges = (stats, name) => (
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '4px', marginTop: '2px', maxWidth: '100%' }}>
            {stats.artilheiroCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', backgroundColor: 'rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: '4px', fontSize: 9 }} title="Artilheiro">
                <span>⚽</span><strong style={{ color: 'var(--text-main)' }}>{stats.artilheiroCount}x</strong>
              </div>
            )}
            {stats.garcomCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', backgroundColor: 'rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: '4px', fontSize: 9 }} title="Garçom">
                <span>🎯</span><strong style={{ color: 'var(--text-main)' }}>{stats.garcomCount}x</strong>
              </div>
            )}
            {stats.mvpCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', backgroundColor: 'rgba(234, 179, 8, 0.2)', padding: '2px 4px', borderRadius: '4px', border: '1px solid rgba(234, 179, 8, 0.3)', fontSize: 9 }} title="MVP">
                <span>⭐</span><strong style={{ color: '#eab308' }}>{stats.mvpCount}x</strong>
              </div>
            )}
            {stats.puskasWins > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', backgroundColor: 'rgba(234, 179, 8, 0.2)', padding: '2px 4px', borderRadius: '4px', border: '1px solid rgba(234, 179, 8, 0.3)', fontSize: 9 }} title="Puskas">
                <span>👟</span><strong style={{ color: '#eab308' }}>{stats.puskasWins}x</strong>
              </div>
            )}
            {name.trim().toLowerCase() === 'digaum' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', backgroundColor: 'rgba(239, 68, 68, 0.2)', padding: '2px 4px', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: 9 }} title="Gol Contra">
                <span>❌</span><strong style={{ color: '#ef4444' }}>2x</strong>
              </div>
            )}
          </div>
        );
        comparisonUI = (
          <div className="compare-section animated">
            <div className="compare-header-grid">
              <div className="compare-player-info">
                <PlayerAvatar users={users} registeredPlayers={registeredPlayers} registeredGoleiros={registeredGoleiros} setSelectedAvatar={setSelectedAvatar} playerName={player1.name} size={48} />
                <span style={{ fontSize: 13, fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{player1.name}</span>
                {renderMiniBadges(stats1, player1.name)}
              </div>
              <div className="vs-badge">VS</div>
              <div className="compare-player-info">
                <PlayerAvatar users={users} registeredPlayers={registeredPlayers} registeredGoleiros={registeredGoleiros} setSelectedAvatar={setSelectedAvatar} playerName={player2.name} size={48} />
                <span style={{ fontSize: 13, fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{player2.name}</span>
                {renderMiniBadges(stats2, player2.name)}
              </div>
            </div>
            <div className="compare-stats-table">
              {renderRow('Peladas', stats1.peladasJogadas, stats2.peladasJogadas)}
              {renderRow('Vitorias', stats1.peladasGanhas, stats2.peladasGanhas)}
              {renderRow('Gols', stats1.totalGoals, stats2.totalGoals)}
              {renderRow('Assistências', stats1.totalAssists, stats2.totalAssists)}
              {renderRow('G+A Total', stats1.totalGoals + stats1.totalAssists, stats2.totalGoals + stats2.totalAssists)}
              {renderRow('Média Gols', stats1.goalAvg, stats2.goalAvg)}
              {renderRow('Nota', rating1.toFixed(2), rating2.toFixed(2))}
              {renderRow('Win Rate', stats1.winRate, stats2.winRate, '%')}
            </div>
          </div>
        );
      }
    }

    return (
      <div className="app-container" style={{ padding: 24, maxWidth: 600, margin: '0 auto', justifyContent: 'center' }}>
        <header className="header" style={{ marginBottom: 24 }}>
          <button className="back-btn" onClick={() => { setShowProfile(false); setViewingPlayerId(null); }}>
            <ChevronLeft size={28} />
          </button>
          <h1>{isOwnProfile ? 'Meu Perfil' : 'Perfil do Jogador'}</h1>
        </header>

        <div className="card animated" style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
          <div style={{ position: 'relative' }}>
            <PlayerAvatar users={users} registeredPlayers={registeredPlayers} registeredGoleiros={registeredGoleiros} setSelectedAvatar={setSelectedAvatar} playerName={isOwnProfile ? currentUser?.name : profilePlayer?.name} userId={isOwnProfile ? currentUser?.id : null} size={120} />
            {isOwnProfile && isUploading && (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="spinner">⏳</span>
              </div>
            )}
          </div>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ margin: 0 }}>{isOwnProfile ? currentUser?.name : profilePlayer?.name}</h2>
            <div style={{ marginTop: '8px' }}>
              <span className="position-badge" style={{
                display: 'inline-flex',
                backgroundColor: isGoleiro ? 'rgba(168, 85, 247, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                color: isGoleiro ? '#a855f7' : 'var(--primary)',
                padding: '4px 14px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: '700',
                border: `1px solid ${isGoleiro ? 'rgba(168, 85, 247, 0.2)' : 'rgba(34, 197, 94, 0.2)'}`,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {isGoleiro ? '🧤 Goleiro' : `🏃 ${profilePlayer?.posicao || 'Jogador'}`}
              </span>
            </div>
            {isOwnProfile && <p style={{ color: 'var(--text-muted)', margin: 0, marginTop: 12 }}>{currentUser?.email}</p>}
            {isOwnProfile && profilePlayer && (
              <div style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: 'rgba(255,255,255,0.05)', padding: '8px 16px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Jogador:</span>
                <strong style={{ color: 'var(--text-main)', fontSize: 16 }}>{profilePlayer.name}</strong>
                <button onClick={handleEditLinkedPlayerName} className="icon-btn" style={{ color: 'var(--primary)', padding: 4, marginLeft: 4 }}><Pencil size={16} /></button>
              </div>
            )}
          </div>
          {isOwnProfile && (
            <div style={{ display: 'flex', gap: 16 }}>
              <label className="btn-primary" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Camera size={16} /> Alterar Foto
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
              </label>
              {currentUser?.avatar && <button className="btn-primary" style={{ backgroundColor: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)' }} onClick={removeAvatar}>Remover Foto</button>}
            </div>
          )}
        </div>

        {profileStats && (
          <>
            {(() => {
              const evolutionData = allHighlights.map(h => {
                const monthStats = getPlayersStatsForMonth(sessions, registeredPlayers, h.monthKey);
                const pStat = monthStats.find(ps => ps.name === profilePlayer.name);
                return {
                  month: h.label.split(' — ')[0] || h.label,
                  key: h.monthKey,
                  nota: pStat ? parseFloat(pStat.media_nota) : null
                };
              }).filter(d => d.nota !== null).reverse();

              if (evolutionData.length < 2) return null;

              const radarData = [
                { subject: 'Ataque', A: Math.min(10, (profileStats.totalGoals / profileStats.peladasJogadas) * 4), value: profileStats.totalGoals, fullMark: 10 },
                { subject: 'Garçom', A: Math.min(10, (profileStats.totalAssists / profileStats.peladasJogadas) * 5), value: profileStats.totalAssists, fullMark: 10 },
                { subject: 'Vitória', A: (profileStats.winRate / 10), value: `${profileStats.winRate}%`, fullMark: 10 },
                { subject: 'Média', A: profilePlayer.media_nota || 0, value: (profilePlayer.media_nota || 0).toFixed(2), fullMark: 10 },
                { subject: 'Defesa', A: Math.min(10, (profileStats.cleanSheetsCount / (profileStats.peladasJogadas || 1)) * 5), value: profileStats.cleanSheetsCount, fullMark: 10 },
              ];

              return (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px', marginTop: 16 }}>
                  <div className="card animated" style={{ padding: '24px 16px' }}>
                    <h3 style={{ fontSize: 16, color: 'var(--primary)', marginBottom: 16, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <Target size={18} /> Pontos Fortes
                    </h3>
                    <div style={{ width: '100%', height: 240, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData} style={{ outline: 'none' }}>
                          <PolarGrid stroke="rgba(255,255,255,0.05)" radialLines={false} />
                          <PolarAngleAxis
                            dataKey="subject"
                            tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: '600' }}
                          />
                          <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
                          <Tooltip
                            cursor={false}
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div style={{
                                    backgroundColor: 'rgba(20,20,20,0.95)',
                                    border: '1px solid var(--primary)',
                                    padding: '8px 12px',
                                    borderRadius: '10px',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                                    backdropFilter: 'blur(10px)'
                                  }}>
                                    <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{data.subject}</p>
                                    <p style={{ margin: 0, fontSize: 16, fontWeight: 'bold', color: 'var(--primary)' }}>{data.value}</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Radar
                            name={profilePlayer.name}
                            dataKey="A"
                            stroke="var(--primary)"
                            strokeWidth={3}
                            fill="var(--primary)"
                            fillOpacity={0.2}
                            dot={{ r: 4, fill: 'var(--primary)', strokeWidth: 2, stroke: '#fff' }}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="card animated" style={{ padding: 24 }}>
                    <h3 style={{ fontSize: 16, color: 'var(--primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <TrendingUp size={18} /> Evolução de Nota
                    </h3>
                    <div style={{ width: '100%', height: 180, marginTop: 10 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={evolutionData} style={{ outline: 'none' }}>
                          <defs>
                            <linearGradient id="colorNota" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis
                            dataKey="month"
                            stroke="var(--text-muted)"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                          />
                          <YAxis hide domain={[0, 10]} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'rgba(20,20,20,0.9)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '12px',
                              fontSize: 12,
                              backdropFilter: 'blur(10px)',
                              boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                            }}
                            itemStyle={{ color: 'var(--primary)', fontWeight: 'bold' }}
                            cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                          />
                          <Area
                            type="monotone"
                            dataKey="nota"
                            stroke="var(--primary)"
                            strokeWidth={4}
                            fillOpacity={1}
                            fill="url(#colorNota)"
                            animationDuration={2000}
                            dot={false}
                            activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--primary)' }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                      {(() => {
                        const prev = evolutionData[evolutionData.length - 2].nota;
                        const last = evolutionData[evolutionData.length - 1].nota;
                        const totalDiff = last - prev;
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: totalDiff > 0 ? '#22c55e' : totalDiff < 0 ? '#ef4444' : 'var(--text-muted)' }}>
                            {totalDiff > 0 && <TrendingUp size={14} />}
                            {totalDiff < 0 && <TrendingDown size={14} />}
                            <span>
                              {totalDiff > 0 
                                ? `Subiu ${totalDiff.toFixed(1)} pts em relação ao mês passado` 
                                : totalDiff < 0 
                                  ? `Caiu ${Math.abs(totalDiff).toFixed(1)} pts em relação ao mês passado` 
                                  : 'Sem alteração em relação ao mês passado'}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="card animated" style={{ padding: 24, marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, color: 'var(--primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Trophy size={18} /> Desempenho Geral</h3>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {(profileStats.recentForm || []).reverse().map((f, i) => (
                    <div key={i} title={`Nota: ${f.nota.toFixed(1)}`} style={{
                      width: 10, height: 10, borderRadius: '50%',
                      backgroundColor: f.won ? '#22c55e' : '#ef4444',
                      boxShadow: `0 0 5px ${f.won ? '#22c55e' : '#ef4444'}`
                    }}></div>
                  ))}
                </div>
              </div>

              {!isGoleiro ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: 16 }}>
                  {[
                    { label: 'Gols', value: profileStats.totalGoals, icon: '⚽' },
                    { label: 'Assist.', value: profileStats.totalAssists, icon: '🎯' },
                    { label: 'Nota', value: profilePlayer?.media_nota ? profilePlayer.media_nota.toFixed(2) : '0.00', icon: '⭐' },
                    { label: 'MVPs', value: profileStats.mvpCount || 0, icon: '🏆' },
                    { label: 'Jogos', value: profileStats.peladasJogadas, icon: '👟' }
                  ].map((s, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 4px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontSize: 16, marginBottom: '2px' }}>{s.icon}</span>
                      <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-main)' }}>{s.value}</span>
                      <span style={{ fontSize: 8.5, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '2px', fontWeight: 'bold' }}>{s.label}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: 16 }}>
                  {[
                    { label: 'Vitórias', value: profilePlayer?.total_vitorias || 0, icon: '🏆' },
                    { label: 'Defesas Dif.', value: profilePlayer?.total_defesas_dificeis || 0, icon: '🧤' }
                  ].map((s, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 6px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontSize: 18, marginBottom: '4px' }}>{s.icon}</span>
                      <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-main)' }}>{s.value}</span>
                      <span style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '2px', fontWeight: 'bold' }}>{s.label}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 20 }}>
                <PlayerBadges playerName={profilePlayer?.name} stats={profileStats} isPodium={false} />
              </div>

              {profileStats.bestPartners && profileStats.bestPartners.length > 0 && (
                <div style={{
                  marginTop: 20, padding: '16px', borderRadius: '12px',
                  backgroundColor: 'rgba(59, 130, 246, 0.03)', border: '1px solid rgba(59, 130, 246, 0.08)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ backgroundColor: 'var(--primary)', padding: '6px', borderRadius: '8px' }}>
                      <Users size={16} color="#fff" />
                    </div>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Melhores Duplas</p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {profileStats.bestPartners.map((partner, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: 13, fontWeight: '600', color: 'var(--text-main)' }}>{partner.name}</span>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{partner.matches} {partner.matches === 1 ? 'jogo' : 'jogos'}</span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: '700', color: 'var(--primary)' }}>{partner.rate}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {profileStats && profileStats.matchHistory && profileStats.matchHistory.length > 0 && (
              <div className="card animated" style={{ padding: 24, marginTop: 16 }}>
                <h3 style={{ fontSize: 16, color: 'var(--primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>📅</span> Últimas Partidas
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {profileStats.matchHistory.slice(0, 10).map((mh, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: '14px', color: 'var(--text-main)', fontWeight: '600' }}>{mh.sessionName}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{mh.sessionDate}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ display: 'flex', gap: 8, fontSize: '13px' }}>
                          {mh.goals > 0 && <span style={{ color: 'var(--primary)', fontWeight: 'bold' }} title="Gols">⚽ {mh.goals}</span>}
                          {mh.assists > 0 && <span style={{ color: 'var(--text-main)', fontWeight: 'bold' }} title="Assistências">🎯 {mh.assists}</span>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, backgroundColor: 'rgba(234, 179, 8, 0.1)', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#eab308' }} title="Nota">⭐ {mh.nota?.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="card animated" style={{ padding: 24, marginTop: 16, marginBottom: 40 }}>
              <h3 style={{ fontSize: 16, color: 'var(--primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Users size={18} /> Comparar Estatísticas</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                <div style={{ position: 'relative' }}>
                  <select className="input-field" value={comparePlayer1Id !== null ? comparePlayer1Id : (profilePlayer?.id || '')} onChange={(e) => setComparePlayer1Id(e.target.value)} style={{ width: '100%' }}>
                    <option value="">Selecionar jogador 1...</option>
                    {registeredPlayers.sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ position: 'relative' }}>
                  <select className="input-field" value={comparePlayer2Id || ''} onChange={(e) => setComparePlayer2Id(e.target.value)} style={{ width: '100%', paddingRight: '40px' }}>
                    <option value="">Selecionar jogador 2...</option>
                    {registeredPlayers.filter(p => p.id !== (comparePlayer1Id !== null ? comparePlayer1Id : profilePlayer?.id)).sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  {comparePlayer2Id && <button onClick={() => setComparePlayer2Id(null)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)' }}><LogOut size={16} /></button>}
                </div>
                <div style={{ position: 'relative' }}>
                  <select className="input-field" value={compareMonthKey} onChange={(e) => setCompareMonthKey(e.target.value)} style={{ width: '100%' }}>
                    <option value="">Geral (Todo o período)</option>
                    {allHighlights.map(h => (
                      <option key={h.monthKey} value={h.monthKey}>{h.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              {comparisonUI}
            </div>
          </>
        )}

      </div>
    );
  }
  if (!activeSessionId) {
    if (showAllSessionsScreen) {
      return (
        <div className="app-container">
          <header className="header" style={{ gap: '16px' }}>
            {activeTab !== 'partidas' && (
              <button className="back-btn" onClick={() => setShowAllSessionsScreen(false)}>
                <ChevronLeft size={28} />
              </button>
            )}
            <h1>{activeTab === 'partidas' ? 'Peladas' : 'Todas as Peladas'}</h1>
          </header>
          <main className="main-content animated">
            <div className="session-list">
              {sessions.map(session => (
                <div key={session.id} className="card animated">
                  <div className="card-header cursor-pointer" onClick={() => setActiveSessionId(session.id)}>
                    <div>
                      <span className="card-title">
                        <Calendar size={18} color="var(--primary)" />
                        {session.name}
                        {canEditSession(session) && <button className="icon-btn" style={{ padding: 4, marginLeft: 6, color: 'var(--text-muted)' }} onClick={(e) => { e.stopPropagation(); editSessionName(session.id, session.name); }}><Pencil size={14} /></button>}
                      </span>
                      <span className="card-meta">{session.teams?.length || 0} times cadastrados</span>
                    </div>
                    <div className="card-actions" onClick={e => e.stopPropagation()}>
                      {canEditSession(session) && (
                        <button className="icon-btn danger" style={{ color: 'var(--danger)' }} onClick={() => removeSession(session.id)}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </main>
          {renderBottomNav()}
        </div>
      );
    }

    if (showMonthlyStatsScreen) {
      const monthNames = {
        "01": "Janeiro", "02": "Fevereiro", "03": "Março", "04": "Abril",
        "05": "Maio", "06": "Junho", "07": "Julho", "08": "Agosto",
        "09": "Setembro", "10": "Outubro", "11": "Novembro", "12": "Dezembro"
      };

      const months = allHighlights.map(h => ({ key: h.monthKey, label: h.label }));
      const currentMonthKey = selectedMonthKey || (months.length > 0 ? months[0].key : null);
      const monthlyPlayers = currentMonthKey ? getPlayersStatsForMonth(sessions, registeredPlayers, currentMonthKey) : [];

      // Get previous month stats for comparison
      const currentIdx = months.findIndex(m => m.key === currentMonthKey);
      const prevMonthKey = (currentIdx !== -1 && currentIdx < months.length - 1) ? months[currentIdx + 1].key : null;
      const prevMonthlyPlayers = prevMonthKey ? getPlayersStatsForMonth(sessions, registeredPlayers, prevMonthKey) : [];

      return (
        <div className="app-container">
          <header className="header" style={{ gap: '16px' }}>
            <button className="back-btn" onClick={() => {
              setShowMonthlyStatsScreen(false);
              setSelectedMonthKey(null);
            }}>
              <ChevronLeft size={28} />
            </button>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h1 style={{ margin: 0, fontSize: '20px' }}>Estatísticas por Mês</h1>
              {currentMonthKey && <span style={{ fontSize: 13, color: 'var(--primary)', fontWeight: '600' }}>{monthNames[currentMonthKey.split('/')[0]]} {currentMonthKey.split('/')[1]}</span>}
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
                    backgroundColor: (selectedMonthKey === m.key || (!selectedMonthKey && m.key === currentMonthKey)) ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                    color: (selectedMonthKey === m.key || (!selectedMonthKey && m.key === currentMonthKey)) ? '#fff' : 'var(--text-muted)',
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

            {monthlyPlayers.length === 0 ? (
              <div className="empty-state">
                <Calendar size={48} />
                <p>Nenhum dado para este mês.</p>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  className="input-field"
                  placeholder="🔍 Buscar jogador no mês..."
                  value={monthlyPlayerSearchQuery}
                  onChange={(e) => setMonthlyPlayerSearchQuery(e.target.value)}
                  style={{ marginBottom: '16px', backgroundColor: 'rgba(255,255,255,0.05)', flex: 'none' }}
                />

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
                  {[
                    { key: 'gols', icon: '⚽', label: 'Gols' },
                    { key: 'assistencias', icon: '🎯', label: 'Assist.' },
                    { key: 'vitorias', icon: '🏆', label: 'Vitorias' },
                    { key: 'media', icon: '⭐', label: 'Média' },
                    { key: 'ga', icon: '🔥', label: 'G+A' },
                    { key: 'media_ga', icon: '📊', label: 'Méd. G/A' },
                  ].map(f => (
                    <button
                      key={f.key}
                      onClick={() => setMonthlyPlayerSortConfig(f.key)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        padding: '12px 8px',
                        borderRadius: '12px',
                        border: monthlyPlayerSortConfig === f.key ? '1.5px solid var(--primary)' : '1px solid rgba(255,255,255,0.08)',
                        backgroundColor: monthlyPlayerSortConfig === f.key ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.03)',
                        color: monthlyPlayerSortConfig === f.key ? 'var(--primary)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <span style={{ fontSize: 22 }}>{f.icon}</span>
                      <span style={{ fontSize: 11, fontWeight: monthlyPlayerSortConfig === f.key ? 700 : 500 }}>{f.label}</span>
                    </button>
                  ))}
                </div>

                <div className="player-list" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(() => {
                    const filteredAndSorted = monthlyPlayers
                      .filter(p => p.name.toLowerCase().includes(monthlyPlayerSearchQuery.toLowerCase()))
                      .sort((a, b) => {
                        if (monthlyPlayerSortConfig === 'gols') return (b.total_gols || 0) - (a.total_gols || 0) || (b.media_nota || 0) - (a.media_nota || 0);
                        if (monthlyPlayerSortConfig === 'assistencias') return (b.total_assistencias || 0) - (a.total_assistencias || 0) || (b.media_nota || 0) - (a.media_nota || 0);
                        if (monthlyPlayerSortConfig === 'vitorias') return (b.total_vitorias || 0) - (a.total_vitorias || 0) || (b.media_nota || 0) - (a.media_nota || 0);
                        if (monthlyPlayerSortConfig === 'media') return (b.media_nota || 0) - (a.media_nota || 0);
                        if (monthlyPlayerSortConfig === 'ga') return ((b.total_gols || 0) + (b.total_assistencias || 0)) - ((a.total_gols || 0) + (a.total_assistencias || 0)) || (b.media_nota || 0) - (a.media_nota || 0);
                        if (monthlyPlayerSortConfig === 'media_ga') {
                          const avgA = a.matchesForNota > 0 ? (a.total_gols + a.total_assistencias) / a.matchesForNota : 0;
                          const avgB = b.matchesForNota > 0 ? (b.total_gols + b.total_assistencias) / b.matchesForNota : 0;
                          return avgB - avgA || (b.media_nota || 0) - (a.media_nota || 0);
                        }
                        return a.name.localeCompare(b.name);
                      });

                    const mainPlayers = filteredAndSorted.filter(p => !p.isGuest);
                    const guestPlayers = filteredAndSorted.filter(p => !!p.isGuest);

                    mainPlayers.forEach((p, i) => { p.displayRank = i + 1; });
                    guestPlayers.forEach((p, i) => { p.displayRank = i + 1; });

                    let maxStatValue = 1;
                    if (mainPlayers.length > 0) {
                      const topP = mainPlayers[0];
                      if (monthlyPlayerSortConfig === 'gols') maxStatValue = topP.total_gols || 1;
                      if (monthlyPlayerSortConfig === 'assistencias') maxStatValue = topP.total_assistencias || 1;
                      if (monthlyPlayerSortConfig === 'vitorias') maxStatValue = topP.total_vitorias || 1;
                      if (monthlyPlayerSortConfig === 'media') maxStatValue = 10;
                      if (monthlyPlayerSortConfig === 'ga') maxStatValue = ((topP.total_gols || 0) + (topP.total_assistencias || 0)) || 1;
                      if (monthlyPlayerSortConfig === 'media_ga') {
                        maxStatValue = topP.matchesForNota > 0 ? (topP.total_gols + topP.total_assistencias) / topP.matchesForNota : 1;
                      }
                    }

                    const showPodium = monthlyPlayerSearchQuery.trim() === '' && mainPlayers.length >= 3;
                    const podiumPlayers = showPodium ? mainPlayers.slice(0, 3) : [];
                    const listPlayers = showPodium ? mainPlayers.slice(3) : mainPlayers;

                    const getStatValue = (p) => {
                      if (monthlyPlayerSortConfig === 'gols') return <span style={{ color: 'var(--primary)' }}>⚽ {p.total_gols || 0}</span>;
                      if (monthlyPlayerSortConfig === 'assistencias') return <span style={{ color: 'var(--primary)' }}>🎯 {p.total_assistencias || 0}</span>;
                      if (monthlyPlayerSortConfig === 'vitorias') return <span style={{ color: 'var(--primary)' }}>🏆 {p.total_vitorias || 0}</span>;
                      if (monthlyPlayerSortConfig === 'media') return <span style={{ color: 'var(--primary)' }}>⭐ {p.media_nota?.toFixed(2) || '0.00'}</span>;
                      if (monthlyPlayerSortConfig === 'ga') return <span style={{ color: 'var(--primary)' }}>🔥 {(p.total_gols || 0) + (p.total_assistencias || 0)}</span>;
                      if (monthlyPlayerSortConfig === 'media_ga') {
                        const avg = p.matchesForNota > 0 ? ((p.total_gols + p.total_assistencias) / p.matchesForNota).toFixed(2) : '0.00';
                        return <span style={{ color: 'var(--primary)' }}>📊 {avg}</span>;
                      }
                      return '';
                    };

                    const renderPlayerCard = (p) => {
                      let currentStatValue = 0;
                      if (monthlyPlayerSortConfig === 'gols') currentStatValue = p.total_gols || 0;
                      if (monthlyPlayerSortConfig === 'assistencias') currentStatValue = p.total_assistencias || 0;
                      if (monthlyPlayerSortConfig === 'vitorias') currentStatValue = p.total_vitorias || 0;
                      if (monthlyPlayerSortConfig === 'media') currentStatValue = p.media_nota || 0;
                      if (monthlyPlayerSortConfig === 'ga') currentStatValue = (p.total_gols || 0) + (p.total_assistencias || 0);
                      if (monthlyPlayerSortConfig === 'media_ga') {
                        currentStatValue = p.matchesForNota > 0 ? (p.total_gols + p.total_assistencias) / p.matchesForNota : 0;
                      }

                      const barPercentage = Math.min(100, Math.max(0, (currentStatValue / maxStatValue) * 100));

                      return (
                        <div key={p.id} className="card animated" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }} onClick={() => togglePlayerStats(p.id)}>
                          <div style={{ position: 'absolute', bottom: 0, left: 0, height: '4px', width: `${barPercentage}%`, backgroundColor: 'var(--primary)', borderTopRightRadius: '4px', transition: 'width 0.5s ease', opacity: 0.9 }}></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                            <span className="card-title" style={{ fontSize: 18, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-muted)' }}>{p.displayRank}º</span>
                              <span
                                onClick={(e) => { e.stopPropagation(); setViewingPlayerId(p.id); setShowProfile(true); }}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                                title="Ver perfil"
                              >
                                <PlayerAvatar users={users} registeredPlayers={registeredPlayers} registeredGoleiros={registeredGoleiros} setSelectedAvatar={setSelectedAvatar}
                                  playerName={p.name}
                                  size={36}
                                  onClick={() => { setViewingPlayerId(p.id); setShowProfile(true); }}
                                />
                                <span style={{ transition: 'color 0.2s ease' }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--primary)'} onMouseOut={(e) => e.currentTarget.style.color = ''}>{p.name}</span>
                              </span>
                              {p.isGuest && <span style={{ fontSize: 10, backgroundColor: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-muted)', marginLeft: 8 }}>Convidado</span>}
                              <span style={{ marginLeft: 8, fontSize: 16, whiteSpace: 'nowrap' }}>
                                {getStatValue(p)}
                              </span>
                              {(() => {
                                const prevP = prevMonthlyPlayers.find(pp => pp.name === p.name);
                                if (!prevP || !p.media_nota || !prevP.media_nota || monthlyPlayerSortConfig !== 'media') return null;
                                const diff = p.media_nota - prevP.media_nota;
                                if (Math.abs(diff) < 0.1) return null;
                                return (
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: 11,
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    backgroundColor: diff > 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                    color: diff > 0 ? '#22c55e' : '#ef4444',
                                    marginLeft: 'auto'
                                  }}>
                                    {diff > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                    <span>{diff > 0 ? 'Subiu' : 'Desceu'} {Math.abs(diff).toFixed(1)}</span>
                                  </div>
                                );
                              })()}
                            </span>
                            {isGlobalAdmin && (
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <select
                                  value={registeredPlayers.find(rp => rp.id === p.id)?.posicao || ''}
                                  onChange={(e) => {
                                    const newPos = e.target.value;
                                    const newList = registeredPlayers.map(rp => rp.id === p.id ? { ...rp, posicao: newPos } : rp);
                                    set(ref(db, 'players'), newList);
                                  }}
                                  className="input-field"
                                  style={{ padding: '4px 8px', fontSize: '11px', height: '28px', width: 'auto', backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.2)', color: 'var(--primary)', fontWeight: 'bold' }}
                                >
                                  <option value="">Posição</option>
                                  <option value="Zagueiro">Zagueiro</option>
                                  <option value="Meia">Meia</option>
                                  <option value="Atacante">Atacante</option>
                                </select>
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', backgroundColor: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Peladas</span>
                              <span style={{ fontWeight: 'bold', color: 'var(--text-main)', fontSize: 16 }}>{p.matchesForNota}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Vitorias</span>
                              <span style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: 16 }}>{p.total_vitorias}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Gols</span>
                              <span style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: 16 }}>{p.total_gols}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Assist.</span>
                              <span style={{ fontWeight: 'bold', color: 'var(--text-main)', fontSize: 16 }}>{p.total_assistencias}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Nota</span>
                              <span style={{ fontWeight: 'bold', color: '#eab308', fontSize: 16 }}>{p.media_nota?.toFixed(2) || '0.00'}</span>
                            </div>
                          </div>
                          <PlayerBadges playerName={p.name} stats={getPlayerStatsForMonth(sessions, p.name, currentMonthKey)} isPodium={false} monthKey={currentMonthKey} />
                          {expandedPlayerStats[p.id] && (() => {
                            const stats = getPlayerStatsForMonth(sessions, p.name, currentMonthKey, registeredPlayers);
                            return stats.matchHistory?.length > 0 && (
                              <div className="match-history animated" style={{ marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', cursor: 'default' }} onClick={(e) => e.stopPropagation()}>
                                <h4 style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px' }}>Histórico nas Peladas</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {stats.matchHistory.map((mh, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '6px' }}>
                                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: '500' }}>{mh.sessionName}</span>
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{mh.sessionDate}</span>
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
                                          {mh.goals > 0 && <span style={{ color: 'var(--primary)' }} title="Gols">⚽ {mh.goals}</span>}
                                          {mh.assists > 0 && <span style={{ color: 'var(--text-main)' }} title="Assistências">🎯 {mh.assists}</span>}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(234, 179, 8, 0.1)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                                          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#eab308' }} title="Nota MVP">⭐ {mh.nota?.toFixed(1)}</span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    };

                    return (
                      <>
                        {showPodium && (
                          <div className="podium-container animated" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '8px', paddingTop: '32px', paddingBottom: '16px', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '30%', position: 'relative' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', height: isGlobalAdmin ? '210px' : '160px', overflow: 'hidden', justifyContent: 'flex-start', marginBottom: '8px' }}>
                                <div onClick={(e) => { e.stopPropagation(); setViewingPlayerId(podiumPlayers[1].id); setShowProfile(true); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', cursor: 'pointer' }} title="Ver perfil">
                                  <PlayerAvatar users={users} registeredPlayers={registeredPlayers} registeredGoleiros={registeredGoleiros} setSelectedAvatar={setSelectedAvatar} playerName={podiumPlayers[1].name} size={48} />
                                  <div style={{ marginTop: '8px', fontSize: '13px', fontWeight: 'bold', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', color: 'var(--text-main)', transition: 'color 0.2s ease' }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--primary)'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-main)'}>{podiumPlayers[1].name}</div>
                                </div>
                                <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>{getStatValue(podiumPlayers[1])}</div>
                                <PlayerBadges playerName={podiumPlayers[1].name} stats={getPlayerStatsForMonth(sessions, podiumPlayers[1].name, currentMonthKey)} isPodium={true} monthKey={currentMonthKey} />
                                {isGlobalAdmin && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', alignItems: 'center', marginBottom: '8px' }}>
                                    <select
                                      value={registeredPlayers.find(rp => rp.id === podiumPlayers[1].id)?.posicao || ''}
                                      onChange={(e) => {
                                        const newPos = e.target.value;
                                        const newList = registeredPlayers.map(rp => rp.id === podiumPlayers[1].id ? { ...rp, posicao: newPos } : rp);
                                        set(ref(db, 'players'), newList);
                                      }}
                                      className="input-field"
                                      style={{ padding: '2px 4px', fontSize: '10px', height: '24px', width: '90%', backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.2)', color: 'var(--primary)', fontWeight: 'bold' }}
                                    >
                                      <option value="">Posição</option>
                                      <option value="Zagueiro">Zag.</option>
                                      <option value="Meia">Meia</option>
                                      <option value="Atacante">Atac.</option>
                                    </select>
                                  </div>
                                )}
                              </div>
                              <div onClick={() => togglePlayerStats(podiumPlayers[1].id)} style={{ width: '100%', height: '70px', backgroundColor: 'rgba(148, 163, 184, 0.15)', border: '1px solid rgba(148, 163, 184, 0.3)', borderBottom: 'none', borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '8px', fontSize: '24px', cursor: 'pointer' }}>🥈</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '35%', position: 'relative', zIndex: 10 }}>
                              <div style={{ position: 'absolute', top: '-28px', fontSize: '26px', filter: 'drop-shadow(0 2px 4px rgba(234,179,8,0.4))' }}>👑</div>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', height: isGlobalAdmin ? '210px' : '160px', overflow: 'hidden', justifyContent: 'flex-start', marginBottom: '8px' }}>
                                <div onClick={(e) => { e.stopPropagation(); setViewingPlayerId(podiumPlayers[0].id); setShowProfile(true); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', cursor: 'pointer' }} title="Ver perfil">
                                  <PlayerAvatar users={users} registeredPlayers={registeredPlayers} registeredGoleiros={registeredGoleiros} setSelectedAvatar={setSelectedAvatar} playerName={podiumPlayers[0].name} size={64} />
                                  <div style={{ marginTop: '8px', fontSize: '15px', fontWeight: 'bold', textAlign: 'center', color: '#eab308', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', transition: 'filter 0.2s ease' }} onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(1.2)'} onMouseOut={(e) => e.currentTarget.style.filter = 'none'}>{podiumPlayers[0].name}</div>
                                </div>
                                <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>{getStatValue(podiumPlayers[0])}</div>
                                <PlayerBadges playerName={podiumPlayers[0].name} stats={getPlayerStatsForMonth(sessions, podiumPlayers[0].name, currentMonthKey)} isPodium={true} monthKey={currentMonthKey} />
                                {isGlobalAdmin && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', alignItems: 'center', marginBottom: '8px' }}>
                                    <select
                                      value={registeredPlayers.find(rp => rp.id === podiumPlayers[0].id)?.posicao || ''}
                                      onChange={(e) => {
                                        const newPos = e.target.value;
                                        const newList = registeredPlayers.map(rp => rp.id === podiumPlayers[0].id ? { ...rp, posicao: newPos } : rp);
                                        set(ref(db, 'players'), newList);
                                      }}
                                      className="input-field"
                                      style={{ padding: '2px 4px', fontSize: '10px', height: '24px', width: '90%', backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.2)', color: 'var(--primary)', fontWeight: 'bold' }}
                                    >
                                      <option value="">Posição</option>
                                      <option value="Zagueiro">Zag.</option>
                                      <option value="Meia">Meia</option>
                                      <option value="Atacante">Atac.</option>
                                    </select>
                                  </div>
                                )}
                              </div>
                              <div onClick={() => togglePlayerStats(podiumPlayers[0].id)} style={{ width: '100%', height: '100px', backgroundColor: 'rgba(234, 179, 8, 0.15)', border: '1px solid rgba(234, 179, 8, 0.4)', borderBottom: 'none', borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '8px', fontSize: '28px', boxShadow: '0 -4px 12px rgba(234,179,8,0.1)', cursor: 'pointer' }}>🥇</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '30%', position: 'relative' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', height: isGlobalAdmin ? '210px' : '160px', overflow: 'hidden', justifyContent: 'flex-start', marginBottom: '8px' }}>
                                <div onClick={(e) => { e.stopPropagation(); setViewingPlayerId(podiumPlayers[2].id); setShowProfile(true); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', cursor: 'pointer' }} title="Ver perfil">
                                  <PlayerAvatar users={users} registeredPlayers={registeredPlayers} registeredGoleiros={registeredGoleiros} setSelectedAvatar={setSelectedAvatar} playerName={podiumPlayers[2].name} size={48} />
                                  <div style={{ marginTop: '8px', fontSize: '13px', fontWeight: 'bold', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', color: 'var(--text-main)', transition: 'color 0.2s ease' }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--primary)'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-main)'}>{podiumPlayers[2].name}</div>
                                </div>
                                <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>{getStatValue(podiumPlayers[2])}</div>
                                <PlayerBadges playerName={podiumPlayers[2].name} stats={getPlayerStatsForMonth(sessions, podiumPlayers[2].name, currentMonthKey)} isPodium={true} monthKey={currentMonthKey} />
                                {isGlobalAdmin && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', alignItems: 'center', marginBottom: '8px' }}>
                                    <select
                                      value={registeredPlayers.find(rp => rp.id === podiumPlayers[2].id)?.posicao || ''}
                                      onChange={(e) => {
                                        const newPos = e.target.value;
                                        const newList = registeredPlayers.map(rp => rp.id === podiumPlayers[2].id ? { ...rp, posicao: newPos } : rp);
                                        set(ref(db, 'players'), newList);
                                      }}
                                      className="input-field"
                                      style={{ padding: '2px 4px', fontSize: '10px', height: '24px', width: '90%', backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.2)', color: 'var(--primary)', fontWeight: 'bold' }}
                                    >
                                      <option value="">Posição</option>
                                      <option value="Zagueiro">Zag.</option>
                                      <option value="Meia">Meia</option>
                                      <option value="Atacante">Atac.</option>
                                    </select>
                                  </div>
                                )}
                              </div>
                              <div onClick={() => togglePlayerStats(podiumPlayers[2].id)} style={{ width: '100%', height: '50px', backgroundColor: 'rgba(180, 83, 9, 0.15)', border: '1px solid rgba(180, 83, 9, 0.3)', borderBottom: 'none', borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '8px', fontSize: '22px', cursor: 'pointer' }}>🥉</div>
                            </div>
                          </div>
                        )}

                        {/* Expanded details for podium players */}
                        {showPodium && podiumPlayers.filter(p => expandedPlayerStats[p.id]).map(p => (
                          <div key={`podium-detail-month-${p.id}`} style={{ marginBottom: '16px' }}>
                            {renderPlayerCard(p)}
                          </div>
                        ))}
                        {listPlayers.map(renderPlayerCard)}
                        {guestPlayers.length > 0 && (
                          <div style={{ marginTop: '32px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
                            <h3 style={{ fontSize: 16, marginBottom: '16px', color: 'var(--text-muted)' }}>Convidados ({guestPlayers.length})</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              {guestPlayers.map(renderPlayerCard)}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </>
            )}
          </main>
          {renderBottomNav()}
        </div>
      );
    }

    if (showPlayersScreen) {
      return (
        <div className="app-container">
          <header className="header" style={{ gap: '16px' }}>
            <button className="back-btn" onClick={() => setShowPlayersScreen(false)}>
              <ChevronLeft size={28} />
            </button>
            <h1>Estatísticas Gerais dos Jogadores</h1>
          </header>

          <main className="main-content animated">

            {registeredPlayers.length === 0 ? (
              <div className="empty-state">
                <Users size={48} />
                <p>Nenhum jogador cadastrado.<br />Adicione acima para poder escalar nos times.</p>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  className="input-field"
                  placeholder="🔍 Buscar jogador..."
                  value={playerSearchQuery}
                  onChange={(e) => setPlayerSearchQuery(e.target.value)}
                  style={{ marginBottom: '16px', backgroundColor: 'rgba(255,255,255,0.05)', flex: 'none' }}
                />

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
                  {[
                    { key: 'gols', icon: '⚽', label: 'Gols' },
                    { key: 'assistencias', icon: '🎯', label: 'Assist.' },
                    { key: 'vitorias', icon: '🏆', label: 'Vitorias' },
                    { key: 'media', icon: '⭐', label: 'Nota' },
                    { key: 'ga', icon: '🔥', label: 'G+A' },
                    { key: 'media_ga', icon: '📊', label: 'Méd. G/A' },
                  ].map(f => (
                    <button
                      key={f.key}
                      onClick={() => setPlayerSortConfig(f.key)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        padding: '12px 8px',
                        borderRadius: '12px',
                        border: playerSortConfig === f.key ? '1.5px solid var(--primary)' : '1px solid rgba(255,255,255,0.08)',
                        backgroundColor: playerSortConfig === f.key ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.03)',
                        color: playerSortConfig === f.key ? 'var(--primary)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: playerSortConfig === f.key ? '0 0 12px rgba(34,197,94,0.15)' : 'none',
                      }}
                    >
                      <span style={{ fontSize: 22 }}>{f.icon}</span>
                      <span style={{ fontSize: 11, fontWeight: playerSortConfig === f.key ? 700 : 500, letterSpacing: '0.3px' }}>{f.label}</span>
                    </button>
                  ))}
                </div>

                <div className="player-list" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(() => {
                    const filteredAndSortedPlayers = registeredPlayers
                      .filter(p => p.name.toLowerCase().includes(playerSearchQuery.toLowerCase()))
                      .slice()
                      .sort((a, b) => {
                        if (playerSortConfig === 'gols') return (b.total_gols || 0) - (a.total_gols || 0) || (b.media_nota || 0) - (a.media_nota || 0) || a.name.localeCompare(b.name);
                        if (playerSortConfig === 'assistencias') return (b.total_assistencias || 0) - (a.total_assistencias || 0) || (b.media_nota || 0) - (a.media_nota || 0) || a.name.localeCompare(b.name);
                        if (playerSortConfig === 'vitorias') return (b.total_vitorias || 0) - (a.total_vitorias || 0) || (b.media_nota || 0) - (a.media_nota || 0) || a.name.localeCompare(b.name);
                        if (playerSortConfig === 'media') return (b.media_nota || 0) - (a.media_nota || 0) || a.name.localeCompare(b.name);
                        if (playerSortConfig === 'ga') return ((b.total_gols || 0) + (b.total_assistencias || 0)) - ((a.total_gols || 0) + (a.total_assistencias || 0)) || (b.media_nota || 0) - (a.media_nota || 0) || a.name.localeCompare(b.name);
                        if (playerSortConfig === 'media_ga') {
                          const statsA = getPlayerStats(a.name, sessions, registeredPlayers, registeredGoleiros);
                          const statsB = getPlayerStats(b.name, sessions, registeredPlayers, registeredGoleiros);
                          const avgA = statsA.peladasJogadas > 0 ? (statsA.totalGoals + statsA.totalAssists) / statsA.peladasJogadas : 0;
                          const avgB = statsB.peladasJogadas > 0 ? (statsB.totalGoals + statsB.totalAssists) / statsB.peladasJogadas : 0;
                          return avgB - avgA || (b.media_nota || 0) - (a.media_nota || 0) || a.name.localeCompare(b.name);
                        }
                        return a.name.localeCompare(b.name);
                      });

                    const mainPlayers = filteredAndSortedPlayers.filter(p => !p.isGuest);
                    const guestPlayers = filteredAndSortedPlayers.filter(p => !!p.isGuest);

                    mainPlayers.forEach((p, i) => { p.displayRank = i + 1; });
                    guestPlayers.forEach((p, i) => { p.displayRank = i + 1; });

                    let maxStatValue = 1;
                    if (mainPlayers.length > 0) {
                      const topP = mainPlayers[0];
                      if (playerSortConfig === 'gols') maxStatValue = topP.total_gols || 1;
                      if (playerSortConfig === 'assistencias') maxStatValue = topP.total_assistencias || 1;
                      if (playerSortConfig === 'vitorias') maxStatValue = topP.total_vitorias || 1;
                      if (playerSortConfig === 'media') maxStatValue = 10;
                      if (playerSortConfig === 'ga') maxStatValue = ((topP.total_gols || 0) + (topP.total_assistencias || 0)) || 1;
                      if (playerSortConfig === 'media_ga') {
                        const topStats = getPlayerStats(topP.name, sessions, registeredPlayers, registeredGoleiros);
                        maxStatValue = topStats.peladasJogadas > 0 ? (topStats.totalGoals + topStats.totalAssists) / topStats.peladasJogadas : 1;
                      }
                    }

                    if (filteredAndSortedPlayers.length === 0) {
                      return <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>Nenhum jogador encontrado.</p>;
                    }

                    const showPodium = playerSearchQuery.trim() === '' && mainPlayers.length >= 3;
                    const podiumPlayers = showPodium ? mainPlayers.slice(0, 3) : [];
                    const listPlayers = showPodium ? mainPlayers.slice(3) : mainPlayers;

                    const getStatValue = (p) => {
                      if (playerSortConfig === 'gols') return <span style={{ color: 'var(--primary)' }}>⚽ {p.total_gols || 0}</span>;
                      if (playerSortConfig === 'assistencias') return <span style={{ color: 'var(--primary)' }}>🎯 {p.total_assistencias || 0}</span>;
                      if (playerSortConfig === 'vitorias') return <span style={{ color: 'var(--primary)' }}>🏆 {p.total_vitorias || 0}</span>;
                      if (playerSortConfig === 'media') return <span style={{ color: 'var(--primary)' }}>⭐ {p.media_nota?.toFixed(2) || '0.00'}</span>;
                      if (playerSortConfig === 'ga') return <span style={{ color: 'var(--primary)' }}>🔥 {(p.total_gols || 0) + (p.total_assistencias || 0)}</span>;
                      if (playerSortConfig === 'media_ga') {
                        const pStats = getPlayerStats(p.name, sessions, registeredPlayers, registeredGoleiros);
                        const avg = pStats.peladasJogadas > 0 ? ((pStats.totalGoals + pStats.totalAssists) / pStats.peladasJogadas).toFixed(2) : '0.00';
                        return <span style={{ color: 'var(--primary)' }}>📊 {avg}</span>;
                      }
                      return '';
                    };

                    const renderPlayerCard = (p) => {
                      const stats = getPlayerStats(p.name, sessions, registeredPlayers, registeredGoleiros);
                      let currentStatValue = 0;
                      if (playerSortConfig === 'gols') currentStatValue = p.total_gols || 0;
                      if (playerSortConfig === 'assistencias') currentStatValue = p.total_assistencias || 0;
                      if (playerSortConfig === 'vitorias') currentStatValue = p.total_vitorias || 0;
                      if (playerSortConfig === 'media') currentStatValue = p.media_nota || 0;
                      if (playerSortConfig === 'ga') currentStatValue = (p.total_gols || 0) + (p.total_assistencias || 0);
                      if (playerSortConfig === 'media_ga') {
                        const pStats = getPlayerStats(p.name, sessions, registeredPlayers, registeredGoleiros);
                        currentStatValue = pStats.peladasJogadas > 0 ? (pStats.totalGoals + pStats.totalAssists) / pStats.peladasJogadas : 0;
                      }

                      const barPercentage = Math.min(100, Math.max(0, (currentStatValue / maxStatValue) * 100));

                      return (
                        <div key={p.id} className="card animated" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }} onClick={() => togglePlayerStats(p.id)}>
                          <div style={{ position: 'absolute', bottom: 0, left: 0, height: '4px', width: `${barPercentage}%`, backgroundColor: 'var(--primary)', borderTopRightRadius: '4px', transition: 'width 0.5s ease', opacity: 0.9 }}></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                            <span className="card-title" style={{ fontSize: 18, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                              {playerSortConfig !== 'alfabetica' && (
                                <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-muted)' }}>{p.displayRank}º</span>
                              )}
                              <span
                                onClick={(e) => { e.stopPropagation(); setViewingPlayerId(p.id); setShowProfile(true); }}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                                title="Ver perfil"
                              >
                                <PlayerAvatar users={users} registeredPlayers={registeredPlayers} registeredGoleiros={registeredGoleiros} setSelectedAvatar={setSelectedAvatar}
                                  playerName={p.name}
                                  size={36}
                                  onClick={() => { setViewingPlayerId(p.id); setShowProfile(true); }}
                                />
                                <span style={{ transition: 'color 0.2s ease' }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--primary)'} onMouseOut={(e) => e.currentTarget.style.color = ''}>{p.name}</span>
                              </span>
                              {p.isGuest && <span style={{ fontSize: 10, backgroundColor: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-muted)', marginLeft: 8 }}>Convidado</span>}
                              <span style={{ marginLeft: 8, fontSize: 16, whiteSpace: 'nowrap' }}>
                                {getStatValue(p)}
                              </span>
                            </span>
                            {isGlobalAdmin && (
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <select
                                  value={p.posicao || ''}
                                  onChange={(e) => {
                                    const newPos = e.target.value;
                                    const newList = registeredPlayers.map(rp => rp.id === p.id ? { ...rp, posicao: newPos } : rp);
                                    set(ref(db, 'players'), newList);
                                  }}
                                  className="input-field"
                                  style={{ padding: '4px 8px', fontSize: '11px', height: '28px', width: 'auto', backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.2)', color: 'var(--primary)', fontWeight: 'bold' }}
                                >
                                  <option value="">Posição</option>
                                  <option value="Zagueiro">Zagueiro</option>
                                  <option value="Meia">Meia</option>
                                  <option value="Atacante">Atacante</option>
                                </select>
                                <button className="icon-btn" style={{ color: p.isGuest ? 'var(--text-muted)' : 'var(--primary)', border: `1px solid ${p.isGuest ? 'rgba(255,255,255,0.2)' : 'var(--primary)'}`, fontSize: 11, padding: '2px 8px', borderRadius: '4px', height: '28px' }} onClick={(e) => { e.stopPropagation(); toggleGuestStatus(p.id, p.isGuest); }} title={p.isGuest ? 'Tornar Mensalista' : 'Tornar Convidado'}>
                                  {p.isGuest ? 'Conv.' : 'Mens.'}
                                </button>
                                <button className="icon-btn danger" style={{ color: 'var(--danger)' }} onClick={(e) => { e.stopPropagation(); removeRegisteredPlayer(p.id); }}>
                                  <Trash2 size={20} />
                                </button>
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', backgroundColor: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Peladas</span>
                              <span style={{ fontWeight: 'bold', color: 'var(--text-main)', fontSize: 16 }}>{stats.peladasJogadas}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Vitorias</span>
                              <span style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: 16 }}>{stats.peladasGanhas}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Gols</span>
                              <span style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: 16 }}>{stats.totalGoals}</span>
                              <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>Média: {stats.goalAvg}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Assist.</span>
                              <span style={{ fontWeight: 'bold', color: 'var(--text-main)', fontSize: 16 }}>{stats.totalAssists}</span>
                              <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>Média: {stats.assistAvg}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Nota</span>
                              <span style={{ fontWeight: 'bold', color: '#eab308', fontSize: 16 }}>{p.media_nota?.toFixed(2) || '0.00'}</span>
                              <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>Média Geral</span>
                            </div>
                          </div>
                          <PlayerBadges playerName={p.name} stats={getPlayerStats(p.name, sessions, registeredPlayers, registeredGoleiros)} isPodium={false} />

                          {expandedPlayerStats[p.id] && stats.matchHistory?.length > 0 && (
                            <div className="match-history animated" style={{ marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', cursor: 'default' }} onClick={(e) => e.stopPropagation()}>
                              <h4 style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px' }}>Histórico nas Peladas</h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {stats.matchHistory.map((mh, idx) => (
                                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '6px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                      <span style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: '500' }}>{mh.sessionName}</span>
                                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{mh.sessionDate}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                      <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
                                        {mh.goals > 0 && <span style={{ color: 'var(--primary)' }} title="Gols">⚽ {mh.goals}</span>}
                                        {mh.assists > 0 && <span style={{ color: 'var(--text-main)' }} title="Assistências">🎯 {mh.assists}</span>}
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(234, 179, 8, 0.1)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#eab308' }} title="Nota MVP">⭐ {mh.nota?.toFixed(1)}</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    };

                    return (
                      <>
                        {showPodium && (
                          <div className="podium-container animated" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '8px', paddingTop: '32px', paddingBottom: '16px', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            {/* 2ND PLACE */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '30%', position: 'relative' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', height: isGlobalAdmin ? '230px' : '160px', overflow: 'hidden', justifyContent: 'flex-start', marginBottom: '8px' }}>
                                <div onClick={(e) => { e.stopPropagation(); setViewingPlayerId(podiumPlayers[1].id); setShowProfile(true); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', cursor: 'pointer' }} title="Ver perfil">
                                  <PlayerAvatar users={users} registeredPlayers={registeredPlayers} registeredGoleiros={registeredGoleiros} setSelectedAvatar={setSelectedAvatar} playerName={podiumPlayers[1].name} size={48} />
                                  <div style={{ marginTop: '8px', fontSize: '13px', fontWeight: 'bold', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', color: 'var(--text-main)', transition: 'color 0.2s ease' }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--primary)'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-main)'}>{podiumPlayers[1].name}</div>
                                </div>
                                <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>{getStatValue(podiumPlayers[1])}</div>
                                <PlayerBadges playerName={podiumPlayers[1].name} stats={getPlayerStats(podiumPlayers[1].name, sessions, registeredPlayers, registeredGoleiros)} isPodium={true} />
                                {isGlobalAdmin && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', alignItems: 'center', marginBottom: '8px' }}>
                                    <select
                                      value={podiumPlayers[1].posicao || ''}
                                      onChange={(e) => {
                                        const newPos = e.target.value;
                                        const newList = registeredPlayers.map(rp => rp.id === podiumPlayers[1].id ? { ...rp, posicao: newPos } : rp);
                                        set(ref(db, 'players'), newList);
                                      }}
                                      className="input-field"
                                      style={{ padding: '2px 4px', fontSize: '10px', height: '24px', width: '90%', backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.2)', color: 'var(--primary)', fontWeight: 'bold' }}
                                    >
                                      <option value="">Posição</option>
                                      <option value="Zagueiro">Zag.</option>
                                      <option value="Meia">Meia</option>
                                      <option value="Atacante">Atac.</option>
                                    </select>
                                    <button className="icon-btn" style={{ color: 'var(--primary)', border: '1px solid rgba(255,255,255,0.2)', fontSize: 10, padding: '2px 6px', borderRadius: '4px' }} onClick={(e) => { e.stopPropagation(); toggleGuestStatus(podiumPlayers[1].id, podiumPlayers[1].isGuest); }} title="Tornar Convidado">
                                      Tornar Convidado
                                    </button>
                                  </div>
                                )}
                              </div>
                              <div onClick={() => togglePlayerStats(podiumPlayers[1].id)} style={{ width: '100%', height: '70px', backgroundColor: 'rgba(148, 163, 184, 0.15)', border: '1px solid rgba(148, 163, 184, 0.3)', borderBottom: 'none', borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '8px', fontSize: '24px', cursor: 'pointer' }}>🥈</div>
                            </div>

                            {/* 1ST PLACE */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '35%', position: 'relative', zIndex: 10 }}>
                              <div style={{ position: 'absolute', top: '-28px', fontSize: '26px', filter: 'drop-shadow(0 2px 4px rgba(234,179,8,0.4))' }}>👑</div>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', height: isGlobalAdmin ? '230px' : '160px', overflow: 'hidden', justifyContent: 'flex-start', marginBottom: '8px' }}>
                                <div onClick={(e) => { e.stopPropagation(); setViewingPlayerId(podiumPlayers[0].id); setShowProfile(true); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', cursor: 'pointer' }} title="Ver perfil">
                                  <PlayerAvatar users={users} registeredPlayers={registeredPlayers} registeredGoleiros={registeredGoleiros} setSelectedAvatar={setSelectedAvatar} playerName={podiumPlayers[0].name} size={64} />
                                  <div style={{ marginTop: '8px', fontSize: '15px', fontWeight: 'bold', textAlign: 'center', color: '#eab308', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', transition: 'filter 0.2s ease' }} onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(1.2)'} onMouseOut={(e) => e.currentTarget.style.filter = 'none'}>{podiumPlayers[0].name}</div>
                                </div>
                                <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>{getStatValue(podiumPlayers[0])}</div>
                                <PlayerBadges playerName={podiumPlayers[0].name} stats={getPlayerStats(podiumPlayers[0].name, sessions, registeredPlayers, registeredGoleiros)} isPodium={true} />
                                {isGlobalAdmin && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', alignItems: 'center', marginBottom: '8px' }}>
                                    <select
                                      value={podiumPlayers[0].posicao || ''}
                                      onChange={(e) => {
                                        const newPos = e.target.value;
                                        const newList = registeredPlayers.map(rp => rp.id === podiumPlayers[0].id ? { ...rp, posicao: newPos } : rp);
                                        set(ref(db, 'players'), newList);
                                      }}
                                      className="input-field"
                                      style={{ padding: '2px 4px', fontSize: '10px', height: '24px', width: '90%', backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.2)', color: 'var(--primary)', fontWeight: 'bold' }}
                                    >
                                      <option value="">Posição</option>
                                      <option value="Zagueiro">Zag.</option>
                                      <option value="Meia">Meia</option>
                                      <option value="Atacante">Atac.</option>
                                    </select>
                                    <button className="icon-btn" style={{ color: 'var(--primary)', border: '1px solid rgba(255,255,255,0.2)', fontSize: 10, padding: '2px 6px', borderRadius: '4px' }} onClick={(e) => { e.stopPropagation(); toggleGuestStatus(podiumPlayers[0].id, podiumPlayers[0].isGuest); }} title="Tornar Convidado">
                                      Tornar Convidado
                                    </button>
                                  </div>
                                )}
                              </div>
                              <div onClick={() => togglePlayerStats(podiumPlayers[0].id)} style={{ width: '100%', height: '100px', backgroundColor: 'rgba(234, 179, 8, 0.15)', border: '1px solid rgba(234, 179, 8, 0.4)', borderBottom: 'none', borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '8px', fontSize: '28px', boxShadow: '0 -4px 12px rgba(234,179,8,0.1)', cursor: 'pointer' }}>🥇</div>
                            </div>

                            {/* 3RD PLACE */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '30%', position: 'relative' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', height: isGlobalAdmin ? '230px' : '160px', overflow: 'hidden', justifyContent: 'flex-start', marginBottom: '8px' }}>
                                <div onClick={(e) => { e.stopPropagation(); setViewingPlayerId(podiumPlayers[2].id); setShowProfile(true); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', cursor: 'pointer' }} title="Ver perfil">
                                  <PlayerAvatar users={users} registeredPlayers={registeredPlayers} registeredGoleiros={registeredGoleiros} setSelectedAvatar={setSelectedAvatar} playerName={podiumPlayers[2].name} size={48} />
                                  <div style={{ marginTop: '8px', fontSize: '13px', fontWeight: 'bold', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', color: 'var(--text-main)' }}>{podiumPlayers[2].name}</div>
                                </div>
                                <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>{getStatValue(podiumPlayers[2])}</div>
                                <PlayerBadges playerName={podiumPlayers[2].name} stats={getPlayerStats(podiumPlayers[2].name, sessions, registeredPlayers, registeredGoleiros)} isPodium={true} />
                                {isGlobalAdmin && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', alignItems: 'center', marginBottom: '8px' }}>
                                    <select
                                      value={podiumPlayers[2].posicao || ''}
                                      onChange={(e) => {
                                        const newPos = e.target.value;
                                        const newList = registeredPlayers.map(rp => rp.id === podiumPlayers[2].id ? { ...rp, posicao: newPos } : rp);
                                        set(ref(db, 'players'), newList);
                                      }}
                                      className="input-field"
                                      style={{ padding: '2px 4px', fontSize: '10px', height: '24px', width: '90%', backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.2)', color: 'var(--primary)', fontWeight: 'bold' }}
                                    >
                                      <option value="">Posição</option>
                                      <option value="Zagueiro">Zag.</option>
                                      <option value="Meia">Meia</option>
                                      <option value="Atacante">Atac.</option>
                                    </select>
                                    <button className="icon-btn" style={{ color: 'var(--primary)', border: '1px solid rgba(255,255,255,0.2)', fontSize: 10, padding: '2px 6px', borderRadius: '4px' }} onClick={(e) => { e.stopPropagation(); toggleGuestStatus(podiumPlayers[2].id, podiumPlayers[2].isGuest); }} title="Tornar Convidado">
                                      Tornar Convidado
                                    </button>
                                  </div>
                                )}
                              </div>
                              <div onClick={() => togglePlayerStats(podiumPlayers[2].id)} style={{ width: '100%', height: '50px', backgroundColor: 'rgba(180, 83, 9, 0.15)', border: '1px solid rgba(180, 83, 9, 0.3)', borderBottom: 'none', borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '8px', fontSize: '22px', cursor: 'pointer' }}>🥉</div>
                            </div>
                          </div>
                        )}

                        {/* Expanded details for podium players */}
                        {showPodium && podiumPlayers.filter(p => expandedPlayerStats[p.id]).map(p => (
                          <div key={`podium-detail-${p.id}`} style={{ marginBottom: '16px' }}>
                            {renderPlayerCard(p)}
                          </div>
                        ))}

                        {listPlayers.map(renderPlayerCard)}

                        {guestPlayers.length > 0 && (
                          <div style={{ marginTop: '32px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
                            <h3 style={{ fontSize: 16, marginBottom: '16px', color: 'var(--text-muted)' }}>Convidados ({guestPlayers.length})</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              {guestPlayers.map(renderPlayerCard)}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </>
            )}
          </main>
          {renderBottomNav()}
        </div>
      );
    }

    if (showGoleirosScreen) {
      return (
        <div className="app-container">
          <header className="header" style={{ gap: '16px' }}>
            <button className="back-btn" onClick={() => setShowGoleirosScreen(false)}>
              <ChevronLeft size={28} />
            </button>
            <h1>Goleiros Cadastrados</h1>
          </header>

          <main className="main-content animated">

            {registeredGoleiros.length === 0 ? (
              <div className="empty-state">
                <span style={{ fontSize: 48, filter: 'grayscale(1)', opacity: 0.8 }}>🧤</span>
                <p>Nenhum goleiro cadastrado.<br />Adicione acima para poder escalar nas peladas.</p>
              </div>
            ) : (
              <>
                <div className="sort-filters card" style={{ padding: '8px', display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', borderRadius: '8px' }}>
                  <button className="btn-primary" style={{ flex: 1, padding: '8px', fontSize: 13, backgroundColor: goleiroSortConfig === 'vitorias' ? 'var(--primary)' : 'rgba(255,255,255,0.05)', color: goleiroSortConfig === 'vitorias' ? '#fff' : 'var(--text-main)', border: goleiroSortConfig === 'vitorias' ? 'none' : '1px solid rgba(255,255,255,0.1)' }} onClick={() => setGoleiroSortConfig('vitorias')}>🏆 Vitorias</button>
                  <button className="btn-primary" style={{ flex: 1, padding: '8px', fontSize: 13, backgroundColor: goleiroSortConfig === 'defesas' ? 'var(--primary)' : 'rgba(255,255,255,0.05)', color: goleiroSortConfig === 'defesas' ? '#fff' : 'var(--text-main)', border: goleiroSortConfig === 'defesas' ? 'none' : '1px solid rgba(255,255,255,0.1)' }} onClick={() => setGoleiroSortConfig('defesas')}>🧤 Defesas</button>
                </div>

                <div className="player-list" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {registeredGoleiros
                    .slice()
                    .sort((a, b) => {
                      if (goleiroSortConfig === 'vitorias') return (b.total_vitorias || 0) - (a.total_vitorias || 0) || a.name.localeCompare(b.name);
                      if (goleiroSortConfig === 'defesas') return (b.total_defesas_dificeis || 0) - (a.total_defesas_dificeis || 0) || a.name.localeCompare(b.name);
                      return a.name.localeCompare(b.name);
                    })
                    .map((p, index) => {
                      return (
                        <div key={p.id} className="card animated" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="card-title" style={{ fontSize: 18, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                              {goleiroSortConfig !== 'alfabetica' && (
                                <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-muted)' }}>{index + 1}º</span>
                              )}
                              <span
                                onClick={(e) => { e.stopPropagation(); setViewingPlayerId(p.id); setShowProfile(true); }}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                                title="Ver perfil"
                              >
                                <PlayerAvatar users={users} registeredPlayers={registeredPlayers} registeredGoleiros={registeredGoleiros} setSelectedAvatar={setSelectedAvatar}
                                  playerName={p.name}
                                  size={36}
                                  onClick={() => { setViewingPlayerId(p.id); setShowProfile(true); }}
                                />
                                <span style={{ transition: 'color 0.2s ease' }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--primary)'} onMouseOut={(e) => e.currentTarget.style.color = ''}>{p.name}</span>
                              </span>
                              {goleiroSortConfig === 'vitorias' && <span style={{ marginLeft: 8, fontSize: 16, color: 'var(--primary)', whiteSpace: 'nowrap' }}>🏆 {p.total_vitorias || 0}</span>}
                              {goleiroSortConfig === 'defesas' && <span style={{ marginLeft: 8, fontSize: 16, color: 'var(--primary)', whiteSpace: 'nowrap' }}>🧤 {p.total_defesas_dificeis || 0}</span>}
                            </span>
                            {isGlobalAdmin && (
                              <button className="icon-btn danger" style={{ color: 'var(--danger)' }} onClick={() => removeRegisteredGoleiro(p.id)}>
                                <Trash2 size={20} />
                              </button>
                            )}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', backgroundColor: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Vitorias</span>
                              <span style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: 18 }}>{p.total_vitorias || 0}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Defesas Difíceis</span>
                              <span style={{ fontWeight: 'bold', color: 'var(--text-main)', fontSize: 18 }}>{p.total_defesas_dificeis || 0}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </>
            )}
          </main>
          {showSupremeAdmin && isGlobalAdmin && renderSupremeAdminModal()}
          {renderBottomNav()}
        </div>
      );
    }

    if (showAllHighlightsScreen) {
      return (
        <div className="app-container">
          <header className="header" style={{ gap: '16px' }}>
            <button className="back-btn" onClick={() => setShowAllHighlightsScreen(false)}>
              <ChevronLeft size={28} />
            </button>
            <h1>Galeria de Destaques</h1>
          </header>
          <main className="main-content animated">
            <div className="highlight-months-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: 24 }}>
              {allHighlights.map((hl, idx) => (
                <div key={hl.monthKey} className="month-group">
                  <h3 style={{ fontSize: 14, color: idx === 0 ? 'var(--primary)' : 'var(--text-muted)', marginBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 6 }}>
                    Destaques — {hl.label}
                  </h3>
                  <div className="highlights-grid">
                    {(() => {
                      const renderCard = (title, statObj, statKey, unit, cardId, infoText = null) => {
                        const val = statObj[statKey];
                        const hasMultiple = statObj.tied && statObj.tied.length > 1;
                        const isExp = expandedHighlights[cardId];
                        return (
                          <div className="highlight-card" key={cardId} onClick={() => hasMultiple && toggleHighlight(cardId)} style={hasMultiple ? { cursor: 'pointer' } : {}}>
                            <span className="hl-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span>{title}</span>
                              {infoText && (
                                <div onClick={(e) => toggleInfoTooltip(cardId, e)} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', opacity: 0.8, padding: '2px', marginLeft: 'auto' }}>
                                  <Info size={14} />
                                </div>
                              )}
                            </span>
                            {infoText && showInfoTooltip[cardId] && (
                              <div className="animated" style={{ fontSize: 10, color: 'var(--text-muted)', backgroundColor: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '4px', lineHeight: '1.3', marginBottom: 8 }}>
                                {infoText}
                              </div>
                            )}
                            <div className="hl-name" style={{ display: 'flex', flexDirection: hasMultiple ? 'column' : 'row', alignItems: 'center', justifyContent: 'center', gap: hasMultiple ? 6 : 8, width: '100%', flexWrap: 'wrap' }}>
                              {val > 0 && !hasMultiple && (
                                <PlayerAvatar users={users} registeredPlayers={registeredPlayers} registeredGoleiros={registeredGoleiros} setSelectedAvatar={setSelectedAvatar}
                                  playerName={statObj.name}
                                  size={24}
                                  onClick={() => {
                                    const p = registeredPlayers.find(rp => (rp.name || '').trim().toLowerCase() === (statObj.name || '').trim().toLowerCase()) ||
                                      registeredGoleiros.find(rg => (rg.name || '').trim().toLowerCase() === (statObj.name || '').trim().toLowerCase());
                                    if (p) {
                                      setViewingPlayerId(p.id);
                                      setShowProfile(true);
                                    }
                                  }}
                                />
                              )}
                              <span
                                style={{
                                  textAlign: 'center',
                                  wordBreak: 'break-word',
                                  lineHeight: 1.3,
                                  cursor: (!hasMultiple && val > 0) ? 'pointer' : 'default',
                                  transition: 'color 0.2s ease'
                                }}
                                onClick={(e) => {
                                  if (!hasMultiple && val > 0) {
                                    e.stopPropagation();
                                    const p = registeredPlayers.find(rp => rp.name === statObj.name) || registeredGoleiros.find(rg => rg.name === statObj.name);
                                    if (p) {
                                      setViewingPlayerId(p.id);
                                      setShowProfile(true);
                                    }
                                  }
                                }}
                                onMouseOver={(e) => { if (!hasMultiple && val > 0) e.currentTarget.style.color = 'var(--primary)'; }}
                                onMouseOut={(e) => { if (!hasMultiple && val > 0) e.currentTarget.style.color = ''; }}
                                title={(!hasMultiple && val > 0) ? "Ver perfil" : ""}
                              >
                                {val > 0 ? statObj.name : '-'}
                              </span>
                              {hasMultiple && val > 0 && (
                                <span style={{ fontSize: 10, color: 'var(--primary)', backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                                  {isExp ? 'Recolher' : 'Ver Todos'}
                                </span>
                              )}
                            </div>
                            <span className="hl-stat">{val > 0 ? (unit === 'Nota' ? `${unit} ${val.toFixed(2)}` : `${val} ${unit}`) : '-'}</span>
                            {hasMultiple && isExp && val > 0 && (
                              <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {statObj.tied.map((p, idx) => (
                                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-main)' }}>
                                    <span>{p.name}</span>
                                    <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{unit === 'Nota' ? `${unit} ${p[statKey].toFixed(2)}` : `${p[statKey]} ${unit}`}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      };
                      return (
                        <>
                          {renderCard('⚽ Artilheiro', hl.topScorer, 'goals', 'Gols', `art-${hl.monthKey}`)}
                          {renderCard('🎯 Garçom', hl.topAssister, 'assists', 'Assist.', `ass-${hl.monthKey}`)}
                          {renderCard('⭐ MVP', hl.mvp, 'mvpScore', 'Nota', `mvp-${hl.monthKey}`, "Nota de 0 a 10. Média do desempenho nas peladas deste mês.")}
                          {renderCard('🏆 Decisivo', hl.topChamp, 'champWins', 'Peladas', `chmp-${hl.monthKey}`)}
                        </>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </main>
          {renderBottomNav()}
        </div>
      );
    }

    if (activeTab === 'ranking') {
      return (
        <div className="app-container">
          {renderRankingsLandingScreen()}
          {renderBottomNav()}
        </div>
      );
    }

    if (activeTab === 'players') {
      return (
        <div className="app-container">
          {renderPlayersDirectoryScreen()}
          {renderBottomNav()}
        </div>
      );
    }

    if (activeTab === 'menu') {
      return (
        <div className="app-container">
          {showSupremeAdmin && isGlobalAdmin && renderSupremeAdminModal()}
          {renderMenuScreen()}
          {renderBottomNav()}
        </div>
      );
    }

    return (
      <div className="app-container">
        {showSupremeAdmin && isGlobalAdmin && renderSupremeAdminModal()}

        <header className="header app-header-main">
          <div className="app-header-top">
            <img src="/logo.png" alt="Selva FC Logo" style={{ width: 48, height: 48 }} />
            <h1>Pelada</h1>
          </div>
          <div className="app-header-actions">
            <span onClick={() => setShowProfile(true)} className="user-pill">
              <PlayerAvatar users={users} registeredPlayers={registeredPlayers} registeredGoleiros={registeredGoleiros} setSelectedAvatar={setSelectedAvatar} playerName={currentUser?.name} userId={currentUser?.id} size={28} />
              <span style={{ fontWeight: 600 }}>{currentUser?.name}</span>
              {isGlobalAdmin && <Shield size={14} color="var(--primary)" title="Administrador Global" />}
            </span>
            {isGlobalAdmin && <button onClick={() => setShowSupremeAdmin(true)} className="icon-btn sistema-btn" title="Painel de Controle"><Database size={14} /> Sistema</button>}
            <button onClick={handleLogout} className="icon-btn logout-btn" title="Sair"><LogOut size={16} /></button>
          </div>
        </header>


        {showSupremeAdmin && isGlobalAdmin && (
          <div className="admin-overlay">
            <div className="admin-panel card animated">
              <header className="admin-panel-header">
                <h2 className="admin-panel-title"><Database size={22} /> Área do Admin Supremo</h2>
                <button className="admin-close-btn" onClick={() => setShowSupremeAdmin(false)}>✕</button>
              </header>

              <div className="admin-user-grid">
                {users.sort((a, b) => a.name.localeCompare(b.name)).map(u => {
                  const linkedPlayer = registeredPlayers.find(p => p.id === u.jogadorId);
                  return (
                    <div key={u.id} className="admin-user-card">
                      <div className="admin-user-info">
                        <PlayerAvatar users={users} registeredPlayers={registeredPlayers} registeredGoleiros={registeredGoleiros} setSelectedAvatar={setSelectedAvatar} playerName={linkedPlayer?.name || ''} size={40} />
                        <div className="admin-user-details">
                          <span className="admin-user-name">
                            {u.name}
                            {u.is_admin && <Shield size={14} color="#eab308" title="Admin Global" />}
                          </span>
                          <span className="admin-user-email">{u.email}</span>
                          <span className="admin-user-linked">
                            Jogador: {linkedPlayer ? <span style={{ color: 'var(--primary)' }}>{linkedPlayer.name}</span> : <span style={{ color: 'var(--danger)' }}>Nenhum</span>}
                          </span>
                        </div>
                      </div>
                      <div className="admin-user-actions">
                        <button className="admin-action-btn admin-action-primary" onClick={() => handleChangePassword(u.id)}><Key size={13} /> Trocar Senha</button>
                        {!u.is_admin && <button className="admin-action-btn admin-action-promote" onClick={() => promoteToGlobalAdmin(u.id)}><Shield size={13} /> Promover</button>}
                        {u.is_admin && u.id !== currentUser.id && (currentUser?.id === users[0]?.id || (currentUser?.name && currentUser.name.toLowerCase().includes('pedro dhalia'))) && <button className="admin-action-btn" style={{backgroundColor: 'transparent', border: '1px solid rgba(239, 68, 68, 0.5)', color: 'var(--danger)'}} onClick={() => demoteFromGlobalAdmin(u.id)}><Shield size={13} /> Rebaixar</button>}
                        {u.id !== currentUser.id && <button className="admin-action-btn admin-action-danger" onClick={() => deleteUser(u.id)}><Trash2 size={13} /> Excluir</button>}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        )}

        <main className="main-content">

          {allHighlights.length > 0 && (
            <div className="highlights-section animated" style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ color: 'var(--text-main)', fontSize: 16, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Trophy color="var(--primary)" size={20} />
                  Destaques do Mês
                </h2>
                {allHighlights.length > 1 && (
                  <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)' }} onClick={() => setShowAllHighlightsScreen(true)}>
                    Ver Todos ({allHighlights.length})
                  </button>
                )}
              </div>

              <div className="highlight-months-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: 24 }}>
                {(() => {
                  const hl = allHighlights[0];
                  return (
                    <div key={hl.monthKey} className="month-group">
                      <h3 style={{ fontSize: 14, color: 'var(--primary)', marginBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 6 }}>
                        Destaques — {hl.label}
                      </h3>
                      <div className="highlights-grid">
                        {(() => {
                          const renderCard = (title, statObj, statKey, unit, cardId, infoText = null) => {
                            const val = statObj[statKey];
                            const hasMultiple = statObj.tied && statObj.tied.length > 1;
                            const isExp = expandedHighlights[cardId];
                            return (
                              <div className="highlight-card" onClick={() => hasMultiple && toggleHighlight(cardId)} style={hasMultiple ? { cursor: 'pointer' } : {}}>
                                <span className="hl-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <span>{title}</span>
                                  {infoText && (
                                    <div onClick={(e) => toggleInfoTooltip(cardId, e)} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', opacity: 0.8, padding: '2px', marginLeft: 'auto' }}>
                                      <Info size={14} />
                                    </div>
                                  )}
                                </span>

                                {infoText && showInfoTooltip[cardId] && (
                                  <div className="animated" style={{ fontSize: 10, color: 'var(--text-muted)', backgroundColor: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '4px', lineHeight: '1.3', marginBottom: 8 }}>
                                    {infoText}
                                  </div>
                                )}

                                <div className="hl-name" style={{ display: 'flex', flexDirection: hasMultiple ? 'column' : 'row', alignItems: 'center', justifyContent: 'center', gap: hasMultiple ? 6 : 8, width: '100%', flexWrap: 'wrap' }}>
                                  {val > 0 && !hasMultiple && (
                                    <PlayerAvatar users={users} registeredPlayers={registeredPlayers} registeredGoleiros={registeredGoleiros} setSelectedAvatar={setSelectedAvatar}
                                      playerName={statObj.name}
                                      size={24}
                                      onClick={() => {
                                        const p = registeredPlayers.find(rp => (rp.name || '').trim().toLowerCase() === (statObj.name || '').trim().toLowerCase()) ||
                                          registeredGoleiros.find(rg => (rg.name || '').trim().toLowerCase() === (statObj.name || '').trim().toLowerCase());
                                        if (p) {
                                          setViewingPlayerId(p.id);
                                          setShowProfile(true);
                                        }
                                      }}
                                    />
                                  )}
                                  <span
                                    style={{
                                      textAlign: 'center',
                                      wordBreak: 'break-word',
                                      lineHeight: 1.3,
                                      cursor: (!hasMultiple && val > 0) ? 'pointer' : 'default',
                                      transition: 'color 0.2s ease'
                                    }}
                                    onClick={(e) => {
                                      if (!hasMultiple && val > 0) {
                                        e.stopPropagation();
                                        const p = registeredPlayers.find(rp => rp.name === statObj.name) || registeredGoleiros.find(rg => rg.name === statObj.name);
                                        if (p) {
                                          setViewingPlayerId(p.id);
                                          setShowProfile(true);
                                        }
                                      }
                                    }}
                                    onMouseOver={(e) => { if (!hasMultiple && val > 0) e.currentTarget.style.color = 'var(--primary)'; }}
                                    onMouseOut={(e) => { if (!hasMultiple && val > 0) e.currentTarget.style.color = ''; }}
                                    title={(!hasMultiple && val > 0) ? "Ver perfil" : ""}
                                  >
                                    {val > 0 ? statObj.name : '-'}
                                  </span>
                                  {hasMultiple && val > 0 && (
                                    <span style={{ fontSize: 10, color: 'var(--primary)', backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                                      {isExp ? 'Recolher' : 'Ver Todos'}
                                    </span>
                                  )}
                                </div>
                                <span className="hl-stat">{val > 0 ? (unit === 'Nota' ? `${unit} ${val.toFixed(2)}` : `${val} ${unit}`) : '-'}</span>

                                {hasMultiple && isExp && val > 0 && (
                                  <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {statObj.tied.map((p, idx) => (
                                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-main)' }}>
                                        <span>{p.name}</span>
                                        <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{unit === 'Nota' ? `${unit} ${p[statKey].toFixed(2)}` : `${p[statKey]} ${unit}`}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          };

                          return (
                            <>
                              {renderCard('⚽ Artilheiro', hl.topScorer, 'goals', 'Gols', `art-${hl.monthKey}`)}
                              {renderCard('🎯 Garçom', hl.topAssister, 'assists', 'Assist.', `ass-${hl.monthKey}`)}
                              {renderCard('⭐ MVP', hl.mvp, 'mvpScore', 'Nota', `mvp-${hl.monthKey}`, "Nota de 0 a 10. Média do desempenho nas peladas deste mês.")}
                              {renderCard('🏆 Decisivo', hl.topChamp, 'champWins', 'Peladas', `chmp-${hl.monthKey}`)}
                            </>
                          );
                        })()}
                      </div>

                      {/* Time do Mês */}
                      {hl.teamOfMonth && (
                        <div className="soccer-field-container animated">
                          <h4 style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            Time do Mês — {hl.label}
                          </h4>
                          <div className="soccer-field">
                            <div className="field-line field-center-line"></div>
                            <div className="field-line field-center-circle"></div>
                            <div className="field-line field-penalty-area-top"></div>
                            <div className="field-line field-penalty-area-bottom"></div>

                            <SoccerField
                              users={users}
                              players={hl.teamOfMonth.atacantes}
                              type="Atacante"
                              sourceRatings={[]}
                              isHighlights={true}
                              registeredPlayers={registeredPlayers}
                              registeredGoleiros={registeredGoleiros}
                              onPlayerClick={(pObj) => {
                                setViewingPlayerId(pObj.id);
                                setShowProfile(true);
                              }}
                            />
                            <SoccerField
                              users={users}
                              players={hl.teamOfMonth.meias}
                              type="Meia"
                              sourceRatings={[]}
                              isHighlights={true}
                              registeredPlayers={registeredPlayers}
                              registeredGoleiros={registeredGoleiros}
                              onPlayerClick={(pObj) => {
                                setViewingPlayerId(pObj.id);
                                setShowProfile(true);
                              }}
                            />
                            <SoccerField
                              users={users}
                              players={hl.teamOfMonth.zagueiros}
                              type="Zagueiro"
                              sourceRatings={[]}
                              isHighlights={true}
                              registeredPlayers={registeredPlayers}
                              registeredGoleiros={registeredGoleiros}
                              onPlayerClick={(pObj) => {
                                setViewingPlayerId(pObj.id);
                                setShowProfile(true);
                              }}
                            />
                          </div>
                          {isGlobalAdmin && (
                            <p style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>

                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}


          {sessions.length === 0 ? (
            <div className="empty-state">
              <Calendar size={48} />
              <p>Nenhuma pelada registrada.<br />Crie uma nova nas opções abaixo!</p>
            </div>
          ) : (
            <div className="session-list" style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '15px', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontFamily: "'Outfit', sans-serif" }}>
                  ⚽ Última Pelada
                </h2>
                {sessions.length > 1 && (
                  <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)' }} onClick={() => { setActiveTab('partidas'); setShowAllSessionsScreen(true); }}>
                    Ver Todas ({sessions.length})
                  </button>
                )}
              </div>

              {/* Card de Última Pelada simplificado */}
              <div className="card animated" style={{ padding: '16px', cursor: 'pointer' }} onClick={() => setActiveSessionId(sessions[0].id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: 'bold' }}>📅 Pelada do dia {latestSessionHighlights.sessionDate}</span>
                  <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 'bold', backgroundColor: 'rgba(34, 197, 94, 0.1)', padding: '4px 10px', borderRadius: '12px' }}>Ver Detalhes →</span>
                </div>
              </div>

              {/* Destaques da Rodada */}
              <h2 style={{ fontSize: '15px', color: 'var(--text-main)', margin: '20px 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: "'Outfit', sans-serif" }}>
                🏆 Destaques da Rodada
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '24px' }} className="animated">
                {/* MVP */}
                <div className="card animated" style={{ padding: '12px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', textAlign: 'center', background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.05) 0%, rgba(0,0,0,0.1) 100%)', border: '1px solid rgba(234, 179, 8, 0.15)', cursor: 'pointer' }} onClick={() => {
                  const pObj = registeredPlayers.find(rp => rp.name === latestSessionHighlights.mvp?.name) || registeredGoleiros.find(rg => rg.name === latestSessionHighlights.mvp?.name);
                  if (pObj) { setViewingPlayerId(pObj.id); setShowProfile(true); }
                }}>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#eab308', textTransform: 'uppercase', letterSpacing: '0.5px' }}>👑 MVP</span>
                  <PlayerAvatar users={users} registeredPlayers={registeredPlayers} registeredGoleiros={registeredGoleiros} setSelectedAvatar={setSelectedAvatar} playerName={latestSessionHighlights.mvp?.name} size={36} />
                  <span style={{ fontSize: '12px', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{latestSessionHighlights.mvp ? latestSessionHighlights.mvp.name : '-'}</span>
                  <span style={{ fontSize: '11px', color: '#eab308', fontWeight: 'bold' }}>{latestSessionHighlights.mvp ? `Nota ${latestSessionHighlights.mvp.nota.toFixed(1)}` : '-'}</span>
                </div>

                {/* ARTILHEIRO */}
                <div className="card animated" style={{ padding: '12px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', textAlign: 'center', background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(0,0,0,0.1) 100%)', border: '1px solid rgba(34, 197, 94, 0.15)', cursor: 'pointer' }} onClick={() => {
                  const pObj = registeredPlayers.find(rp => rp.name === latestSessionHighlights.topScorer?.name) || registeredGoleiros.find(rg => rg.name === latestSessionHighlights.topScorer?.name);
                  if (pObj) { setViewingPlayerId(pObj.id); setShowProfile(true); }
                }}>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>⚽ Artilheiro</span>
                  <PlayerAvatar users={users} registeredPlayers={registeredPlayers} registeredGoleiros={registeredGoleiros} setSelectedAvatar={setSelectedAvatar} playerName={latestSessionHighlights.topScorer?.name} size={36} />
                  <span style={{ fontSize: '12px', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{latestSessionHighlights.topScorer ? latestSessionHighlights.topScorer.name : '-'}</span>
                  <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 'bold' }}>{latestSessionHighlights.topScorer ? `${latestSessionHighlights.topScorer.goals} Gols` : '-'}</span>
                </div>

                {/* ASSISTENTE */}
                <div className="card animated" style={{ padding: '12px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', textAlign: 'center', background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.05) 0%, rgba(0,0,0,0.1) 100%)', border: '1px solid rgba(168, 85, 247, 0.15)', cursor: 'pointer' }} onClick={() => {
                  const pObj = registeredPlayers.find(rp => rp.name === latestSessionHighlights.topAssister?.name) || registeredGoleiros.find(rg => rg.name === latestSessionHighlights.topAssister?.name);
                  if (pObj) { setViewingPlayerId(pObj.id); setShowProfile(true); }
                }}>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🎯 Garçom</span>
                  <PlayerAvatar users={users} registeredPlayers={registeredPlayers} registeredGoleiros={registeredGoleiros} setSelectedAvatar={setSelectedAvatar} playerName={latestSessionHighlights.topAssister?.name} size={36} />
                  <span style={{ fontSize: '12px', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{latestSessionHighlights.topAssister ? latestSessionHighlights.topAssister.name : '-'}</span>
                  <span style={{ fontSize: '11px', color: '#a855f7', fontWeight: 'bold' }}>{latestSessionHighlights.topAssister ? `${latestSessionHighlights.topAssister.assists} Assist.` : '-'}</span>
                </div>
              </div>

              {/* Ranking Resumido */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '24px 0 12px 0' }}>
                <h2 style={{ fontSize: '15px', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontFamily: "'Outfit', sans-serif" }}>
                  📊 Ranking Resumido (Top 5)
                </h2>
                <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)' }} onClick={() => { setActiveTab('ranking'); setShowPlayersScreen(true); setShowMonthlyStatsScreen(false); }}>
                  Ver Completo
                </button>
              </div>

              <div className="card animated" style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {summaryRanking.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '10px 0' }}>Nenhum jogador pontuou ainda.</p>
                ) : (
                  summaryRanking.map((p, idx) => {
                    let color = 'var(--text-main)';
                    if (p.media_nota >= 9) color = '#22c55e';
                    else if (p.media_nota >= 7) color = '#4ade80';
                    else if (p.media_nota >= 5) color = '#eab308';
                    else color = '#ef4444';

                    return (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: idx < summaryRanking.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => { setViewingPlayerId(p.id); setShowProfile(true); }}>
                          <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', width: '20px', textAlign: 'center', opacity: 0.6 }}>{idx + 1}º</span>
                          <PlayerAvatar users={users} registeredPlayers={registeredPlayers} registeredGoleiros={registeredGoleiros} setSelectedAvatar={setSelectedAvatar} playerName={p.name} size={32} />
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '14px', fontWeight: '600' }}>{p.name}</span>
                            {p.posicao && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{p.posicao}</span>}
                          </div>
                        </div>
                        <span style={{ fontWeight: 'bold', color: color, fontSize: '14px' }}>{p.media_nota ? p.media_nota.toFixed(2) : '0.00'}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          <div className="main-actions-bar" style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 6 }}>
              Administração
            </h3>
            {isGlobalAdmin ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <form className="input-group" onSubmit={handleAddSession} style={{ marginBottom: 0 }}>
                  <input type="text" className="input-field" placeholder="Criar nova pelada..." value={newSessionName} onChange={(e) => setNewSessionName(e.target.value)} />
                  <button type="submit" className="btn-primary" title="Criar Pelada"><Plus size={20} /></button>
                </form>
                <form className="input-group" onSubmit={handleRegisterPlayer} style={{ marginBottom: 0 }}>
                  <input type="text" name="playerName" className="input-field" placeholder="Cadastrar novo jogador..." />
                  <button type="submit" className="btn-primary" title="Cadastrar Jogador"><Users size={20} /></button>
                </form>
                <form className="input-group" onSubmit={handleRegisterGoleiro} style={{ marginBottom: 0 }}>
                  <input type="text" name="goleiroName" className="input-field" placeholder="Cadastrar novo goleiro..." />
                  <button type="submit" className="btn-primary" title="Cadastrar Goleiro"><Hand size={20} /></button>
                </form>
              </div>
            ) : (
              <div style={{ padding: '16px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.1)', textAlign: 'center', color: 'var(--text-muted)' }}>
                Apenas Administradores podem criar peladas ou cadastrar jogadores/goleiros.
              </div>
            )}
          </div>

          {/* Easter Egg */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px', paddingBottom: '20px' }}>
            <img src="/ditador.png" alt="O Ditador" style={{ width: '100px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }} />
          </div>
        </main>
        {renderBottomNav()}
      </div>
    );
  }

  // Calculate Rankings for active session
  const teams = (activeSession?.teams || []).map(t => {
    if (activeSession?.matches) {
      let wins = 0, draws = 0, losses = 0;
      (activeSession.matches || []).forEach(m => {
        if (m.team1Id === t.id) {
          if (m.score1 > m.score2) wins++;
          else if (m.score1 === m.score2) draws++;
          else losses++;
        } else if (m.team2Id === t.id) {
          if (m.score2 > m.score1) wins++;
          else if (m.score2 === m.score1) draws++;
          else losses++;
        }
      });
      return { ...t, wins, draws, losses };
    }
    return t;
  });

  const teamStandings = [...teams].map(t => ({
    ...t,
    points: (t.wins * 3) + (t.draws * 1)
  })).sort((a, b) => b.points - a.points || b.wins - a.wins);

  const allPlayers = teams.flatMap(t => (t.players || []).map(p => ({ ...p, teamName: t.name })));

  // Calculate session ratings for tiebreaker
  const sessionRatings = calculateSessionPlayerRatings(activeSession, registeredPlayers);
  const getPlayerNota = (playerName) => {
    const r = sessionRatings.find(r => r.name.trim().toLowerCase() === playerName.trim().toLowerCase());
    return r ? r.nota : 0;
  };

  const topScorers = [...allPlayers]
    .filter(p => p.goals > 0 || p.assists > 0)
    .sort((a, b) => b.goals - a.goals || getPlayerNota(b.name) - getPlayerNota(a.name))
    .slice(0, 5);

  const topAssists = [...allPlayers]
    .filter(p => p.assists > 0 || p.goals > 0)
    .sort((a, b) => b.assists - a.assists || getPlayerNota(b.name) - getPlayerNota(a.name))
    .slice(0, 5);

  const SessionPodium = ({ players, type }) => {
    if (!players || players.length < 3) return null;

    const getStatValue = (p) => {
      if (type === 'gols') return <span style={{ color: 'var(--primary)' }}>⚽ {p.goals || 0}</span>;
      if (type === 'assists') return <span style={{ color: 'var(--primary)' }}>🎯 {p.assists || 0}</span>;
      if (type === 'nota') return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
          <span style={{ color: '#eab308' }}>⭐ {p.nota?.toFixed(1) || '0.0'}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', opacity: 0.9, color: 'var(--text-main)' }}>
            {(p.goals > 0 || p.assists > 0) ? (
              <>
                {p.goals > 0 && <span>⚽ {p.goals}</span>}
                {p.assists > 0 && <span>🎯 {p.assists}</span>}
              </>
            ) : null}
          </div>
        </div>
      );
      return '';
    };

    return (
      <div className="podium-container animated" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '8px', paddingTop: '24px', paddingBottom: '16px', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {/* 2ND PLACE */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '30%', position: 'relative' }}>
          <div onClick={() => {
            const pObj = registeredPlayers.find(rp => rp.name === players[1].name) || registeredGoleiros.find(rg => rg.name === players[1].name);
            if (pObj) { setViewingPlayerId(pObj.id); setShowProfile(true); }
          }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', cursor: 'pointer' }} title="Ver perfil">
            <PlayerAvatar users={users} registeredPlayers={registeredPlayers} registeredGoleiros={registeredGoleiros} setSelectedAvatar={setSelectedAvatar} playerName={players[1].name} size={40} />
            <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: 'bold', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', color: 'var(--text-main)', transition: 'color 0.2s ease' }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--primary)'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-main)'}>{players[1].name}</div>
          </div>
          <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>{getStatValue(players[1])}</div>
          <div style={{ width: '100%', height: '50px', backgroundColor: 'rgba(148, 163, 184, 0.15)', border: '1px solid rgba(148, 163, 184, 0.3)', borderBottom: 'none', borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '6px', fontSize: '20px' }}>🥈</div>
        </div>

        {/* 1ST PLACE */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '35%', position: 'relative', zIndex: 10 }}>
          <div style={{ position: 'absolute', top: '-22px', fontSize: '20px', filter: 'drop-shadow(0 2px 4px rgba(234,179,8,0.4))' }}>👑</div>
          <div onClick={() => {
            const pObj = registeredPlayers.find(rp => rp.name === players[0].name) || registeredGoleiros.find(rg => rg.name === players[0].name);
            if (pObj) { setViewingPlayerId(pObj.id); setShowProfile(true); }
          }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', cursor: 'pointer' }} title="Ver perfil">
            <PlayerAvatar users={users} registeredPlayers={registeredPlayers} registeredGoleiros={registeredGoleiros} setSelectedAvatar={setSelectedAvatar} playerName={players[0].name} size={50} />
            <div style={{ marginTop: '8px', fontSize: '13px', fontWeight: 'bold', textAlign: 'center', color: '#eab308', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', transition: 'filter 0.2s ease' }} onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(1.2)'} onMouseOut={(e) => e.currentTarget.style.filter = 'none'}>{players[0].name}</div>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '6px' }}>{getStatValue(players[0])}</div>
          <div style={{ width: '100%', height: '70px', backgroundColor: 'rgba(234, 179, 8, 0.15)', border: '1px solid rgba(234, 179, 8, 0.4)', borderBottom: 'none', borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '6px', fontSize: '24px', boxShadow: '0 -4px 12px rgba(234,179,8,0.1)' }}>🥇</div>
        </div>

        {/* 3RD PLACE */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '30%', position: 'relative' }}>
          <div onClick={() => {
            const pObj = registeredPlayers.find(rp => rp.name === players[2].name) || registeredGoleiros.find(rg => rg.name === players[2].name);
            if (pObj) { setViewingPlayerId(pObj.id); setShowProfile(true); }
          }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', cursor: 'pointer' }} title="Ver perfil">
            <PlayerAvatar users={users} registeredPlayers={registeredPlayers} registeredGoleiros={registeredGoleiros} setSelectedAvatar={setSelectedAvatar} playerName={players[2].name} size={40} />
            <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: 'bold', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', color: 'var(--text-main)', transition: 'color 0.2s ease' }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--primary)'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-main)'}>{players[2].name}</div>
          </div>
          <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>{getStatValue(players[2])}</div>
          <div style={{ width: '100%', height: '35px', backgroundColor: 'rgba(180, 83, 9, 0.15)', border: '1px solid rgba(180, 83, 9, 0.3)', borderBottom: 'none', borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '6px', fontSize: '18px' }}>🥉</div>
        </div>
      </div>
    );
  };

  return (
    <div className="app-container" style={{ maxWidth: 1000 }}>
      <header className="header" style={{ flexWrap: 'wrap' }}>
        <button className="back-btn" onClick={() => setActiveSessionId(null)}>
          <ChevronLeft size={28} />
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h1 style={{ margin: 0 }}>{activeSession?.name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={14} color="var(--text-muted)" />
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{activeSession?.date || 'Sem data'}</span>
            {canEditSession(activeSession) && (
              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--primary)', backgroundColor: 'rgba(34,197,94,0.1)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(34,197,94,0.2)' }}>
                <Pencil size={12} />
                <span>Alterar</span>
                <input
                  type="date"
                  style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
                  value={activeSession?.date ? (() => { const p = activeSession.date.split("/"); return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : ""; })() : ""}
                  onChange={(e) => handleEditSessionDate(activeSessionId, e.target.value)}
                  onClick={(e) => e.target.showPicker && e.target.showPicker()}
                  ref={(el) => { if (el) el.onclick = () => el.showPicker?.(); }}
                />
              </label>
            )}
          </div>
          {canEditSession(activeSession) && <span style={{ fontSize: 13, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 4 }}><Shield size={14} /> Admin da Pelada</span>}
        </div>

        {canEditSession(activeSession) && (
          <button className="btn-primary" style={{ marginLeft: 'auto', padding: '8px 16px', fontSize: 13, backgroundColor: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)' }} onClick={() => setShowAdminModal(true)}>
            <Users size={16} /> Gerenciar Admins
          </button>
        )}
      </header>

      {showAdminModal && canEditSession(activeSession) && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 24, backdropFilter: 'blur(4px)' }}>
          <div className="card animated" style={{ width: '100%', maxWidth: 500, padding: 24, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}><ShieldAlert color="var(--primary)" /> Gerenciar Administradores</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>Admins podem editar os resultados desta pelada.</p>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 4 }}>
              {(() => {
                const uniqueUserIds = new Set();
                const usersToRender = [];

                if (activeSession.admins) {
                  activeSession.admins.forEach(adminId => {
                    if (!uniqueUserIds.has(adminId)) {
                      uniqueUserIds.add(adminId);
                      usersToRender.push({ userId: adminId, isAdmin: true });
                    }
                  });
                }

                const sessionPlayers = activeSession.teams?.flatMap(t => t.players?.filter(p => registeredPlayers.find(rp => rp.name === p.name)?.userId) || []) || [];
                for (const p of sessionPlayers) {
                  const rp = registeredPlayers.find(rp => rp.name === p.name);
                  if (rp && rp.userId && !uniqueUserIds.has(rp.userId)) {
                    uniqueUserIds.add(rp.userId);
                    usersToRender.push({ userId: rp.userId, isAdmin: false });
                  }
                }

                if (usersToRender.length === 0) return <p style={{ color: 'var(--text-muted)' }}>Nenhum administrador ou jogador cadastrado encontrado.</p>;

                return usersToRender.map(item => {
                  const { userId, isAdmin } = item;
                  const userObj = users.find(u => u.id === userId);
                  if (!userObj) return null;

                  const isCreator = activeSession.criador === currentUser?.id;
                  const canManage = isCreator;
                  const isSelf = userId === currentUser?.id;

                  const linkedPlayer = registeredPlayers.find(rp => rp.userId === userId);
                  const playerNameText = linkedPlayer ? linkedPlayer.name : 'Não vinculado';

                  return (
                    <div key={userId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, border: isAdmin ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid transparent' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <strong style={{ fontSize: 16 }}>{userObj.name}</strong>
                          {isAdmin && <Shield size={14} color="var(--primary)" title="Admin" />}
                        </div>
                        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Jogador atrelado: {playerNameText}</span>
                      </div>
                      <div>
                        {isAdmin ? (
                          canManage && !isSelf ? (
                            <button onClick={() => demoteFromAdmin(userId)} className="btn-primary" style={{ backgroundColor: 'transparent', border: '1px solid rgba(239, 68, 68, 0.5)', color: 'var(--danger)', padding: '6px 12px', fontSize: 13 }}>Remover Admin</button>
                          ) : isSelf ? (
                            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Você</span>
                          ) : null
                        ) : (
                          canManage ? (
                            <button onClick={() => promoteToAdmin(userId)} className="btn-primary" style={{ padding: '6px 12px', fontSize: 13 }}>Tornar Admin</button>
                          ) : null
                        )}
                      </div>
                    </div>
                  )
                });
              })()}
            </div>
            <button className="btn-primary" style={{ width: '100%', marginTop: 24, justifyContent: 'center', backgroundColor: 'var(--surface)', border: '1px solid rgba(255,255,255,0.2)' }} onClick={() => setShowAdminModal(false)}>Fechar</button>
          </div>
        </div>
      )}

      {showMatchesModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 24, backdropFilter: 'blur(4px)' }}>
          <div className="card animated" style={{ width: '100%', maxWidth: 500, padding: 24, maxHeight: '90vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <button
              className="icon-btn"
              style={{ position: 'absolute', top: 16, right: 16, color: 'var(--text-muted)' }}
              onClick={() => setShowMatchesModal(false)}
            >
              <X size={24} />
            </button>
            <h2 style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8, paddingRight: 32 }}><span style={{ fontSize: '24px' }}>⚔️</span> Partidas e Placares</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>Acompanhe os resultados dos confrontos diretos.</p>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, paddingRight: 4 }}>

              {canEditSession(activeSession) && (
                <form onSubmit={handleAddMatch} style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 'bold' }}>Adicionar Partida</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select name="team1Id" className="input-field" style={{ flex: 1 }} required>
                      <option value="">Time 1</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 'bold' }}>VS</span>
                    <select name="team2Id" className="input-field" style={{ flex: 1 }} required>
                      <option value="">Time 2</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }}>Adicionar</button>
                </form>
              )}

              {(!activeSession.matches || activeSession.matches.length === 0) ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0', fontSize: 14 }}>
                  Nenhuma partida registrada ainda.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {activeSession.matches.map(match => {
                    const t1 = teams.find(t => t.id === match.team1Id);
                    const t2 = teams.find(t => t.id === match.team2Id);
                    if (!t1 || !t2) return null;

                    return (
                      <div key={match.id} style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                        {canEditSession(activeSession) && (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 8px', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                            <button className="icon-btn danger" style={{ padding: 4 }} onClick={() => removeMatch(match.id)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', gap: 12 }}>
                          {/* Team 1 */}
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 'bold', color: getTextColor(getTeamColor(t1.name)), backgroundColor: getTeamColor(t1.name), padding: '4px 8px', borderRadius: 6, textAlign: 'center', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {t1.name}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {canEditSession(activeSession) && <button className="ctrl-btn" onClick={() => updateMatchScore(match.id, 'score1', -1)}><Minus size={14} /></button>}
                              <span style={{ fontSize: 32, fontWeight: '900', width: 30, textAlign: 'center' }}>{match.score1}</span>
                              {canEditSession(activeSession) && <button className="ctrl-btn" onClick={() => updateMatchScore(match.id, 'score1', 1)}><Plus size={14} /></button>}
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: 18, color: 'var(--text-muted)', fontWeight: 'bold' }}>X</span>
                          </div>

                          {/* Team 2 */}
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 'bold', color: getTextColor(getTeamColor(t2.name)), backgroundColor: getTeamColor(t2.name), padding: '4px 8px', borderRadius: 6, textAlign: 'center', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {t2.name}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {canEditSession(activeSession) && <button className="ctrl-btn" onClick={() => updateMatchScore(match.id, 'score2', -1)}><Minus size={14} /></button>}
                              <span style={{ fontSize: 32, fontWeight: '900', width: 30, textAlign: 'center' }}>{match.score2}</span>
                              {canEditSession(activeSession) && <button className="ctrl-btn" onClick={() => updateMatchScore(match.id, 'score2', 1)}><Plus size={14} /></button>}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="main-content animated">
        <div className="session-container">

          {/* LEFT COLUMN: TEAMS */}
          <div className="teams-column">
            {/* PARTIDAS / PLACARES */}
            <div className="matches-section" style={{ marginBottom: '16px' }}>
              <button
                className="btn-primary"
                style={{ width: '100%', padding: '16px', backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)', display: 'flex', flexDirection: 'row', gap: '16px', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', cursor: 'pointer' }}
                onClick={() => setShowMatchesModal(true)}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(34, 197, 94, 0.2)', padding: '10px', borderRadius: '50%' }}>
                  <span style={{ fontSize: '24px', lineHeight: 1 }}>⚔️</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '16px', fontWeight: 'bold' }}>Partidas e Placares</span>
                  <span style={{ fontSize: '13px', color: 'rgba(34, 197, 94, 0.8)', fontWeight: 'normal' }}>
                    {(activeSession?.matches?.length || 0)} partidas registradas
                  </span>
                </div>
              </button>
            </div>

            {teams.length < 4 ? (
              canEditSession(activeSession) ? <form className="input-group" onSubmit={handleAddTeam} style={{ marginBottom: 4 }}>
                <input
                  type="text"
                  name="teamName"
                  className="input-field"
                  placeholder="Nome do Time (Opcional)..."
                />
                <button type="submit" className="btn-primary">
                  + Time
                </button>
              </form> : null
            ) : null}

            {teams.length === 0 ? (
              <div className="empty-state">
                <Flag size={48} />
                <p>Nenhum time formado.<br />Crie os times para adicionar jogadores.</p>
              </div>
            ) : (
              <div className="team-list">
                {teams.map(team => {
                  const headerColor = getTeamColor(team.name);
                  const isPrimary = headerColor === 'var(--primary)';
                  const headerTextColor = isPrimary ? '#ffffff' : getTextColor(headerColor);
                  const isBgVeryDark = headerColor === '#1a1a1a' || headerColor === '#000000';
                  const isWhite = headerColor === '#ffffff';
                  const themeAccentColor = isBgVeryDark ? '#333333' : headerColor;

                  const bodyBg = isBgVeryDark
                    ? '#080808'
                    : isPrimary
                      ? 'rgba(0,0,0,0.15)'
                      : `color-mix(in srgb, ${headerColor} 8%, #080808)`;

                  const playerItemBg = isBgVeryDark
                    ? '#141414'
                    : `color-mix(in srgb, ${headerColor} 16%, #080808)`;

                  return (
                    <div key={team.id} className="team-wrapper" style={{
                      borderColor: headerColor,
                      backgroundColor: isBgVeryDark ? '#000000' : 'var(--surface)'
                    }}>
                      {/* Team Header */}
                      <div className="team-header"
                        onClick={() => toggleTeam(team.id)}
                        style={{
                          backgroundColor: isPrimary ? 'rgba(255,255,255,0.02)' : headerColor,
                          color: headerTextColor,
                          padding: 0
                        }}>
                        <div
                          className="team-title-row"
                          style={{
                            padding: '16px 16px 8px 16px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <span className="card-title" style={{ color: headerTextColor, display: 'flex', alignItems: 'center' }}>
                            <SoccerBallIcon color={isPrimary ? 'var(--primary)' : '#ffffff'} size={20} />
                            {team.name} ({team.players?.length || 0}/5)

                            {/* Botão para editar nome do Time */}
                            {canEditSession(activeSession) && (
                              <button
                                style={{
                                  padding: '5px',
                                  marginLeft: '6px',
                                  backgroundColor: headerTextColor === '#000000' ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.1)',
                                  border: `1px solid ${headerTextColor === '#000000' ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.2)'}`,
                                  color: headerTextColor,
                                  borderRadius: '6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  opacity: 0.8
                                }}
                                onMouseOver={(e) => {
                                  e.currentTarget.style.backgroundColor = headerTextColor === '#000000' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.18)';
                                  e.currentTarget.style.opacity = '1';
                                }}
                                onMouseOut={(e) => {
                                  e.currentTarget.style.backgroundColor = headerTextColor === '#000000' ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.1)';
                                  e.currentTarget.style.opacity = '0.8';
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  editTeamName(team.id, team.name);
                                }}
                              >
                                <Pencil size={14} />
                              </button>
                            )}

                          </span>
                          <div className="card-actions">
                            {canEditSession(activeSession) && (
                              <button
                                style={{
                                  padding: '5px',
                                  backgroundColor: headerTextColor === '#000000' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.2)',
                                  border: `1px solid ${headerTextColor === '#000000' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.35)'}`,
                                  color: headerTextColor === '#000000' ? '#c53030' : '#ff6b6b',
                                  borderRadius: '6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease'
                                }}
                                onMouseOver={(e) => {
                                  e.currentTarget.style.backgroundColor = headerTextColor === '#000000' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.3)';
                                  e.currentTarget.style.borderColor = headerTextColor === '#000000' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(239, 68, 68, 0.5)';
                                }}
                                onMouseOut={(e) => {
                                  e.currentTarget.style.backgroundColor = headerTextColor === '#000000' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.2)';
                                  e.currentTarget.style.borderColor = headerTextColor === '#000000' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.35)';
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeTeam(team.id);
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="stats-grid"
                          onClick={(e) => e.stopPropagation()}
                          style={{ padding: '0 16px 12px 16px', cursor: 'default' }}>
                          <div className="stat-box">
                            <span className="stat-label" style={{ color: headerTextColor }}>V</span>
                            <span className="stat-value" style={{ margin: 'auto' }}>{team.wins}</span>
                          </div>

                          <div className="stat-box">
                            <span className="stat-label" style={{ color: headerTextColor }}>E</span>
                            <span className="stat-value" style={{ margin: 'auto' }}>{team.draws}</span>
                          </div>

                          <div className="stat-box">
                            <span className="stat-label" style={{ color: headerTextColor }}>D</span>
                            <span className="stat-value" style={{ margin: 'auto' }}>{team.losses}</span>
                          </div>
                        </div>

                        {/* Handle de expansão na parte inferior do header */}
                        <div
                          className={`team-expand-handle ${expandedTeams[team.id] ? 'expanded' : ''}`}
                          style={{
                            color: headerTextColor,
                            borderTop: isPrimary ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)'
                          }}
                        >
                          <ChevronDown size={20} />
                        </div>
                      </div>

                      {/* Expanded Team Body (Players) */}
                      {expandedTeams[team.id] && (
                        <div className="team-body animated" style={{ backgroundColor: bodyBg, borderColor: 'transparent' }}>

                          {/* Toggle View Mode */}
                          <div style={{
                            display: 'flex',
                            backgroundColor: 'rgba(0,0,0,0.2)',
                            padding: '4px',
                            borderRadius: '10px',
                            marginBottom: '20px',
                            border: '1px solid rgba(255,255,255,0.05)'
                          }}>
                            <button
                              onClick={() => toggleTeamViewMode(team.id, 'list')}
                              style={{
                                flex: 1, padding: '8px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold',
                                backgroundColor: (!teamViewModes[team.id] || teamViewModes[team.id] === 'list') ? themeAccentColor : 'transparent',
                                color: (!teamViewModes[team.id] || teamViewModes[team.id] === 'list') ? getTextColor(themeAccentColor) : 'var(--text-muted)',
                                border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                              }}
                            >
                              <Users size={14} /> Lista
                            </button>
                            <button
                              onClick={() => toggleTeamViewMode(team.id, 'field')}
                              style={{
                                flex: 1, padding: '8px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold',
                                backgroundColor: teamViewModes[team.id] === 'field' ? themeAccentColor : 'transparent',
                                color: teamViewModes[team.id] === 'field' ? getTextColor(themeAccentColor) : 'var(--text-muted)',
                                border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                              }}
                            >
                              <Flag size={14} /> Campo
                            </button>
                          </div>

                          {(!teamViewModes[team.id] || teamViewModes[team.id] === 'list') ? (
                            <div className="slide-in-left">
                              {(!team.players || team.players.length < 5) && canEditSession(activeSession) && (
                                <form className="input-group" style={{ marginBottom: 16 }} onSubmit={(e) => handleAddPlayer(team.id, e)}>
                                  <select
                                    name="playerName"
                                    className="input-field"
                                    style={{
                                      backgroundColor: isBgVeryDark ? '#1a1a1a' : 'rgba(0,0,0,0.2)',
                                      borderColor: isPrimary ? 'var(--border)' : `color-mix(in srgb, ${headerColor} 30%, transparent)`,
                                      color: '#ffffff'
                                    }}
                                  >
                                    <option value="">Selecionar Jogador...</option>
                                    {registeredPlayers
                                      .filter(rp => {
                                        const isInAnyTeam = teams.some(t => t.players?.some(p => p.name === rp.name));
                                        return !isInAnyTeam;
                                      })
                                      .sort((a, b) => a.name.localeCompare(b.name))
                                      .map(rp => (
                                        <option key={rp.id} value={rp.name}>{rp.name}</option>
                                      ))}
                                  </select>
                                  <button type="submit" className="btn-primary" style={{
                                    padding: '0 12px',
                                    backgroundColor: themeAccentColor,
                                    color: getTextColor(themeAccentColor)
                                  }}>
                                    <UserPlus size={18} />
                                  </button>
                                </form>
                              )}

                              <div className="player-list">
                                {(!team.players || team.players.length === 0) ? (
                                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center' }}>Nenhum jogador no time.</p>
                                ) : (
                                  team.players.map(player => (
                                    <div key={player.id} className="player-item" style={{
                                      backgroundColor: playerItemBg,
                                      borderLeft: `4px solid ${headerColor}`,
                                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                    }}>
                                      <div className="player-header">
                                        <span style={{ color: '#ffffff', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                          <PlayerAvatar users={users} registeredPlayers={registeredPlayers} registeredGoleiros={registeredGoleiros} setSelectedAvatar={setSelectedAvatar} playerName={player.name} size={30} />
                                          {player.name}
                                          {/* Botão para editar nome do Jogador */}
                                          {canEditSession(activeSession) && <button className="icon-btn" style={{ padding: 4, color: 'rgba(255,255,255,0.6)' }} onClick={(e) => { e.stopPropagation(); editPlayerName(team.id, player.id, player.name); }}><Pencil size={12} /></button>}
                                        </span>
                                        {canEditSession(activeSession) && <button className="icon-btn danger" style={{ padding: 0, color: 'var(--danger)' }} onClick={() => removePlayer(team.id, player.id)}><Trash2 size={14} /></button>}
                                      </div>
                                      <div className="player-stats">
                                        <div className="mini-stat" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                                          <span className="mini-stat-label"><Goal size={12} /> Gols</span>
                                          {canEditSession(activeSession) ? (
                                            <div className="stat-controls">
                                              <button className="ctrl-btn" onClick={() => updatePlayerStat(team.id, player.id, 'goals', -1)}><Minus size={10} /></button>
                                              <span className="stat-value" style={{ fontSize: 14, color: '#ffffff' }}>{player.goals}</span>
                                              <button className="ctrl-btn" onClick={() => updatePlayerStat(team.id, player.id, 'goals', 1)}><Plus size={10} /></button>
                                            </div>
                                          ) : <span className="stat-value" style={{ fontSize: 14, color: '#ffffff', minWidth: 28, textAlign: 'center' }}>{player.goals}</span>}
                                        </div>
                                        <div className="mini-stat" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                                          <span className="mini-stat-label"><Target size={12} /> Assist.</span>
                                          {canEditSession(activeSession) ? (
                                            <div className="stat-controls">
                                              <button className="ctrl-btn" onClick={() => updatePlayerStat(team.id, player.id, "assists", -1)}><Minus size={10} /></button>
                                              <span className="stat-value" style={{ fontSize: 14, color: '#ffffff' }}>{player.assists}</span>
                                              <button className="ctrl-btn" onClick={() => updatePlayerStat(team.id, player.id, 'assists', 1)}><Plus size={10} /></button>
                                            </div>
                                          ) : <span className="stat-value" style={{ fontSize: 14, color: '#ffffff', minWidth: 28, textAlign: 'center' }}>{player.assists}</span>}
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="slide-in-right soccer-field-container" style={{ marginTop: 0 }}>
                              <div className="soccer-field" style={{ maxWidth: '100%', backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <div className="field-line field-center-line"></div>
                                <div className="field-line field-center-circle"></div>
                                <div className="field-line field-penalty-area-top"></div>
                                <div className="field-line field-penalty-area-bottom"></div>

                                {(() => {
                                  const playersWithPos = (team.players || []).map(p => {
                                    const rp = registeredPlayers.find(regP => regP.name === p.name);
                                    return { ...p, posicao: rp?.posicao || 'Atacante' };
                                  });

                                  const atacantes = playersWithPos.filter(p => p.posicao === 'Atacante');
                                  const meias = playersWithPos.filter(p => p.posicao === 'Meia');
                                  const zagueiros = playersWithPos.filter(p => p.posicao === 'Zagueiro');

                                  return (
                                    <>
                                      <SoccerField
                                        users={users}
                                        players={atacantes}
                                        type="Atacante"
                                        sourceRatings={sessionRatings}
                                        registeredPlayers={registeredPlayers}
                                        registeredGoleiros={registeredGoleiros}
                                        onPlayerClick={(pObj) => {
                                          setViewingPlayerId(pObj.id);
                                          setShowProfile(true);
                                        }}
                                      />
                                      <SoccerField
                                        users={users}
                                        players={meias}
                                        type="Meia"
                                        sourceRatings={sessionRatings}
                                        registeredPlayers={registeredPlayers}
                                        registeredGoleiros={registeredGoleiros}
                                        onPlayerClick={(pObj) => {
                                          setViewingPlayerId(pObj.id);
                                          setShowProfile(true);
                                        }}
                                      />
                                      <SoccerField
                                        users={users}
                                        players={zagueiros}
                                        type="Zagueiro"
                                        sourceRatings={sessionRatings}
                                        registeredPlayers={registeredPlayers}
                                        registeredGoleiros={registeredGoleiros}
                                        onPlayerClick={(pObj) => {
                                          setViewingPlayerId(pObj.id);
                                          setShowProfile(true);
                                        }}
                                      />
                                    </>
                                  );
                                })()}
                              </div>
                              <p style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', marginTop: 12 }}>
                                💡 As posições podem ser alteradas no ranking geral.
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}



            {/* GOLEIROS DA PELADA */}
            <div className="goleiros-section" style={{ marginTop: '24px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                  🧤 Goleiros da Pelada
                </h3>
              </div>

              {canEditSession(activeSession) && (
                <form className="input-group" style={{ marginBottom: 16 }} onSubmit={handleAddGoleiroSession}>
                  <select
                    name="goleiroName"
                    className="input-field"
                    style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderColor: 'rgba(255,255,255,0.1)', color: '#ffffff' }}
                  >
                    <option value="">Selecionar Goleiro...</option>
                    {registeredGoleiros
                      .filter(rg => !(activeSession?.goleiros || []).some(g => g.name === rg.name))
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(rg => (
                        <option key={rg.id} value={rg.name}>{rg.name}</option>
                      ))}
                  </select>
                  <button type="submit" className="btn-primary" style={{ padding: '0 12px', backgroundColor: '#a855f7', color: '#fff' }}>
                    <UserPlus size={18} />
                  </button>
                </form>
              )}

              {(!activeSession?.goleiros || activeSession.goleiros.length === 0) ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', margin: '20px 0' }}>Nenhum goleiro participando.</p>
              ) : (
                <div className="player-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {activeSession.goleiros.map(goleiro => (
                    <div key={goleiro.id} className="player-item" style={{ backgroundColor: '#141414', borderLeft: '4px solid #a855f7', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                      <div className="player-header">
                        <span
                          style={{ color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                          onClick={() => {
                            const pObj = registeredPlayers.find(rp => rp.name === goleiro.name) || registeredGoleiros.find(rg => rg.name === goleiro.name);
                            if (pObj) { setViewingPlayerId(pObj.id); setShowProfile(true); }
                          }}
                          onMouseOver={(e) => e.currentTarget.style.color = 'var(--primary)'}
                          onMouseOut={(e) => e.currentTarget.style.color = '#ffffff'}
                          title="Ver perfil"
                        >
                          <span style={{ fontSize: '18px' }}>🧤</span> {goleiro.name}
                          {canEditSession(activeSession) && (
                            <button className="icon-btn" style={{ padding: 4, color: 'rgba(255,255,255,0.6)' }} onClick={(e) => { e.stopPropagation(); editGoleiroNameSession(goleiro.id, goleiro.name); }}>
                              <Pencil size={12} />
                            </button>
                          )}
                        </span>
                        {canEditSession(activeSession) && (
                          <button className="icon-btn danger" style={{ padding: 0, color: 'var(--danger)' }} onClick={() => removeGoleiroSession(goleiro.id)}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      <div className="player-stats">
                        <div className="mini-stat" style={{ backgroundColor: 'rgba(0,0,0,0.3)', flex: 1 }}>
                          <span className="mini-stat-label">🏆 Vitorias</span>
                          {canEditSession(activeSession) ? (
                            <div className="stat-controls">
                              <button className="ctrl-btn" onClick={() => updateGoleiroStatSession(goleiro.id, 'wins', -1)}><Minus size={10} /></button>
                              <span className="stat-value" style={{ fontSize: 14, color: '#ffffff' }}>{goleiro.wins}</span>
                              <button className="ctrl-btn" onClick={() => updateGoleiroStatSession(goleiro.id, 'wins', 1)}><Plus size={10} /></button>
                            </div>
                          ) : <span className="stat-value" style={{ fontSize: 14, color: '#ffffff', minWidth: 28, textAlign: 'center' }}>{goleiro.wins}</span>}
                        </div>
                        <div className="mini-stat" style={{ backgroundColor: 'rgba(0,0,0,0.3)', flex: 1 }}>
                          <span className="mini-stat-label">🪽 Defesas Dif.</span>
                          {canEditSession(activeSession) ? (
                            <div className="stat-controls">
                              <button className="ctrl-btn" onClick={() => updateGoleiroStatSession(goleiro.id, 'saves', -1)}><Minus size={10} /></button>
                              <span className="stat-value" style={{ fontSize: 14, color: '#ffffff' }}>{goleiro.saves}</span>
                              <button className="ctrl-btn" onClick={() => updateGoleiroStatSession(goleiro.id, 'saves', 1)}><Plus size={10} /></button>
                            </div>
                          ) : <span className="stat-value" style={{ fontSize: 14, color: '#ffffff', minWidth: 28, textAlign: 'center' }}>{goleiro.saves}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: RANKINGS */}
          {teams.length > 0 && (
            <div className="rankings-column">
              {/* Pontos dos Times */}
              <div className="ranking-card">
                <div className="ranking-header">
                  <Trophy size={18} color="var(--primary)" />
                  Pontos dos Times
                </div>
                <div className="ranking-list">
                  {teamStandings.filter(t => t.wins > 0 || t.draws > 0 || t.losses > 0).length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Nenhum jogo registrado.</p>
                  ) : (
                    teamStandings.map((t, idx) => (
                      <div key={t.id} className="ranking-item">
                        <div className="left-part" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span
                            className="rank-badge"
                            style={{
                              backgroundColor: getTeamColor(t.name),
                              color: getTextColor(getTeamColor(t.name))
                            }}
                          >
                            {idx + 1}
                          </span>
                          <span>{t.name}</span>
                        </div>
                        <span className="score-val">{t.points} pts</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Artilharia */}
              <div className="ranking-card">
                <div className="ranking-header">
                  <Flame size={18} color="var(--primary)" />
                  Artilharia (Gols)
                </div>
                <div className="ranking-list" style={{ padding: topScorers.length >= 3 ? '0 16px 16px 16px' : '16px' }}>
                  {topScorers.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: '16px 0' }}>Nenhum gol marcado.</p>
                  ) : (
                    <>
                      <SessionPodium players={topScorers} type="gols" />
                      {topScorers.slice(topScorers.length >= 3 ? 3 : 0).map((p, idx) => {
                        const actualIdx = topScorers.length >= 3 ? idx + 3 : idx;
                        return (
                          <div key={p.id} className="ranking-item">
                            <div className="left-part" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span
                                className="rank-badge"
                                style={{
                                  backgroundColor: getTeamColor(p.teamName),
                                  color: getTextColor(getTeamColor(p.teamName))
                                }}
                              >
                                {actualIdx + 1}
                              </span>
                              <span onClick={() => {
                                const pObj = registeredPlayers.find(rp => rp.name === p.name) || registeredGoleiros.find(rg => rg.name === p.name);
                                if (pObj) { setViewingPlayerId(pObj.id); setShowProfile(true); }
                              }} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} title="Ver perfil">
                                <PlayerAvatar users={users} registeredPlayers={registeredPlayers} registeredGoleiros={registeredGoleiros} setSelectedAvatar={setSelectedAvatar} playerName={p.name} size={28} />
                                <span style={{ transition: 'color 0.2s ease' }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--primary)'} onMouseOut={(e) => e.currentTarget.style.color = ''}>{p.name} <span className="team-name">({p.teamName})</span></span>
                              </span>
                            </div>
                            <span className="score-val" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>{p.goals} <span style={{ fontSize: '14px' }}>⚽</span></span>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>

              {/* Garçom */}
              <div className="ranking-card">
                <div className="ranking-header">
                  <Medal size={18} color="var(--primary)" />
                  Líder Assistências
                </div>
                <div className="ranking-list" style={{ padding: topAssists.length >= 3 ? '0 16px 16px 16px' : '16px' }}>
                  {topAssists.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: '16px 0' }}>Nenhuma assistência.</p>
                  ) : (
                    <>
                      <SessionPodium players={topAssists} type="assists" />
                      {topAssists.slice(topAssists.length >= 3 ? 3 : 0).map((p, idx) => {
                        const actualIdx = topAssists.length >= 3 ? idx + 3 : idx;
                        return (
                          <div key={p.id} className="ranking-item">
                            <div className="left-part" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span
                                className="rank-badge"
                                style={{
                                  backgroundColor: getTeamColor(p.teamName),
                                  color: getTextColor(getTeamColor(p.teamName))
                                }}
                              >
                                {actualIdx + 1}
                              </span>
                              <PlayerAvatar users={users} registeredPlayers={registeredPlayers} registeredGoleiros={registeredGoleiros} setSelectedAvatar={setSelectedAvatar} playerName={p.name} size={28} />
                              <span>{p.name} <span className="team-name">({p.teamName})</span></span>
                            </div>
                            <span className="score-val" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>{p.assists} <span style={{ fontSize: '14px' }}>🎯</span></span>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>

              {/* Notas da Pelada */}
              <div className="ranking-card" style={{ marginTop: '16px' }}>
                <div className="ranking-header" style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Star size={18} color="#eab308" />
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      Notas dos Jogadores (MVP)
                      <div onClick={() => setShowNotaInfo(!showNotaInfo)} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', opacity: 0.8, padding: '4px' }}>
                        <Info size={14} />
                      </div>
                    </span>
                  </div>
                  {showNotaInfo && (
                    <div className="animated" style={{ fontSize: 12, color: 'var(--text-muted)', backgroundColor: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px', lineHeight: '1.4', width: '100%' }}>
                      Nota de 0 a 10. Calculada pelo desempenho do jogador (Gols, Assistências e Resultado do Time) comparado ao resto da pelada.
                    </div>
                  )}
                </div>
                <div className="ranking-list" style={{ padding: '0' }}>
                  {(() => {
                    const ratedPlayers = calculateSessionPlayerRatings(activeSession, registeredPlayers);
                    if (ratedPlayers.length === 0) return <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: 16 }}>Nenhum jogador atuou.</p>;
                    return (
                      <>
                        <SessionPodium players={ratedPlayers} type="nota" />
                        {ratedPlayers.slice(ratedPlayers.length >= 3 ? 3 : 0).map((p, idx) => {
                          const actualIdx = ratedPlayers.length >= 3 ? idx + 3 : idx;
                          let color = 'var(--text-main)';
                          if (p.nota >= 9) color = '#22c55e'; // strong green
                          else if (p.nota >= 7) color = '#4ade80'; // soft green
                          else if (p.nota >= 5) color = '#eab308'; // yellow
                          else color = '#ef4444'; // red

                          return (
                            <div key={p.id} className="ranking-item" style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div
                                onClick={() => {
                                  const pObj = registeredPlayers.find(rp => rp.name === p.name) || registeredGoleiros.find(rg => rg.name === p.name);
                                  if (pObj) { setViewingPlayerId(pObj.id); setShowProfile(true); }
                                }}
                                style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                                title="Ver perfil"
                              >
                                <span style={{
                                  fontSize: '11px',
                                  fontWeight: '800',
                                  color: 'var(--text-muted)',
                                  width: '20px',
                                  textAlign: 'center',
                                  opacity: 0.6
                                }}>
                                  {actualIdx + 1}
                                </span>
                                <PlayerAvatar users={users} registeredPlayers={registeredPlayers} registeredGoleiros={registeredGoleiros} setSelectedAvatar={setSelectedAvatar} playerName={p.name} size={32} />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span style={{ fontSize: '14px', fontWeight: '600', transition: 'color 0.2s ease' }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--primary)'} onMouseOut={(e) => e.currentTarget.style.color = ''}>{p.name} {actualIdx === 0 && <span title="MVP da Pelada" style={{ fontSize: 12 }}>👑</span>}</span>
                                  {(p.goals > 0 || p.assists > 0) && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', opacity: 0.8 }}>
                                      {p.goals > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>⚽ <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{p.goals}</span></span>}
                                      {p.assists > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>🎯 <span style={{ color: '#fff', fontWeight: 'bold' }}>{p.assists}</span></span>}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <span className="score-val" style={{ color: color, fontWeight: 'bold' }}>{p.nota.toFixed(1)}</span>
                            </div>
                          );
                        })}
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Puskas Selector */}
              <div className="ranking-card" style={{ marginTop: '16px' }}>
                <div className="ranking-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: 18 }}>👟</span>
                  Prêmio Puskas (Opcional)
                </div>
                <div className="ranking-list" style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Selecione quem fez o gol mais bonito desta pelada.</p>
                  <select
                    className="input-field"
                    value={activeSession.puskas || ""}
                    onChange={e => updatePuskas(e.target.value)}
                    disabled={!canEditSession(activeSession)}
                    style={{ width: '100%', marginBottom: 0 }}
                  >
                    <option value="">Nenhum / Selecionar...</option>
                    {[...allPlayers].sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                      <option key={p.id} value={p.name}>{p.name} ({p.teamName})</option>
                    ))}
                  </select>
                </div>
              </div>

            </div>
          )}

        </div>
      </main>

      {renderBottomNav()}
      {renderAvatarModal()}
    </div>
  );
};

export default App;
