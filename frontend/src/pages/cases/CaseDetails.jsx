import React, { useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Descriptions, Divider, Dropdown, Empty, Modal, Space, Tag, Typography, Steps, Upload, Input, List, message, Tooltip, Popconfirm } from 'antd';
import { ArrowLeftOutlined, BranchesOutlined, CopyOutlined, FileDoneOutlined, FileTextOutlined, SendOutlined, ReloadOutlined, InboxOutlined, EditOutlined, SaveOutlined, DownloadOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useCases, STATUS_COLORS, EVENT_ACTIONS } from './CasesContext';

function formatSLA(deadline){
  const diff = deadline - Date.now();
  if(diff <=0) return <Tag>Expirat</Tag>;
  const h = diff/3600000; let color='green'; if(h<24) color='red'; else if(h<48) color='gold';
  const d=Math.floor(h/24); const hh=Math.floor(h%24); const m=Math.floor((diff/60000)%60);
  const text=d>0?`${d}d ${hh}h`:(h>=1?`${Math.floor(h)}h`:`${m}m`);
  return <Tag color={color}>{text}</Tag>;
}

export default function CaseDetails(){
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { cases, changeStatus, generateLetter, updateChecklistItem, addAttachment, addNote, regenerateAnalysis, updateCase, EVENT_ACTIONS: EA } = useCases();
  const item = cases.find(c => c.id === caseId);
  // Defensive shape (in case of race before migration) – do not mutate context directly here
  const checklistSafe = item?.checklist && Array.isArray(item.checklist) ? item.checklist : [];
  const attachmentsSafe = item?.attachments && Array.isArray(item.attachments) ? item.attachments : [];
  const notesSafe = item?.notes && Array.isArray(item.notes) ? item.notes : [];
  const activitySafe = item?.activity && Array.isArray(item.activity) ? item.activity : [];
  const [showLetter, setShowLetter] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [tmpLetter, setTmpLetter] = useState('');
  const [editingLetter, setEditingLetter] = useState(false);
  const [letterDraft, setLetterDraft] = useState(item?.letter || '');
  const [noteText, setNoteText] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const eventsSafe = item?.events || [];

  if(!item) return <Empty description={<span>Case not found</span>} />;

  const statusItems = ['Open','In Progress','Sent','Won','Lost'].map(s => ({ key: s, label: s, disabled: s===item.status, onClick: ()=> changeStatus(item.id, s) }));

  const slaInfo = useMemo(()=>{
    const diff = item.deadline - Date.now();
    if(diff<=0) return { text:'Expirat', color:'red' };
    const h = diff/3600000; let color='green'; if(h<24) color='red'; else if(h<48) color='gold';
    const d=Math.floor(h/24); const hh=Math.floor(h%24); const m=Math.floor((diff/60000)%60);
    const text=d>0?`${d}d ${hh}h`:(h>=1?`${Math.floor(h)}h`:`${m}m`);
    return { text, color };
  },[item.deadline]);

  // Timeline computation (6 steps)
  const timelineSteps = useMemo(()=>{
    const created = true;
    const dataCollected = !!item.reason;
  const evidencePct = checklistSafe.length? checklistSafe.filter(i=> i.status==='ok').length / checklistSafe.length : 0;
    const evidenceDone = evidencePct >= 0.6; // threshold
    const letterGen = !!item.letter;
    const sent = item.status === 'Sent' || item.status === 'Won' || item.status === 'Lost';
    const result = item.status === 'Won' || item.status === 'Lost';
    const mapStatus = (cond) => cond ? 'finish' : 'wait';
    const currentIndex = result ? 5 : sent ? 4 : letterGen ? 3 : evidenceDone ? 2 : dataCollected ? 1 : 0;
    return {
      currentIndex,
      items: [
        { title: 'Creat', status: mapStatus(created), description: new Date(item.history[0]?.at || item.lastUpdate).toLocaleDateString() },
        { title: 'Date colectate', status: mapStatus(dataCollected), description: dataCollected? 'OK':'Motiv lipsă?' },
  { title: 'Dovezi', status: mapStatus(evidenceDone), description: `${Math.round(evidencePct*100)}%` },
        { title: 'Scrisoare', status: mapStatus(letterGen), description: letterGen? 'Generată':'—' },
        { title: 'Trimis', status: mapStatus(sent), description: sent? 'Marcat':'—' },
        { title: 'Rezultat', status: mapStatus(result), description: result? item.status:'—' },
      ]
    };
  }, [item]);

  const onGenLetter = () => {
    setGenerating(true);
    setTimeout(()=>{ const draft = generateLetter(item.id); setLetterDraft(draft); setTmpLetter(draft); setGenerating(false); setShowLetter(true); }, 400);
  };

  const markSent = () => { changeStatus(item.id, 'Sent'); };
  const markWon = () => { changeStatus(item.id, 'Won'); };
  const markLost = () => { changeStatus(item.id, 'Lost'); };

  const beforeUpload = (file) => {
    const id = 'att-'+Date.now();
    addAttachment(item.id, { id, name: file.name, type: file.type, size: file.size, uploadedAt: Date.now(), url: URL.createObjectURL(file) });
    message.success('Încărcat');
    return false; // prevent auto upload
  };

  const toggleChecklist = (ci) => {
    if(!item) return;
    // Cycle missing -> ok -> missing (skip other states)
    const newStatus = ci.status === 'ok' ? 'missing' : 'ok';
    updateChecklistItem(item.id, ci.id, { status: newStatus });
  };

  const markNA = (ci) => {
    const reason = prompt('Motiv neaplicabil (scurt)');
    if(reason===null) return;
    updateChecklistItem(item.id, ci.id, { status: 'na', naReason: reason.slice(0,140) });
  };

  const revertNA = (ci) => updateChecklistItem(item.id, ci.id, { status: 'missing', naReason: '' });

  const requiredOkCount = (list) => list.filter(i=> i.required && i.status==='ok').length;
  const requiredTotal = (list) => list.filter(i=> i.required && i.status!=='na').length;
  const canSend = requiredTotal(checklistSafe) > 0 && requiredOkCount(checklistSafe) === requiredTotal(checklistSafe);

  const saveLetter = () => { updateCase(item.id, { letter: letterDraft }, 'Letter edited', 'letter'); setEditingLetter(false); };

  const downloadLetter = () => {
    const blob = new Blob([item.letter||letterDraft||''], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${item.id}-letter.txt`;
    a.click();
  };

  const addNoteHandler = () => { if(!noteText.trim()) return; addNote(item.id, noteText.trim()); setNoteText(''); };

  return (
    <div style={{display:'flex',flexDirection:'column',gap:18, maxWidth:1300, margin:'0 auto'}}>
      {/* HEADER SUMMARY */}
      <Card bodyStyle={{padding:16}} style={{borderRadius:20, background:'#fff'}}>
        <div style={{display:'flex',flexWrap:'wrap',gap:16,alignItems:'center'}}>
          <Space size={12} wrap>
            <Button icon={<ArrowLeftOutlined/>} onClick={()=>navigate('/cases')}>Înapoi</Button>
            <Typography.Title level={3} style={{margin:0}}>{item.id}</Typography.Title>
            <Dropdown menu={{ items: statusItems }} trigger={['click']}>
              <Tag color={STATUS_COLORS[item.status] || 'default'} style={{cursor:'pointer',fontSize:14,padding:'4px 10px'}}>{item.status}</Tag>
            </Dropdown>
            <Tag color={slaInfo.color} style={{fontSize:14,padding:'4px 10px'}}>SLA {slaInfo.text}</Tag>
          </Space>
          <div style={{display:'flex',flexWrap:'wrap',gap:16,marginLeft:'auto'}}>
            <div style={{minWidth:180}}>
              <div style={{fontSize:12,opacity:.6}}>Recomandare AI</div>
              <div style={{fontWeight:600,fontSize:16}}><Tag color={item.recommendation==='Fight'?'green':'volcano'} style={{marginRight:4}}>{item.recommendation}</Tag></div>
            </div>
            <div style={{minWidth:120}}>
              <div style={{fontSize:12,opacity:.6}}>Prob. câștig</div>
              <div style={{fontWeight:600,fontSize:16}}>{Math.round(item.probability*100)}%</div>
            </div>
            <div style={{minWidth:170}}>
              <div style={{fontSize:12,opacity:.6}}>Impact (Fight vs Refund)</div>
              <div style={{fontWeight:600,fontSize:16}}>{item.amount} {item.currency}</div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <Tooltip title='Re-evaluează AI (mock)'><Button icon={<ReloadOutlined/>} onClick={()=>regenerateAnalysis(item.id)} /></Tooltip>
              <Tooltip title='Generează scrisoare'><Button icon={<FileTextOutlined/>} onClick={onGenLetter} loading={generating} /></Tooltip>
              {item.status==='Open' && <Tooltip title='Start'><Button icon={<BranchesOutlined/>} onClick={()=>changeStatus(item.id,'In Progress')} /></Tooltip>}
              {item.status==='In Progress' && <Tooltip title={canSend? 'Marchează trimis':'Necesită dovezi minime'}><Button type='primary' disabled={!canSend} icon={<SendOutlined/>} onClick={markSent} /></Tooltip>}
              {item.status==='Sent' && <Tooltip title='Câștigat'><Button type='primary' icon={<FileDoneOutlined/>} onClick={markWon} /></Tooltip>}
              {item.status==='Sent' && (
                <Tooltip title='Pierdut'>
                  <Button danger onClick={markLost}>Pierdut</Button>
                </Tooltip>
              )}
            </div>
          </div>
        </div>
        {item.analysis?.reasons && (
          <div style={{marginTop:12,display:'flex',flexWrap:'wrap',gap:8}}>
            {item.analysis.reasons.map(r=> <Tag key={r} color='blue'>{r}</Tag>)}
            {item.analysis.rulesSummary && <Tag color='purple'>{item.analysis.rulesSummary}</Tag>}
          </div>
        )}
      </Card>

      {/* TIMELINE */}
      <Card title='Progres' style={{borderRadius:18}} bodyStyle={{padding:'12px 20px 4px'}}>
        <Steps size='small' current={timelineSteps.currentIndex} items={timelineSteps.items} responsive />
      </Card>

      {/* INFO + CHECKLIST ROW */}
      <div style={{display:'grid',gap:18,gridTemplateColumns:'repeat(auto-fit,minmax(360px,1fr))'}}>
        <Card title='Informații caz' style={{borderRadius:18}} bodyStyle={{padding:'12px 16px 16px'}}>
          <div style={{display:'grid',gap:6,fontSize:13}}>
            <div><b>Motiv:</b> {item.reason}</div>
            <div><b>Sumă:</b> {item.amount} {item.currency}</div>
            <div><b>Owner:</b> {item.owner||'—'}</div>
            <div><b>Last update:</b> {new Date(item.lastUpdate).toLocaleString()}</div>
            <div><b>Reguli:</b> {item.analysis?.rulesSummary || '—'}</div>
          </div>
        </Card>
  <Card title={`Checklist — ${item.reason}`} style={{borderRadius:18}} bodyStyle={{padding:'12px 16px 4px'}} extra={<span style={{fontSize:12,opacity:.6}}>{requiredOkCount(checklistSafe)}/{requiredTotal(checklistSafe)} req · {Math.round(checklistSafe.filter(c=>c.status==='ok').length / (checklistSafe.length||1)*100)}%</span>}>
          <List
            size='small'
            dataSource={checklistSafe}
            renderItem={ci => {
              const colorByStatus = ci.status==='ok' ? 'green' : ci.status==='uploaded' ? 'blue' : ci.status==='na' ? 'gold' : 'default';
              const statusLabel = ci.status==='ok' ? 'Verificat' : ci.status==='uploaded' ? 'Încărcat' : ci.status==='na' ? 'N/A' : 'Lipsește';
              return (
                <List.Item style={{padding:'6px 4px'}} actions={[
                  ci.status!=='na' && <Button size='small' type={ci.status==='ok'?'default':'dashed'} onClick={()=>toggleChecklist(ci)}>{ci.status==='ok'?'✔':'Bifează'}</Button>,
                  ci.status!=='na' && <Upload beforeUpload={(file)=>{ beforeUpload(file); updateChecklistItem(item.id, ci.id, { status:'uploaded', extracted: file.name.slice(0,60) }); return false; }} multiple={false} showUploadList={false}>
                    <Button size='small' icon={<InboxOutlined/>} />
                  </Upload>,
                  ci.status!=='na' ? <Button size='small' onClick={()=>markNA(ci)}>N/A</Button> : <Button size='small' onClick={()=>revertNA(ci)}>Reset</Button>
                ].filter(Boolean)}>
                  <div style={{display:'flex',flexDirection:'column',flex:1}}>
                    <span style={{fontSize:13,fontWeight:500,display:'flex',alignItems:'center',gap:6}}>
                      {ci.label} {ci.required && <Tag color='red' style={{marginLeft:0}}>req</Tag>}
                      <Tag color={colorByStatus} style={{marginLeft:0}}>{statusLabel}</Tag>
                    </span>
                    <span style={{fontSize:11,opacity:.65}}>
                      {ci.naReason && ci.status==='na' ? `Neaplicabil: ${ci.naReason}` : (ci.extracted || (ci.status==='ok'?'OK':'—'))}
                    </span>
                  </div>
                </List.Item>
              );
            }}
          />
          <div style={{fontSize:11,opacity:.6,marginTop:6}}>Trimite disponibil doar când toate dovezile obligatorii sunt verificate (sau marcate N/A).</div>
        </Card>
        <Card title='Atașamente' style={{borderRadius:18}} bodyStyle={{padding:'12px 16px 12px'}} extra={<Upload beforeUpload={beforeUpload} showUploadList={false}><Button size='small' icon={<PlusOutlined/>}>Upload</Button></Upload>}>
          <div style={{display:'flex',flexWrap:'wrap',gap:10}}>
            {attachmentsSafe.map(a => (
              <div key={a.id} style={{width:160,padding:10,border:'1px solid #eee',borderRadius:12,background:'#fafafa',display:'flex',flexDirection:'column',gap:6}}>
                <div style={{fontSize:12,fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}} title={a.name}>{a.name}</div>
                <div style={{fontSize:10,opacity:.6}}>{(a.size/1024).toFixed(1)} KB</div>
                <Button size='small' onClick={()=>message.info('Marcat pentru scrisoare (demo)')}>Folosește</Button>
              </div>
            ))}
            {attachmentsSafe.length===0 && <div style={{fontSize:12,opacity:.6}}>Nimic încă.</div>}
          </div>
        </Card>
      </div>

      {/* LETTER */}
      <Card title='Scrisoare dispută' style={{borderRadius:18}} extra={
        <Space>
          {!editingLetter && <Button size='small' icon={<EditOutlined/>} onClick={()=>{setEditingLetter(true); setLetterDraft(item.letter||letterDraft);}}>Editează</Button>}
          {editingLetter && <Button size='small' type='primary' icon={<SaveOutlined/>} onClick={saveLetter}>Salvează</Button>}
          <Button size='small' icon={<CopyOutlined/>} onClick={()=>{navigator.clipboard.writeText(item.letter||letterDraft||''); message.success('Copiat');}}>Copiază</Button>
          <Button size='small' icon={<DownloadOutlined/>} onClick={downloadLetter}>Descarcă</Button>
        </Space>
      }>
        {editingLetter ? (
          <Input.TextArea value={letterDraft} onChange={e=>setLetterDraft(e.target.value)} autoSize={{minRows:10}} />
        ) : (
          item.letter ? <pre style={{background:'#111',color:'#eee',padding:16,borderRadius:12,fontSize:12,whiteSpace:'pre-wrap',margin:0}}>{item.letter}</pre> : <Alert type='info' message='Nicio scrisoare generată încă' />
        )}
      </Card>

      {/* NOTES & ACTIVITY */}
      <div style={{display:'grid',gap:18,gridTemplateColumns:'repeat(auto-fit,minmax(420px,1fr))'}}>
  <Card title='Notițe interne' style={{borderRadius:18}} bodyStyle={{padding:'12px 16px 16px'}} extra={<span style={{fontSize:12,opacity:.6}}>{notesSafe.length}</span>}>
          <List
            size='small'
            dataSource={[...notesSafe].sort((a,b)=>b.at-a.at)}
            locale={{emptyText:'Nicio notiță'}}
            renderItem={n => (
              <List.Item style={{padding:'6px 4px'}}>
                <div style={{display:'flex',flexDirection:'column',fontSize:12}}>
                  <span style={{fontWeight:600}}>{n.author} <span style={{opacity:.6,fontWeight:400}}>{new Date(n.at).toLocaleString([], { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'short'})}</span></span>
                  <span style={{whiteSpace:'pre-wrap'}}>{n.text}</span>
                </div>
              </List.Item>
            )}
          />
          <Input.TextArea value={noteText} onChange={e=>setNoteText(e.target.value)} rows={3} placeholder='Adaugă notiță...' style={{marginTop:8}} />
          <Button type='primary' size='small' style={{marginTop:6}} onClick={addNoteHandler}>Adaugă</Button>
        </Card>
  <Card title='Activitate' style={{borderRadius:18}} bodyStyle={{padding:'12px 16px 12px'}} extra={<span style={{fontSize:12,opacity:.6}}>{activitySafe.length}</span>}>
          <div style={{maxHeight:300,overflowY:'auto',display:'flex',flexDirection:'column',gap:4}}>
            {[...activitySafe].sort((a,b)=>b.at-a.at).map(a => (
              <div key={a.id} style={{fontSize:12,padding:'6px 8px',border:'1px solid #f0f0f0',borderRadius:8,background:'#fafafa'}}>
                <span style={{opacity:.6}}>{new Date(a.at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span> — {a.text}
              </div>
            ))}
            {activitySafe.length===0 && <div style={{fontSize:12,opacity:.6}}>Nimic încă</div>}
          </div>
        </Card>
      </div>

      <Modal open={showLetter} title='Draft generat' onCancel={()=>setShowLetter(false)} width={720} footer={[
        <Button key='close' onClick={()=>setShowLetter(false)}>Închide</Button>,
        <Button key='copy' type='primary' icon={<CopyOutlined/>} onClick={()=>{navigator.clipboard.writeText(tmpLetter||item.letter); setShowLetter(false); message.success('Copiat');}}>Copiază</Button>
      ]}>
        <pre style={{background:'#111',color:'#eee',padding:12,borderRadius:8,fontSize:12,whiteSpace:'pre-wrap'}}>{tmpLetter||item.letter}</pre>
        <Divider />
        <Alert type='warning' showIcon message='Revizuiește și maschează date sensibile înainte de a trimite.' />
      </Modal>

      {/* DECISION / AUDIT TIMELINE */}
      <Card title='Istoric decizii' style={{borderRadius:18}} bodyStyle={{padding:'12px 16px 16px'}} extra={
        <Space size={4} wrap>
          {['all','status','ai','letter','file','checklist','note','legacy'].map(f => (
            <Tag key={f} color={eventFilter===f? 'blue':'default'} style={{cursor:'pointer',marginInlineEnd:0}} onClick={()=>setEventFilter(f)}>{f}</Tag>
          ))}
        </Space>
      }>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {[...eventsSafe]
            .sort((a,b)=>b.at-a.at)
            .filter(e => eventFilter==='all' ? true : e.category===eventFilter)
            .map(e => {
              const dateStr = new Date(e.at).toLocaleString([], {hour:'2-digit',minute:'2-digit', day:'2-digit', month:'short'});
              let title = '';
              switch(e.action){
                case EA.STATUS_CHANGE: title = `Status → ${e.details?.status}`; break;
                case EA.AI_RECOMMENDATION: title = `AI: ${e.details?.recommendation} (${Math.round((e.details?.probability||0)*100)}%)`; break;
                case EA.LETTER_GENERATED: title = `Scrisoare v${e.details?.version} (hash ${e.details?.hash?.slice(0,6)})`; break;
                case EA.FILE_UPLOAD: title = `Fișier încărcat: ${e.details?.name}`; break;
                case EA.CHECKLIST_UPDATE: title = `Checklist item ${e.details?.itemId}`; break;
                case EA.NOTE_ADDED: title = 'Notiță adăugată'; break;
                default: title = e.details?.text || e.action;
              }
              return (
                <div key={e.id} style={{display:'flex',gap:12,position:'relative',paddingLeft:22}}>
                  <div style={{position:'absolute',left:6,top:6,width:10,height:10,borderRadius:10,background:'#1677ff'}} />
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600}}>{title}</div>
                    <div style={{fontSize:11,opacity:.65}}>de {e.actor?.name||'User'}, {dateStr}</div>
                    {Object.keys(e.details||{}).length>0 && (
                      <details style={{marginTop:4}}>
                        <summary style={{cursor:'pointer',fontSize:11,opacity:.75}}>Detalii</summary>
                        <pre style={{background:'#111',color:'#eee',padding:8,borderRadius:8,fontSize:11,whiteSpace:'pre-wrap',marginTop:4}}>{JSON.stringify(e.details,null,2)}</pre>
                      </details>
                    )}
                  </div>
                </div>
              );
            })}
          {eventsSafe.length===0 && <div style={{fontSize:12,opacity:.6}}>Fără evenimente</div>}
        </div>
      </Card>
    </div>
  );
}
