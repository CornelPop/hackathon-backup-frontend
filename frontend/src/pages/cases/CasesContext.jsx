import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// Status flow: Open -> In Progress -> Sent -> Won/Lost
export const STATUS_COLORS = {
  Open: 'default',
  'In Progress': 'processing',
  Sent: 'purple',
  Won: 'green',
  Lost: 'red'
};

// Audit event action enums (front-end only for now)
export const EVENT_ACTIONS = {
  STATUS_CHANGE: 'status_change',
  AI_RECOMMENDATION: 'ai_recommendation',
  RULES_APPLIED: 'rules_applied',
  FILE_UPLOAD: 'file_upload',
  FILE_DELETE: 'file_delete',
  LETTER_GENERATED: 'letter_generated',
  CASE_SENT: 'case_sent',
  SLA_THRESHOLD: 'sla_threshold',
  POLICY_CHANGE: 'policy_change',
  OVERRIDE_DECISION: 'override_decision',
  NOTE_ADDED: 'note_added',
  CHECKLIST_UPDATE: 'checklist_update'
};

// Motive-based reusable checklist templates.
// status flow per item: missing -> uploaded -> ok (or) na (not applicable)
// Each template item may contain simple keyword hints (mock) for future extraction.
export const CHECKLIST_TEMPLATES = {
  Fraudă: [
    { id: 'fraud-3ds', label: 'Dovadă 3-D Secure (ECI/CAVV)', required: true, keywords:['3DS','ECI','CAVV'] },
    { id: 'fraud-avs-cvv', label: 'Rezultat AVS/CVV', required: true, keywords:['AVS','CVV'] },
    { id: 'fraud-ip-device', label: 'IP / Device + țară', required: true, keywords:['IP','Device'] },
    { id: 'fraud-history', label: 'Istoric client / comportament', required: false },
    { id: 'fraud-logs', label: 'Loguri autentificare', required: false },
  ],
  Nelivrat: [
    { id: 'nl-awb', label: 'AWB / tracking expediere', required: true, keywords:['AWB','tracking'] },
    { id: 'nl-courier-confirm', label: 'Confirmare curier (livrat / în tranzit)', required: true, keywords:['livrat','in tranzit'] },
    { id: 'nl-address', label: 'Adresă expediere comandă', required: true, keywords:['adresă','address'] },
    { id: 'nl-client-chat', label: 'Conversație client', required: false },
  ],
  Neconform: [
    { id: 'nc-photos', label: 'Poze/clip produs (client)', required: true, keywords:['img','jpg','png'] },
    { id: 'nc-description', label: 'Descriere produs / fișă tehnică', required: true },
    { id: 'nc-policy', label: 'Politică retur / garanție', required: true },
    { id: 'nc-rma', label: 'RMA / confirmare retur', required: false },
  ],
  Dublă: [
    { id: 'dbl-both', label: 'Ambele plăți (ID + dată + sumă)', required: true },
    { id: 'dbl-log', label: 'Log / raport procesator (dublare)', required: true },
    { id: 'dbl-settlement', label: 'Stare decontare / refund', required: true },
    { id: 'dbl-cause', label: 'Cauză internă (retry/timeout)', required: false },
  ],
  Abonament: [
    { id: 'sub-cancel', label: 'Cerere anulare (email/ticket)', required: true },
    { id: 'sub-terms', label: 'Termeni plan (cancel/renewal)', required: true },
    { id: 'sub-usage', label: 'Log folosire post-anulare', required: true },
    { id: 'sub-confirm', label: 'Confirmare automată anulare', required: false },
  ],
  Default: [
    { id: 'gen-invoice', label: 'Factură / dovadă plată', required: true },
    { id: 'gen-communication', label: 'Comunicare client', required: false },
  ],
};

export const instantiateChecklist = (reason) => (CHECKLIST_TEMPLATES[reason] || CHECKLIST_TEMPLATES.Default).map(i => ({
  ...i,
  status: 'missing', // missing | uploaded | ok | na
  extracted: '',
  naReason: ''
}));

