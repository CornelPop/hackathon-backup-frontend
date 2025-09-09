import React, {useEffect, useMemo, useState} from "react";
import {
    Layout,
    Typography,
    Segmented,
    Row, Col, theme, Input, Modal, Button, Space, Tag, message, Steps, Divider, Tooltip,
} from "antd";
import InvoiceCard from "../../components/InvoiceCard.jsx";
import CustomHeader from "../../components/CustomHeader.jsx";
import NavigationBar from "../../components/NavigationBar.jsx";
import Title from "antd/es/skeleton/Title.js";
import {SearchOutlined} from "@ant-design/icons";

const {Content} = Layout;
const {Text} = Typography;

const FALLBACK_INVOICES = Array.from({length: 12}).map((_, i) => {
    let status;

    if (i % 6 === 0) {
        status = "FLAGGED";
    } else if (i % 7 === 0) {
        status = "FAILED";
    } else if (i % 3 === 0) {
        status = "SUCCESSFUL";
    } else {
        status = "OPEN";
    }

    return {
        id: crypto.randomUUID?.() || `INV-${i.toString().padStart(4, "0")}`,
        amount: status === "FAILED" ? 9990 : 49,
        currency: "USD",
        label:
            status === "FAILED"
                ? "August premium"
                : status === "FLAGGED"
                    ? "Flagged transaction"
                    : "Monthly premium",
        status,
        createdAt: `2025-0${(i % 9) + 1}-01`,
    };
});

import { usePayments } from './PaymentsContext';

