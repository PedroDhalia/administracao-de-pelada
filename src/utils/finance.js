// Controle de diárias: quem joga num mês sem estar na lista de mensalistas
// daquele mês deve a diária de cada pelada em que entrou.

export const DEFAULT_DAILY_FEE = 25;

// Mês em que o controle de diárias passou a valer (yyyy-mm). Peladas anteriores
// não geram cobrança nem aparecem como pendência.
export const FINANCE_START_MONTH = '2026-11';

export const isBeforeFinanceStart = (monthKey) => String(monthKey) < FINANCE_START_MONTH;

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

// Chaves do Realtime Database não aceitam . # $ / [ ]
export const toFirebaseKey = (value) => String(value ?? '').trim().replace(/[.#$/[\]]/g, '_');

const normalizeName = (name) => String(name || '').trim().toLowerCase();

// 'dd/mm/yyyy' -> 'yyyy-mm' (formato usado como chave no banco)
export const getMonthKeyFromDate = (dateStr) => {
  if (typeof dateStr !== 'string') return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  const [, month, year] = parts;
  if (!/^\d{1,2}$/.test(month) || !/^\d{4}$/.test(year)) return null;
  return `${year}-${month.padStart(2, '0')}`;
};

export const getMonthKeyFromJsDate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export const shiftMonthKey = (monthKey, delta) => {
  const [year, month] = monthKey.split('-').map(Number);
  return getMonthKeyFromJsDate(new Date(year, month - 1 + delta, 1));
};

export const getMonthLabel = (monthKey) => {
  const [year, month] = String(monthKey).split('-');
  return `${MONTH_NAMES[Number(month) - 1] || month}/${year}`;
};

export const getMonthName = (monthKey) => {
  const [, month] = String(monthKey).split('-');
  return MONTH_NAMES[Number(month) - 1] || month;
};

export const formatCurrency = (value) =>
  (Number(value) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const dateSortValue = (dateStr) => {
  const p = String(dateStr || '').split('/');
  if (p.length !== 3) return 0;
  return Number(p[2]) * 10000 + Number(p[1]) * 100 + Number(p[0]);
};

export const getMonthDailyFee = (monthConfig) => {
  const raw = monthConfig?.dailyFee;
  if (raw === undefined || raw === null || raw === '') return DEFAULT_DAILY_FEE;
  const fee = Number(raw);
  return Number.isFinite(fee) && fee >= 0 ? fee : DEFAULT_DAILY_FEE;
};

export const getMensalistaKeys = (monthConfig) =>
  Object.entries(monthConfig?.mensalistas || {})
    .filter(([, value]) => !!value)
    .map(([key]) => key);

export const isMonthConfigured = (monthConfig) => getMensalistaKeys(monthConfig).length > 0;

// Chave estável do jogador dentro de uma pelada: id do cadastro quando existe,
// senão o nome normalizado (jogador digitado à mão e não cadastrado).
const getPlayerKey = (registeredPlayer, name) =>
  registeredPlayer ? toFirebaseKey(registeredPlayer.id) : `nome_${toFirebaseKey(normalizeName(name))}`;

export const computeMonthFinance = ({ sessions = [], registeredPlayers = [], monthKey, monthConfig, payments = {} }) => {
  const fee = getMonthDailyFee(monthConfig);
  const mensalistaKeys = new Set(getMensalistaKeys(monthConfig));
  const playersByName = new Map(registeredPlayers.map(p => [normalizeName(p.name), p]));

  const monthSessions = (isBeforeFinanceStart(monthKey) ? [] : sessions)
    .filter(s => getMonthKeyFromDate(s?.date) === monthKey)
    .sort((a, b) => dateSortValue(b.date) - dateSortValue(a.date));

  const totals = { charges: 0, paidCount: 0, paidAmount: 0, pendingCount: 0, pendingAmount: 0 };
  const pendingByPlayerMap = new Map();

  const sessionGroups = monthSessions.map(session => {
    const sessionKey = toFirebaseKey(session.id);
    const sessionPayments = payments?.[sessionKey] || {};
    const seen = new Set();
    const charges = [];

    (session.teams || []).forEach(team => {
      (team.players || []).forEach(sessionPlayer => {
        const name = String(sessionPlayer?.name || '').trim();
        if (!name) return;

        const registered = playersByName.get(normalizeName(name));
        const playerKey = getPlayerKey(registered, name);
        if (seen.has(playerKey)) return;
        seen.add(playerKey);

        if (registered && mensalistaKeys.has(toFirebaseKey(registered.id))) return;

        const payment = sessionPayments[playerKey] || null;
        const amount = payment && payment.amount !== undefined ? Number(payment.amount) || 0 : fee;

        charges.push({
          playerKey,
          playerId: registered?.id || null,
          name: registered?.name || name,
          isRegistered: !!registered,
          teamName: team.name || '',
          amount,
          paid: !!payment,
          payment
        });
      });
    });

    charges.sort((a, b) => a.name.localeCompare(b.name));

    let paidCount = 0;
    charges.forEach(charge => {
      totals.charges += 1;
      if (charge.paid) {
        paidCount += 1;
        totals.paidCount += 1;
        totals.paidAmount += charge.amount;
      } else {
        totals.pendingCount += 1;
        totals.pendingAmount += charge.amount;
        const entry = pendingByPlayerMap.get(charge.playerKey) || { playerKey: charge.playerKey, name: charge.name, count: 0, amount: 0, dates: [] };
        entry.count += 1;
        entry.amount += charge.amount;
        entry.dates.push(session.date);
        pendingByPlayerMap.set(charge.playerKey, entry);
      }
    });

    return { session, sessionKey, charges, paidCount };
  });

  const pendingByPlayer = [...pendingByPlayerMap.values()]
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));

  return {
    monthKey,
    fee,
    isConfigured: mensalistaKeys.size > 0,
    mensalistasCount: mensalistaKeys.size,
    sessionsCount: monthSessions.length,
    sessionGroups,
    pendingByPlayer,
    totals
  };
};

// Pendências em outros meses (só meses com mensalistas definidos, para não
// acusar dívida em meses anteriores à adoção do controle).
export const getOutstandingByMonth = ({ sessions = [], registeredPlayers = [], finance, excludeMonthKey }) => {
  const months = finance?.months || {};
  return Object.keys(months)
    .filter(key => key !== excludeMonthKey && !isBeforeFinanceStart(key) && isMonthConfigured(months[key]))
    .map(key => {
      const { totals } = computeMonthFinance({
        sessions,
        registeredPlayers,
        monthKey: key,
        monthConfig: months[key],
        payments: finance?.payments
      });
      return { monthKey: key, pendingCount: totals.pendingCount, pendingAmount: totals.pendingAmount };
    })
    .filter(m => m.pendingCount > 0)
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
};

// Mês anterior mais recente com mensalistas definidos (para copiar a lista).
export const findPreviousConfiguredMonth = (finance, monthKey) => {
  const months = finance?.months || {};
  return Object.keys(months)
    .filter(key => key < monthKey && !isBeforeFinanceStart(key) && isMonthConfigured(months[key]))
    .sort()
    .pop() || null;
};
