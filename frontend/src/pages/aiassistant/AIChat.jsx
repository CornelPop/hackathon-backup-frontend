import React, { useEffect, useRef, useState } from 'react';
import { Button, Input, Upload, Tag, Tooltip, message as antdMessage, theme } from 'antd';
import { SendOutlined, PaperClipOutlined, RobotOutlined, UserOutlined, FileOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import CustomRightDrawer from '../../components/CustomRightDrawer.jsx';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCases } from '../cases/CasesContext.jsx';

const genId = () => Math.random().toString(36).slice(2,10);

export default function AIChat(){
    const { token } = theme.useToken();
    const { applyChatRecommendation } = useCases();
    const navigate = useNavigate();
    const location = useLocation();
    const item = location.state?.item;
    const prefill = location.state?.prefill;
    const prefillAttachments = location.state?.attachments || [];

    const [messages, setMessages] = useState([]);
    const [value, setValue] = useState('');
    const [pending, setPending] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const listRef = useRef(null);
    const autoSentRef = useRef(false);

    useEffect(()=>{ if(listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }, [messages]);

    const callBackend = async(history) => {
        try{
            const resp = await fetch('http://localhost:8000/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ messages: history.map(m=>({ role:m.role, content:m.content })) }) });
            if(!resp.ok){
                let detail = 'Eroare server';
                try { const ct=resp.headers.get('content-type')||''; if(ct.includes('json')){ const j=await resp.json(); detail=j.detail||j.error||JSON.stringify(j).slice(0,180);} else { const t=await resp.text(); if(t) detail=t.slice(0,180);} } catch(_){ }
                antdMessage.error(detail); return { text:'(eroare)', error:true };
            }
            const data = await resp.json();
            return { text: data.answer || '(fără răspuns)', error:false };
        }catch(e){ antdMessage.error(e.message); return { text:'(eroare rețea)', error:true }; }
    };

    const encodeAttachment = async(att) => {
        try {
            const resp = await fetch(att.url);
            const blob = await resp.blob();
            const MAX = 60000;
            const slice = blob.size>MAX ? blob.slice(0,MAX) : blob;
            const buf = await slice.arrayBuffer();
            const bytes = new Uint8Array(buf); let binary='';
            for(let i=0;i<bytes.length;i++) binary += String.fromCharCode(bytes[i]);
            const b64 = btoa(binary);
            const truncated = blob.size>MAX ? `\nTRUNCATED_TO=${(MAX/1024).toFixed(1)}KB_OF_${(blob.size/1024).toFixed(1)}KB` : '';
            const content = [ 'ATTACHMENT', `name: ${att.name}`, `mime: ${blob.type||'unknown'}`, `size_bytes: ${blob.size}`, 'encoding: base64', 'data: '+b64, truncated, 'END_ATTACHMENT' ].filter(Boolean).join('\n');
            return { id: genId(), role:'user', content, attachments:[att], at: Date.now() };
        } catch(e){ return { id: genId(), role:'user', content:`ATTACHMENT_ERROR name=${att.name} error=${e.message}`, attachments:[att], at: Date.now() }; }
    };

    useEffect(()=>{
        if(autoSentRef.current) return;
        if(messages.length>0) return;
        const run = async () => {
            if(prefill){
                autoSentRef.current = true;
                const attachMsgs=[]; for(const a of prefillAttachments){ // eslint-disable-next-line no-await-in-loop
                    attachMsgs.push(await encodeAttachment(a));
                }
                const main = { id: genId(), role:'user', content: prefill.trim(), attachments: prefillAttachments, at: Date.now() };
                const newMsgs=[...messages, ...attachMsgs, main];
                setMessages(newMsgs); setLoading(true);
                try { const reply = await callBackend(newMsgs); setMessages(m=>[...m,{ id:genId(), role:'assistant', content: reply.text, error: reply.error, at: Date.now(), attachments:[] }]); } finally { setLoading(false); }
                return;
            }
            if(!item) return;
            autoSentRef.current = true;
            const template = `Dispută tranzacție flagată:\nID: ${item.id}\nSumă: ${item.amount} ${item.currency}\nDescriere: ${item.label||item.id}\nStatus curent: ${item.status}\nContext: am nevoie de pașii recomandați și ce dovezi/documente să pregătesc pentru a reduce riscul de chargeback. Indică clar ce lipsește.`;
            await send(template);
        };
        run();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prefill, item, messages.length]);

    const send = async(customText) => {
        const base = (customText !== undefined ? customText : value).trim();
        if(!base && pending.length===0) return; if(loading) return;
        setLoading(true);
        try {
            const attachMsgs=[]; for(const a of pending){ // eslint-disable-next-line no-await-in-loop
                attachMsgs.push(await encodeAttachment(a));
            }
            const userMsg = { id: genId(), role:'user', content: base, attachments: pending, at: Date.now() };
            const history=[...messages, ...attachMsgs, userMsg];
            setMessages(history);
            if(customText===undefined) setValue(''); setPending([]);
            const reply = await callBackend(history);
            setMessages(m=>[...m,{ id:genId(), role:'assistant', content: reply.text, error: reply.error, attachments:[], at: Date.now() }]);
        } finally { setLoading(false); }
    };

    const onKeyDown = e => { if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send(); } };
    const beforeUpload = file => { if(pending.length>=5){ antdMessage.warning('Max 5 attach'); return Upload.LIST_IGNORE; } const url=URL.createObjectURL(file); setPending(p=>[...p,{ id:genId(), name:file.name, type:file.type.startsWith('image/')?'image':'file', url }]); return false; };
    const removePending = id => setPending(p=>p.filter(a=>a.id!==id));

    const bubble = m => {
        const isUser = m.role==='user'; const isError = !!m.error && m.role==='assistant';
        const bg = isUser ? token.colorPrimary : isError ? token.colorErrorBg : token.colorBgContainer;
        const fg = isUser ? token.colorTextLightSolid : isError ? token.colorErrorText : token.colorText;
        const border = isError ? `1px solid ${token.colorErrorBorder}` : 'none';
        const avatarBg = isUser ? token.colorPrimary : token.colorFillSecondary;
        const avatarFg = isUser ? token.colorTextLightSolid : token.colorTextTertiary;
        return (
            <div key={m.id} style={{display:'flex',justifyContent:isUser?'flex-end':'flex-start',padding:'4px 8px'}}>
                <div style={{maxWidth:640,display:'flex',gap:8,flexDirection:isUser?'row-reverse':'row'}}>
                    <div style={{width:36,height:36,borderRadius:8,background:avatarBg,color:avatarFg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>
                        {isUser ? <UserOutlined/> : <RobotOutlined/>}
                    </div>
                    <div style={{background:bg,color:fg,padding:'10px 14px',borderRadius:18,boxShadow:token.boxShadowSecondary,minWidth:120,whiteSpace:'pre-wrap',border}}>
                        <div style={{fontSize:14,lineHeight:1.55,fontWeight:isError?600:500}}>{m.content}</div>
                        {m.attachments?.length>0 && (
                            <div style={{marginTop:8,display:'flex',flexWrap:'wrap',gap:6}}>
                                {m.attachments.map(a => a.type==='image' ? (
                                    <div key={a.id} style={{width:72,height:72,borderRadius:8,overflow:'hidden',border:`1px solid ${token.colorBorderSecondary}`}}>
                                        <img src={a.url} alt={a.name} style={{width:'100%',height:'100%',objectFit:'cover'}} />
                                    </div>
                                ) : <Tag key={a.id} icon={<FileOutlined/>} style={{marginInlineEnd:0,background:token.colorFillQuaternary}}>{a.name}</Tag>)}
                            </div>)}
                        <div style={{opacity:.65,fontSize:10,marginTop:4,color:token.colorTextTertiary}}>{new Date(m.at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div style={{height:'calc(100vh - 72px)',display:'flex',flexDirection:'column',background:token.colorBgLayout,position:'relative'}}>
                <div style={{padding:'10px 18px',borderBottom:`1px solid ${token.colorSplit}`,display:'flex',alignItems:'center',justifyContent:'space-between',background:token.colorBgContainer,boxShadow:token.boxShadowTertiary,zIndex:2}}>
                    <div style={{display:'flex',flexDirection:'column',lineHeight:1.1}}>
                        <span style={{fontSize:18,fontWeight:700,letterSpacing:.5}}>Smart Assistant</span>
                        <span style={{fontSize:11,opacity:.6,letterSpacing:.5}}>Suport AI pentru cazuri</span>
                    </div>
                    <Button type='primary' danger onClick={()=>setOpen(true)} style={{fontWeight:600,letterSpacing:.5}}>USER GUIDE</Button>
                </div>
                        <div ref={listRef} style={{flex:1,overflowY:'auto',overflowX:'hidden',background:token.colorBgLayout,minHeight:0}}>
                                {messages.map(bubble)}
                                {messages.length===0 && (
                                    <div style={{maxWidth:920,margin:'32px auto 40px',padding:'0 20px',display:'flex',flexDirection:'column',gap:28}}>
                                        <div style={{textAlign:'center'}}>
                                            <div style={{fontSize:26,fontWeight:700,letterSpacing:.5,background:'linear-gradient(90deg,#1677ff,#5c2be3)',WebkitBackgroundClip:'text',color:'transparent'}}>Asistent AI Dispute</div>
                                            <div style={{marginTop:6,fontSize:13,opacity:.65}}>Alege o întrebare de pornire sau scrie direct mesajul tău.</div>
                                        </div>
                                        <div style={{display:'grid',gap:14,gridTemplateColumns:'repeat(2,minmax(0,1fr))',maxWidth:900,margin:'0 auto'}}>
                                                                    {[
                                                                        'Tutorial — îți arăt pas cu pas cum deschizi și rezolvi un caz',
                                                                        'Abonament anulat dar taxat — afli ce documente și pași sunt necesari',
                                                                        'Checklist inițial — vezi ce informații și dovezi trebuie să pregătești',
                                                                        'Formular de caz — îți generez un template pe care să-l completezi'
                                                                    ].map(q => (
                                                <div key={q} style={{
                                                    border:`1px solid ${token.colorBorderSecondary}`,
                                                    background:token.colorBgContainer,
                                                    borderRadius:14,
                                                    padding:'14px 16px 46px',
                                                    position:'relative',
                                                    cursor:'pointer',
                                                    display:'flex',
                                                    flexDirection:'column',
                                                    gap:8,
                                                    minHeight:120,
                                                    boxShadow:token.boxShadowTertiary,
                                                    transition:'border-color .15s, box-shadow .15s, transform .15s'
                                                }}
                                                onClick={()=>send(q)}
                                                onKeyDown={e=>{ if(e.key==='Enter') send(q); }}
                                                role='button'
                                                tabIndex={0}
                                                onMouseEnter={e=>{e.currentTarget.style.borderColor=token.colorPrimary; e.currentTarget.style.boxShadow=token.boxShadowSecondary;}}
                                                onMouseLeave={e=>{e.currentTarget.style.borderColor=token.colorBorderSecondary; e.currentTarget.style.boxShadow=token.boxShadowTertiary;}}
                                                >
                                                    <div style={{fontSize:13,fontWeight:600,lineHeight:1.38}}>{q}</div>
                                                    <div style={{marginTop:'auto',fontSize:11,opacity:.7}}>Click pentru a trimite</div>
                                                    <div style={{position:'absolute',right:12,bottom:12,display:'flex',alignItems:'center',gap:4,fontSize:11,opacity:.55}}>
                                                        <SendOutlined />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
            <div style={{borderTop:`1px solid ${token.colorSplit}`,padding:'12px 16px',background:token.colorBgContainer,display:'flex',flexDirection:'column',gap:8}}>
                {pending.length>0 && (
                    <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                        {pending.map(f => (
                            <Tag key={f.id} closable onClose={()=>removePending(f.id)} icon={f.type==='image'?null:<FileOutlined/>} style={{marginInlineEnd:0,background:token.colorFillQuaternary,padding:'4px 8px'}}>
                                <span style={{maxWidth:140,display:'inline-block',overflow:'hidden',textOverflow:'ellipsis'}}>{f.name}</span>
                            </Tag>
                        ))}
                    </div>
                )}
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                    <Upload beforeUpload={beforeUpload} multiple showUploadList={false} accept='image/*,application/pdf,text/plain'>
                        <Tooltip title='Atașează fișiere'><Button icon={<PaperClipOutlined/>} /></Tooltip>
                    </Upload>
                    <Input.TextArea value={value} onChange={e=>setValue(e.target.value)} onKeyDown={onKeyDown} autoSize={{minRows:2,maxRows:5}} placeholder='Scrie mesajul... Enter trimite' disabled={loading} style={{flex:1}} />
                    <Button type='primary' icon={<SendOutlined/>} onClick={()=>send()} disabled={(value.trim()===''&&pending.length===0)||loading}>Trimite</Button>
                    {item && item.status==='FLAGGED' && (
                        <Tooltip title='Aplică decizia risc pe payment (parsează ultimul JSON AI)'>
                            <Button onClick={()=>{
                                const last=[...messages].reverse().find(m=>m.role==='assistant');
                                if(!last){ antdMessage.warning('Niciun răspuns AI'); return; }
                                const jsonMatch=last.content.match(/\{[\s\S]*\}/); // crude capture
                                if(!jsonMatch){ antdMessage.warning('JSON nerecunoscut'); return; }
                                let parsed; try{ parsed=JSON.parse(jsonMatch[0]); }catch(e){ antdMessage.error('JSON invalid'); return; }
                                if(parsed.fraud_risk_percent===undefined && parsed.fraud_risk!==undefined) parsed.fraud_risk_percent=parsed.fraud_risk;
                                const pct = Number(parsed.fraud_risk_percent);
                                if(isNaN(pct) || pct<0 || pct>100){ antdMessage.error('fraud_risk_percent lipsă sau invalid'); return; }
                                const decision = pct < 50 ? 'SUCCESSFUL' : 'FAILED';
                                fetch(`http://localhost:8000/payments/${item.id}/risk_decision`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ decision }) })
                                  .then(async r=>{ if(!r.ok){ const t=await r.text(); throw new Error(t||('http '+r.status)); } return r.json(); })
                                  .then(data=>{
                                      // update local overrides so list reflectă imediat
                                      try {
                                          const key='cb_payment_sim_meta';
                                          const meta=JSON.parse(localStorage.getItem(key)||'{}');
                                          meta[item.id] = { ...(meta[item.id]||{}), status: decision, flag_category: data.flag_category, flag_reason: data.flag_reason };
                                          localStorage.setItem(key, JSON.stringify(meta));
                                      } catch(_){}
                                      antdMessage.success(`Aplicat: risc ${pct}% => ${decision}`);
                                      setTimeout(()=>{ window.location.href='/payments'; }, 650);
                                  })
                                  .catch(e=> antdMessage.error('Eroare aplicare: '+e.message));
                            }}>Aplică risc</Button>
                        </Tooltip>
                    )}
                    {item && (
                        <Tooltip title='Extrage JSON (probability, recommendation) din ultimul răspuns AI și aplică pe caz'>
                            <Button onClick={()=>{
                                const last=[...messages].reverse().find(m=>m.role==='assistant'); if(!last){ antdMessage.warning('Niciun răspuns AI încă'); return; }
                                const jsonMatch=last.content.match(/\{\s*"probability"[\s\S]*?\}/); if(!jsonMatch){ antdMessage.warning('JSON cu probability nu găsit'); return; }
                                try { const parsed=JSON.parse(jsonMatch[0]); if(!('recommendation' in parsed)) throw new Error('lipsește recommendation'); const pct=parsed.probability===null?null:Number(parsed.probability); if(pct!==null && (isNaN(pct)||pct<0||pct>100)) throw new Error('procent invalid'); let rec=String(parsed.recommendation||'').trim(); if(!/^(Fight|Refund)$/i.test(rec)) throw new Error('recommendation trebuie Fight sau Refund'); rec=rec.charAt(0).toUpperCase()+rec.slice(1).toLowerCase(); applyChatRecommendation(item.id, pct, rec); antdMessage.success('Aplicat. Redirecționare...'); setTimeout(()=>navigate(`/cases/${item.id}`),400); } catch(e){ antdMessage.error('Eroare parse: '+e.message); }
                            }}>Aplică pe caz</Button>
                        </Tooltip>)
                    }
                    <Tooltip title='User Guide'><Button type='primary' shape='circle' icon={<QuestionCircleOutlined style={{fontSize:22}}/>} onClick={()=>setOpen(true)} /></Tooltip>
                </div>
                <div style={{fontSize:11,color:token.colorTextTertiary,display:'flex',justifyContent:'space-between'}}>
                    <span>{pending.length}/5 attach</span>
                    <span>{loading?'Se generează răspuns...':'Enter = trimite, Shift+Enter = linie nouă'}</span>
                </div>
            </div>
            <CustomRightDrawer open={open} setOpen={setOpen} setValue={setValue} />
        </div>
    );
}