const seedCases = () => {
  const now = Date.now();
  return [
    {
      id: 'CB-1024',
      status: 'Open',
      reason: 'Fraudă',
      amount: 480,
      currency: 'RON',
      probability: 0.78,
      recommendation: 'Fight',
      owner: 'Dana',
      lastUpdate: now - 1000 * 60 * 60 * 3,
      deadline: now + 1000 * 60 * 60 * 55, // 55h
      letter: '',
      history: [{ at: now - 1000 * 60 * 60 * 5, text: 'Case created' }],
  checklist: instantiateChecklist('Fraudă'),
      attachments: [],
      notes: [],
      activity: [{ id: 'a-'+now+'-0', at: now - 1000 * 60 * 60 * 5, text: 'Case created', type: 'system' }],
      analysis: { reasons: ['3DS=DA', 'IP consistent'], rulesSummary: '3DS valid + device consistent → recomandare Fight' }
    },
    {
      id: 'CB-1025',
      status: 'In Progress',
      reason: 'Nelivrat',
      amount: 1299,
      currency: 'RON',
      probability: 0.64,
      recommendation: 'Fight',
      owner: 'Mihai',
      lastUpdate: now - 1000 * 60 * 30,
      deadline: now + 1000 * 60 * 60 * 23, // 23h (red)
      letter: '',
      history: [{ at: now - 1000 * 60 * 60 * 7, text: 'Case created' }, { at: now - 1000 * 60 * 30, text: 'Evidence uploaded (AWB)' }],
  checklist: instantiateChecklist('Nelivrat'),
      attachments: [],
      notes: [],
      activity: [{ id: 'a-'+now+'-1', at: now - 1000 * 60 * 60 * 7, text: 'Case created', type: 'system' }],
      analysis: { reasons: ['AWB lipsă încă'], rulesSummary: 'Lipsește dovada livrare → verifică AWB' }
    },
    {
      id: 'CB-1026',
      status: 'Sent',
      reason: 'Dublă',
      amount: 59,
      currency: 'EUR',
      probability: 0.42,
      recommendation: 'Refund',
      owner: 'Irina',
      lastUpdate: now - 1000 * 60 * 60 * 11,
      deadline: now + 1000 * 60 * 60 * 120,
      letter: 'Draft existent ...',
      history: [{ at: now - 1000 * 60 * 60 * 15, text: 'Case created' }, { at: now - 1000 * 60 * 60 * 11, text: 'Letter sent' }],
  checklist: instantiateChecklist('Dublă'),
      attachments: [],
      notes: [],
      activity: [{ id: 'a-'+now+'-2', at: now - 1000 * 60 * 60 * 15, text: 'Case created', type: 'system' }],
      analysis: { reasons: ['Sumă mică', 'Dublare clară'], rulesSummary: 'Dublă confirmată → Refund economic' }
    }
  ];
};

const CasesContext = createContext(null);

// Ensure every case object has the new extended shape (migration for older localStorage data)
function ensureCaseShape(c){
  const now = Date.now();
  return {
    checklist: [],
    attachments: [],
    notes: [],
    activity: [],
    analysis: { reasons: [], rulesSummary: '' },
    events: [],
  history: [],
    ...c,
  history: (c.history && Array.isArray(c.history)) ? c.history : (c.lastUpdate ? [{ at: c.lastUpdate, text: 'Loaded' }] : []),
    checklist: (c.checklist && Array.isArray(c.checklist) ? c.checklist : instantiateChecklist(c.reason || 'Default')).map(i => ({
      ...i,
      status: i.status || 'missing',
      extracted: i.extracted || '',
      naReason: i.naReason || ''
    })),
    attachments: Array.isArray(c.attachments)? c.attachments : [],
    notes: Array.isArray(c.notes)? c.notes : [],
    activity: Array.isArray(c.activity)? c.activity : (c.history? [{ id:'a-'+now+'-'+Math.random().toString(36).slice(2,7), at: c.history[0]?.at || now, text:'Case loaded (migrated)', type:'system'}]:[]),
    analysis: c.analysis && typeof c.analysis==='object' ? { reasons: c.analysis.reasons||[], rulesSummary: c.analysis.rulesSummary||'' } : { reasons: [], rulesSummary: '' },
    events: Array.isArray(c.events) ? c.events : (Array.isArray(c.activity) ? c.activity.map(a => ({
      id: a.id || ('e-'+now+'-'+Math.random().toString(36).slice(2,7)),
      at: a.at || now,
      actor: a.actor || { id: 'user', name: 'User' },
      action: a.type === 'status' ? EVENT_ACTIONS.STATUS_CHANGE : 'legacy',
      caseId: c.id,
      details: { text: a.text },
      protected: false,
      category: 'legacy'
    })) : [])
  };
}

