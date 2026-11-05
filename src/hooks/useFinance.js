import { useState, useEffect } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { db } from '../api/firebase';
import { toFirebaseKey } from '../utils/finance';

// Estrutura no banco:
// finance/months/{yyyy-mm}/mensalistas/{playerId}: true
// finance/months/{yyyy-mm}/dailyFee: number
// finance/payments/{sessionId}/{playerKey}: { amount, paidAt, paidBy, paidByName }
//
// As escritas são sempre em caminhos específicos (nunca reescrevem a lista inteira),
// então dois admins marcando pagamentos ao mesmo tempo não sobrescrevem um ao outro.
export const useFinance = (enabled) => {
  const [finance, setFinance] = useState({ months: {}, payments: {} });
  const [isFinanceLoaded, setIsFinanceLoaded] = useState(false);

  useEffect(() => {
    if (!enabled) return undefined;
    const unsubscribe = onValue(ref(db, 'finance'), (snapshot) => {
      const val = snapshot.val() || {};
      setFinance({ months: val.months || {}, payments: val.payments || {} });
      setIsFinanceLoaded(true);
    }, (error) => {
      console.error('Erro ao carregar controle de diárias:', error);
      setIsFinanceLoaded(true);
    });
    return unsubscribe;
  }, [enabled]);

  const setMensalista = (monthKey, playerId, isMensalista) =>
    set(ref(db, `finance/months/${monthKey}/mensalistas/${toFirebaseKey(playerId)}`), isMensalista ? true : null);

  const replaceMensalistas = (monthKey, mensalistasMap) =>
    set(ref(db, `finance/months/${monthKey}/mensalistas`), mensalistasMap && Object.keys(mensalistasMap).length > 0 ? mensalistasMap : null);

  const setMonthDailyFee = (monthKey, fee) =>
    set(ref(db, `finance/months/${monthKey}/dailyFee`), fee);

  const setPayment = (sessionId, playerKey, paymentData) =>
    set(ref(db, `finance/payments/${toFirebaseKey(sessionId)}/${playerKey}`), paymentData || null);

  return {
    finance,
    isFinanceLoaded,
    setMensalista,
    replaceMensalistas,
    setMonthDailyFee,
    setPayment
  };
};
