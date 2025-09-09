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

export default function InvoiceCard({ item, onPay, onRetry }) {
    const navigate = useNavigate();

    const statusColor = {
        OPEN: { bg: "#fff7e6", text: "#ad6800", border: "#ffe7ba" },
        SUCCESSFUL: { bg: "#f6ffed", text: "#237804", border: "#d9f7be" },
        FAILED: { bg: "#fff1f0", text: "#a8071a", border: "#ffccc7" },
        FLAGGED: { bg: "#fef3e3", text: "#d46b08", border: "#faad14" },
    };

    const statusIcon = {
        OPEN: null,
        SUCCESSFUL: <SafetyOutlined />,
        FAILED: <CloseCircleOutlined />,
        FLAGGED: <WarningOutlined />,
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
                </Tag>

                <Title level={4} style={{ margin: 0 }}>
                    {amountFmt(item.amount, item.currency)}
                </Title>
            </Space>

            <div style={{ marginTop: 8 }}>
                <Text strong>{item.label}</Text>
            </div>
            <div style={{ marginTop: 6, flex: 1 }}>
                <Text type="secondary">ID: {item.id}</Text>
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
                            {item.status === "PAID"
                                ? "Paid"
                                : item.status === "FLAGGED"
                                    ? "Flagged"
                                    : "Unknown"}
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
                            onClick={() => navigate("/ai", { state: { item: item } }) }
                        >
                            Dispute
                        </Button>
                    </Col>
                )}
            </Row>
        </Card>
    );
}