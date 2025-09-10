import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const PaymentsContext = createContext(null);

export function PaymentsProvider({ children }){
  const [payments, setPayments] = useState([]); // raw remote payments
  const [loaded, setLoaded] = useState(false);
  const [error,setError] = useState(null);
  const [ownerMap, setOwnerMap] = useState(()=> {
    try { return JSON.parse(localStorage.getItem('cb_payment_owners')) || {}; } catch(_) { return {}; }
  });

  const currentUser = useMemo(()=>{
    try { return JSON.parse(localStorage.getItem('cb_user')); } catch(_) { return null; }
  }, []);

  useEffect(()=>{
    const controller = new AbortController();
    async function load(){
      try {
        const res = await fetch('http://localhost:8000/payments', { signal: controller.signal });
        if(!res.ok) throw new Error('http '+res.status);
        const data = await res.json();
        setPayments(data || []);
      } catch(e){ setError(e.message); }
      finally { setLoaded(true); }
    }
    load();
    return ()=> controller.abort();
  }, []);

  // Persist owner mapping on change
  useEffect(()=>{
    try { localStorage.setItem('cb_payment_owners', JSON.stringify(ownerMap)); } catch(_) {}
  }, [ownerMap]);

  const addPayment = (p) => {
    setPayments(prev => [p, ...prev]);
    if(p?.id && currentUser?.email){
      setOwnerMap(prev => ({ ...prev, [p.id]: currentUser.email }));
    }
  };
  const refresh = async () => {
    try {
      const res = await fetch('http://localhost:8000/payments');
      if(res.ok){
        const data = await res.json();
        setPayments(data||[]);
      }
    } catch(_){ /* ignore */ }
  };
  // If user has no payments yet, seed some demo ones locally (not persisted to backend) for display.
  useEffect(()=>{
    if(!currentUser?.email) return;
    const existingForUser = payments.filter(p => (p.receiver_account||ownerMap[p.id]) === currentUser.email);
    const seededFlagKey = 'cb_seed_pay_'+currentUser.email;
    if(existingForUser.length === 0 && !localStorage.getItem(seededFlagKey)){
      const statuses = ['OPEN','SUCCESSFUL','FLAGGED','FAILED','OPEN','SUCCESSFUL','FAILED'];
      const demo = statuses.slice(0,7).map((st,idx)=>({
        id: 'demo-'+Date.now().toString(36)+'-'+idx,
        amount: [49, 129, 1999, 75, 360, 18, 870][idx % 7],
        currency: idx % 2 ? 'EUR' : 'RON',
        label: st==='FLAGGED'? 'Flagged transaction' : st==='FAILED'? 'Failed charge' : st==='SUCCESSFUL'? 'Monthly premium' : 'Pending invoice',
        status: st,
        created_at: new Date(Date.now() - idx*3600*1000).toISOString(),
        receiver_account: currentUser.email,
        payment_channel: idx%2? 'Card':'Bank Transfer',
        merchant_category: idx%2? 'games':'pharmacy'
      }));
      setPayments(prev => [...demo, ...prev]);
      localStorage.setItem(seededFlagKey,'1');
    }
  }, [currentUser, payments, ownerMap]);

  // Filter by receiver_account (primary) falling back to ownerMap mapping if older created locally.
  const filtered = useMemo(()=>{
    if(!currentUser?.email) return payments;
    const mine = payments.filter(p => p.receiver_account === currentUser.email || ownerMap[p.id] === currentUser.email);
    // Fallback: if user has zero associated payments (e.g. seed used a different email), show all so UI isn't empty
    return mine.length === 0 ? payments : mine;
  }, [payments, ownerMap, currentUser]);

  return <PaymentsContext.Provider value={{ payments: filtered, loaded, error, addPayment, refresh }}>{children}</PaymentsContext.Provider>;
}

export function usePayments(){
  const ctx = useContext(PaymentsContext);
  if(!ctx) throw new Error('usePayments must be inside PaymentsProvider');
  return ctx;
}
