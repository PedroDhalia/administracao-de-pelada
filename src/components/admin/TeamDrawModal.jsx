import React, { useState, useEffect } from 'react';
import {
  Star, Shuffle, History, Save, X, ShieldAlert, Check,
  AlertTriangle, Users, Sparkles, RefreshCw, Layers
} from 'lucide-react';
import PlayerAvatar from '../common/PlayerAvatar';
import './TeamDrawModal.css';

const DEFAULT_TIER_NAMES = ['Nível 1 (Melhor)', 'Nível 2', 'Nível 3', 'Nível 4'];
const TEAM_NAMES = ['Time 1 (Verde)', 'Time 2 (Amarelo)', 'Time 3 (Azul)', 'Time 4 (Vermelho)'];
const TEAM_COLORS = ['#00e65a', '#ffd60a', '#0a84ff', '#ff375f'];

export default function TeamDrawModal({
  isOpen,
  onClose,
  sessions = [],
  registeredPlayers = [],
  registeredGoleiros = [],
  users = [],
  starRatings = null,
  saveStarRatings,
  saveSessionDraw,
  currentUser
}) {
  const [activeTab, setActiveTab] = useState('sorteio'); // 'sorteio' | 'estrelas' | 'historico'
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [currentDrawnTeams, setCurrentDrawnTeams] = useState(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Star Ratings Matrix State (5 stars x 4 positions = 20 players)
  const [matrix, setMatrix] = useState({
    stars5: ['', '', '', ''],
    stars4: ['', '', '', ''],
    stars3: ['', '', '', ''],
    stars2: ['', '', '', ''],
    stars1: ['', '', '', '']
  });

  // Load saved star ratings from Firebase when modal opens or ratings update
  useEffect(() => {
    if (starRatings) {
      setMatrix({
        stars5: Array.isArray(starRatings.stars5) ? [...starRatings.stars5] : ['', '', '', ''],
        stars4: Array.isArray(starRatings.stars4) ? [...starRatings.stars4] : ['', '', '', ''],
        stars3: Array.isArray(starRatings.stars3) ? [...starRatings.stars3] : ['', '', '', ''],
        stars2: Array.isArray(starRatings.stars2) ? [...starRatings.stars2] : ['', '', '', ''],
        stars1: Array.isArray(starRatings.stars1) ? [...starRatings.stars1] : ['', '', '', '']
      });
    }
  }, [starRatings, isOpen]);

  // Set default selected session when sessions change or modal opens
  useEffect(() => {
    if (sessions.length > 0 && !selectedSessionId) {
      setSelectedSessionId(sessions[0].id);
    }
  }, [sessions, selectedSessionId, isOpen]);

  if (!isOpen) return null;

  const currentSession = sessions.find(s => s.id === selectedSessionId) || sessions[0];
  const drawHistory = currentSession?.drawHistory || [];
  const drawCount = drawHistory.length;
  const latestDraw = drawHistory.length > 0 ? drawHistory[drawHistory.length - 1] : null;

  // Auto fill top 20 registered players sorted by media_nota or name
  const handleAutoFill = () => {
    const sorted = [...registeredPlayers].sort((a, b) => (b.media_nota || 0) - (a.media_nota || 0));
    const names = sorted.map(p => p.name);

    setMatrix({
      stars5: [names[0] || '', names[1] || '', names[2] || '', names[3] || ''],
      stars4: [names[4] || '', names[5] || '', names[6] || '', names[7] || ''],
      stars3: [names[8] || '', names[9] || '', names[10] || '', names[11] || ''],
      stars2: [names[12] || '', names[13] || '', names[14] || '', names[15] || ''],
      stars1: [names[16] || '', names[17] || '', names[18] || '', names[19] || '']
    });
  };

  const handleSlotChange = (starKey, index, value) => {
    setMatrix(prev => {
      const updatedList = [...prev[starKey]];
      updatedList[index] = value;
      return { ...prev, [starKey]: updatedList };
    });
  };

  const handleSaveMatrix = () => {
    if (saveStarRatings) {
      saveStarRatings(matrix);
      setSaveSuccessMsg('Estrelas salvas com sucesso no banco de dados!');
      setTimeout(() => setSaveSuccessMsg(''), 3000);
    }
  };

  // Calculate individual player score: Star Base (50..10) + Sub-Level Bonus (10..2.5)
  const getPlayerScore = (stars, tierLevel) => {
    const starBase = stars * 20; // 5★=100, 4★=80, 3★=60, 2★=40, 1★=20
    const tierBonus = (5 - tierLevel) * 2.5; // N1=10, N2=7.5, N3=5.0, N4=2.5
    return starBase + tierBonus;
  };

  const calculateTeamScore = (players = []) => {
    return players.reduce((sum, p) => sum + getPlayerScore(p.stars || 1, p.tierLevel || 4), 0);
  };

  // Fisher-Yates Shuffle Helper
  const shuffleArray = (array) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Generate mathematically balanced sub-level assignments across the 5 star tiers for 4 teams
  const generateBalancedSubLevelMatrix = () => {
    // 5 rows (star tiers 5★ to 1★), each row is a permutation of sub-level indices [0, 1, 2, 3] (Nível 1, 2, 3, 4)
    // We search for a matrix where the 4 team sub-level rank sums differ by at most 1 point!
    for (let attempt = 0; attempt < 500; attempt++) {
      const assignmentMatrix = [];
      const teamSubLevelSums = [0, 0, 0, 0];

      for (let star = 0; star < 5; star++) {
        const perm = shuffleArray([0, 1, 2, 3]);
        assignmentMatrix.push(perm);
        for (let team = 0; team < 4; team++) {
          teamSubLevelSums[team] += perm[team];
        }
      }

      const minSum = Math.min(...teamSubLevelSums);
      const maxSum = Math.max(...teamSubLevelSums);

      if (maxSum - minSum <= 1) { // Perfect balance achieved!
        return assignmentMatrix;
      }
    }

    // Fallback snake pattern
    const row0 = shuffleArray([0, 1, 2, 3]);
    const row1 = [...row0].reverse();
    const row2 = shuffleArray([0, 1, 2, 3]);
    const row3 = [...row2].reverse();
    const row4 = shuffleArray([0, 1, 2, 3]);
    return [row0, row1, row2, row3, row4];
  };

  // Perform Team Draw
  const handlePerformDraw = () => {
    if (!currentSession) {
      alert('Selecione ou crie uma pelada primeiro!');
      return;
    }

    // Star keys in order from highest to lowest
    const starKeys = [
      { key: 'stars5', label: '5 Estrelas', stars: 5, color: '#ffd60a' },
      { key: 'stars4', label: '4 Estrelas', stars: 4, color: '#a855f7' },
      { key: 'stars3', label: '3 Estrelas', stars: 3, color: '#3b82f6' },
      { key: 'stars2', label: '2 Estrelas', stars: 2, color: '#30d158' },
      { key: 'stars1', label: '1 Estrela', stars: 1, color: '#ff9f0a' }
    ];

    // Initialize 4 teams
    const teams = TEAM_NAMES.map((name, idx) => ({
      id: idx + 1,
      name: name,
      color: TEAM_COLORS[idx],
      players: []
    }));

    // Generate balanced sub-level index mapping (5 rows x 4 teams)
    const balancedSubLevelMatrix = generateBalancedSubLevelMatrix();

    // Assign 1 player per star category using the balanced sub-level matrix
    starKeys.forEach((starInfo, starIndex) => {
      const playerList = matrix[starInfo.key] || [];
      const subLevelIndicesForTeams = balancedSubLevelMatrix[starIndex];

      teams.forEach((team, teamIndex) => {
        const chosenSubLevelIndex = subLevelIndicesForTeams[teamIndex]; // 0..3 (Nível 1..4)
        const playerName = playerList[chosenSubLevelIndex] || `Jogador ${starInfo.stars}★ (Nível ${chosenSubLevelIndex + 1})`;

        team.players.push({
          name: playerName,
          stars: starInfo.stars,
          tierLevel: chosenSubLevelIndex + 1, // 1, 2, 3, 4
          color: starInfo.color
        });
      });
    });

    // Calculate total score for each team
    teams.forEach(t => {
      t.totalScore = calculateTeamScore(t.players);
    });

    setCurrentDrawnTeams(teams);

    // Format teams for official session matches & standings
    const formattedTeams = teams.map((t, idx) => ({
      id: idx + 1,
      name: t.name,
      color: t.color,
      players: t.players.map(p => ({
        id: Date.now() + Math.random(),
        name: p.name,
        goals: 0,
        assists: 0
      })),
      wins: 0,
      draws: 0,
      losses: 0
    }));

    // Save draw attempt to Firebase draw history AND automatically insert teams into session
    const drawRecord = {
      id: Date.now().toString(),
      drawNumber: drawCount + 1,
      timestamp: new Date().toLocaleString('pt-BR'),
      adminName: currentUser?.name || 'Administrador',
      teams: teams,
      appliedToSession: true
    };

    if (saveSessionDraw) {
      saveSessionDraw(currentSession.id, drawRecord, formattedTeams);
      setSaveSuccessMsg('Times sorteados e inseridos automaticamente na Pelada!');
      setTimeout(() => setSaveSuccessMsg(''), 3500);
    }
  };

  // Apply Drawn Teams to the active session official match teams
  const handleApplyToSession = () => {
    if (!currentDrawnTeams || !currentSession) return;

    // Convert teams into session format
    const formattedTeams = currentDrawnTeams.map((t, idx) => ({
      id: idx + 1,
      name: t.name,
      color: t.color,
      players: t.players.map(p => ({
        id: Date.now() + Math.random(),
        name: p.name,
        goals: 0,
        assists: 0
      })),
      wins: 0,
      draws: 0,
      losses: 0
    }));

    const drawRecord = {
      id: Date.now().toString(),
      drawNumber: drawCount,
      timestamp: new Date().toLocaleString('pt-BR'),
      adminName: currentUser?.name || 'Administrador',
      teams: currentDrawnTeams,
      appliedToSession: true
    };

    if (saveSessionDraw) {
      saveSessionDraw(currentSession.id, drawRecord, formattedTeams);
      setSaveSuccessMsg('Times do sorteio aplicados à Pelada!');
      setTimeout(() => setSaveSuccessMsg(''), 3000);
    }
  };

  const renderStarsBadge = (count) => {
    return (
      <span className="stars-icons">
        {Array.from({ length: count }).map((_, i) => (
          <Star key={i} size={13} fill="#ffd60a" color="#ffd60a" />
        ))}
      </span>
    );
  };

  return (
    <div className="draw-modal-overlay">
      <div className="draw-modal-container">
        {/* Header */}
        <header className="draw-modal-header">
          <div className="draw-modal-title">
            <Shuffle size={22} className="icon-glow" />
            <span>Sorteio de Times por Estrelas</span>
          </div>
          <button className="draw-modal-close" onClick={onClose} title="Fechar">
            <X size={20} />
          </button>
        </header>

        {/* Tabs */}
        <div className="draw-tabs">
          <button
            className={`draw-tab-btn ${activeTab === 'sorteio' ? 'active' : ''}`}
            onClick={() => setActiveTab('sorteio')}
          >
            <Shuffle size={15} />
            <span>Sortear Pelada</span>
          </button>
          <button
            className={`draw-tab-btn ${activeTab === 'estrelas' ? 'active' : ''}`}
            onClick={() => setActiveTab('estrelas')}
          >
            <Layers size={15} />
            <span>Matriz de Estrelas (20 Jogadores)</span>
          </button>
          <button
            className={`draw-tab-btn ${activeTab === 'historico' ? 'active' : ''}`}
            onClick={() => setActiveTab('historico')}
          >
            <History size={15} />
            <span>Transparência & Histórico ({drawCount})</span>
          </button>
        </div>

        {/* Body */}
        <div className="draw-modal-body">
          {saveSuccessMsg && (
            <div style={{
              backgroundColor: 'rgba(48, 209, 88, 0.15)',
              border: '1px solid rgba(48, 209, 88, 0.3)',
              color: '#30d158',
              padding: '10px 16px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              fontWeight: 600
            }}>
              <Check size={16} /> {saveSuccessMsg}
            </div>
          )}

          {/* TAB 1: SORTEIO */}
          {activeTab === 'sorteio' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Pelada Selector */}
              <div className="session-select-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>
                    SELECIONE A PELADA PARA SORTEAR
                  </span>
                  {currentSession && (
                    <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600 }}>
                      Data: {currentSession.date || 'Atual'}
                    </span>
                  )}
                </div>

                <div className="session-select-row">
                  <select
                    className="session-select-input"
                    value={selectedSessionId}
                    onChange={(e) => setSelectedSessionId(e.target.value)}
                  >
                    {sessions.length === 0 ? (
                      <option value="">Nenhuma pelada encontrada</option>
                    ) : (
                      sessions.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name || `Pelada ${s.date || ''}`}
                        </option>
                      ))
                    )}
                  </select>

                  <button
                    className="btn-draw-main"
                    onClick={handlePerformDraw}
                  >
                    <Shuffle size={18} />
                    Sortear Times
                  </button>
                </div>
              </div>

              {/* Transparency Banner */}
              <div className="transparency-banner">
                <div className="transparency-info">
                  <AlertTriangle size={20} color="#ffd60a" />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>
                      Transparência de Sorteio (Anti-Roubo)
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {drawCount === 0
                        ? 'Nenhum sorteio realizado ainda para esta pelada.'
                        : drawCount === 1
                          ? '1º Sorteio oficial realizado para esta pelada.'
                          : `Atenção: O sorteio foi re-executado ${drawCount} vezes para esta pelada.`}
                    </div>
                  </div>
                </div>
                <div className="transparency-counter" title="Total de sorteios efetuados">
                  #{drawCount}
                </div>
              </div>

              {/* Drawn Teams View */}
              {(currentDrawnTeams || (latestDraw && latestDraw.teams)) ? (
                (() => {
                  const activeTeams = currentDrawnTeams || latestDraw.teams;
                  const teamsWithScores = activeTeams.map(t => ({
                    ...t,
                    score: t.totalScore || calculateTeamScore(t.players)
                  }));
                  const scoresList = teamsWithScores.map(t => t.score);
                  const minS = Math.min(...scoresList);
                  const maxS = Math.max(...scoresList);
                  const parity = maxS > 0 ? ((minS / maxS) * 100).toFixed(1) : '100.0';

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>
                          ⚽ Escalação Sorteada ({currentDrawnTeams ? 'Novo Sorteio' : `Tentativa #${latestDraw.drawNumber}`})
                        </h3>
                        <button
                          className="btn-primary"
                          onClick={handleApplyToSession}
                          style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <Save size={14} /> Aplicar à Pelada
                        </button>
                      </div>

                      {/* Drawn Teams Grid */}
                      <div className="teams-drawn-grid">
                        {teamsWithScores.map((team) => (
                          <div key={team.id} className="drawn-team-card" style={{ borderTop: `3px solid ${team.color || '#00e65a'}` }}>
                            <div className="drawn-team-header">
                              <span style={{ color: team.color || 'var(--text-main)', fontWeight: 800 }}>{team.name}</span>
                              <span
                                style={{
                                  backgroundColor: 'rgba(0, 230, 90, 0.15)',
                                  color: '#00e65a',
                                  border: '1px solid rgba(0, 230, 90, 0.3)',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontSize: '11px',
                                  fontWeight: 800
                                }}
                                title="Pontuação Total de Habilidade do Time"
                              >
                                ⚡ {team.score.toFixed(1)} pts
                              </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {team.players.map((p, pIdx) => (
                                <div key={pIdx} className="drawn-player-item">
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <PlayerAvatar
                                      users={users}
                                      registeredPlayers={registeredPlayers}
                                      registeredGoleiros={registeredGoleiros}
                                      playerName={p.name}
                                      size={22}
                                    />
                                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                                  </div>
                                  <span
                                    className="player-star-badge"
                                    style={{
                                      backgroundColor: `${p.color || '#ffd60a'}20`,
                                      color: p.color || '#ffd60a',
                                      border: `1px solid ${p.color || '#ffd60a'}40`
                                    }}
                                  >
                                    {p.stars}★ (N{p.tierLevel})
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* COMPROVAÇÃO DE EQUILÍBRIO CARD */}
                      <div style={{
                        background: 'linear-gradient(135deg, rgba(0, 230, 90, 0.06) 0%, rgba(0,0,0,0.3) 100%)',
                        border: '1px solid rgba(0, 230, 90, 0.25)',
                        borderRadius: '16px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 800, color: '#ffffff' }}>
                            <Sparkles size={18} color="#00e65a" />
                            <span>Comprovação de Equilíbrio (Pontuação das Equipes)</span>
                          </div>
                          <span style={{
                            fontSize: '12px',
                            fontWeight: 800,
                            backgroundColor: 'rgba(0, 230, 90, 0.2)',
                            color: '#00e65a',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            border: '1px solid rgba(0, 230, 90, 0.4)'
                          }}>
                            Índice de Paridade: {parity}% (Super Equilibrado)
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                          {teamsWithScores.map(t => (
                            <div key={t.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '12px', borderLeft: `3px solid ${t.color}`, display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: t.color }}>{t.name}</span>
                              <span style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>{t.score.toFixed(1)} pts</span>
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Média: {(t.score / 5).toFixed(1)} pts / jogador</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div style={{
                  padding: '36px 20px',
                  textAlign: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '16px',
                  border: '1px dashed rgba(255, 255, 255, 0.1)',
                  color: 'var(--text-muted)'
                }}>
                  <Shuffle size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
                  <p style={{ fontSize: 14, fontWeight: 600 }}>Pronto para sortear!</p>
                  <p style={{ fontSize: 12, marginTop: 4 }}>
                    Clique no botão "Sortear Times" acima para distribuir os 20 jogadores da matriz nas 4 equipes.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EDITAR MATRIZ DE ESTRELAS */}
          {activeTab === 'estrelas' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700 }}>Matriz de Estrelas (20 Jogadores)</h3>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Defina os 20 mensalistas/diaristas divididos em 5 níveis de estrelas e 4 posições (do melhor pro pior).
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleAutoFill}
                    className="btn-primary"
                    style={{ backgroundColor: 'transparent', border: '1px solid var(--border-hover)', color: 'var(--text-main)', fontSize: 12, padding: '8px 12px' }}
                    title="Preencher com os jogadores mais bem pontuados do ranking"
                  >
                    <Sparkles size={14} /> Auto-Preencher (Ranking)
                  </button>
                  <button
                    onClick={handleSaveMatrix}
                    className="btn-primary"
                    style={{ fontSize: 12, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Save size={14} /> Salvar Matriz
                  </button>
                </div>
              </div>

              <div className="stars-matrix-grid">
                {[
                  { key: 'stars5', label: '5 Estrelas (Top Performer)', count: 5, color: '#ffd60a' },
                  { key: 'stars4', label: '4 Estrelas (Muito Bom)', count: 4, color: '#a855f7' },
                  { key: 'stars3', label: '3 Estrelas (Regular)', count: 3, color: '#3b82f6' },
                  { key: 'stars2', label: '2 Estrelas (Modesto)', count: 2, color: '#30d158' },
                  { key: 'stars1', label: '1 Estrela (Iniciante / Reserva)', count: 1, color: '#ff9f0a' }
                ].map((tier) => (
                  <div key={tier.key} className="star-tier-card" data-stars={tier.count}>
                    <div className="star-tier-header">
                      <div className="star-tier-title">
                        {renderStarsBadge(tier.count)}
                        <span style={{ color: tier.color }}>{tier.label}</span>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                        4 Posições
                      </span>
                    </div>

                    <div className="star-slots-grid">
                      {DEFAULT_TIER_NAMES.map((tierName, idx) => {
                        const val = matrix[tier.key][idx] || '';
                        return (
                          <div key={idx} className="slot-input-box">
                            <span className="slot-label">{tierName}</span>
                            <select
                              className="slot-select"
                              value={val}
                              onChange={(e) => handleSlotChange(tier.key, idx, e.target.value)}
                            >
                              <option value="">Selecione ou digite...</option>
                              {registeredPlayers.map(p => (
                                <option key={p.id} value={p.name}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                            {/* Direct text input fallback for guest/diarista players */}
                            <input
                              type="text"
                              className="slot-select"
                              style={{ marginTop: 4, fontSize: 11, padding: '4px 6px', background: 'rgba(255,255,255,0.03)' }}
                              placeholder="Ou digite nome do diarista..."
                              value={val}
                              onChange={(e) => handleSlotChange(tier.key, idx, e.target.value)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: HISTÓRICO & TRANSPARÊNCIA */}
          {activeTab === 'historico' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>Histórico Completo de Sorteios</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Pelada selecionada: <strong style={{ color: 'var(--primary)' }}>{currentSession?.name || `Pelada ${currentSession?.date || ''}`}</strong> ({drawCount} sorteios registrados)
                </p>
              </div>

              {drawHistory.length === 0 ? (
                <div style={{
                  padding: '36px 20px',
                  textAlign: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '16px',
                  border: '1px dashed rgba(255, 255, 255, 0.1)',
                  color: 'var(--text-muted)'
                }}>
                  <History size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
                  <p style={{ fontSize: 14, fontWeight: 600 }}>Nenhum histórico gravado</p>
                  <p style={{ fontSize: 12, marginTop: 4 }}>
                    Realize o primeiro sorteio para começar o registro auditável e transparente.
                  </p>
                </div>
              ) : (
                <div className="history-logs-list">
                  {[...drawHistory].reverse().map((record, index) => (
                    <div key={record.id || index} className="history-item-card">
                      <div className="history-item-header">
                        <span style={{ fontWeight: 800, color: '#ffd60a', fontSize: 14 }}>
                          Sorteio #{record.drawNumber}
                        </span>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <span>Sorteado por: <strong>{record.adminName}</strong></span>
                          <span>• {record.timestamp}</span>
                        </div>
                      </div>

                      <div className="teams-drawn-grid" style={{ marginTop: 8 }}>
                        {record.teams.map((t) => {
                          const tScore = t.totalScore || calculateTeamScore(t.players);
                          return (
                            <div key={t.id} style={{ background: 'rgba(255,255,255,0.02)', padding: 10, borderRadius: 10, borderLeft: `3px solid ${t.color || '#00e65a'}` }}>
                              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: t.color || 'var(--text-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>{t.name}</span>
                                <span style={{ fontSize: 10, color: '#00e65a', backgroundColor: 'rgba(0, 230, 90, 0.1)', padding: '1px 6px', borderRadius: 8, border: '1px solid rgba(0, 230, 90, 0.2)' }}>
                                  ⚡ {tScore.toFixed(1)} pts
                                </span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {t.players.map((p, pIdx) => (
                                  <div key={pIdx} style={{ fontSize: 11, display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                                    <span style={{ color: '#ffffff' }}>{p.name}</span>
                                    <span>{p.stars}★</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