export function CasesProvider({ children }) {
  const [cases, setCases] = useState(() => {
    try {
      const raw = localStorage.getItem('cb_cases');
      if (raw) {
        const parsed = JSON.parse(raw);
        if(Array.isArray(parsed)) return parsed.map(ensureCaseShape);
      }
    } catch (_) {}
    return seedCases().map(ensureCaseShape);
  });
  const [loadedRemote, setLoadedRemote] = useState(false);

  // Attempt remote load (idempotent). If backend reachable, replace local data (shallow fields only for now)
  useEffect(()=>{
    const controller = new AbortController();
    async function loadRemote(){
      try {
        const res = await fetch('http://localhost:8000/cases', { signal: controller.signal });
        if(!res.ok) throw new Error('http error');
        const data = await res.json();
        if(Array.isArray(data) && data.length){
          setCases(prev => {
            // map incoming into local extended shape; we keep existing local if same id to avoid losing rich fields
            const map = new Map(prev.map(c=>[c.id,c]));
            const merged = data.map(r => {
              const existing = map.get(r.id);
              const deadlineMs = r.deadline ? Date.parse(r.deadline) : (existing?.deadline || Date.now()+72*3600*1000);
              return ensureCaseShape({
                id: r.id,
                reason: r.reason,
                status: r.status,
                amount: r.amount,
                currency: r.currency,
                probability: r.probability,
                recommendation: r.recommendation,
                owner: r.owner || existing?.owner,
                lastUpdate: existing?.lastUpdate || Date.now(),
                deadline: deadlineMs,
                letter: existing?.letter || '',
                checklist: existing?.checklist || instantiateChecklist(r.reason),
                notes: existing?.notes || [],
                attachments: existing?.attachments || [],
                analysis: existing?.analysis || { reasons: [], rulesSummary: '' },
                events: existing?.events || [],
                history: existing?.history || [{ at: Date.now(), text: 'Imported' }]
              });
            });
            return merged;
          });
          setLoadedRemote(true);
        }
      } catch (e){
        // silent fallback
      }
    }
    if(!loadedRemote) loadRemote();
    return ()=> controller.abort();
  }, [loadedRemote]);

  useEffect(() => {
    // On each change persist migrated version
    try { localStorage.setItem('cb_cases', JSON.stringify(cases)); } catch (_) {}
  }, [cases]);

  const addActivity = (c, text, type='system') => ({ ...c, activity: [...c.activity, { id: 'act-'+Date.now()+'-'+Math.random().toString(36).slice(2,7), at: Date.now(), text, type }] });

  const logEvent = useCallback((c, payload) => {
    const evt = {
      id: 'evt-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),
      at: Date.now(),
      actor: payload.actor || { id: 'user', name: 'User' },
      action: payload.action,
      caseId: c.id,
      details: payload.details || {},
      protected: payload.protected || false,
      category: payload.category || payload.action
    };
    return { ...c, events: [...(c.events||[]), evt] };
  }, []);

  const updateCase = useCallback((id, patch, note, actType='system') => {
    setCases(prev => prev.map(c => c.id === id ? (() => {
      const updated = {
        ...c,
        ...patch,
        lastUpdate: Date.now(),
        history: note ? [...c.history, { at: Date.now(), text: note }] : c.history
      };
      return note ? addActivity(updated, note, actType) : updated;
    })() : c));
  }, []);

  const changeStatus = useCallback((id, status, actor) => {
    setCases(prev => prev.map(c => c.id === id ? (() => {
      const patched = { ...c, status, lastUpdate: Date.now(), history: [...c.history, { at: Date.now(), text: `Status -> ${status}` }] };
      const withAct = addActivity(patched, `Status -> ${status}`, 'status');
      const withEvt = logEvent(withAct, { action: EVENT_ACTIONS.STATUS_CHANGE, actor, details:{ status }, category: 'status', protected: ['Sent','Won','Lost'].includes(status) });
      return withEvt;
    })() : c));
  }, [logEvent]);

  const regenerateAnalysis = useCallback((id, actor) => {
    const target = cases.find(c => c.id === id);
    if(!target) return;
    // Simple mock logic: more checklist ok -> higher probability
    const total = target.checklist.length || 1;
    const okCount = target.checklist.filter(i => i.status === 'ok').length;
    const newProb = Math.min(0.95, Math.max(0.15, okCount / total * 0.9 + 0.1));
    const recommendation = newProb > 0.55 ? 'Fight' : 'Refund';
    const reasons = [
      `${okCount}/${total} dovezi solide`,
      recommendation === 'Fight' ? 'Argument favorabil' : 'Cost / șansă mică'
    ];
    setCases(prev => prev.map(c => c.id === id ? (() => {
      let updated = { ...c, probability: newProb, recommendation, analysis: { reasons, rulesSummary: reasons.join(' + ') }, lastUpdate: Date.now(), history:[...c.history,{at:Date.now(),text:'AI analysis regenerated'}] };
      updated = addActivity(updated, 'AI analysis regenerated', 'ai');
      updated = logEvent(updated, { action: EVENT_ACTIONS.AI_RECOMMENDATION, actor, details:{ probability:newProb, recommendation, reasons }, category:'ai'});
      return updated;
    })(): c));
  }, [cases, updateCase]);

  const generateLetter = useCallback((id, actor) => {
    const target = cases.find(c => c.id === id);
    if (!target) return '';
    const evid = target.checklist.filter(i => i.status === 'ok').map(i => `- ${i.label}${i.extracted?`: ${i.extracted}`:''}`).join('\n') || '(niciuna)';
    const draft = `DRAFT SCRISOARE DISPUTĂ\nCase: ${target.id}\nMotiv: ${target.reason}\nSumă: ${target.amount} ${target.currency}\nRecomandare AI: ${target.recommendation} (${Math.round(target.probability*100)}%)\n\nDovezi:\n${evid}\n\nArgument (completează / ajustează):\n[Argument generat AI placeholder]\n\nCu stimă,\nMerchant`;
    const hash = Array.from(draft).reduce((h,ch)=>((h<<5)-h)+ch.charCodeAt(0)|0,0).toString(16);
    setCases(prev => prev.map(c => c.id === id ? (() => {
      let updated = { ...c, letter: draft, lastUpdate: Date.now(), history:[...c.history,{at:Date.now(),text:'Letter generated'}] };
      updated = addActivity(updated, 'Letter generated', 'letter');
      updated = logEvent(updated, { action: EVENT_ACTIONS.LETTER_GENERATED, actor, details:{ version: (c.events?.filter(e=>e.action===EVENT_ACTIONS.LETTER_GENERATED).length||0)+1, hash, length: draft.length }, category:'letter' });
      return updated;
    })(): c));
    return draft;
  }, [cases, updateCase]);

  const updateChecklistItem = useCallback((id, itemId, patch, actor) => {
    setCases(prev => prev.map(c => c.id === id ? (() => {
  const checklist = c.checklist.map(ci => ci.id === itemId ? { ...ci, ...patch } : ci);
  // Simple auto: if status becomes 'uploaded' and required, switch to 'ok' (mock validation)
  const adjusted = checklist.map(ci => ci.id === itemId && ci.status === 'uploaded' ? { ...ci, status: 'ok' } : ci);
      let updatedCase = addActivity({ ...c, checklist: adjusted }, `Checklist: ${itemId} -> ${patch.status || 'update'}`, 'checklist');
      updatedCase = logEvent(updatedCase, { action: EVENT_ACTIONS.CHECKLIST_UPDATE, actor, details:{ itemId, patch }, category:'checklist' });
  return updatedCase;
    })() : c));
  }, []);

  const addAttachment = useCallback((id, fileObj, actor) => {
    setCases(prev => prev.map(c => c.id === id ? (() => {
      let updated = addActivity({ ...c, attachments: [...c.attachments, fileObj] }, `Attachment upload: ${fileObj.name}`, 'attachment');
      updated = logEvent(updated, { action: EVENT_ACTIONS.FILE_UPLOAD, actor, details:{ name:fileObj.name, size:fileObj.size, type:fileObj.type }, category:'file' });
      return updated;
    })() : c));
  }, [logEvent]);

  const addNote = useCallback((id, text, author='User') => {
    setCases(prev => prev.map(c => c.id === id ? (() => {
      let updated = addActivity({ ...c, notes: [...c.notes, { id: 'n-'+Date.now(), text, author, at: Date.now() }] }, `Note added`, 'note');
      updated = logEvent(updated, { action: EVENT_ACTIONS.NOTE_ADDED, actor:{id:'user',name:author}, details:{ text }, category:'note' });
      return updated;
    })() : c));
  }, [logEvent]);

  const contextValue = useMemo(() => ({ cases, updateCase, changeStatus, generateLetter, updateChecklistItem, addAttachment, addNote, regenerateAnalysis, EVENT_ACTIONS, loadedRemote }), [cases, updateCase, changeStatus, generateLetter, updateChecklistItem, addAttachment, addNote, regenerateAnalysis, loadedRemote]);

  return <CasesContext.Provider value={contextValue}>{children}</CasesContext.Provider>;
}

export function useCases() {
  const ctx = useContext(CasesContext);
  if (!ctx) throw new Error('useCases must be inside CasesProvider');
  return ctx;
}
