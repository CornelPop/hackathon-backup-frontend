import React, {useEffect, useRef, useState} from 'react';
import {
    Button, Input, Upload, Typography, Space, Tag, Tooltip,
    Drawer, Divider, Alert, message as antdMessage, theme
} from 'antd';
import {
    SendOutlined, PaperClipOutlined, RobotOutlined, UserOutlined,
    FileOutlined, QuestionCircleOutlined, CloseOutlined
} from '@ant-design/icons';
import CustomRightDrawer from "../../components/CustomRightDrawer.jsx";
import {useLocation} from "react-router-dom";

const genId = () => Math.random().toString(36).slice(2, 10);

export default function AIChat() {
    const {token} = theme.useToken();
    const location = useLocation();
    const item = location.state?.item;

    const [messages, setMessages] = useState([]); // {id,role,content,attachments,at}
    const [value, setValue] = useState(item?.id ?? '');
    const [pending, setPending] = useState([]);   // {id,name,type,url}
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const listRef = useRef(null);

    useEffect(() => {
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    }, [messages]);

    // Auto-submit standardized dispute message only once (guard for React StrictMode double mount)
    const autoSentRef = useRef(false);
    useEffect(() => {
        if (!item) return;
        if (autoSentRef.current) return; // already sent during this mount
        if (messages.length > 0) return; // user already interacted
        autoSentRef.current = true;
        const template = `Dispută tranzacție flagată:
ID: ${item.id}
Sumă: ${item.amount} ${item.currency}
Descriere: ${item.label}
Status curent: ${item.status}
Context: am nevoie de pașii recomandați și ce dovezi/documente să pregătesc pentru a reduce riscul de chargeback. Indică clar ce lipsește.`;
        (async () => { await send(template); })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [item, messages.length]);

    const callBackend = async (history) => {
        try {
            const resp = await fetch('http://localhost:8000/chat', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({messages: history.map(m => ({role: m.role, content: m.content}))})
            });
            if (!resp.ok) {
                let detail = 'Eroare server';
                const ct = resp.headers.get('content-type') || '';
                try {
                    if (ct.includes('application/json')) {
                        const errJson = await resp.json();
                        if (errJson && (errJson.detail || errJson.error)) detail = errJson.detail || errJson.error;
                        else detail = JSON.stringify(errJson).slice(0, 400);
                    } else {
                        const t = await resp.text();
                        if (t) detail = t.slice(0, 400);
                    }
                } catch (_) {
                }
                antdMessage.error(`Eroare: ${detail}`);
                return {text: `Eroare: ${detail}`, error: true};
            }
            const data = await resp.json();
            return {text: data.answer || '(fără răspuns)', error: false};
        } catch (e) {
            const msg = e?.message ? e.message : 'Eroare la generare răspuns.';
            antdMessage.error(msg);
            return {text: `Eroare: ${msg}`, error: true};
        }
    };

    const send = async (customText) => {
        const base = (customText !== undefined ? customText : value).trim();
        if (!base && pending.length === 0) return;
        if (loading) return;

        const userMsg = {id: genId(), role: 'user', content: base, attachments: pending, at: Date.now()};
        setMessages(m => [...m, userMsg]);
        if (customText === undefined) setValue(''); else setValue(v => (v === base ? '' : v));
        setPending([]);
        setLoading(true);
        try {
            const history = [...messages, userMsg];
            const reply = await callBackend(history);
            setMessages(m => [...m, {
                id: genId(),
                role: 'assistant',
                content: reply.text,
                error: reply.error,
                attachments: [],
                at: Date.now()
            }]);
        } finally {
            setLoading(false);
        }
    };

    const onKeyDown = e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    };
    const beforeUpload = file => {
        if (pending.length >= 5) {
            antdMessage.warning('Max 5 attach');
            return Upload.LIST_IGNORE;
        }
        const url = URL.createObjectURL(file);
        setPending(p => [...p, {
            id: genId(),
            name: file.name,
            type: file.type.startsWith('image/') ? 'image' : 'file',
            url
        }]);
        return false;
    };
    const removePending = id => setPending(p => p.filter(a => a.id !== id));

    const bubble = m => {
        const isUser = m.role === 'user';
        const isError = !!m.error && m.role === 'assistant';

        // Theme-aware colors
        const bg = isUser
            ? token.colorPrimary
            : isError
                ? token.colorErrorBg
                : token.colorBgContainer;
        const fg = isUser
            ? token.colorTextLightSolid
            : isError
                ? token.colorErrorText
                : token.colorText;
        const border = isError ? `1px solid ${token.colorErrorBorder}` : 'none';
        const avatarBg = isUser ? token.colorPrimary : token.colorFillSecondary;
        const avatarFg = isUser ? token.colorTextLightSolid : token.colorTextTertiary;

        return (
            <div key={m.id}
                 style={{display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', padding: '4px 8px'}}>
                <div style={{maxWidth: 640, display: 'flex', gap: 8, flexDirection: isUser ? 'row-reverse' : 'row'}}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 8, background: avatarBg, color: avatarFg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
                    }}>
                        {isUser ? <UserOutlined/> : <RobotOutlined/>}
                    </div>
                    <div style={{
                        background: bg, color: fg, padding: '10px 14px', borderRadius: 18,
                        boxShadow: token.boxShadowSecondary, minWidth: 120, whiteSpace: 'pre-wrap', border
                    }}>
                        <div style={{fontSize: 14, lineHeight: 1.55, fontWeight: isError ? 600 : 500}}>{m.content}</div>

                        {m.attachments?.length > 0 && (
                            <div style={{marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6}}>
                                {m.attachments.map(a => a.type === 'image' ? (
                                    <div key={a.id} style={{
                                        width: 72, height: 72, borderRadius: 8, overflow: 'hidden',
                                        border: `1px solid ${token.colorBorderSecondary}`
                                    }}>
                                        <img src={a.url} alt={a.name}
                                             style={{width: '100%', height: '100%', objectFit: 'cover'}}/>
                                    </div>
                                ) : <Tag key={a.id} icon={<FileOutlined/>}
                                         style={{marginInlineEnd: 0, background: token.colorFillQuaternary}}>
                                    {a.name}
                                </Tag>)}
                            </div>
                        )}

                        <div style={{opacity: .65, fontSize: 10, marginTop: 4, color: token.colorTextTertiary}}>
                            {new Date(m.at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div style={{
            height: `calc(100vh - 72px)` ,
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            background: token.colorBgLayout,
            overflow: 'hidden'
        }}>

            {/* Scrollable message list */}
            <div ref={listRef} style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                background: token.colorBgLayout,
                minHeight: 0 // Important for flex child to shrink
            }}>
                {messages.map(bubble)}
                {messages.length === 0 && (
                    <div style={{maxWidth: 760, margin: '48px auto 40px', padding: '0 16px'}}>
                        <div style={{textAlign: 'center', marginBottom: 28}}>
                            <RobotOutlined style={{fontSize: 56, marginBottom: 12, color: token.colorTextQuaternary}}/>
                            <div style={{
                                fontSize: 18,
                                fontWeight: 600,
                                letterSpacing: .3,
                                color: token.colorTextSecondary
                            }}>
                                Alege o întrebare de start sau scrie propria întrebare
                            </div>
                        </div>

                        <div style={{
                            display: 'grid',
                            gap: 16,
                            gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))'
                        }}>
                            {[
                                'Tutorial — îmi poți arăta, pas cu pas, cum deschid și rezolv un caz?',
                                'Abonament anulat dar taxat — care sunt documentele obligatorii și pașii de urmat?',
                                'Checklist inițial (universal) — ce informații și documente trebuie să pregătesc înainte să încep?',
                                'Formular de caz — generează un template pe care să-l completez și să-l trimit aici'
                            ].map(text => (
                                <div key={text}
                                     onClick={() => send(text)}
                                     role='button'
                                     tabIndex={0}
                                     onKeyDown={e => {
                                         if (e.key === 'Enter') send(text)
                                     }}
                                     style={{
                                         background: token.colorBgContainer,
                                         border: `1px solid ${token.colorBorderSecondary}`,
                                         borderRadius: 14,
                                         padding: '14px 16px',
                                         cursor: 'pointer',
                                         display: 'flex',
                                         flexDirection: 'column',
                                         gap: 8,
                                         minHeight: 110,
                                         boxShadow: token.boxShadowTertiary,
                                         transition: 'border-color .18s, box-shadow .18s, transform .18s'
                                     }}
                                     onMouseEnter={e => {
                                         e.currentTarget.style.borderColor = token.colorPrimary;
                                         e.currentTarget.style.boxShadow = token.boxShadowSecondary;
                                     }}
                                     onMouseLeave={e => {
                                         e.currentTarget.style.borderColor = token.colorBorderSecondary;
                                         e.currentTarget.style.boxShadow = token.boxShadowTertiary;
                                     }}
                                >
                                    <div style={{
                                        fontSize: 13,
                                        fontWeight: 600,
                                        lineHeight: 1.35,
                                        color: token.colorText
                                    }}>
                                        {text}
                                    </div>
                                    <div style={{
                                        marginTop: 'auto',
                                        fontSize: 11,
                                        color: token.colorTextTertiary,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6
                                    }}>
                                        <span>Click pentru a trimite</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Fixed composer at bottom */}
            <div
                style={{
                    borderTop: `1px solid ${token.colorSplit}`,
                    padding: '12px 16px',
                    background: token.colorBgContainer,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    flexShrink: 0, // Prevent shrinking
                    position: 'relative', // Changed from sticky to relative
                    zIndex: 2
                }}
            >
                {pending.length > 0 && (
                    <div style={{display: 'flex', gap: 6, flexWrap: 'wrap'}}>
                        {pending.map(f => (
                            <Tag
                                key={f.id}
                                closable
                                onClose={() => removePending(f.id)}
                                icon={f.type === 'image' ? null : <FileOutlined/>}
                                style={{marginInlineEnd: 0, background: token.colorFillQuaternary, padding: '4px 8px'}}
                            >
                            <span style={{
                                maxWidth: 140,
                                display: 'inline-block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>{f.name}</span>
                            </Tag>
                        ))}
                    </div>
                )}

                <div style={{display: 'flex', gap: 8}}>
                    <Upload beforeUpload={beforeUpload} multiple showUploadList={false}
                            accept='image/*,application/pdf,text/plain'>
                        <Tooltip title='Atașează fișiere'>
                            <Button icon={<PaperClipOutlined/>}/>
                        </Tooltip>
                    </Upload>

                    <Input.TextArea
                        value={value}
                        onChange={e => setValue(e.target.value)}
                        onKeyDown={onKeyDown}
                        autoSize={{minRows: 2, maxRows: 5}}
                        placeholder='Scrie mesajul... Enter trimite'
                        disabled={loading}
                        style={{flex: 1, resize: 'none'}}
                    />

                    <Button
                        type='primary'
                        icon={<SendOutlined/>}
                        onClick={send}
                        disabled={(value.trim() === '' && pending.length === 0) || loading}
                    >
                        Trimite
                    </Button>
                    <Tooltip title="User Guide">
                        <Button
                            type="primary"
                            shape="circle"
                            size="large"
                            icon={<QuestionCircleOutlined style={{fontSize: 32}}/>}
                            onClick={() => setOpen(true)}
                        />
                    </Tooltip>
                </div>

                <div style={{
                    fontSize: 11,
                    color: token.colorTextTertiary,
                    display: 'flex',
                    justifyContent: 'space-between'
                }}>
                    <span>{pending.length}/5 attach</span>
                    <span>{loading ? 'Se generează răspuns...' : 'Enter = trimite, Shift+Enter = linie nouă'}</span>
                </div>
            </div>

            <CustomRightDrawer open={open} setOpen={setOpen} setValue={setValue} />
        </div>
    );
}
