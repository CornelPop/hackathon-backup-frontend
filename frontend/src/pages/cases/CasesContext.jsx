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
  AI_REVIEW_REQUEST: 'ai_review_request',
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
  'Fraud': [
    { id: 'fraud-3ds', label: '3-D Secure proof (ECI/CAVV)', required: true, keywords:['3DS','ECI','CAVV'] },
    { id: 'fraud-avs-cvv', label: 'AVS/CVV result', required: true, keywords:['AVS','CVV'] },
    { id: 'fraud-ip-device', label: 'IP / Device + country', required: true, keywords:['IP','Device'] },
    { id: 'fraud-history', label: 'Customer history / behavior', required: false },
    { id: 'fraud-logs', label: 'Authentication logs', required: false },
  ],
  'Undelivered': [
    { id: 'nl-awb', label: 'Shipment tracking (AWB)', required: true, keywords:['AWB','tracking'] },
    { id: 'nl-courier-confirm', label: 'Courier confirmation (delivered / in transit)', required: true, keywords:['delivered','in transit'] },
    { id: 'nl-address', label: 'Order shipping address', required: true, keywords:['address'] },
    { id: 'nl-client-chat', label: 'Customer conversation', required: false },
  ],
  'Not as described': [
    { id: 'nc-photos', label: 'Product photos/video (customer)', required: true, keywords:['img','jpg','png'] },
    { id: 'nc-description', label: 'Product description / spec sheet', required: true },
    { id: 'nc-policy', label: 'Return / warranty policy', required: true },
    { id: 'nc-rma', label: 'RMA / return confirmation', required: false },
  ],
  'Double charge': [
    { id: 'dbl-both', label: 'Both payments (ID + date + amount)', required: true },
    { id: 'dbl-log', label: 'Processor log/report (duplication)', required: true },
    { id: 'dbl-settlement', label: 'Settlement / refund status', required: true },
    { id: 'dbl-cause', label: 'Internal cause (retry/timeout)', required: false },
  ],
  'Subscription': [
    { id: 'sub-cancel', label: 'Cancellation request (email/ticket)', required: true },
    { id: 'sub-terms', label: 'Plan terms (cancel/renewal)', required: true },
    { id: 'sub-usage', label: 'Usage log post-cancellation', required: true },
    { id: 'sub-confirm', label: 'Automated cancellation confirmation', required: false },
  ],
  'Default': [
    { id: 'gen-invoice', label: 'Invoice / payment proof', required: true },
    { id: 'gen-communication', label: 'Customer communication', required: false },
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
  reason: 'Fraud',
      amount: 480,
      currency: 'RON',
      probability: 0.78,
      recommendation: 'Fight',
  owner: 'Dana', // seed demo owner
      lastUpdate: now - 1000 * 60 * 60 * 3,
      deadline: now + 1000 * 60 * 60 * 55, // 55h
      letter: '',
      history: [{ at: now - 1000 * 60 * 60 * 5, text: 'Case created' }],
  checklist: instantiateChecklist('Fraud'),
      attachments: [],
      notes: [],
      activity: [{ id: 'a-'+now+'-0', at: now - 1000 * 60 * 60 * 5, text: 'Case created', type: 'system' }],
  analysis: { reasons: ['3DS=YES', 'Consistent IP'], rulesSummary: 'Valid 3DS + consistent IP → Fight recommended' }
    },
    {
      id: 'CB-1025',
      status: 'In Progress',
  reason: 'Undelivered',
      amount: 1299,
      currency: 'RON',
      probability: 0.64,
      recommendation: 'Fight',
  owner: 'Mihai',
      lastUpdate: now - 1000 * 60 * 30,
      deadline: now + 1000 * 60 * 60 * 23, // 23h (red)
      letter: '',
      history: [{ at: now - 1000 * 60 * 60 * 7, text: 'Case created' }, { at: now - 1000 * 60 * 30, text: 'Evidence uploaded (AWB)' }],
  checklist: instantiateChecklist('Undelivered'),
      attachments: [],
      notes: [],
      activity: [{ id: 'a-'+now+'-1', at: now - 1000 * 60 * 60 * 7, text: 'Case created', type: 'system' }],
  analysis: { reasons: ['Tracking missing'], rulesSummary: 'Delivery proof missing → check tracking' }
    },
    {
      id: 'CB-1026',
      status: 'Sent',
  reason: 'Double charge',
      amount: 59,
      currency: 'EUR',
      probability: 0.42,
      recommendation: 'Refund',
  owner: 'Irina',
      lastUpdate: now - 1000 * 60 * 60 * 11,
      deadline: now + 1000 * 60 * 60 * 120,
      letter: 'Draft existent ...',
      history: [{ at: now - 1000 * 60 * 60 * 15, text: 'Case created' }, { at: now - 1000 * 60 * 60 * 11, text: 'Letter sent' }],
  checklist: instantiateChecklist('Double charge'),
      attachments: [],
      notes: [],
      activity: [{ id: 'a-'+now+'-2', at: now - 1000 * 60 * 60 * 15, text: 'Case created', type: 'system' }],
  analysis: { reasons: ['Low amount', 'Clear duplication'], rulesSummary: 'Duplicate confirmed → Refund economical' }
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
  aiReviewRequested: c.aiReviewRequested || false,
  aiAnalysisApplied: c.aiAnalysisApplied || false,
  merchant_name: c.merchant_name || '',
  customer_masked_name: c.customer_masked_name || '',
  customer_masked_email: c.customer_masked_email || '',
  transaction_date: c.transaction_date || null, // epoch ms or ISO string later
  short_description: c.short_description || '',
  actions_taken: c.actions_taken || '',
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
  const currentUser = useMemo(()=> {
    try { return JSON.parse(localStorage.getItem('cb_user')); } catch(_) { return null; }
  }, []);
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

  // Auto-assign missing owners to current user on mount / login
  useEffect(()=>{
    if(!currentUser?.email) return;
    setCases(prev => prev.map(c => (!c.owner || c.owner==='—') ? { ...c, owner: currentUser.email } : c));
  }, [currentUser]);

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
      `${okCount}/${total} solid evidence items`,
      recommendation === 'Fight' ? 'Favorable argument' : 'Low probability / cost weighs'
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

    // Checklist breakdown
    const chkReq = target.checklist.filter(i=>i.required);
    const chkOpt = target.checklist.filter(i=>!i.required);
    const fmtItem = i => `- ${i.label} [${i.status.toUpperCase()}]${i.naReason?` (N/A: ${i.naReason})`:''}${i.extracted?` -> ${i.extracted}`:''}`;
    const checklistSection = [
      'EVIDENCE / CHECKLIST SECTION:',
      'Required:',
      chkReq.length ? chkReq.map(fmtItem).join('\n') : '(none)',
      'Optional:',
      chkOpt.length ? chkOpt.map(fmtItem).join('\n') : '(none)'
    ].join('\n');

    // Attachments
  const attachmentsSection = 'ATTACHMENTS:\n' + (target.attachments.length ? target.attachments.map(a=>`- ${a.name} (${(a.size/1024).toFixed(1)} KB, ${a.type||'unknown type'})`).join('\n') : '(no files uploaded)');

    // Notes (exclude system / dossier auto updates)
  const userNotes = target.notes.filter(n => (n.author||'').toLowerCase() !== 'system' && !n.text.startsWith('Case updated'));
  const notesSection = 'RELEVANT INTERNAL NOTES:\n' + (userNotes.length ? userNotes.sort((a,b)=>a.at-b.at).map(n=>`- ${new Date(n.at).toLocaleDateString()} ${n.author||'User'}: ${n.text}`).join('\n') : '(none)');

    // Dossier meta
  const dossier = `CASE DOSSIER:\nMerchant: ${target.merchant_name || '(unknown)'}\nCustomer (masked): ${target.customer_masked_name || '-'}\nCustomer email (masked): ${target.customer_masked_email || '-'}\nTransaction date: ${target.transaction_date ? new Date(target.transaction_date).toLocaleDateString() : '(unknown)'}\nShort description: ${target.short_description || '(missing)'}\nActions already taken: ${target.actions_taken || '(none)'}`;

    // Evidence summary (only OK)
  const evid = target.checklist.filter(i => i.status === 'ok').map(i => `- ${i.label}${i.extracted?`: ${i.extracted}`:''}`).join('\n') || '(none)';
  const evidenceSummary = 'KEY EVIDENCE SUMMARY (OK):\n' + evid;

    const intro = [
      'CASE CONTEXT FOR LETTER GENERATION / AI ANALYSIS',
      `Case ID: ${target.id}`,
      `Primary reason: ${target.reason}`,
      `Disputed amount: ${target.amount} ${target.currency}`,
      `Internal owner: ${target.owner || '(unassigned)'}`,
      `Internal deadline (SLA): ${new Date(target.deadline).toLocaleString()}`,
      'NOTE: Current AI recommendation intentionally excluded to avoid bias prior to model recalculation.',
      ''
    ].join('\n');

  const argumentSkeleton = `ARGUMENT / PROPOSED STRUCTURE:\n1. Situation summary & reason (key facts)\n2. Contract / legal validation (terms, evidence)\n3. Address customer assertions (if any)\n4. Key technical / logistic evidence\n5. Conclusion + clear request (retain funds / deny chargeback)\n\n<Fill each section using the elements above.>`;

  const disclaimer = `DISCLAIMER: This draft is generated from current application data and requires human review. Verify & mask sensitive data (PII) before submission.`;

    // Structured JSON context (without AI recommendation) for optional downstream processing
    const structured = {
      case_id: target.id,
      reason: target.reason,
      amount: target.amount,
      currency: target.currency,
      owner: target.owner || null,
      deadline: target.deadline,
      dossier: {
        merchant_name: target.merchant_name || null,
        customer_masked_name: target.customer_masked_name || null,
        customer_masked_email: target.customer_masked_email || null,
        transaction_date: target.transaction_date || null,
        short_description: target.short_description || null,
        actions_taken: target.actions_taken || null
      },
      checklist: target.checklist.map(i=>({ id:i.id, label:i.label, required:i.required, status:i.status, extracted:i.extracted||null, naReason:i.naReason||null })),
      attachments: target.attachments.map(a=>({ id:a.id, name:a.name, size:a.size, type:a.type })),
  notes_internal: target.notes.filter(n => (n.author||'').toLowerCase() !== 'system' && !n.text.startsWith('Case updated')).map(n=>({ at:n.at, author:n.author, text:n.text })),
  system_updates: target.notes.filter(n => (n.author||'').toLowerCase()==='system' || n.text.startsWith('Case updated')).map(n=>({ at:n.at, text:n.text }))
    };

    const draft = [
      intro,
      dossier,
      '',
      evidenceSummary,
      '',
      checklistSection,
      '',
      attachmentsSection,
      '',
      notesSection,
      '',
  'REQUEST FOR AI ENGINE:',
  'Based strictly on the information above (no external sources), compute:',
  '- Estimated win probability (%) for the dispute',
  '- Strategic recommendation: Fight or Refund',
  'Format the result EXACTLY as JSON on a single line: {"probability": <number 0-100>, "recommendation": "Fight|Refund" }',
  'Do not add explanations on that JSON line. Explanations may follow separately if needed.',
  'If you cannot estimate with given data, return JSON: {"probability": null, "recommendation": "Refund" } and explain separately.',
  'DO NOT change keys/format or add fields in that JSON.',
  '',
  'STRUCTURED CONTEXT (JSON WITHOUT AI RECOMMENDATION):',
      JSON.stringify(structured, null, 2),
      '',
      argumentSkeleton,
      '',
      disclaimer,
      '',
  'Best regards,',
  'Merchant Team'
    ].join('\n');

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

  const removeAttachment = useCallback((id, attachmentId, actor) => {
    setCases(prev => prev.map(c => c.id === id ? (() => {
      let updated = addActivity({ ...c, attachments: c.attachments.filter(a => a.id !== attachmentId) }, `Attachment removed: ${attachmentId}`, 'attachment');
      updated = logEvent(updated, { action: EVENT_ACTIONS.FILE_DELETE, actor, details:{ id: attachmentId }, category:'file' });
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

  // Apply AI chat extracted recommendation/probability (probabilityPercent 0-100)
  const applyChatRecommendation = useCallback((id, probabilityPercent, recommendation, actor) => {
    const prob = typeof probabilityPercent === 'number' && probabilityPercent >=0 ? Math.min(1, Math.max(0, probabilityPercent/100)) : null;
    setCases(prev => prev.map(c => c.id === id ? (() => {
      if(prob===null && !recommendation) return c; // nothing to apply
  const reasons = [`Chat AI applied (${prob!==null? probabilityPercent+'%':'no percent'})`];
      let updated = { ...c, lastUpdate: Date.now(), history:[...c.history,{ at: Date.now(), text:`Chat AI applied (${probabilityPercent!=null?probabilityPercent+'% ':''}${recommendation||''})` }] };
      if(prob!==null) updated.probability = prob;
      if(recommendation) updated.recommendation = recommendation;
  updated.aiAnalysisApplied = true;
      // Optional: inject / refresh lines in existing letter (if any) so UI reflects new values immediately
      if(updated.letter){
        const pctLine = prob!==null ? `Estimated win probability: ${probabilityPercent}%` : null;
        const recLine = recommendation ? `AI Recommendation: ${recommendation}` : null;
        const lines = updated.letter.split(/\n/);
        let foundRec = false, foundProb = false;
        for(let i=0;i<lines.length;i++){
          if(recLine && /^AI Recommendation:/i.test(lines[i])){ lines[i]=recLine; foundRec=true; }
          if(pctLine && /^Estimated win probability:/i.test(lines[i])){ lines[i]=pctLine; foundProb=true; }
        }
        // Insert near top (after first non-empty line) if not present
        const insertPos = Math.min(5, lines.findIndex(l=>l.trim()==='')>-1? lines.findIndex(l=>l.trim()===''):lines.length); // early section
        const toInsert = [];
        if(recLine && !foundRec) toInsert.push(recLine);
        if(pctLine && !foundProb) toInsert.push(pctLine);
        if(toInsert.length){
          lines.splice(insertPos, 0, ...toInsert);
        }
        updated.letter = lines.join('\n');
      }
      if(updated.analysis){
        updated.analysis = { ...updated.analysis, reasons: Array.from(new Set([...(updated.analysis.reasons||[]), ...reasons])), rulesSummary: updated.analysis.rulesSummary || reasons.join(' + ') };
      } else { updated.analysis = { reasons, rulesSummary: reasons.join(' + ') }; }
      updated = addActivity(updated, 'Chat AI recommendation applied', 'ai');
      updated = logEvent(updated, { action: EVENT_ACTIONS.AI_RECOMMENDATION, actor, details:{ probability: updated.probability, recommendation: updated.recommendation, source:'chat' }, category:'ai' });
      return updated;
    })(): c));
  }, [logEvent]);

  const visibleCases = useMemo(()=>{
    if(!currentUser?.email) return cases; // before auth guard kicks in
    return cases.filter(c => c.owner === currentUser.email || c.owner === 'system');
  }, [cases, currentUser]);

  const addCase = useCallback((base) => {
    setCases(prev => [ensureCaseShape({
      id: base.id || ('CB-DISP-'+Math.floor(1000+Math.random()*9000)),
      status: base.status || 'Open',
  reason: base.reason || 'Dispute',
      amount: base.amount || 0,
      currency: base.currency || 'RON',
      probability: base.probability ?? 0.5,
      recommendation: base.recommendation || 'Refund',
      owner: base.owner || currentUser?.email || '—',
      lastUpdate: Date.now(),
      deadline: Date.now() + 72*3600*1000,
      letter: '',
      history: [{ at: Date.now(), text: base.historyNote || 'Case created (dispute)' }]
    }), ...prev]);
  }, [currentUser]);

  const contextValue = useMemo(() => ({ cases: visibleCases, updateCase, changeStatus, generateLetter, updateChecklistItem, addAttachment, removeAttachment, addNote, regenerateAnalysis, applyChatRecommendation, addCase, EVENT_ACTIONS, loadedRemote }), [visibleCases, updateCase, changeStatus, generateLetter, updateChecklistItem, addAttachment, removeAttachment, addNote, regenerateAnalysis, applyChatRecommendation, addCase, loadedRemote]);

  return <CasesContext.Provider value={contextValue}>{children}</CasesContext.Provider>;
}

export function useCases() {
  const ctx = useContext(CasesContext);
  if (!ctx) throw new Error('useCases must be inside CasesProvider');
  return ctx;
}
