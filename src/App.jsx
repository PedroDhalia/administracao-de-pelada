import { useState, useEffect } from 'react';
import {
  Trophy, Users, Target, Plus, Minus, Trash2, User, Star, Info,
  Flag, Goal, Calendar, ChevronLeft, ChevronDown, ChevronUp, UserPlus, Flame, Medal, Circle, Pencil,
  LogOut, Shield, ShieldAlert, Key, Database, Camera, Hand, X
} from 'lucide-react';
import './index.css';
import './compare.css';

// Firebase Imports
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set } from 'firebase/database';

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyBO79UYiZzSDFHjgWY_enw8oa0_w-1ik28",
  authDomain: "pelada-selva.firebaseapp.com",
  databaseURL: "https://pelada-selva-default-rtdb.firebaseio.com",
  projectId: "pelada-selva",
  storageBucket: "pelada-selva.firebasestorage.app",
  messagingSenderId: "223113381758",
  appId: "1:223113381758:web:c4dae5c4f355ede257552f",
  measurementId: "G-9HL7V50FNJ"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

const CURRENT_FORMULA_VERSION = 3; // Increment this when formula changes

function App() {
  const [sessions, setSessions] = useState([]);
  const [registeredPlayers, setRegisteredPlayers] = useState([]);
  const [registeredGoleiros, setRegisteredGoleiros] = useState([]);
  const [users, setUsers] = useState([]);
  const [loggedInUserId, setLoggedInUserId] = useState(localStorage.getItem('selva_user_id') || null);
  const [authMode, setAuthMode] = useState('login');
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showMatchesModal, setShowMatchesModal] = useState(false);
  const [showSupremeAdmin, setShowSupremeAdmin] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [isLoaded, setIsLoaded] = useState(false);
  const [dataSynced, setDataSynced] = useState(false);

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

  useEffect(() => {
    let timeout;
    try {
      const dbRef = ref(db, 'sessions');
      const unsubscribeSessions = onValue(dbRef, (snapshot) => {
        console.log("Sessions data received");
        const data = snapshot.val();
        if (data) {
          const dataArray = Array.isArray(data) ? data : Object.values(data);
          setSessions(dataArray);
        } else {
          const saved = localStorage.getItem('selva_data_v2');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && parsed.length > 0) {
              set(dbRef, parsed);
              setSessions(parsed);
            } else {
              setSessions([]);
            }
          } else {
            setSessions([]);
          }
        }
        setIsLoaded(true);
      }, (error) => {
        console.error("Firebase Sessions Error:", error);
        setIsLoaded(true);
      });

      const playersRef = ref(db, 'players');
      const unsubscribePlayers = onValue(playersRef, (snapshot) => {
        const val = snapshot.val();
        setRegisteredPlayers(Array.isArray(val) ? val : (val ? Object.values(val) : []));
      }, (error) => console.error("Firebase Players Error:", error));

      const usersRef = ref(db, 'users');
      const unsubscribeUsers = onValue(usersRef, (snapshot) => {
        const val = snapshot.val();
        setUsers(Array.isArray(val) ? val : (val ? Object.values(val) : []));
      }, (error) => console.error("Firebase Users Error:", error));

      const goleirosRef = ref(db, 'goleiros');
      const unsubscribeGoleiros = onValue(goleirosRef, (snapshot) => {
        const val = snapshot.val();
        setRegisteredGoleiros(Array.isArray(val) ? val : (val ? Object.values(val) : []));
      }, (error) => console.error("Firebase Goleiros Error:", error));

      // Fallback timeout to ensure app loads even if Firebase hangs
      timeout = setTimeout(() => {
        setIsLoaded(true);
        console.warn("Firebase connection timeout - loading app anyway");
      }, 4000);

      return () => {
        if (timeout) clearTimeout(timeout);
        unsubscribeSessions();
        unsubscribePlayers();
        unsubscribeUsers();
        unsubscribeGoleiros();
      };
    } catch (err) {
      console.error("Critical initialization error:", err);
      setIsLoaded(true);
    }
  }, []);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  const updateSessionsAndStats = (newSessionsList, currentPlayers = registeredPlayers, currentGoleiros = registeredGoleiros) => {
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

      let championTeamId = null;
      if (teamsWithPoints.length > 0 && teamsWithPoints[0].points > 0) {
        championTeamId = teamsWithPoints[0].id;
      }

      teams.forEach(team => {
        const isWinner = team.id === championTeamId;
        const players = team.players || [];
        players.forEach(p => {
          const normName = p.name.trim().toLowerCase();
          if (!statsByName[normName]) {
            statsByName[normName] = { goals: 0, assists: 0, wins: 0, matchesForNota: 0, artilheiroCount: 0, garcomCount: 0, mvpCount: 0 };
          }
          statsByName[normName].goals += (p.goals || 0);
          statsByName[normName].assists += (p.assists || 0);
          if (isWinner) {
            statsByName[normName].wins += 1;
          }
        });
      });

      const allPlayersInSession = teams.flatMap(t => t.players || []);
      const sessionMaxGoals = Math.max(0, ...allPlayersInSession.map(p => p.goals || 0));
      const sessionMaxAssists = Math.max(0, ...allPlayersInSession.map(p => p.assists || 0));

      const ratings = calculateSessionPlayerRatings(session);
      const maxNota = ratings.length > 0 ? ratings[0].nota : 0;
      const isInitialState = ratings.every(r => r.nota === 7.0);

      ratings.forEach(r => {
        const normName = r.name.trim().toLowerCase();
        if (!statsByName[normName]) {
          statsByName[normName] = { goals: 0, assists: 0, wins: 0, matchesForNota: 0, artilheiroCount: 0, garcomCount: 0, mvpCount: 0 };
        }
        statsByName[normName].matchesForNota += 1;

        if (sessionMaxGoals > 0 && (r.goals || 0) === sessionMaxGoals) {
          statsByName[normName].artilheiroCount += 1;
        }
        if (sessionMaxAssists > 0 && (r.assists || 0) === sessionMaxAssists) {
          statsByName[normName].garcomCount += 1;
        }
        if (!isInitialState && r.nota === maxNota && maxNota > 0) {
          statsByName[normName].mvpCount += 1;
        }
      });

      const goleiros = session.goleiros || [];
      goleiros.forEach(g => {
        const normName = g.name.trim().toLowerCase();
        if (!statsGoleiroByName[normName]) {
          statsGoleiroByName[normName] = { wins: 0, saves: 0 };
        }
        statsGoleiroByName[normName].wins += (g.wins || 0);
        statsGoleiroByName[normName].saves += (g.saves || 0);
      });
    });

    // Calculate raw scores for all players to enable global normalization
    const playerStatsWithRaw = currentPlayers.map(p => {
      const pName = p.name || '';
      const normName = pName.trim().toLowerCase();
      const s = statsByName[normName] || { goals: 0, assists: 0, wins: 0, matchesForNota: 0, artilheiroCount: 0, garcomCount: 0, mvpCount: 0 };
      // New Formula: Goals*5 + Assists*4 + Wins*1.5 + Artilheiro*1 + Garcom*1 + MVP*2
      const rawScore = (s.goals * 5) + (s.assists * 4) + (s.wins * 1.5) + (s.artilheiroCount * 1) + (s.garcomCount * 1) + (s.mvpCount * 2);
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

      const currentVersion = p.formula_version || 0;

      if (
        (p.total_gols || 0) !== s.goals ||
        (p.total_assistencias || 0) !== s.assists ||
        (p.total_vitorias || 0) !== s.wins ||
        (p.media_nota || 0) !== mediaCalculada ||
        currentVersion < CURRENT_FORMULA_VERSION
      ) {
        changed = true;
        return {
          ...p,
          total_gols: s.goals,
          total_assistencias: s.assists,
          total_vitorias: s.wins,
          media_nota: mediaCalculada,
          formula_version: CURRENT_FORMULA_VERSION
        };
      }
      return p;
    });

    if (changed) {
      set(ref(db, 'players'), newPlayersList);
    }

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

    if (changedGoleiros) {
      set(ref(db, 'goleiros'), newGoleirosList);
    }
  };

  useEffect(() => {
    if (isLoaded && sessions.length > 0 && registeredPlayers.length > 0 && !dataSynced) {
      const needsSync = registeredPlayers.some(p =>
        p.total_gols === undefined ||
        p.media_nota === undefined ||
        (p.formula_version || 0) < CURRENT_FORMULA_VERSION
      );
      if (needsSync) {
        updateSessionsAndStats(sessions);
      }
      setDataSynced(true);
    }
  }, [isLoaded, sessions, registeredPlayers, dataSynced]);

  const toggleTeam = (teamId) => {
    setExpandedTeams(prev => ({ ...prev, [teamId]: !prev[teamId] }));
  };

  const toggleTeamViewMode = (teamId, mode) => {
    setTeamViewModes(prev => ({ ...prev, [teamId]: mode }));
  };


  const currentUser = users?.find(u => u.id === loggedInUserId) || null;
  const isGlobalAdmin = currentUser?.is_admin === true;
  const canEditSession = (session) => isGlobalAdmin || session?.admins?.includes(currentUser?.id) || false;

  const handleLogin = (e) => {
    e.preventDefault();
    const email = e.target.email.value.trim();
    const password = e.target.password.value.trim();
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
      localStorage.setItem('selva_user_id', user.id);
      setLoggedInUserId(user.id);
    } else {
      alert("Credenciais inválidas");
    }
  };

  const handleRegisterUser = (e) => {
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
    localStorage.setItem('selva_user_id', newUser.id);
    setLoggedInUserId(newUser.id);
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
      const compressedImage = await compressImage(file);
      const newUsers = users.map(u => u.id === currentUser.id ? { ...u, avatar: compressedImage } : u);
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

  const compressImage = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const MAX_SIZE = 300;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
      };
    });
  };

  const PlayerAvatar = ({ playerName, userId, size = 32 }) => {
    let avatarUrl = null;
    let initial = '?';

    // 1. Direct userId lookup (header, profile, admin panel)
    if (userId) {
      const u = users.find(us => us.id === userId);
      if (u) {
        initial = u.name.charAt(0).toUpperCase();
        if (u.avatar) avatarUrl = u.avatar;
      }
    }

    // 2. Player-name lookup (team lists, rankings)
    if (!avatarUrl && playerName) {
      initial = playerName.charAt(0).toUpperCase();
      const rp = registeredPlayers.find(r => r.name.toLowerCase() === playerName.toLowerCase());
      if (rp && rp.userId) {
        const u = users.find(us => us.id === rp.userId);
        if (u && u.avatar) avatarUrl = u.avatar;
      }
    }

    if (avatarUrl) {
      return <img
        src={avatarUrl}
        alt={playerName || ''}
        onClick={(e) => { e.stopPropagation(); setSelectedAvatar(avatarUrl); }}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(255,255,255,0.1)', cursor: 'pointer', boxSizing: 'border-box' }}
        loading="lazy"
      />;
    }
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: size * 0.45, flexShrink: 0, border: '2px solid rgba(255,255,255,0.1)', boxSizing: 'border-box' }}>
        {initial}
      </div>
    );
  };

  const handleLogout = () => {
    localStorage.removeItem('selva_user_id');
    setLoggedInUserId(null);
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
      admins: [currentUser.id]
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

  const updateTeamStat = (teamId, stat, delta) => {
    const newSessionsList = sessions.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          teams: s.teams.map(t => {
            if (t.id === teamId) {
              return { ...t, [stat]: Math.max(0, t[stat] + delta) };
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

  const getTextColor = (bgColor) => {
    const lightColors = ['#ffffff', '#eab308', '#fcd34d', 'var(--primary)', '#22c55e', '#4ade80'];
    if (lightColors.includes(bgColor)) return '#0a140b';
    return '#ffffff';
  };

  const getNotaColor = (nota) => {
    if (nota >= 7.0) return '#22c55e'; // Verde
    if (nota >= 5.5) return '#eab308'; // Amarelo
    return '#ef4444'; // Vermelho
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

  const calculateSessionPlayerRatings = (session) => {
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
    session.teams.forEach(t => {
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
          cleanSheetsBonus: isZagueiro ? teamCleanSheets : 0
        });
      });
    });

    if (allPlayers.length === 0) return [];

    allPlayers.forEach(p => {
      // Session Rating Formula: Goals*5 + Assists*4 + Wins*1.5 + Losses*-1 + CleanSheetsBonus*2
      p.rawScore = ((p.goals || 0) * 5) + ((p.assists || 0) * 4) + (p.teamWins * 1.5) + (p.teamLosses * -1) + (p.cleanSheetsBonus * 2);
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

  const getMonthlyHighlights = () => {
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

    const monthNames = {
      "01": "Janeiro", "02": "Fevereiro", "03": "Março", "04": "Abril",
      "05": "Maio", "06": "Junho", "07": "Julho", "08": "Agosto",
      "09": "Setembro", "10": "Outubro", "11": "Novembro", "12": "Dezembro"
    };

    sortedMonths.forEach(monthKey => {
      const monthSessions = grouped[monthKey];
      const playerStats = {};

      monthSessions.forEach(session => {
        const teams = session.teams || [];
        if (teams.length === 0) return;

        const teamsWithPoints = teams.map(t => ({
          ...t,
          points: (t.wins || 0) * 3 + (t.draws || 0) * 1
        })).sort((a, b) => b.points - a.points || (b.wins || 0) - (a.wins || 0));

        let championTeamId = null;
        if (teamsWithPoints.length > 0 && teamsWithPoints[0].points > 0) {
          championTeamId = teamsWithPoints[0].id;
        }

        teams.forEach(team => {
          const isChamp = team.id === championTeamId;
          const players = team.players || [];
          players.forEach(p => {
            const pName = p.name || '';
            const normName = pName.trim().toLowerCase();
            if (!playerStats[normName]) {
              playerStats[normName] = { name: p.name.trim(), goals: 0, assists: 0, champWins: 0, notaSum: 0, matchesForNota: 0, artilheiroCount: 0, garcomCount: 0, mvpCount: 0 };
            }
            playerStats[normName].goals += (p.goals || 0);
            playerStats[normName].assists += (p.assists || 0);
            if (isChamp) {
              playerStats[normName].champWins += 1;
            }
          });
        });

        const allPlayersInSession = teams.flatMap(t => t.players || []);
        const sessionMaxGoals = Math.max(0, ...allPlayersInSession.map(p => p.goals || 0));
        const sessionMaxAssists = Math.max(0, ...allPlayersInSession.map(p => p.assists || 0));

        const ratings = calculateSessionPlayerRatings(session);
        const maxNota = ratings.length > 0 ? ratings[0].nota : 0;
        const isInitialState = ratings.every(r => r.nota === 7.0);

        ratings.forEach(r => {
          const normName = r.name.trim().toLowerCase();
          if (playerStats[normName]) {
            playerStats[normName].notaSum += r.nota;
            playerStats[normName].matchesForNota += 1;

            if (sessionMaxGoals > 0 && (r.goals || 0) === sessionMaxGoals) playerStats[normName].artilheiroCount = (playerStats[normName].artilheiroCount || 0) + 1;
            if (sessionMaxAssists > 0 && (r.assists || 0) === sessionMaxAssists) playerStats[normName].garcomCount = (playerStats[normName].garcomCount || 0) + 1;
            if (!isInitialState && r.nota === maxNota && maxNota > 0) playerStats[normName].mvpCount = (playerStats[normName].mvpCount || 0) + 1;
          }
        });
      });

      const playersWithRaw = Object.values(playerStats)
        .filter(p => {
          const pName = p.name || '';
          const rp = registeredPlayers.find(rp => (rp.name || '').trim().toLowerCase() === pName.trim().toLowerCase());
          return rp ? !rp.isGuest : true;
        })
        .map(p => ({
          ...p,
          // New Formula: Goals*5 + Assists*4 + Wins*1.5 + Artilheiro*1 + Garcom*1 + MVP*2
          rawScore: (p.goals * 5) + (p.assists * 4) + (p.champWins * 1.5) + ((p.artilheiroCount || 0) * 1) + ((p.garcomCount || 0) * 1) + ((p.mvpCount || 0) * 2)
        }));

      const allRaw = playersWithRaw.map(x => x.rawScore);
      const minRaw = allRaw.length > 0 ? Math.min(...allRaw) : 0;
      const maxRaw = allRaw.length > 0 ? Math.max(...allRaw) : 0;

      const playersArray = playersWithRaw.map(p => {
        let mvpScore = 0;
        if (p.matchesForNota > 0) {
          if (maxRaw !== minRaw) {
            const normalized = (p.rawScore - minRaw) / (maxRaw - minRaw);
            mvpScore = parseFloat((4 + (normalized * 6)).toFixed(2));
          } else {
            mvpScore = 7.0;
          }
        }
        return { ...p, mvpScore };
      });

      if (playersArray.length > 0) {
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
        const mvp = getTop(playersArray, 'mvpScore');
        const topChamp = getTop(playersArray, 'champWins');

        // Logic for "Time do Mês"
        const getBestByPosition = (pos, count) => {
          return playersArray
            .filter(p => {
              const pName = p.name || '';
              const rp = registeredPlayers.find(reg => (reg.name || '').trim().toLowerCase() === pName.trim().toLowerCase());
              return rp?.posicao === pos;
            })
            .sort((a, b) => b.mvpScore - a.mvpScore || (b.goals + b.assists) - (a.goals + a.assists))
            .slice(0, count);
        };

        const teamOfMonth = {
          zagueiros: getBestByPosition('Zagueiro', 2),
          meia: getBestByPosition('Meia', 1),
          atacantes: getBestByPosition('Atacante', 2)
        };

        const [mNum, yNum] = monthKey.split('/');
        const labelText = `${monthNames[mNum]} ${yNum}`;

        if (topScorer.goals > 0 || topAssister.assists > 0 || topChamp.champWins > 0) {
          results.push({
            monthKey,
            label: labelText,
            topScorer,
            topAssister,
            mvp,
            topChamp,
            teamOfMonth
          });
        }
      }
    });

    return results;
  };

  const getPlayersStatsForMonth = (monthKey) => {
    const grouped = {};
    sessions.forEach(s => {
      if (!s.date || typeof s.date !== 'string') return;
      const parts = s.date.split('/');
      if (parts.length === 3) {
        const mY = `${(parts[1] || '').padStart(2, '0')}/${parts[2]}`;
        if (!grouped[mY]) grouped[mY] = [];
        grouped[mY].push(s);
      }
    });

    const monthSessions = grouped[monthKey] || [];
    const playerStats = {};

    monthSessions.forEach(session => {
      const teams = session.teams || [];
      if (teams.length === 0) return;

      const teamsWithPoints = teams.map(t => ({
        ...t,
        points: (t.wins || 0) * 3 + (t.draws || 0) * 1
      })).sort((a, b) => b.points - a.points || (b.wins || 0) - (a.wins || 0));

      let championTeamId = null;
      if (teamsWithPoints.length > 0 && teamsWithPoints[0].points > 0) {
        championTeamId = teamsWithPoints[0].id;
      }

      teams.forEach(team => {
        const isChamp = team.id === championTeamId;
        const players = team.players || [];
        players.forEach(p => {
          const pName = p.name || '';
          const normName = pName.trim().toLowerCase();
          if (!playerStats[normName]) {
            playerStats[normName] = {
              name: p.name.trim(),
              total_gols: 0,
              total_assistencias: 0,
              total_vitorias: 0,
              notaSum: 0,
              matchesForNota: 0,
              artilheiroCount: 0,
              garcomCount: 0,
              mvpCount: 0
            };
          }
          playerStats[normName].total_gols += (p.goals || 0);
          playerStats[normName].total_assistencias += (p.assists || 0);
          if (isChamp) {
            playerStats[normName].total_vitorias += 1;
          }
        });
      });

      const allPlayersInSession = teams.flatMap(t => t.players || []);
      const sessionMaxGoals = Math.max(0, ...allPlayersInSession.map(p => p.goals || 0));
      const sessionMaxAssists = Math.max(0, ...allPlayersInSession.map(p => p.assists || 0));

      const ratings = calculateSessionPlayerRatings(session);
      const maxNota = ratings.length > 0 ? ratings[0].nota : 0;
      const isInitialState = ratings.every(r => r.nota === 7.0);

      ratings.forEach(r => {
        const normName = r.name.trim().toLowerCase();
        if (playerStats[normName]) {
          playerStats[normName].notaSum += r.nota;
          playerStats[normName].matchesForNota += 1;

          if (sessionMaxGoals > 0 && (r.goals || 0) === sessionMaxGoals) playerStats[normName].artilheiroCount += 1;
          if (sessionMaxAssists > 0 && (r.assists || 0) === sessionMaxAssists) playerStats[normName].garcomCount += 1;
          if (!isInitialState && r.nota === maxNota && maxNota > 0) playerStats[normName].mvpCount += 1;
        }
      });
    });

    const playersWithRaw = Object.values(playerStats).map(p => ({
      ...p,
      // New Formula: Goals*5 + Assists*4 + Wins*1.5 + Artilheiro*1 + Garcom*1 + MVP*2
      rawScore: ((p.total_gols || 0) * 5) + ((p.total_assistencias || 0) * 4) + ((p.total_vitorias || 0) * 1.5) + ((p.artilheiroCount || 0) * 1) + ((p.garcomCount || 0) * 1) + ((p.mvpCount || 0) * 2)
    }));

    const allRaw = playersWithRaw.map(x => x.rawScore);
    const minRaw = allRaw.length > 0 ? Math.min(...allRaw) : 0;
    const maxRaw = allRaw.length > 0 ? Math.max(...allRaw) : 0;

    return playersWithRaw.map(p => {
      const rp = registeredPlayers.find(rp => rp.name.trim().toLowerCase() === p.name.trim().toLowerCase());
      let mediaCalculada = 0;
      if (p.matchesForNota > 0) {
        if (maxRaw !== minRaw) {
          const normalized = (p.rawScore - minRaw) / (maxRaw - minRaw);
          mediaCalculada = parseFloat((4 + (normalized * 6)).toFixed(2));
        } else {
          mediaCalculada = 7.0;
        }
      }
      return {
        ...p,
        id: rp ? rp.id : generateId(),
        media_nota: mediaCalculada,
        isGuest: rp?.isGuest || false
      };
    });
  };

  const getPlayerStats = (playerName) => {
    let peladasJogadas = 0;
    let totalGoals = 0;
    let totalAssists = 0;
    let peladasGanhas = 0;
    let artilheiroCount = 0;
    let garcomCount = 0;
    let mvpCount = 0;
    let puskasWins = 0;
    let matchHistory = [];

    const pNameForStats = playerName || '';
    const normName = pNameForStats.trim().toLowerCase();

    sessions.forEach(session => {
      if (session.puskas && typeof session.puskas === 'string' && session.puskas.trim().toLowerCase() === normName) {
        puskasWins++;
      }

      const teams = session.teams || [];
      if (teams.length === 0) return;

      const teamsWithPoints = teams.map(t => ({
        ...t,
        points: (t.wins || 0) * 3 + (t.draws || 0) * 1
      })).sort((a, b) => b.points - a.points || (b.wins || 0) - (a.wins || 0));

      let championTeamId = null;
      if (teamsWithPoints.length > 0 && teamsWithPoints[0].points > 0) {
        championTeamId = teamsWithPoints[0].id;
      }

      let playedInSession = false;
      let wonThisSession = false;

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

          if (team.id === championTeamId) {
            wonThisSession = true;
          }
        }
      });

      if (playedInSession) {
        peladasJogadas++;
        if (wonThisSession) peladasGanhas++;

        const ratings = calculateSessionPlayerRatings(session);
        const playerRating = ratings.find(r => (r.name || '').trim().toLowerCase() === normName);

        if (ratings && ratings.length > 0) {
          const maxNota = ratings[0].nota;
          const isInitialState = ratings.every(r => r.nota === 7.0);
          if (playerRating && playerRating.nota === maxNota && !isInitialState) {
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
            assists: playerRating.assists || 0
          });
        }
      }
    });

    const goalAvg = peladasJogadas > 0 ? (totalGoals / peladasJogadas).toFixed(2) : '0.00';
    const assistAvg = peladasJogadas > 0 ? (totalAssists / peladasJogadas).toFixed(2) : '0.00';
    const winRate = peladasJogadas > 0 ? Math.round((peladasGanhas / peladasJogadas) * 100) : 0;

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
      matchHistory
    };
  };

  const renderPlayerBadges = (playerName, isPodium = false) => {
    if (!playerName) return null;
    const stats = getPlayerStats(playerName);
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
              <span>❌</span><strong style={{ color: '#ef4444' }}>1x</strong>
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
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(239, 68, 68, 0.2)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.3)' }} title="Gol Contra (09/04/2026)">
              <span style={{ fontSize: 14 }}>❌</span>
              <span style={{ fontSize: 12, color: '#ef4444' }}>Gol Contra</span>
              <span style={{ fontWeight: 'bold', color: '#ef4444', fontSize: 12 }}>1x</span>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderFormation = (players, type, sourceRatings, isHighlights = false) => {
    const count = players.length;
    if (count === 0) return <div style={{ height: 60 }}></div>;

    // Detect session-wide max nota for MVP badge
    const allRatings = sourceRatings.length > 0 ? sourceRatings : (players.map(p => ({ name: p.name, nota: p.mvpScore || 0 })));
    const maxNota = Math.max(...allRatings.map(r => r.nota || 0));

    // Only show MVP if there's differentiation (not everyone 7.0)
    const isInitialState = allRatings.every(r => r.nota === 7.0);
    const showMVP = !isInitialState && maxNota > 0;

    return (
      <div className="field-row" style={{ position: 'relative', gap: '15px' }}>
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
            if (count === 3) {
              if (idx === 1) style.transform = 'translateY(-15px)';
              else style.transform = 'translateY(10px)';
            } else if (count === 4) {
              // Recess attackers a bit more down for better spacing
              if (idx === 1 || idx === 2) style.transform = 'translateY(-10px)';
              else {
                style.transform = 'translateY(25px)';
                style.margin = '0 10px';
              }
            }
          } else if (type === 'Meia') {
            if (count === 3) {
              if (idx === 1) style.transform = 'translateY(20px)';
              else style.transform = 'translateY(-10px)';
            }
          } else if (type === 'Zagueiro') {
            if (count === 3) {
              if (idx === 1) style.transform = 'translateY(15px)';
              else style.transform = 'translateY(-10px)';
            } else if (count === 4) {
              if (idx === 1 || idx === 2) style.transform = 'translateY(15px)';
              else style.transform = 'translateY(-15px)';
            }
          }

          const hasGoals = p.goals > 0;
          const hasAssists = p.assists > 0;

          return (
            <div key={p.id || p.name} className="field-player" style={style}>
              <div style={{ position: 'relative', width: 45, height: 45, margin: '0 auto' }}>
                <PlayerAvatar playerName={p.name} size={45} />

                {/* MVP Star - Standardized Position */}
                {!isHighlights && showMVP && isMVP && (
                  <div style={{
                    position: 'absolute', top: -2, left: -8,
                    width: 16, height: 16, borderRadius: '50%',
                    backgroundColor: '#3b82f6', border: '1.5px solid #fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 12, boxShadow: '0 2px 4px rgba(0,0,0,0.4)'
                  }}>
                    <Star size={10} color="#fff" fill="#fff" />
                  </div>
                )}

                {/* Goals Badge - Standardized Position (Align left to grow right) */}
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

                {/* Assists Badge - Slot 1 if no goals, else Slot 2 (Bottom) */}
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
                boxShadow: (!isHighlights && showMVP && isMVP) ? '0 0 10px rgba(59, 130, 246, 0.6)' : 'none',
                zIndex: 10,
                fontSize: '10px',
                padding: '2px 6px'
              }}>{nota.toFixed(1)}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const allHighlights = !activeSessionId ? getMonthlyHighlights() : [];

  if (!isLoaded) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Conectando ao Banco de Dados...</p>
      </div>
    );
  }


  if (!loggedInUserId) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="card animated" style={{ padding: 32, width: '100%', maxWidth: 400 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <img src="/logo.png" alt="Logo" style={{ width: 80, height: 80, marginBottom: 16 }} />
            <h2 style={{ color: 'var(--primary)', margin: 0 }}>{authMode === 'login' ? 'Entrar' : 'Cadastro'}</h2>
          </div>
          {authMode === 'login' ? (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <input name="email" type="email" placeholder="Email" required className="input-field" style={{ marginBottom: 0 }} />
              <input name="password" type="password" placeholder="Senha" required className="input-field" style={{ marginBottom: 0 }} />
              <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Entrar</button>
              <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-muted)' }}>
                Não tem conta? <span style={{ color: 'var(--primary)', cursor: 'pointer' }} onClick={() => setAuthMode('register')}>Cadastre-se</span>
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegisterUser} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <input name="name" type="text" placeholder="Seu Nome (como quer ser chamado)" required className="input-field" style={{ marginBottom: 0 }} />
              <input name="email" type="email" placeholder="Email" required className="input-field" style={{ marginBottom: 0 }} />
              <input name="password" type="password" placeholder="Senha" required className="input-field" style={{ marginBottom: 0 }} />
              <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Criar Conta</button>
              <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-muted)' }}>
                Já tem conta? <span style={{ color: 'var(--primary)', cursor: 'pointer' }} onClick={() => setAuthMode('login')}>Entrar</span>
              </p>
            </form>
          )}
        </div>
      </div>
    );
  }

  if (currentUser && !currentUser.jogadorId) {
    return (
      <div className="app-container" style={{ padding: 24, maxWidth: 600, margin: '0 auto', justifyContent: 'center' }}>
        <h2 style={{ textAlign: 'center', color: 'var(--primary)', marginBottom: 24 }}>Bem-vindo, {currentUser.name}!</h2>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24, gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <PlayerAvatar playerName={currentUser.name} userId={currentUser.id} size={90} />
            {isUploading && <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="spinner">⏳</span></div>}
          </div>
          <label className="btn-primary" style={{ cursor: 'pointer', padding: '6px 12px', fontSize: 13, backgroundColor: 'rgba(255,255,255,0.1)' }}>
            <Camera size={14} style={{ marginRight: 6 }} /> Adicionar foto (opcional)
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
          </label>
        </div>
        <p style={{ textAlign: 'center', marginBottom: 24, color: 'var(--text-muted)' }}>Precisamos vincular sua conta a um jogador na nossa base para contabilizar suas estatísticas.</p>

        <div className="card animated" style={{ padding: 24, marginBottom: 24 }}>
          <h3 style={{ marginBottom: 8 }}>Nunca joguei com essa rapaziada</h3>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>Primeira vez nas peladas? Crie seu jogador agora para entrar nos times.</p>
          <button className="btn-primary" onClick={handleOnboardingCreate} style={{ width: '100%', justifyContent: 'center' }}>
            <Plus size={18} /> Criar meu jogador
          </button>
        </div>

        <div className="card animated" style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 8 }}>Já joguei (Selecionar da lista)</h3>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>Seu nome já deve estar listado se você já participou antes. Selecione abaixo:</p>
          <div className="player-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
            {registeredPlayers.filter(p => !p.userId).length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: 14, gridColumn: '1 / -1', textAlign: 'center', padding: '20px 0' }}>Nenhum jogador sem dono encontrado.</p>
            )}
            {registeredPlayers.filter(p => !p.userId).sort((a, b) => a.name.localeCompare(b.name)).map(p => (
              <button key={p.id} className="btn-primary" onClick={() => handleOnboardingSelect(p.id)} style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text-main)', justifyContent: 'center', paddingTop: 12, paddingBottom: 12 }}>
                {p.name}
              </button>
            ))}
          </div>
        </div>
      </div>
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

  if (showProfile) {
    const profilePlayer = registeredPlayers.find(p => p.id === currentUser?.jogadorId);
    const profileStats = profilePlayer ? getPlayerStats(profilePlayer.name) : null;

    let comparisonUI = null;
    const p1Id = comparePlayer1Id !== null ? comparePlayer1Id : profilePlayer?.id;
    const p2Id = comparePlayer2Id;

    if (p1Id && p2Id) {
      const player1 = registeredPlayers.find(p => p.id === p1Id);
      const player2 = registeredPlayers.find(p => p.id === p2Id);
      if (player1 && player2) {
        const stats1 = getPlayerStats(player1.name);
        const stats2 = getPlayerStats(player2.name);
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
                <span>❌</span><strong style={{ color: '#ef4444' }}>1x</strong>
              </div>
            )}
          </div>
        );
        comparisonUI = (
          <div className="compare-section animated">
            <div className="compare-header-grid">
              <div className="compare-player-info">
                <PlayerAvatar playerName={player1.name} size={48} />
                <span style={{ fontSize: 13, fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{player1.name}</span>
                {renderMiniBadges(stats1, player1.name)}
              </div>
              <div className="vs-badge">VS</div>
              <div className="compare-player-info">
                <PlayerAvatar playerName={player2.name} size={48} />
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
              {renderRow('Nota', (player1.media_nota || 0).toFixed(2), (player2.media_nota || 0).toFixed(2))}
              {renderRow('Win Rate', stats1.winRate, stats2.winRate, '%')}
            </div>
          </div>
        );
      }
    }

    return (
      <div className="app-container" style={{ padding: 24, maxWidth: 600, margin: '0 auto', justifyContent: 'center' }}>
        <header className="header" style={{ marginBottom: 24 }}>
          <button className="back-btn" onClick={() => setShowProfile(false)}>
            <ChevronLeft size={28} />
          </button>
          <h1>Meu Perfil</h1>
        </header>

        <div className="card animated" style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
          <div style={{ position: 'relative' }}>
            <PlayerAvatar playerName={currentUser?.name} userId={currentUser?.id} size={120} />
            {isUploading && (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="spinner">⏳</span>
              </div>
            )}
          </div>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ margin: 0 }}>{currentUser?.name}</h2>
            <p style={{ color: 'var(--text-muted)', margin: 0, marginTop: 4 }}>{currentUser?.email}</p>
            {profilePlayer && (
              <div style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: 'rgba(255,255,255,0.05)', padding: '8px 16px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Jogador:</span>
                <strong style={{ color: 'var(--text-main)', fontSize: 16 }}>{profilePlayer.name}</strong>
                <button onClick={handleEditLinkedPlayerName} className="icon-btn" style={{ color: 'var(--primary)', padding: 4, marginLeft: 4 }}><Pencil size={16} /></button>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <label className="btn-primary" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Camera size={16} /> Alterar Foto
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
            </label>
            {currentUser?.avatar && <button className="btn-primary" style={{ backgroundColor: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)' }} onClick={removeAvatar}>Remover Foto</button>}
          </div>
        </div>

        {profileStats && (
          <>
            <div className="card animated" style={{ padding: 24, marginTop: 16 }}>
              <h3 style={{ fontSize: 16, color: 'var(--primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Trophy size={18} /> Minhas Estatísticas</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: 16 }}>
                {[
                  { icon: '🏟️', label: 'Peladas', value: profileStats.peladasJogadas },
                  { icon: '🥇', label: 'Vitorias', value: profileStats.peladasGanhas },
                  { icon: '⚽', label: 'Gols', value: profileStats.totalGoals },
                  { icon: '🎯', label: 'Assistências', value: profileStats.totalAssists },
                  { icon: '📊', label: 'Média Gols', value: profileStats.goalAvg },
                  { icon: '📈', label: 'Média Assist.', value: profileStats.assistAvg },
                  { icon: '⭐', label: 'Nota Geral', value: profilePlayer?.media_nota?.toFixed(2) || '0.00' },
                ].map((s, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 8px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ fontSize: 20 }}>{s.icon}</span>
                    <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-main)' }}>{s.value}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.label}</span>
                  </div>
                ))}
              </div>
              {renderPlayerBadges(profilePlayer.name, false)}
            </div>

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
              </div>
              {comparisonUI}
            </div>
          </>
        )}
        {renderAvatarModal()}
      </div>
    );
  }
  if (!activeSessionId) {
    if (showAllSessionsScreen) {
      return (
        <div className="app-container">
          <header className="header" style={{ gap: '16px' }}>
            <button className="back-btn" onClick={() => setShowAllSessionsScreen(false)}>
              <ChevronLeft size={28} />
            </button>
            <h1>Todas as Peladas</h1>
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
      const monthlyPlayers = currentMonthKey ? getPlayersStatsForMonth(currentMonthKey) : [];

      return (
        <div className="app-container">
          <header className="header" style={{ gap: '16px' }}>
            <button className="back-btn" onClick={() => { setShowMonthlyStatsScreen(false); setSelectedMonthKey(null); }}>
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
                              <PlayerAvatar playerName={p.name} size={36} />
                              {p.name}
                              {p.isGuest && <span style={{ fontSize: 10, backgroundColor: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-muted)', marginLeft: 8 }}>Convidado</span>}
                              <span style={{ marginLeft: 8, fontSize: 16, whiteSpace: 'nowrap' }}>
                                {getStatValue(p)}
                              </span>
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
                          {renderPlayerBadges(p.name, false)}
                          {expandedPlayerStats[p.id] && (() => {
                            const stats = getPlayerStats(p.name);
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
                              <PlayerAvatar playerName={podiumPlayers[1].name} size={48} />
                              <div style={{ marginTop: '8px', fontSize: '13px', fontWeight: 'bold', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', color: 'var(--text-main)' }}>{podiumPlayers[1].name}</div>
                              <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>{getStatValue(podiumPlayers[1])}</div>
                              {renderPlayerBadges(podiumPlayers[1].name, true)}
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
                              <div onClick={() => togglePlayerStats(podiumPlayers[1].id)} style={{ width: '100%', height: '70px', backgroundColor: 'rgba(148, 163, 184, 0.15)', border: '1px solid rgba(148, 163, 184, 0.3)', borderBottom: 'none', borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '8px', fontSize: '24px', cursor: 'pointer' }}>🥈</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '35%', position: 'relative', zIndex: 10 }}>
                              <div style={{ position: 'absolute', top: '-28px', fontSize: '26px', filter: 'drop-shadow(0 2px 4px rgba(234,179,8,0.4))' }}>👑</div>
                              <PlayerAvatar playerName={podiumPlayers[0].name} size={64} />
                              <div style={{ marginTop: '8px', fontSize: '15px', fontWeight: 'bold', textAlign: 'center', color: '#eab308', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{podiumPlayers[0].name}</div>
                              <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>{getStatValue(podiumPlayers[0])}</div>
                              {renderPlayerBadges(podiumPlayers[0].name, true)}
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
                              <div onClick={() => togglePlayerStats(podiumPlayers[0].id)} style={{ width: '100%', height: '100px', backgroundColor: 'rgba(234, 179, 8, 0.15)', border: '1px solid rgba(234, 179, 8, 0.4)', borderBottom: 'none', borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '8px', fontSize: '28px', boxShadow: '0 -4px 12px rgba(234,179,8,0.1)', cursor: 'pointer' }}>🥇</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '30%', position: 'relative' }}>
                              <PlayerAvatar playerName={podiumPlayers[2].name} size={48} />
                              <div style={{ marginTop: '8px', fontSize: '13px', fontWeight: 'bold', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', color: 'var(--text-main)' }}>{podiumPlayers[2].name}</div>
                              <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>{getStatValue(podiumPlayers[2])}</div>
                              {renderPlayerBadges(podiumPlayers[2].name, true)}
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
          {renderAvatarModal()}
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
                          const statsA = getPlayerStats(a.name);
                          const statsB = getPlayerStats(b.name);
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
                        const topStats = getPlayerStats(topP.name);
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
                        const pStats = getPlayerStats(p.name);
                        const avg = pStats.peladasJogadas > 0 ? ((pStats.totalGoals + pStats.totalAssists) / pStats.peladasJogadas).toFixed(2) : '0.00';
                        return <span style={{ color: 'var(--primary)' }}>📊 {avg}</span>;
                      }
                      return '';
                    };

                    const renderPlayerCard = (p) => {
                      const stats = getPlayerStats(p.name);
                      let currentStatValue = 0;
                      if (playerSortConfig === 'gols') currentStatValue = p.total_gols || 0;
                      if (playerSortConfig === 'assistencias') currentStatValue = p.total_assistencias || 0;
                      if (playerSortConfig === 'vitorias') currentStatValue = p.total_vitorias || 0;
                      if (playerSortConfig === 'media') currentStatValue = p.media_nota || 0;
                      if (playerSortConfig === 'ga') currentStatValue = (p.total_gols || 0) + (p.total_assistencias || 0);
                      if (playerSortConfig === 'media_ga') {
                        const pStats = getPlayerStats(p.name);
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
                              <PlayerAvatar playerName={p.name} size={36} />
                              {p.name}
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
                          {renderPlayerBadges(p.name, false)}

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
                              <PlayerAvatar playerName={podiumPlayers[1].name} size={48} />
                              <div style={{ marginTop: '8px', fontSize: '13px', fontWeight: 'bold', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', color: 'var(--text-main)' }}>{podiumPlayers[1].name}</div>
                              <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>{getStatValue(podiumPlayers[1])}</div>
                              {renderPlayerBadges(podiumPlayers[1].name, true)}
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
                              <div onClick={() => togglePlayerStats(podiumPlayers[1].id)} style={{ width: '100%', height: '70px', backgroundColor: 'rgba(148, 163, 184, 0.15)', border: '1px solid rgba(148, 163, 184, 0.3)', borderBottom: 'none', borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '8px', fontSize: '24px', cursor: 'pointer' }}>🥈</div>
                            </div>

                            {/* 1ST PLACE */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '35%', position: 'relative', zIndex: 10 }}>
                              <div style={{ position: 'absolute', top: '-28px', fontSize: '26px', filter: 'drop-shadow(0 2px 4px rgba(234,179,8,0.4))' }}>👑</div>
                              <PlayerAvatar playerName={podiumPlayers[0].name} size={64} />
                              <div style={{ marginTop: '8px', fontSize: '15px', fontWeight: 'bold', textAlign: 'center', color: '#eab308', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{podiumPlayers[0].name}</div>
                              <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>{getStatValue(podiumPlayers[0])}</div>
                              {renderPlayerBadges(podiumPlayers[0].name, true)}
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
                              <div onClick={() => togglePlayerStats(podiumPlayers[0].id)} style={{ width: '100%', height: '100px', backgroundColor: 'rgba(234, 179, 8, 0.15)', border: '1px solid rgba(234, 179, 8, 0.4)', borderBottom: 'none', borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '8px', fontSize: '28px', boxShadow: '0 -4px 12px rgba(234,179,8,0.1)', cursor: 'pointer' }}>🥇</div>
                            </div>

                            {/* 3RD PLACE */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '30%', position: 'relative' }}>
                              <PlayerAvatar playerName={podiumPlayers[2].name} size={48} />
                              <div style={{ marginTop: '8px', fontSize: '13px', fontWeight: 'bold', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', color: 'var(--text-main)' }}>{podiumPlayers[2].name}</div>
                              <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>{getStatValue(podiumPlayers[2])}</div>
                              {renderPlayerBadges(podiumPlayers[2].name, true)}
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
          {renderAvatarModal()}
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
                              <PlayerAvatar playerName={p.name} size={36} />
                              {p.name}
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
          {renderAvatarModal()}
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
                              {val > 0 && !hasMultiple && <PlayerAvatar playerName={statObj.name} size={24} />}
                              <span style={{ textAlign: 'center', wordBreak: 'break-word', lineHeight: 1.3 }}>
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
          {renderAvatarModal()}
        </div>
      );
    }

    return (
      <div className="app-container">

        <header className="header app-header-main">
          <div className="app-header-top">
            <img src="/logo.png" alt="Selva FC Logo" style={{ width: 48, height: 48 }} />
            <h1>Pelada Selva</h1>
          </div>
          <div className="app-header-actions">
            <span onClick={() => setShowProfile(true)} className="user-pill">
              <PlayerAvatar playerName={currentUser?.name} userId={currentUser?.id} size={28} />
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
                        <PlayerAvatar playerName={linkedPlayer?.name || ''} size={40} />
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

          <button className="card animated" style={{
            width: '100%',
            padding: '16px',
            marginBottom: '12px',
            backgroundColor: 'rgba(234, 179, 8, 0.05)',
            border: '1px solid rgba(234, 179, 8, 0.3)',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }} onClick={() => setShowPlayersScreen(true)}>
            <div style={{ backgroundColor: 'rgba(234, 179, 8, 0.15)', padding: '12px', borderRadius: '50%', color: '#eab308' }}>
              <Trophy size={28} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: 18, fontWeight: 'bold', color: '#eab308', textAlign: 'center', letterSpacing: '-0.5px' }}>Estatísticas Gerais dos Jogadores</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 4 }}>Explore o ranking global de desempenho</span>
            </div>
          </button>

          <button className="card animated" style={{
            width: '100%',
            padding: '12px 16px',
            marginBottom: '12px',
            backgroundColor: 'rgba(34, 197, 94, 0.05)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: '12px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }} onClick={() => setShowMonthlyStatsScreen(true)}>
            <div style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', padding: '10px', borderRadius: '50%', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={20} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontSize: 16, fontWeight: 'bold', color: '#22c55e', letterSpacing: '-0.5px' }}>Estatísticas por mês</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Ranking detalhado de cada mês</span>
            </div>
          </button>

          <button className="card animated" style={{
            width: '100%',
            padding: '12px 16px',
            marginBottom: '24px',
            backgroundColor: 'rgba(168, 85, 247, 0.05)',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: '12px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }} onClick={() => setShowGoleirosScreen(true)}>
            <div style={{ backgroundColor: 'rgba(168, 85, 247, 0.15)', padding: '10px', borderRadius: '50%', color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '20px', lineHeight: 1 }}>🧤</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontSize: 16, fontWeight: 'bold', color: '#a855f7', letterSpacing: '-0.5px' }}>Estatísticas de Goleiros</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{registeredGoleiros.length} goleiros na base de dados</span>
            </div>
          </button>

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
                                  {val > 0 && !hasMultiple && <PlayerAvatar playerName={statObj.name} size={24} />}
                                  <span style={{ textAlign: 'center', wordBreak: 'break-word', lineHeight: 1.3 }}>
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

                            {/* Atacantes (Front) */}
                            {renderFormation(hl.teamOfMonth.atacantes, 'Atacante', [], true)}

                            {/* Meia (Middle) */}
                            {renderFormation(hl.teamOfMonth.meia, 'Meia', [], true)}

                            {/* Zagueiros (Back) */}
                            {renderFormation(hl.teamOfMonth.zagueiros, 'Zagueiro', [], true)}
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
                <h2 style={{ fontSize: '18px', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar color="var(--primary)" size={20} />
                  Última Pelada
                </h2>
                {sessions.length > 1 && (
                  <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)' }} onClick={() => setShowAllSessionsScreen(true)}>
                    Ver Todas ({sessions.length})
                  </button>
                )}
              </div>

              <div className="card animated">
                <div className="card-header cursor-pointer" onClick={() => setActiveSessionId(sessions[0].id)}>
                  <div>
                    <span className="card-title">
                      <Calendar size={18} color="var(--primary)" />
                      {sessions[0].name}
                      {canEditSession(sessions[0]) && <button className="icon-btn" style={{ padding: 4, marginLeft: 6, color: 'var(--text-muted)' }} onClick={(e) => { e.stopPropagation(); editSessionName(sessions[0].id, sessions[0].name); }}><Pencil size={14} /></button>}
                    </span>
                    <span className="card-meta">{sessions[0].teams?.length || 0} times cadastrados</span>
                  </div>
                  <div className="card-actions" onClick={e => e.stopPropagation()}>
                    {canEditSession(sessions[0]) && (
                      <button className="icon-btn danger" style={{ color: 'var(--danger)' }} onClick={() => removeSession(sessions[0].id)}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
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
      </div>
    );
  }

  // Calculate Rankings for active session
  const teams = activeSession.teams || [];
  const teamStandings = [...teams].map(t => ({
    ...t,
    points: (t.wins * 3) + (t.draws * 1)
  })).sort((a, b) => b.points - a.points || b.wins - a.wins);

  const allPlayers = teams.flatMap(t => (t.players || []).map(p => ({ ...p, teamName: t.name })));

  // Calculate session ratings for tiebreaker
  const sessionRatings = calculateSessionPlayerRatings(activeSession);
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
          <PlayerAvatar playerName={players[1].name} size={40} />
          <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: 'bold', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', color: 'var(--text-main)' }}>{players[1].name}</div>
          <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>{getStatValue(players[1])}</div>
          <div style={{ width: '100%', height: '50px', backgroundColor: 'rgba(148, 163, 184, 0.15)', border: '1px solid rgba(148, 163, 184, 0.3)', borderBottom: 'none', borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '6px', fontSize: '20px' }}>🥈</div>
        </div>

        {/* 1ST PLACE */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '35%', position: 'relative', zIndex: 10 }}>
          <div style={{ position: 'absolute', top: '-22px', fontSize: '20px', filter: 'drop-shadow(0 2px 4px rgba(234,179,8,0.4))' }}>👑</div>
          <PlayerAvatar playerName={players[0].name} size={50} />
          <div style={{ marginTop: '8px', fontSize: '13px', fontWeight: 'bold', textAlign: 'center', color: '#eab308', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{players[0].name}</div>
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '6px' }}>{getStatValue(players[0])}</div>
          <div style={{ width: '100%', height: '70px', backgroundColor: 'rgba(234, 179, 8, 0.15)', border: '1px solid rgba(234, 179, 8, 0.4)', borderBottom: 'none', borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '6px', fontSize: '24px', boxShadow: '0 -4px 12px rgba(234,179,8,0.1)' }}>🥇</div>
        </div>

        {/* 3RD PLACE */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '30%', position: 'relative' }}>
          <PlayerAvatar playerName={players[2].name} size={40} />
          <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: 'bold', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', color: 'var(--text-main)' }}>{players[2].name}</div>
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
                const sessionPlayers = activeSession.teams?.flatMap(t => t.players?.filter(p => registeredPlayers.find(rp => rp.name === p.name)?.userId) || []) || [];
                if (sessionPlayers.length === 0) return <p style={{ color: 'var(--text-muted)' }}>Nenhum jogador com conta cadastrada está listado na pelada.</p>;

                // Remove duplicates
                const uniqueUserIds = new Set();
                const playersToRender = [];
                for (const p of sessionPlayers) {
                  const rp = registeredPlayers.find(rp => rp.name === p.name);
                  if (rp && rp.userId && !uniqueUserIds.has(rp.userId)) {
                    uniqueUserIds.add(rp.userId);
                    playersToRender.push({ ...p, userId: rp.userId });
                  }
                }

                return playersToRender.map(p => {
                  const isAdmin = activeSession.admins?.includes(p.userId);
                  const userObj = users.find(u => u.id === p.userId);
                  if (!userObj) return null;
                  return (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, border: isAdmin ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid transparent' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <strong style={{ fontSize: 16 }}>{userObj.name}</strong>
                          {isAdmin && <Shield size={14} color="var(--primary)" title="Admin" />}
                        </div>
                        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Jogador atrelado: {p.name}</span>
                      </div>
                      <div>
                        {isAdmin ? (
                          <button onClick={() => demoteFromAdmin(p.userId)} className="btn-primary" style={{ backgroundColor: 'transparent', border: '1px solid rgba(239, 68, 68, 0.5)', color: 'var(--danger)', padding: '6px 12px', fontSize: 13 }}>Remover Admin</button>
                        ) : (
                          <button onClick={() => promoteToAdmin(p.userId)} className="btn-primary" style={{ padding: '6px 12px', fontSize: 13 }}>Tornar Admin</button>
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
            <h2 style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8, paddingRight: 32 }}><span style={{fontSize: '24px'}}>⚔️</span> Partidas e Placares</h2>
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
            ) : (
              <div style={{
                marginBottom: 4, textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: 13, fontWeight: '700', padding: '12px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.1)'
              }}>
                Limite de times atingido (4/4)
              </div>
            )}

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
                            {canEditSession(activeSession) && <button className="icon-btn" style={{ padding: 4, marginLeft: 6, color: headerTextColor, opacity: 0.8 }} onClick={(e) => { e.stopPropagation(); editTeamName(team.id, team.name); }}><Pencil size={14} /></button>}

                          </span>
                          <div className="card-actions">
                            {canEditSession(activeSession) && <button className="icon-btn danger" style={{ color: headerTextColor }} onClick={(e) => { e.stopPropagation(); removeTeam(team.id); }}><Trash2 size={18} /></button>}
                          </div>
                        </div>

                        <div className="stats-grid"
                          onClick={(e) => e.stopPropagation()}
                          style={{ padding: '0 16px 12px 16px', cursor: 'default' }}>
                          <div className="stat-box">
                            <span className="stat-label" style={{ color: headerTextColor }}>V</span>
                            {canEditSession(activeSession) ? (
                              <div className="stat-controls">
                                <button className="ctrl-btn" onClick={() => updateTeamStat(team.id, 'wins', -1)}><Minus size={12} /></button>
                                <span className="stat-value">{team.wins}</span>
                                <button className="ctrl-btn" onClick={() => updateTeamStat(team.id, 'wins', 1)}><Plus size={12} /></button>
                              </div>
                            ) : <span className="stat-value" style={{ margin: 'auto' }}>{team.wins}</span>}
                          </div>

                          <div className="stat-box">
                            <span className="stat-label" style={{ color: headerTextColor }}>E</span>
                            {canEditSession(activeSession) ? (
                              <div className="stat-controls">
                                <button className="ctrl-btn" onClick={() => updateTeamStat(team.id, 'draws', -1)}><Minus size={12} /></button>
                                <span className="stat-value">{team.draws}</span>
                                <button className="ctrl-btn" onClick={() => updateTeamStat(team.id, 'draws', 1)}><Plus size={12} /></button>
                              </div>
                            ) : <span className="stat-value" style={{ margin: 'auto' }}>{team.draws}</span>}
                          </div>

                          <div className="stat-box">
                            <span className="stat-label" style={{ color: headerTextColor }}>D</span>
                            {canEditSession(activeSession) ? (
                              <div className="stat-controls">
                                <button className="ctrl-btn" onClick={() => updateTeamStat(team.id, 'losses', -1)}><Minus size={12} /></button>
                                <span className="stat-value">{team.losses}</span>
                                <button className="ctrl-btn" onClick={() => updateTeamStat(team.id, 'losses', 1)}><Plus size={12} /></button>
                              </div>
                            ) : <span className="stat-value" style={{ margin: 'auto' }}>{team.losses}</span>}
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
                                          <PlayerAvatar playerName={player.name} size={30} />
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
                                      {/* Atacantes (Top) */}
                                      {renderFormation(atacantes, 'Atacante', sessionRatings)}

                                      {/* Meias (Middle) */}
                                      {renderFormation(meias, 'Meia', sessionRatings)}

                                      {/* Zagueiros (Bottom) */}
                                      {renderFormation(zagueiros, 'Zagueiro', sessionRatings)}
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

            {/* PARTIDAS / PLACARES */}
            <div className="matches-section" style={{ marginTop: '24px' }}>
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
                        <span style={{ color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                              <PlayerAvatar playerName={p.name} size={28} />
                              <span>{p.name} <span className="team-name">({p.teamName})</span></span>
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
                              <PlayerAvatar playerName={p.name} size={28} />
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
                    const ratedPlayers = calculateSessionPlayerRatings(activeSession);
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
                            <div key={p.id} className="ranking-item" style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <div className="left-part" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span className="rank-badge" style={{ backgroundColor: getTeamColor(p.teamName), color: getTextColor(getTeamColor(p.teamName)) }}>
                                  {actualIdx + 1}
                                </span>
                                <PlayerAvatar playerName={p.name} size={32} />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span style={{ fontSize: '14px', fontWeight: '600' }}>{p.name} {actualIdx === 0 && <span title="MVP da Pelada" style={{ fontSize: 12 }}>👑</span>}</span>
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

      {renderAvatarModal()}
    </div>
  );
}

export default App;