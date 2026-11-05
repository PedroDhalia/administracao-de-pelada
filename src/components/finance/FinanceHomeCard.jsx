import { useMemo } from 'react';
import { ChevronRight, AlertTriangle } from 'lucide-react';
import {
  computeMonthFinance,
  getOutstandingByMonth,
  getMonthKeyFromJsDate,
  getMonthName,
  formatCurrency
} from '../../utils/finance';
import './Finance.css';

const FinanceHomeCard = ({ sessions, registeredPlayers, finance, isLoaded, onOpen }) => {
  const monthKey = getMonthKeyFromJsDate();

  const summary = useMemo(() => computeMonthFinance({
    sessions,
    registeredPlayers,
    monthKey,
    monthConfig: finance?.months?.[monthKey],
    payments: finance?.payments
  }), [sessions, registeredPlayers, finance, monthKey]);

  const previousPending = useMemo(() => getOutstandingByMonth({
    sessions,
    registeredPlayers,
    finance,
    excludeMonthKey: monthKey
  }).reduce((sum, m) => sum + m.pendingAmount, 0), [sessions, registeredPlayers, finance, monthKey]);

  const { totals } = summary;

  return (
    <div
      role="button"
      tabIndex={0}
      className="card finance-home-card animated"
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
    >
      <div className="finance-home-head">
        <span className="finance-home-title">💰 Controle de Diárias</span>
        <span className="finance-home-month">{getMonthName(monthKey)} <ChevronRight size={16} /></span>
      </div>

      {!isLoaded ? (
        <span className="finance-muted">Carregando...</span>
      ) : !summary.isConfigured ? (
        <div className="finance-home-warning">
          <AlertTriangle size={16} />
          <span>Defina os mensalistas de {getMonthName(monthKey)} para começar o controle.</span>
        </div>
      ) : (
        <div className="finance-home-stats">
          <div className="finance-stat">
            <span className="finance-stat-label">A receber</span>
            <strong className="finance-stat-value is-pending">{formatCurrency(totals.pendingAmount)}</strong>
            <small>{totals.pendingCount} {totals.pendingCount === 1 ? 'diária pendente' : 'diárias pendentes'}</small>
          </div>
          <div className="finance-stat">
            <span className="finance-stat-label">Arrecadado</span>
            <strong className="finance-stat-value is-paid">{formatCurrency(totals.paidAmount)}</strong>
            <small>{totals.paidCount} {totals.paidCount === 1 ? 'diária paga' : 'diárias pagas'}</small>
          </div>
        </div>
      )}

      {isLoaded && previousPending > 0 && (
        <div className="finance-home-previous">
          + {formatCurrency(previousPending)} pendentes de meses anteriores
        </div>
      )}
    </div>
  );
};

export default FinanceHomeCard;
