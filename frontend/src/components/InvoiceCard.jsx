import { Button, Card, Space, Tag, Tooltip, Row, Col } from "antd";
import {
    CreditCardOutlined,
    SafetyOutlined,
    CloseCircleOutlined,
    WarningOutlined,
    ExpandOutlined,
    CustomerServiceOutlined,
} from "@ant-design/icons";
import { Typography } from "antd";
const { Title, Text } = Typography;
import { useNavigate } from "react-router-dom";

export default function InvoiceCard({ item, onPay, onRetry, clientMeta }) {
    const navigate = useNavigate();

    const statusColor = {
        OPEN: { bg: "#fff7e6", text: "#ad6800", border: "#ffe7ba" },
        SUCCESSFUL: { bg: "#f6ffed", text: "#237804", border: "#d9f7be" },
        FAILED: { bg: "#fff1f0", text: "#a8071a", border: "#ffccc7" },
        FLAGGED: { bg: "#fef3e3", text: "#d46b08", border: "#faad14" },
        REFUNDED: { bg: "#e6f4ff", text: "#0958d9", border: "#bae0ff" },
        CANCELED: { bg: "#fafafa", text: "#595959", border: "#d9d9d9" },
        EXPIRED: { bg: "#fafafa", text: "#8c8c8c", border: "#d9d9d9" }
    };

    const statusIcon = {
        OPEN: null,
        SUCCESSFUL: <SafetyOutlined />,
        FAILED: <CloseCircleOutlined />,
    FLAGGED: <WarningOutlined />,
    REFUNDED: <SafetyOutlined />,
    CANCELED: <CloseCircleOutlined />,
    EXPIRED: <CloseCircleOutlined />,
    };

    const c = statusColor[item.status] || statusColor["OPEN"];

    const amountFmt = (amt, cur) =>
        new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: cur || "USD",
        }).format(amt);

    return (
        <Card
            hoverable
            style={{
                borderRadius: 16,
                height: "100%",
                boxShadow: "0 8px 26px rgba(35,35,89,0.08)",
                display: "flex",
                flexDirection: "column",
                position: "relative",
            }}
        >
            <Tooltip title="View details">
                <Button
                    type="text"
                    icon={<ExpandOutlined />}
                    size="small"
                    style={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        zIndex: 1,
                        borderRadius: 6,
                    }}
                    onClick={() => navigate(`/payments/${item.id}`)}
                />
            </Tooltip>

            <Space style={{ width: "100%", justifyContent: "space-between", marginTop: 10 }} align="start">
                                <Tag
                    style={{
                        background: c.bg,
                        color: c.text,
                        borderColor: c.border,
                        paddingInline: 10,
                        borderRadius: 999,
                        fontWeight: 600,
                    }}
                    icon={statusIcon[item.status] || null}
                >
                                        {item.status}
                                                                                {item.status==='FLAGGED' && (
                                                                                        <span style={{fontWeight:400, marginLeft:4}}>
                                                                                              ({ (item.flag_category==='RISK' || (!item.flag_category && clientMeta?.risk_trigger)) ? 'RISC' : (item.flag_category==='DISPUTE' || (!item.flag_category && clientMeta?.reason)) ? 'DISPUTĂ' : 'FLAG' })
                                                                                        </span>
                                                                                )}
                </Tag>

                <Title level={4} style={{ margin: 0 }}>
                    {amountFmt(item.amount, item.currency)}
                </Title>
            </Space>

            <div style={{ marginTop: 8 }}>
                <Text strong>{item.label}</Text>
            </div>
                        <div style={{ marginTop: 6, flex: 1, display:'flex', flexDirection:'column', gap:4 }}>
                                <Text type="secondary">ID: {item.id}</Text>
                                {item.status==='FLAGGED' && (item.flag_category || clientMeta?.reason || clientMeta?.risk_trigger) && (
                                    <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                                        {item.flag_category && <Tag color={item.flag_category==='RISK'?'orange':'purple'} style={{marginInlineEnd:0}}>{item.flag_category}</Tag>}
                                        {(item.flag_reason || clientMeta?.risk_trigger || clientMeta?.reason) && (
                                            <Tag style={{background:'#fafafa',borderColor:'#d9d9d9',marginInlineEnd:0,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis'}}>
                                                {(item.flag_reason || clientMeta?.risk_trigger || clientMeta?.reason)}
                                            </Tag>) }
                                    </div>
                                )}
                        </div>

            <Row gutter={8} style={{ marginTop: 16 }}>
                <Col span={item.status === "FLAGGED" ? 12 : 24}>
                    {item.status === "OPEN" ? (
                        <Button
                            type="primary"
                            icon={<CreditCardOutlined />}
                            onClick={() => onPay?.(item)}
                            block
                            style={{ borderRadius: 10 }}
                        >
                            Pay
                        </Button>
                    ) : item.status === "FAILED" ? (
                        <Button danger block style={{ borderRadius: 10 }} onClick={() => onRetry?.(item)}>
                            Retry
                        </Button>
                    ) : (
                        <Button disabled block style={{ borderRadius: 10 }}>
                            {item.status}
                        </Button>
                    )}
                </Col>

                                {item.status === "FLAGGED" && (
                                    <Col span={12}>
                                        <Button
                                            type="default"
                                            block
                                            icon={<CustomerServiceOutlined />}
                                            style={{ borderRadius: 10 }}
                                            onClick={() => {
                                                const reasonMap = {
                                                    NOT_RECOGNIZED: 'Tranzacție nerecunoscută',
                                                    UNDELIVERED: 'Produs/serviciu nelivrat',
                                                    SUB_CANCEL_CHARGED: 'Abonament anulat dar taxat',
                                                    DOUBLE_CHARGE: 'Dublă încasare',
                                                    STOLEN_CARD: 'Card furat',
                                                    NOT_AS_DESCRIBED: 'Nu corespunde descrierii',
                                                    FAMILY_FRAUD: 'Fraudă prietenoasă / familie',
                                                    TRIAL_AUTORENEW: 'Trial auto-renewal contestat'
                                                };
                                                const isRisk = (item.flag_category==='RISK') || (!item.flag_category && clientMeta?.risk_trigger);
                                                                        if(isRisk){
                                                                            const trigger = clientMeta?.risk_trigger || item.flag_reason || 'UNKNOWN';
                                                                            const riskObj = {
                                                                                type: 'RISK_REVIEW_REQUEST',
                                                                                payment: {
                                                                                    id: item.id,
                                                                                    amount: item.amount,
                                                                                    currency: item.currency,
                                                                                    label: item.label,
                                                                                    flag_category: 'RISK',
                                                                                    risk_trigger: trigger
                                                                                },
                                                                                client: clientMeta ? {
                                                                                    id: clientMeta.id,
                                                                                    email_masked: clientMeta.email_masked,
                                                                                    country: clientMeta.country,
                                                                                    total_payments: clientMeta.total_payments,
                                                                                    disputed_payments: clientMeta.disputed_payments,
                                                                                    lifetime_value: clientMeta.lifetime_value,
                                                                                    average_ticket: clientMeta.average_ticket
                                                                                } : null,
                                                                                risk_context: {
                                                                                    trigger_code: trigger,
                                                                                    description_hint: 'Semnal risc generat din profil/random simulation'
                                                                                },
                                                                                required_output: {
                                                                                    fraud_risk_percent: '0-100 integer',
                                                                                    confidence: 'LOW|MEDIUM|HIGH',
                                                                                    recommendation: 'REFUND|APPROVE|HOLD',
                                                                                    rationale: 'max 2 sentences',
                                                                                    next_evidence: ['list of 2-5 signals to collect']
                                                                                }
                                                                            };
                                                                            const prefill = `Evaluează tranzacția risc și răspunde STRICT doar cu JSON valid conform structurii (fără markdown, fără text înainte/după).\n${JSON.stringify(riskObj, null, 2)}`;
                                                    navigate('/ai', { state: { item, prefill } });
                                                    return;
                                                }
                                                // Dispute flow
                                                const r = item.flag_category==='DISPUTE' ? (clientMeta?.reason) : (clientMeta?.risk_trigger || clientMeta?.reason);
                                                const readable = (()=>{
                                                    if(clientMeta?.reason && reasonMap[clientMeta.reason]) return reasonMap[clientMeta.reason];
                                                    return r || 'Motiv nespecificat';
                                                })();
                                                const clientDetails = clientMeta ? `\nProfil client: ${clientMeta.email_masked||clientMeta.id} (${clientMeta.country||'N/A'})\nTotal plăți: ${clientMeta.total_payments} | Disputate: ${clientMeta.disputed_payments} | Win rate: ${clientMeta.chargeback_win_rate}% | LTV: ${clientMeta.lifetime_value}` : 'Profil client indisponibil';
                                                const prefill = `Dispută inițiată pentru tranzacție FLAGGED (DISPUTĂ).\nID: ${item.id}\nSumă: ${item.amount} ${item.currency}\nDescriere: ${item.label}\nMotiv dispută: ${readable}\nCod intern: ${item.flag_reason||clientMeta?.reason||'N/A'}${clientDetails}\nTe rog oferă pași și EV (Fight vs Refund).`;
                                                navigate('/ai', { state: { item, prefill } });
                                            }}
                                        >
                                            {(item.flag_category==='RISK') || (!item.flag_category && clientMeta?.risk_trigger) ? 'ASK AI' : 'Dispute'}
                                        </Button>
                                    </Col>
                                )}
            </Row>
        </Card>
    );
}