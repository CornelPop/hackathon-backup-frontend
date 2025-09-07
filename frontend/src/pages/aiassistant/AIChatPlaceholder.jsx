import React, { useEffect, useRef, useState } from 'react';
import { Button, Input, Upload, Typography, Space, Tag, Tooltip, Drawer, Divider, Alert, message as antdMessage } from 'antd';
import { SendOutlined, PaperClipOutlined, RobotOutlined, UserOutlined, FileOutlined, QuestionCircleOutlined, CloseOutlined } from '@ant-design/icons';

const genId = () => Math.random().toString(36).slice(2,10);

export default function AIChatPlaceholder(){
  const [messages,setMessages]=useState([]); // {id,role,content,attachments,at}
  const [value,setValue]=useState('');
  const [pending,setPending]=useState([]); // {id,name,type,url}
  const [loading,setLoading]=useState(false);
  const [open,setOpen]=useState(false);
  const listRef=useRef(null);

  useEffect(()=>{ if(listRef.current) listRef.current.scrollTop=listRef.current.scrollHeight; },[messages]);
  // call Python FastAPI backend (returns {text, error})
  const callBackend = async (history) => {
    try {
      const resp = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ messages: history.map(m=>({ role:m.role, content:m.content })) })
      });
      if(!resp.ok){
        // Try to extract JSON detail first
        let detail = 'Eroare server';
        const ct = resp.headers.get('content-type') || '';
        try {
          if(ct.includes('application/json')){
            const errJson = await resp.json();
            if(errJson && (errJson.detail || errJson.error)) detail = errJson.detail || errJson.error;
            else detail = JSON.stringify(errJson).slice(0,400);
          } else {
            const t = await resp.text();
            if(t) detail = t.slice(0,400);
          }
        } catch(_) {}
        antdMessage.error(`Eroare: ${detail}`);
        return { text: `Eroare: ${detail}`, error: true };
      }
      const data = await resp.json();
      return { text: data.answer || '(fără răspuns)', error: false };
    } catch(e){
      const msg = e?.message ? e.message : 'Eroare la generare răspuns.';
      antdMessage.error(msg);
      return { text: `Eroare: ${msg}`, error: true };
    }
  };
  
  const send=async(customText)=>{ const base=(customText!==undefined?customText:value).trim(); if(!base && pending.length===0) return; if(loading) return; const userMsg={id:genId(),role:'user',content:base,attachments:pending,at:Date.now()}; setMessages(m=>[...m,userMsg]); if(customText===undefined) setValue(''); else setValue(v=> (v===base?'':v)); setPending([]); setLoading(true); try{ const history=[...messages,userMsg]; const reply=await callBackend(history); setMessages(m=>[...m,{id:genId(),role:'assistant',content:reply.text,error:reply.error,attachments:[],at:Date.now()}]); } finally { setLoading(false); } };
  const onKeyDown=e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send(); } };
  const beforeUpload=file=>{ if(pending.length>=5){ antdMessage.warning('Max 5 attach'); return Upload.LIST_IGNORE;} const url=URL.createObjectURL(file); setPending(p=>[...p,{id:genId(),name:file.name,type:file.type.startsWith('image/')?'image':'file',url}]); return false; };
  const removePending=id=>setPending(p=>p.filter(a=>a.id!==id));

  const bubble=m=> {
    const isUser = m.role==='user';
    const isError = !!m.error && m.role==='assistant';
    const bg = isUser ? '#1677ff' : (isError ? '#fff1f0' : '#fff');
    const fg = isUser ? '#fff' : (isError ? '#cf1322' : '#000');
    const border = isError ? '1px solid #ffccc7' : 'none';
    return (
      <div key={m.id} style={{display:'flex',justifyContent:isUser?'flex-end':'flex-start',padding:'4px 8px'}}>
        <div style={{maxWidth:640,display:'flex',gap:8,flexDirection:isUser?'row-reverse':'row'}}>
          <div style={{width:36,height:36,borderRadius:8,background:isUser?'#1677ff':'#f0f0f0',color:isUser?'#fff':'#555',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>
            {isUser?<UserOutlined/>:<RobotOutlined/>}
          </div>
          <div style={{background:bg,color:fg,padding:'10px 14px',borderRadius:18,boxShadow:'0 2px 4px rgba(0,0,0,0.08)',minWidth:120,whiteSpace:'pre-wrap',border}}>
            <div style={{fontSize:14,lineHeight:1.5,fontWeight:isError?600:500}}>{m.content}</div>
              {m.attachments?.length>0 && (
                <div style={{marginTop:8,display:'flex',flexWrap:'wrap',gap:6}}>
                  {m.attachments.map(a=> a.type==='image' ? (
                    <div key={a.id} style={{width:72,height:72,borderRadius:8,overflow:'hidden',border:'1px solid #eee'}}>
                      <img src={a.url} alt={a.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                    </div>
                  ):<Tag key={a.id} icon={<FileOutlined/>} style={{marginInlineEnd:0}}>{a.name}</Tag>)}
                </div>
              )}
            <div style={{opacity:.55,fontSize:10,marginTop:4}}>{new Date(m.at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column',position:'relative'}}>
      <div style={{padding:'12px 16px',borderBottom:'1px solid #eee',background:'#fff'}}>
        <Button danger type='primary' block size='large' style={{fontWeight:600,letterSpacing:.5}} onClick={()=>setOpen(true)} icon={<QuestionCircleOutlined/>}>USER GUIDE</Button>
        <div style={{marginTop:12,fontSize:20,fontWeight:600,letterSpacing:.5}}>AI Chat</div>
      </div>

      <div ref={listRef} style={{flex:1,overflowY:'auto',background:'#fafafa'}}>
        {messages.map(bubble)}
        {messages.length===0 && (
          <div style={{maxWidth:760,margin:'48px auto 40px',padding:'0 16px'}}>
            <div style={{textAlign:'center',marginBottom:28}}>
              <RobotOutlined style={{fontSize:56,marginBottom:12,opacity:.35}}/>
              <div style={{fontSize:18,fontWeight:600,letterSpacing:.3}}>Alege o întrebare de start sau scrie propria întrebare</div>
            </div>
            <div style={{display:'grid',gap:16,gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))'}}>
              {[
                'Tutorial — îmi poți arăta, pas cu pas, cum deschid și rezolv un caz?',
                'Abonament anulat dar taxat — care sunt documentele obligatorii și pașii de urmat?',
                'Checklist inițial (universal) — ce informații și documente trebuie să pregătesc înainte să încep?',
                'Formular de caz — generează un template pe care să-l completez și să-l trimit aici'
              ].map(text => (
                <div key={text}
                  onClick={()=>send(text)}
                  role='button'
                  tabIndex={0}
                  onKeyDown={e=>{if(e.key==='Enter') send(text)}}
                  style={{
                    background:'#fff',
                    border:'1px solid #e5e5e5',
                    borderRadius:14,
                    padding:'14px 16px',
                    cursor:'pointer',
                    display:'flex',
                    flexDirection:'column',
                    gap:8,
                    minHeight:110,
                    boxShadow:'0 2px 4px rgba(0,0,0,0.04)',
                    transition:'border-color .18s, box-shadow .18s, transform .18s'
                  }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor='#1677ff'; e.currentTarget.style.boxShadow='0 4px 10px -2px rgba(0,0,0,0.08)';}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor='#e5e5e5'; e.currentTarget.style.boxShadow='0 2px 4px rgba(0,0,0,0.04)';}}
                >
                  <div style={{fontSize:13,fontWeight:600,lineHeight:1.35}}>{text}</div>
                  <div style={{marginTop:'auto',fontSize:11,opacity:.55,display:'flex',alignItems:'center',gap:6}}>
                    <span>Click pentru a trimite</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{borderTop:'1px solid #eee',padding:'12px 16px',background:'#fff',display:'flex',flexDirection:'column',gap:8}}>
        {pending.length>0 && (
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {pending.map(f=> (
              <Tag key={f.id} closable onClose={()=>removePending(f.id)} icon={f.type==='image'?null:<FileOutlined/>} style={{marginInlineEnd:0,background:'#f5f5f5',padding:'4px 8px'}}>
                <span style={{maxWidth:140,display:'inline-block',overflow:'hidden',textOverflow:'ellipsis'}}>{f.name}</span>
              </Tag>
            ))}
          </div>
        )}
        <div style={{display:'flex',gap:8}}>
          <Upload beforeUpload={beforeUpload} multiple showUploadList={false} accept='image/*,application/pdf,text/plain'>
            <Tooltip title='Atașează fișiere'>
              <Button icon={<PaperClipOutlined/>}/>
            </Tooltip>
          </Upload>
          <Input.TextArea value={value} onChange={e=>setValue(e.target.value)} onKeyDown={onKeyDown} autoSize={{minRows:2,maxRows:5}} placeholder='Scrie mesajul... Enter trimite' disabled={loading} style={{flex:1,resize:'none'}} />
          <Button type='primary' icon={<SendOutlined/>} onClick={send} disabled={(value.trim()==='' && pending.length===0) || loading}>Trimite</Button>
        </div>
        <div style={{fontSize:11,opacity:.6,display:'flex',justifyContent:'space-between'}}>
          <span>{pending.length}/5 attach</span>
          <span>{loading?'Se generează răspuns...':'Enter = trimite, Shift+Enter = linie nouă'}</span>
        </div>
      </div>

      <Drawer title='User Guide — Dispute Assistant' placement='right' width={620} destroyOnClose open={open} onClose={()=>setOpen(false)} styles={{body:{padding:'12px 20px 40px',overflowY:'auto'}}}>
        <Space wrap size={[8,8]} style={{position:'sticky',top:0,background:'#fff',padding:'4px 0 8px',zIndex:2}}>
          {['1','2','3','4','5','6','7','8','9','10','11','12','13'].map(id => (
            <Tag key={id} color='blue' style={{cursor:'pointer',marginInlineEnd:0}} onClick={()=>{const el=document.getElementById('g'+id); if(el) el.scrollIntoView({behavior:'smooth'});}}>Sec {id}</Tag>
          ))}
          <Tag color='red' style={{cursor:'pointer',marginInlineEnd:0}} onClick={()=>setOpen(false)}>Închide</Tag>
        </Space>
        <Divider style={{margin:'8px 0 12px'}}/>
        <Alert type='info' showIcon message={<b>Nu introduce date sensibile</b>} description='Maschează email / telefon / adresă (ex: i***@exemplu.ro)' style={{marginBottom:24}} />
        <section id='g1'>
          <Typography.Title level={4} style={{marginBottom:4}}>1) Scopul ghidului</Typography.Title>
          <Typography.Paragraph style={{marginTop:0}}>Cum folosești chatbotul pentru dispute: informații, dovezi, recomandare Fight vs Refund și draft.</Typography.Paragraph>
        </section>
        <section id='g2'>
          <Typography.Title level={4} style={{marginBottom:4}}>2) Ce face asistentul</Typography.Title>
          <ul style={{paddingLeft:18,lineHeight:1.55}}>
            <li>Colectează date tranzacție + motiv.</li>
            <li>Generează checklist + lipsuri.</li>
            <li>Recomandă <Tag color='green'>Fight</Tag> / <Tag color='volcano'>Refund</Tag>.</li>
            <li>Produce draft scrisoare.</li>
          </ul>
          <Alert type='warning' showIcon message='Nu inventează date și nu decide în locul tău.' style={{marginTop:8}}/>
        </section>
        <section id='g3'>
          <Typography.Title level={4} style={{marginBottom:4}}>3) Înainte să începi</Typography.Title>
          <div style={{display:'grid',gap:4}}>
            <div><b>Motiv</b>: nelivrat / fraudă / neconform / dublă / abonament anulat</div>
            <div><b>Tranzacție</b>: sumă, monedă, dată, ID</div>
            <div><b>Comandă/Serviciu</b>: orderId, plan, perioadă</div>
            <div><b>Dovezi</b>: factură, AWB, loguri, email, anulare</div>
            <div><b>Confidențialitate</b>: maschează PII</div>
          </div>
        </section>
        <section id='g4'>
          <Typography.Title level={4} style={{marginBottom:4}}>4) Primul mesaj</Typography.Title>
          <Typography.Paragraph style={{marginBottom:6}}>Trimite motiv + date esențiale. Template:</Typography.Paragraph>
          <pre style={{background:'#111',color:'#eee',padding:12,borderRadius:8,fontSize:12,lineHeight:1.5,overflowX:'auto'}}>{`Motiv: ____________________\nTranzacție: sumă ______, monedă ___, dată ______, ID __________\nClient (mascat): ____________________\nComandă/Serviciu: orderId ______, descriere ______\nDovezi avute: Factură / AWB / Confirmare / Loguri / Email client / Contract\nObservații: ____________________`}</pre>
          <Typography.Paragraph style={{marginTop:8}}>Răspuns: sinteză, ce lipsește, checklist, recomandare, draft (la cerere).</Typography.Paragraph>
        </section>
        <section id='g5'>
          <Typography.Title level={4} style={{marginBottom:4}}>5) Comenzi utile</Typography.Title>
          <Space direction='vertical' size={4} style={{fontSize:13}}>
            <code>Fă checklist pentru motivul X.</code>
            <code>Spune-mi ce lipsește ca să pot trimite apărarea.</code>
            <code>Pe baza datelor, recomanzi Fight sau Refund? De ce?</code>
            <code>Generează un draft de scrisoare pentru cazul acesta.</code>
            <code>Rezumat caz în 5 puncte.</code>
          </Space>
        </section>
        <section id='g6'>
          <Typography.Title level={4} style={{marginBottom:4}}>6) Dovezi</Typography.Title>
          <div style={{display:'grid',gap:12}}>
            {[
              {t:'Produs nelivrat',o:'AWB + confirmare / încercări + factură',r:'Conversație client, poze'},
              {t:'Fraudă',o:'3DS/AVS/CVV, IP/device, data/ora',r:'Istoric cont, pattern'},
              {t:'Serviciu neconform',o:'Termeni, perioadă, dovada acces',r:'Loguri, suport'},
              {t:'Dublă încasare',o:'Ambele tranzacții + confirmare dublu',r:'Jurnal sistem, refund/void'},
              {t:'Abonament anulat',o:'Dovadă anulare + debit contestat',r:'Loguri post-anulare, politică'}
            ].map(row=> (
              <div key={row.t} style={{background:'#fafafa',border:'1px solid #eee',borderRadius:8,padding:12}}>
                <div style={{fontWeight:600,marginBottom:4}}>{row.t}</div>
                <div style={{fontSize:12}}><Tag color='green'>Obligatorii</Tag> {row.o}</div>
                <div style={{fontSize:12,marginTop:2}}><Tag color='blue'>Recomandate</Tag> {row.r}</div>
              </div>
            ))}
          </div>
          <Alert type='warning' showIcon style={{marginTop:10}} message='Lipsește o dovadă obligatorie? Nu trimite încă.' />
        </section>
        <section id='g7'>
          <Typography.Title level={4} style={{marginBottom:4}}>7) Format răspuns</Typography.Title>
          <ol style={{paddingLeft:20,fontSize:13,lineHeight:1.55}}>
            <li>Motiv identificat</li><li>Date primite</li><li>Date lipsă</li><li>Checklist (✓/✗)</li><li>Analiză scurtă</li><li>Recomandare Fight / Refund</li><li>Draft (opțional)</li><li>Pașii următori</li>
          </ol>
        </section>
        <section id='g8'>
          <Typography.Title level={4} style={{marginBottom:4}}>8) Exemple</Typography.Title>
          <div style={{display:'grid',gap:12}}>
            {[{h:'A. Nelivrat — AWB OK',u:'Motiv nelivrat; 230 RON, 01.09, TX-11; factură + AWB 123 semnat.',a:'Checklist ✓; Fight.'},{h:'B. Nelivrat — fără AWB',u:'Motiv nelivrat; 230 RON; factură.',a:'Lipsește AWB → cere completări.'},{h:'C. Abonament anulat',u:'Anulare 15.08, debit 01.09; confirmare email; loguri 0.',a:'Refund recomandat.'},{h:'D. Fraudă 3DS',u:'Fraudă; 3DS da; device/IP identic.',a:'Fight; cere AVS/CVV dacă lipsesc.'}].map(ex=>(
              <div key={ex.h} style={{background:'#fff',border:'1px solid #eee',borderRadius:8,padding:12}}>
                <b>{ex.h}</b>
                <div style={{fontSize:12,marginTop:4}}><b>User:</b> {ex.u}</div>
                <div style={{fontSize:12,marginTop:4}}><b>Asistent:</b> {ex.a}</div>
              </div>
            ))}
          </div>
        </section>
        <section id='g9'>
          <Typography.Title level={4} style={{marginBottom:4}}>9) Draft scrisoare</Typography.Title>
          <Typography.Paragraph style={{marginBottom:4}}>Cere: <code>Generează un draft de scrisoare pentru cazul acesta</code>. Include tranzacție, motiv, dovezi, concluzie.</Typography.Paragraph>
          <Alert type='info' showIcon message='Verifică PII înainte de folosire.' />
        </section>
        <section id='g10'>
          <Typography.Title level={4} style={{marginBottom:4}}>10) Bune practici</Typography.Title>
          <ul style={{paddingLeft:18,lineHeight:1.55}}>
            <li>Clar + complet pe dovezi.</li><li>Nu trimite fără obligatorii.</li><li>Maschează PII.</li><li>Cere „Rezumat caz”.</li><li>Întreabă „Ce lipsește?”.</li>
          </ul>
        </section>
        <section id='g11'>
          <Typography.Title level={4} style={{marginBottom:4}}>11) Greșeli</Typography.Title>
          <ul style={{paddingLeft:18,lineHeight:1.55}}>
            <li>Descrieri vagi.</li><li>Lipsă AWB la nelivrat.</li><li>Amesteci cazuri.</li><li>Date card complete.</li><li>Ceri recomandare fără minime.</li>
          </ul>
        </section>
        <section id='g12'>
          <Typography.Title level={4} style={{marginBottom:4}}>12) Întrebări</Typography.Title>
          <div style={{display:'grid',gap:6,fontSize:13}}>
            <div><b>Decide?</b> Nu, doar recomandă.</div>
            <div><b>Fără dovezi?</b> Cere ce lipsește.</div>
            <div><b>Găsește AWB?</b> Nu.</div>
            <div><b>Nu știu motivul?</b> Dă context.</div>
          </div>
        </section>
        <section id='g13'>
          <Typography.Title level={4} style={{marginBottom:4}}>13) Template</Typography.Title>
          <pre style={{background:'#111',color:'#eee',padding:12,borderRadius:8,fontSize:12,lineHeight:1.5,overflowX:'auto'}}>{`Motiv: ____________________\nTranzacție: sumă ______, monedă ___, dată ______, ID __________\nComandă/Serviciu: ____________________\nDovezi: Factură / AWB / Confirmare / Loguri / Email client / Contract\nObservații: ____________________\nTe rog: checklist + ce lipsește + recomandare + draft scrisoare.`}</pre>
        </section>
        <Divider/>
        <Space wrap>
          <Tag color='purple' style={{marginInlineEnd:0}}>Beta</Tag>
          <Tag color='geekblue' style={{marginInlineEnd:0,cursor:'pointer'}} onClick={()=>{setValue('Checklist fraudă tranzacție 1234'); setOpen(false);}}>Prompt checklist</Tag>
          <Tag color='geekblue' style={{marginInlineEnd:0,cursor:'pointer'}} onClick={()=>{setValue('Recomandare fight vs refund nelivrat TX-11'); setOpen(false);}}>Prompt fight/refund</Tag>
        </Space>
        <div style={{textAlign:'right',marginTop:16}}>
          <Button icon={<CloseOutlined/>} onClick={()=>setOpen(false)}>Închide</Button>
        </div>
      </Drawer>
    </div>
  );
}
