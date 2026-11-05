import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Check, Copy, AlertTriangle, ClipboardList } from 'lucide-react';
import PlayerAvatar from '../components/common/PlayerAvatar';
import {
  computeMonthFinance,
  getOutstandingByMonth,
  findPreviousConfiguredMonth,
  getMensalistaKeys,
  getMonthKeyFromDate,
  getMonthKeyFromJsDate,
  getMonthLabel,
  getMonthName,
  shiftMonthKey,
  formatCurrency,
  toFirebaseKey,
  FINANCE_START_MONTH
} from '../utils/finance';
import '../components/finance/Finance.css';

const shortDate = (dateStr) => String(dateStr || '').split('/').slice(0, 2).join('/');

const formatPaidAt = (timestamp) => {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const plural = (count, singular, pluralWord) => `${count} ${count === 1 ? singular : pluralWord}`;

const FILTERS = [
  { key: 'pendentes', label: 'Pendentes' },
  { key: 'pagos', label: 'Pagos' },
  { key: 'todos', label: 'Todos' }
];

const FinanceScreen = ({
  sessions = [],
  registeredPlayers = [],
  registeredGoleiros = [],
  users = [],
  currentUser,
  finance,
  isFinanceLoaded,
  setMensalista,
  replaceMensalistas,
  setMonthDailyFee,
  setPayment,
  onBack,
  onOpenSession
}) => {
  const currentMonthKey = getMonthKeyFromJsDate();
  const minMonthKey = FINANCE_START_MONTH;
  const maxMonthKey = shiftMonthKey(currentMonthKey < minMonthKey ? minMonthKey : currentMonthKey, 1);

  const [monthKey, setMonthKey] = useState(currentMonthKey < minMonthKey ? minMonthKey : currentMonthKey);
  const [tab, setTab] = useState('diaristas');
  const [filter, setFilter] = useState('pendentes');
  const [search, setSearch] = useState('');
  const [feeDraft, setFeeDraft] = useState(null);
  const [copied, setCopied] = useState(false);

  const monthConfig = finance?.months?.[monthKey];
  const monthLabel = getMonthLabel(monthKey);

  const summary = useMemo(() => computeMonthFinance({
    sessions,
    registeredPlayers,
    monthKey,
    monthConfig,
    payments: finance?.payments
  }), [sessions, registeredPlayers, monthKey, monthConfig, finance?.payments]);

  const otherMonthsPending = useMemo(() => getOutstandingByMonth({
    sessions,
    registeredPlayers,
    finance,
    excludeMonthKey: monthKey
  }), [sessions, registeredPlayers, finance, monthKey]);

  // Quantas peladas cada jogador cadastrado fez no mês (ajuda a montar a lista de mensalistas)
  const appearancesInMonth = useMemo(() => {
    const counts = {};
    const idByName = new Map(registeredPlayers.map(p => [String(p.name || '').trim().toLowerCase(), p.id]));
    sessions
      .filter(s => getMonthKeyFromDate(s?.date) === monthKey)
      .forEach(s => {
        const seen = new Set();
        (s.teams || []).forEach(t => (t.players || []).forEach(p => {
          const id = idByName.get(String(p?.name || '').trim().toLowerCase());
          if (id && !seen.has(id)) {
            seen.add(id);
            counts[id] = (counts[id] || 0) + 1;
          }
        }));
      });
    return counts;
  }, [sessions, registeredPlayers, monthKey]);

  const mensalistaKeys = new Set(getMensalistaKeys(monthConfig));
  const previousConfiguredMonth = findPreviousConfiguredMonth(finance, monthKey);
  const { totals } = summary;
  const totalExpected = totals.paidAmount + totals.pendingAmount;
  const paidPercent = totalExpected > 0 ? Math.round((totals.paidAmount / totalExpected) * 100) : 0;

  const handleError = (err) => {
    console.error(err);
    alert(`Não foi possível salvar: ${err?.message || 'erro desconhecido'}`);
  };

  const changeMonth = (newKey) => {
    setMonthKey(newKey);
    setFeeDraft(null);
    setCopied(false);
  };

  const togglePayment = (group, charge) => {
    if (charge.paid) {
      if (!confirm(`Desmarcar o pagamento de ${charge.name} na pelada de ${group.session.date}?`)) return;
      setPayment(group.session.id, charge.playerKey, null).catch(handleError);
      return;
    }
    setPayment(group.session.id, charge.playerKey, {
      amount: charge.amount,
      paidAt: Date.now(),
      paidBy: currentUser?.id || null,
      paidByName: currentUser?.name || 'Admin',
      playerName: charge.name,
      sessionDate: group.session.date || null,
      monthKey
    }).catch(handleError);
  };

  const toggleMensalista = (player) => {
    const isMensalista = mensalistaKeys.has(toFirebaseKey(player.id));
    setMensalista(monthKey, player.id, !isMensalista).catch(handleError);
  };

  const copyFromPreviousMonth = () => {
    if (!previousConfiguredMonth) return;
    const validKeys = new Set(registeredPlayers.map(p => toFirebaseKey(p.id)));
    const copied = Object.fromEntries(
      getMensalistaKeys(finance.months[previousConfiguredMonth])
        .filter(key => validKeys.has(key))
        .map(key => [key, true])
    );
    const count = Object.keys(copied).length;
    const message = mensalistaKeys.size > 0
      ? `Substituir os ${mensalistaKeys.size} mensalistas de ${monthLabel} pelos ${count} de ${getMonthLabel(previousConfiguredMonth)}?`
      : `Copiar os ${count} mensalistas de ${getMonthLabel(previousConfiguredMonth)} para ${monthLabel}?`;
    if (!confirm(message)) return;
    replaceMensalistas(monthKey, copied).catch(handleError);
  };

  const saveFee = (e) => {
    e.preventDefault();
    if (feeDraft === null) return;
    const value = Number(String(feeDraft).replace(',', '.'));
    if (!Number.isFinite(value) || value < 0) {
      alert('Informe um valor válido para a diária.');
      return;
    }
    setMonthDailyFee(monthKey, value).catch(handleError);
    setFeeDraft(null);
  };

  const copyChargeMessage = async () => {
    const lines = summary.pendingByPlayer.map(p => {
      const dates = [...p.dates].reverse().map(shortDate).join(', ');
      return `• ${p.name}: ${plural(p.count, 'diária', 'diárias')} (${dates}) – ${formatCurrency(p.amount)}`;
    });
    const text = `💰 Diárias pendentes – ${monthLabel}\n\n${lines.join('\n')}\n\nTotal: ${formatCurrency(totals.pendingAmount)}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      prompt('Copie o texto abaixo:', text);
    }
  };

  const avatarProps = { users, registeredPlayers, registeredGoleiros };

  const renderDiaristasTab = () => {
    const groups = summary.sessionGroups
      .map(group => ({
        ...group,
        visibleCharges: group.charges.filter(c => filter === 'todos' || (filter === 'pagos' ? c.paid : !c.paid))
      }))
      .filter(group => filter === 'todos' || group.visibleCharges.length > 0);

    return (
      <>
        <div className="finance-chips">
          {FILTERS.map(f => (
            <button
              key={f.key}
              type="button"
              className={`finance-chip ${filter === f.key ? 'active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
              {f.key === 'pendentes' && totals.pendingCount > 0 && <span className="finance-chip-count">{totals.pendingCount}</span>}
            </button>
          ))}
        </div>

        {filter !== 'pagos' && summary.pendingByPlayer.length > 0 && (
          <div className="card finance-debtors">
            <div className="finance-section-head">
              <h3><ClipboardList size={16} /> Quem falta pagar</h3>
              <button type="button" className="finance-outline-btn" onClick={copyChargeMessage}>
                {copied ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar cobrança</>}
              </button>
            </div>
            {summary.pendingByPlayer.map(p => (
              <div key={p.playerKey} className="finance-debtor-row">
                <div className="finance-row-info">
                  <span className="finance-row-name">{p.name}</span>
                  <span className="finance-row-sub">
                    {plural(p.count, 'diária', 'diárias')} · {[...p.dates].reverse().map(shortDate).join(', ')}
                  </span>
                </div>
                <strong className="finance-amount is-pending">{formatCurrency(p.amount)}</strong>
              </div>
            ))}
          </div>
        )}

        {summary.sessionsCount === 0 ? (
          <div className="finance-empty">Nenhuma pelada registrada em {monthLabel}.</div>
        ) : groups.length === 0 ? (
          <div className="finance-empty">
            {filter === 'pendentes' ? '🎉 Nenhuma diária pendente neste mês.' : 'Nenhuma diária paga ainda neste mês.'}
          </div>
        ) : (
          groups.map(group => (
            <div key={group.session.id} className="card finance-session">
              <div className="finance-session-head">
                <div className="finance-row-info">
                  <span className="finance-session-date">📅 {group.session.date}</span>
                  {group.session.name && <span className="finance-row-sub">{group.session.name}</span>}
                </div>
                <div className="finance-session-meta">
                  <span className={`finance-pill ${group.charges.length > 0 && group.paidCount === group.charges.length ? 'is-done' : ''}`}>
                    {group.paidCount}/{group.charges.length} pagos
                  </span>
                  {onOpenSession && (
                    <button type="button" className="finance-link-btn" onClick={() => onOpenSession(group.session.id)}>
                      Ver pelada
                    </button>
                  )}
                </div>
              </div>

              {group.visibleCharges.length === 0 ? (
                <p className="finance-muted">Nenhum diarista nesta pelada.</p>
              ) : (
                group.visibleCharges.map(charge => (
                  <div key={charge.playerKey} className={`finance-row ${charge.paid ? 'is-paid' : ''}`}>
                    <PlayerAvatar {...avatarProps} playerName={charge.name} size={34} />
                    <div className="finance-row-info">
                      <span className="finance-row-name">{charge.name}</span>
                      <span className="finance-row-sub">
                        {!charge.isRegistered && <span className="finance-tag">não cadastrado</span>}
                        {charge.paid
                          ? `Pago ${formatPaidAt(charge.payment?.paidAt) ? `em ${formatPaidAt(charge.payment.paidAt)} ` : ''}· ${charge.payment?.paidByName || 'Admin'}`
                          : charge.teamName}
                      </span>
                    </div>
                    <span className={`finance-amount ${charge.paid ? 'is-paid' : 'is-pending'}`}>{formatCurrency(charge.amount)}</span>
                    <label className="finance-check" title={charge.paid ? 'Desmarcar pagamento' : 'Marcar como pago'}>
                      <input type="checkbox" checked={charge.paid} onChange={() => togglePayment(group, charge)} />
                      <span className="finance-check-box"><Check size={16} strokeWidth={3} /></span>
                      <span className="finance-check-label">Pago</span>
                    </label>
                  </div>
                ))
              )}
            </div>
          ))
        )}
      </>
    );
  };

  const renderMensalistasTab = () => {
    const query = search.trim().toLowerCase();
    const players = [...registeredPlayers]
      .filter(p => String(p.name || '').toLowerCase().includes(query))
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));

    return (
      <>
        <form className="card finance-fee-card" onSubmit={saveFee}>
          <label className="finance-field-label" htmlFor="finance-fee-input">Valor da diária em {getMonthName(monthKey)}</label>
          <div className="input-group">
            <span className="finance-fee-prefix">R$</span>
            <input
              id="finance-fee-input"
              type="number"
              min="0"
              step="0.5"
              inputMode="decimal"
              className="input-field"
              value={feeDraft ?? summary.fee}
              onChange={(e) => setFeeDraft(e.target.value)}
            />
            <button type="submit" className="btn-primary" disabled={feeDraft === null} style={{ opacity: feeDraft === null ? 0.5 : 1 }}>
              Salvar
            </button>
          </div>
          <small className="finance-muted">Vale só para este mês. Pagamentos já marcados mantêm o valor registrado.</small>
        </form>

        <div className="finance-section-head">
          <span className="finance-muted"><strong className="finance-strong">{mensalistaKeys.size}</strong> mensalistas em {monthLabel}</span>
          {previousConfiguredMonth && (
            <button type="button" className="finance-outline-btn" onClick={copyFromPreviousMonth}>
              <Copy size={14} /> Copiar de {getMonthLabel(previousConfiguredMonth)}
            </button>
          )}
        </div>
        <p className="finance-muted" style={{ margin: 0 }}>
          Marque quem é mensalista neste mês. Quem jogar uma pelada do mês sem estar marcado entra automaticamente na lista de diaristas.
        </p>

        <input
          type="text"
          className="input-field finance-search"
          placeholder="🔍 Buscar jogador..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="card finance-player-list">
          {players.length === 0 ? (
            <p className="finance-muted" style={{ padding: 16, textAlign: 'center' }}>Nenhum jogador encontrado.</p>
          ) : players.map(player => {
            const checked = mensalistaKeys.has(toFirebaseKey(player.id));
            const appearances = appearancesInMonth[player.id] || 0;
            return (
              <label key={player.id} className={`finance-player-row ${checked ? 'is-checked' : ''}`}>
                <span className="finance-check">
                  <input type="checkbox" checked={checked} onChange={() => toggleMensalista(player)} />
                  <span className="finance-check-box"><Check size={16} strokeWidth={3} /></span>
                </span>
                <PlayerAvatar {...avatarProps} playerName={player.name} size={30} />
                <div className="finance-row-info">
                  <span className="finance-row-name">{player.name}</span>
                  {appearances > 0 && (
                    <span className="finance-row-sub">{plural(appearances, 'pelada', 'peladas')} no mês</span>
                  )}
                </div>
                {checked && <span className="finance-tag is-mensalista">Mensalista</span>}
              </label>
            );
          })}
        </div>
      </>
    );
  };

  return (
    <div className="main-content animated finance-screen">
      <header className="header" style={{ padding: '8px 0', borderBottom: 'none', gap: 12 }}>
        <button className="back-btn" onClick={onBack} aria-label="Voltar">
          <ChevronLeft size={28} />
        </button>
        <h1 style={{ margin: 0 }}>Controle de Diárias</h1>
      </header>

      <div className="finance-month-nav">
        <button
          type="button"
          className="finance-month-arrow"
          onClick={() => changeMonth(shiftMonthKey(monthKey, -1))}
          disabled={monthKey <= minMonthKey}
          aria-label="Mês anterior"
          title={monthKey <= minMonthKey ? `O controle começa em ${getMonthLabel(minMonthKey)}` : undefined}
        >
          <ChevronLeft size={20} />
        </button>
        <div className="finance-month-label">
          <span>{monthLabel}</span>
          {monthKey === currentMonthKey && <small>mês atual</small>}
        </div>
        <button
          type="button"
          className="finance-month-arrow"
          onClick={() => changeMonth(shiftMonthKey(monthKey, 1))}
          disabled={monthKey >= maxMonthKey}
          aria-label="Próximo mês"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {!isFinanceLoaded ? (
        <div className="finance-empty">Carregando controle de diárias...</div>
      ) : (
        <>
          {!summary.isConfigured && (
            <div className="finance-alert">
              <AlertTriangle size={18} />
              <div className="finance-row-info">
                <strong>Mensalistas de {monthLabel} não definidos</strong>
                <span>Enquanto a lista estiver vazia, todos que jogaram aparecem como diaristas.</span>
              </div>
              {tab !== 'mensalistas' && (
                <button type="button" className="finance-outline-btn" onClick={() => setTab('mensalistas')}>Definir</button>
              )}
            </div>
          )}

          <div className="finance-summary-grid">
            <div className="finance-stat">
              <span className="finance-stat-label">Arrecadado</span>
              <strong className="finance-stat-value is-paid">{formatCurrency(totals.paidAmount)}</strong>
              <small>{plural(totals.paidCount, 'diária paga', 'diárias pagas')}</small>
            </div>
            <div className="finance-stat">
              <span className="finance-stat-label">A receber</span>
              <strong className="finance-stat-value is-pending">{formatCurrency(totals.pendingAmount)}</strong>
              <small>{plural(totals.pendingCount, 'pendente', 'pendentes')}</small>
            </div>
            <div className="finance-stat">
              <span className="finance-stat-label">Diária</span>
              <strong className="finance-stat-value">{formatCurrency(summary.fee)}</strong>
              <small>{plural(summary.sessionsCount, 'pelada', 'peladas')} no mês</small>
            </div>
            <div className="finance-stat">
              <span className="finance-stat-label">Mensalistas</span>
              <strong className="finance-stat-value">{summary.mensalistasCount}</strong>
              <small>definidos para o mês</small>
            </div>
          </div>

          {totalExpected > 0 && (
            <div className="finance-progress" title={`${paidPercent}% das diárias recebidas`}>
              <div className="finance-progress-bar"><span style={{ width: `${paidPercent}%` }} /></div>
              <small>{paidPercent}% das diárias do mês recebidas</small>
            </div>
          )}

          {otherMonthsPending.length > 0 && (
            <div className="finance-other-months">
              <span className="finance-muted">Pendências em outros meses:</span>
              {otherMonthsPending.map(m => (
                <button key={m.monthKey} type="button" className="finance-chip" onClick={() => changeMonth(m.monthKey)}>
                  {getMonthLabel(m.monthKey)} · {formatCurrency(m.pendingAmount)}
                </button>
              ))}
            </div>
          )}

          <div className="finance-tabs">
            <button type="button" className={`finance-tab ${tab === 'diaristas' ? 'active' : ''}`} onClick={() => setTab('diaristas')}>
              💵 Diárias ({totals.charges})
            </button>
            <button type="button" className={`finance-tab ${tab === 'mensalistas' ? 'active' : ''}`} onClick={() => setTab('mensalistas')}>
              📋 Mensalistas ({summary.mensalistasCount})
            </button>
          </div>

          {tab === 'diaristas' ? renderDiaristasTab() : renderMensalistasTab()}
        </>
      )}
    </div>
  );
};

export default FinanceScreen;