export default function Payments({ onPay}) {
    const { payments, loaded, error, addPayment } = usePayments();
    // Use fallback only before remote load completes; once loaded show actual list (even if empty)
    const invoices = !loaded ? FALLBACK_INVOICES : payments.map(p => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        label: p.label,
        status: p.status,
        createdAt: p.created_at
    }));
    const [q, setQ] = useState("");
    const [filter, setFilter] = useState("ALL");

    const {
        token: {colorBgLayout},
    } = theme.useToken();

    const filtered = useMemo(() => {
        const pool = filter === "ALL" ? invoices : invoices.filter((i) => i.status === filter);
        const query = q.trim().toLowerCase();
        if (!query) return pool;
        return pool.filter((i) =>
            [i.id, i.label, i.amount.toString()].some((s) => String(s).toLowerCase().includes(query))
        );
    }, [filter, invoices, q]);

    const [paying, setPaying] = useState(null); // invoice object (Pay)
    const [genLink, setGenLink] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [copied, setCopied] = useState(false);
    const [retrying, setRetrying] = useState(null); // invoice object (Retry)
    const [processing, setProcessing] = useState(false);
    const [processStep, setProcessStep] = useState(0);
    const [retryOutcome, setRetryOutcome] = useState(null); // 'success' | 'failure' | null
    const [overrides, setOverrides] = useState({}); // id -> { status, attempts:[{id,time,result,reason}] }

    function handlePay(inv){
        const link = `https://pay.example.com/checkout/${inv.id}?amt=${inv.amount}&cur=${inv.currency}`;
        setGenLink(link);
        setPaying(inv);
        onPay?.(inv);
    }

    function handleRetry(inv){
        // Initialize attempt history if not exists
        setRetryOutcome(null);
        setProcessStep(0);
        setProcessing(false);
        setRetrying(inv);
    }

    const closeModal = () => { setPaying(null); setSending(false); setSent(false); setCopied(false); };
    const closeRetry = () => { setRetrying(null); setProcessing(false); setRetryOutcome(null); setProcessStep(0); };

        const copyLink = () => {
                navigator.clipboard.writeText(genLink)
                    .then(()=> { setCopied(true); message.success('Link copiat'); setTimeout(()=> setCopied(false), 1700); })
                    .catch(()=> message.error('Copy failed'));
    };

    const sendLink = () => {
                if(sent) return;
                setSending(true);
                setTimeout(()=>{ 
                        setSending(false); 
                        setSent(true); 
                        message.success('Link marcat ca trimis');
                }, 900);
    };

        const failureReasons = [
            'Issuer declined',
            'Insufficient funds',
            'Do not honor',
            'Expired card',
            'Processing error'
        ];
        const pickReason = (id) => {
            let sum = 0; for(const ch of id) sum += ch.charCodeAt(0); return failureReasons[sum % failureReasons.length];
        };

        const recommendedWindow = () => {
            const opts = ['în 15 minute','în 1 oră','după 3 ore','mâine','după actualizare date'];
            return opts[Math.floor(Math.random()*opts.length)];
        };

            // Simulate multi-step processing
            const startRetry = () => {
                if(!retrying || processing) return;
                setProcessing(true);
                setRetryOutcome(null);
                setProcessStep(0);
                const steps = [
                    { delay: 500 }, // initializing
                    { delay: 900 }, // contacting issuer
                    { delay: 800 }, // awaiting response
                ];
                let acc = 0;
                steps.forEach((s, idx) => {
                    acc += s.delay;
                    setTimeout(()=> setProcessStep(idx+1), acc);
                });
                // Final outcome
                acc += 600;
                setTimeout(()=> {
                    const success = Math.random() < 0.55; // ~55% success chance
                    const reason = success ? 'Approved by issuer' : pickReason(retrying.id);
                    setRetryOutcome(success ? 'success' : 'failure');
                    setProcessing(false);
                    setOverrides(prev => {
                        const current = prev[retrying.id] || { status: retrying.status, attempts: [] };
                            const attempt = { id: 'att-'+Date.now(), time: Date.now(), result: success?'success':'failure', reason };
                            const newStatus = success ? 'SUCCESSFUL' : current.status; // only update if success
                            return { ...prev, [retrying.id]: { ...current, status: newStatus, attempts: [...current.attempts, attempt] } };
                    });
                    if(success){
                        message.success('Payment succeeded');
                    } else {
                        message.error('Retry failed: '+reason);
                    }
                }, acc);
            };

            // Merge overrides into invoices rendered
            const effectiveInvoices = useMemo(()=> {
                return filtered.map(inv => overrides[inv.id] ? { ...inv, status: overrides[inv.id].status } : inv);
            }, [filtered, overrides]);

        return (
        <Content
            style={{
                overflow: "auto",
                background: colorBgLayout,
                minHeight: 0,
                minWidth: 0,
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: 24,
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                    paddingInline: 12,
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 1, minWidth: 280 }}>
                    <Segmented
                        value={filter}
                        onChange={(val) => setFilter(String(val))}
                        options={["ALL", "OPEN", "SUCCESSFUL", "FLAGGED", "FAILED"]}
                        size="large"
                    />
                    <Text type="secondary">
                        {filtered.length} result{filtered.length === 1 ? "" : "s"}
                    </Text>
                </div>
                <div style={{display:'flex', gap:12, flexWrap:'wrap', alignItems:'center'}}>
                    <Input
                        allowClear
                        size="large"
                        prefix={<SearchOutlined />}
                        placeholder="Search invoices (ID or description)"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        style={{ maxWidth: 360, flex: "1 1 300px" }}
                    />
                    {/* New Invoice button moved to header */}
                </div>
            </div>

            <div style={{width: '100%', paddingInline: 12}}>
                <Row gutter={[24, 24]}>
                    {loaded && invoices.length === 0 && (
                        <Col span={24}>
                            <div style={{textAlign:'center', padding:40, opacity:.7}}>No payments yet. Create one from the New Invoice button.</div>
                        </Col>) }
                    {effectiveInvoices.map((item) => (
                        <Col key={item.id} xs={24} sm={24} md={12} lg={8} xl={8} xxl={8} style={{display: "flex"}}>
                            <div style={{width: "100%"}}>
                                                                <InvoiceCard item={item} onPay={handlePay} onRetry={handleRetry}/>
                            </div>
                        </Col>
                    ))}
                </Row>
            </div>
                        <Modal
                            open={!!paying}
                            onCancel={closeModal}
                            title={paying? `Collect payment – ${paying.id}`:''}
                            footer={null}
                        >
                            {paying && (
                                <div style={{display:'flex',flexDirection:'column',gap:16}}>
                                    <div style={{display:'grid',gap:8,fontSize:13}}>
                                        <div><b>Amount:</b> {paying.amount} {paying.currency}</div>
                                        <div><b>Description:</b> {paying.label}</div>
                                        <div><b>Status:</b> <Tag color={paying.status==='OPEN'?'blue':paying.status==='FLAGGED'?'orange':paying.status==='FAILED'?'red':'green'} style={{marginLeft:4}}>{paying.status}</Tag></div>
                                    </div>
                                    <div style={{display:'flex',flexDirection:'column',gap:6}}>
                                        <span style={{fontSize:12,opacity:.7}}>Payment link</span>
                                        <Input value={genLink} readOnly />
                                        <Space>
                                              <Button onClick={copyLink} disabled={copied}>{copied? 'Copied' : 'Copy'}</Button>
                                              <Button type={sent? 'default':'primary'} onClick={sendLink} loading={sending} disabled={sent} style={sent? {background:'#f5f5f5', color:'#555'}:undefined}>{sent? 'Sent' : 'Send'}</Button>
                                              <Button onClick={()=> { if(sent) return; setGenLink(prev => prev + '&r='+Math.random().toString(36).slice(2,6)); }}>Regenerate</Button>
                                        </Space>
                                    </div>
                                    <div style={{fontSize:11,opacity:.6,lineHeight:1.4}}>Demo: aici ai putea adăuga opțiuni de validare email client, expirație link, canal trimitere (email/SMS), preview mesaj.</div>
                                </div>
                            )}
                        </Modal>
                                                <Modal
                                                    open={!!retrying}
                                                    onCancel={processing ? undefined : closeRetry}
                                                    maskClosable={!processing}
                                                    title={retrying? `Retry payment – ${retrying.id}`: ''}
                                                    footer={null}
                                                >
                                                    {retrying && (
                                                        <div style={{display:'flex',flexDirection:'column',gap:18}}>
                                                            <div style={{display:'flex',flexDirection:'column',gap:4,fontSize:13}}>
                                                                <div><b>Amount:</b> {retrying.amount} {retrying.currency}</div>
                                                                <div><b>Description:</b> {retrying.label}</div>
                                                                <div><b>Current status:</b> <Tag color={ (overrides[retrying.id]?.status||retrying.status)==='SUCCESSFUL' ? 'green':'red'}>{(overrides[retrying.id]?.status||retrying.status)}</Tag></div>
                                                                {(overrides[retrying.id]?.status||retrying.status)==='FAILED' && <div><b>Last failure:</b> {overrides[retrying.id]?.attempts?.slice(-1)[0]?.reason || pickReason(retrying.id)}</div>}
                                                                <div><b>Attempts:</b> {(overrides[retrying.id]?.attempts?.length)||0}</div>
                                                                <div><b>Recommended next window:</b> {recommendedWindow()}</div>
                                                            </div>
                                                            <Divider style={{margin:'4px 0'}} />
                                                            <Steps
                                                                size='small'
                                                                current={retryOutcome ? 3 : processStep}
                                                                items={[
                                                                    { title: 'Init' },
                                                                    { title: 'Issuer' },
                                                                    { title: 'Await' },
                                                                    { title: retryOutcome ? (retryOutcome==='success'?'Succeeded':'Failed') : 'Result' }]
                                                                }
                                                            />
                                                            <div style={{minHeight:40,fontSize:12,display:'flex',alignItems:'center'}}>
                                                                {!processing && !retryOutcome && <span>Ready to retry charge.</span>}
                                                                {processing && <span>Processing step {processStep}/3…</span>}
                                                                {retryOutcome==='success' && <Tag color='green'>Approved by issuer</Tag>}
                                                                {retryOutcome==='failure' && <Tag color='red'>{overrides[retrying.id]?.attempts?.slice(-1)[0]?.reason}</Tag>}
                                                            </div>
                                                            <Divider style={{margin:'0 0 4px'}} />
                                                            <div style={{display:'flex',flexDirection:'column',gap:10}}>
                                                                <div style={{fontSize:11,opacity:.65,lineHeight:1.4}}>
                                                                    Each retry should respect issuer decline codes & velocity limits. Success rate crește cu date card actualizate (3DS / AVS / CVV corecte).
                                                                </div>
                                                                <Space>
                                                                    <Button onClick={closeRetry} disabled={processing}>Close</Button>
                                                                    {(overrides[retrying.id]?.status||retrying.status)!=='SUCCESSFUL' && (
                                                                        <Tooltip title={processing? 'În curs...' : retryOutcome==='success'? 'Deja reușit' : 'Inițiază o nouă încercare'}>
                                                                            <Button type='primary' disabled={processing || retryOutcome==='success'} loading={processing} onClick={startRetry}>
                                                                                {processing ? 'Processing...' : retryOutcome==='success' ? 'Succeeded' : 'Retry charge'}
                                                                            </Button>
                                                                        </Tooltip>
                                                                    )}
                                                                </Space>
                                                            </div>
                                                            { (overrides[retrying.id]?.attempts?.length) ? (
                                                                <div style={{marginTop:8}}>
                                                                    <Typography.Text strong style={{fontSize:12}}>Attempt history</Typography.Text>
                                                                    <div style={{display:'flex',flexDirection:'column',gap:6,marginTop:6,maxHeight:160,overflowY:'auto'}}>
                                                                        {[...overrides[retrying.id].attempts].sort((a,b)=>b.time-a.time).map(a => (
                                                                            <div key={a.id} style={{border:'1px solid #f0f0f0',borderRadius:8,padding:'6px 8px',fontSize:11,background:'#fafafa'}}>
                                                                                <b style={{color:a.result==='success'?'#1677ff':'#cf1322'}}>{a.result.toUpperCase()}</b> — {a.reason} <span style={{opacity:.6}}>{new Date(a.time).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'})}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ): <div style={{fontSize:11,opacity:.55}}>No attempts yet.</div> }
                                                        </div>
                                                    )}
                                                </Modal>
                                                {/* Creation modal removed (handled globally in header) */}
        </Content>
    );
}
