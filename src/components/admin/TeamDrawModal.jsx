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

  // Fisher-Yates Shuffle Helper
  const shuffleArray = (array) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
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

    // For each star tier, shuffle the 4 players (sub-levels 1..4) and assign 1 to each team
    starKeys.forEach(starInfo => {
      const playerList = matrix[starInfo.key] || [];
      const pool = playerList.map((name, idx) => ({
        name: name || `Jogador ${starInfo.stars}★ (Slot ${idx + 1})`,
        stars: starInfo.stars,
        tierLevel: idx + 1,
        color: starInfo.color
      }));

      const shuffled = shuffleArray(pool);
      shuffled.forEach((player, teamIdx) => {
        teams[teamIdx].players.push(player);
      });
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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

                  <div className="teams-drawn-grid">
                    {(currentDrawnTeams || latestDraw.teams).map((team) => (
                      <div key={team.id} className="drawn-team-card" style={{ borderTop: `3px solid ${team.color || '#00e65a'}` }}>
                        <div className="drawn-team-header">
                          <span style={{ color: team.color || 'var(--text-main)' }}>{team.name}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>5 Jogadores</span>
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
                </div>
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
                        {record.teams.map((t) => (
                          <div key={t.id} style={{ background: 'rgba(255,255,255,0.02)', padding: 10, borderRadius: 10, borderLeft: `3px solid ${t.color || '#00e65a'}` }}>
                            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: t.color || 'var(--text-main)' }}>
                              {t.name}
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
                        ))}
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
