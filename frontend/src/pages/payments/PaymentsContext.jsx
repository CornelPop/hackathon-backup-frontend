import React, { createContext, useContext, useEffect, useState } from 'react';

const PaymentsContext = createContext(null);

export function PaymentsProvider({ children }){
  const [payments, setPayments] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error,setError] = useState(null);

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

  const addPayment = (p) => setPayments(prev => [p, ...prev]);
  const refresh = async () => {
    try {
      const res = await fetch('http://localhost:8000/payments');
      if(res.ok){
        const data = await res.json();
        setPayments(data||[]);
      }
    } catch(_){ /* ignore */ }
  };
  return <PaymentsContext.Provider value={{ payments, loaded, error, addPayment, refresh }}>{children}</PaymentsContext.Provider>;
}

export function usePayments(){
  const ctx = useContext(PaymentsContext);
  if(!ctx) throw new Error('usePayments must be inside PaymentsProvider');
  return ctx;
}
