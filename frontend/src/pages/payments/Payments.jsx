import React, {useMemo, useState} from "react";
import {
    Layout,
    Typography,
    Segmented,
    Row, Col, theme,
} from "antd";
import InvoiceCard from "../../components/InvoiceCard.jsx";
import CustomHeader from "../../components/CustomHeader.jsx";
import NavigationBar from "../../components/NavigationBar.jsx";

const {Content} = Layout;
const {Text} = Typography;

const MOCK_INVOICES = Array.from({length: 28}).map((_, i) => {
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

export default function Payments({invoices = MOCK_INVOICES, onPay}) {
    const [q, setQ] = useState("");
    const [filter, setFilter] = useState("ALL");
    const [collapsed, setCollapsed] = useState(false);
    const [activeItem, setActiveItem] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);

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
    }, [q, filter, invoices]);

    return (
        <Content
            style={{
                padding: 24,
                overflow: "auto",   // single scroll container
                background: colorBgLayout,
                minHeight: 0,
                minWidth: 0,        // prevents horizontal overflow when sider collapses
            }}
        >
            <div style={{display: "flex", gap: 12, alignItems: "center", marginBottom: 24}}>
                <Segmented
                    value={filter}
                    onChange={(val) => setFilter(val)}
                    options={["ALL", "OPEN", "SUCCESSFUL", "FLAGGED", "FAILED"]}
                    size="large"
                />
                <Text type="secondary" style={{marginLeft: 8}}>
                    {filtered.length} result{filtered.length === 1 ? "" : "s"}
                </Text>
            </div>

            <div style={{width: '100%', paddingInline: 12}}>
                <Row gutter={[24, 24]}>
                    {filtered.map((item) => (
                        <Col key={item.id} xs={24} sm={24} md={12} lg={8} xl={8} xxl={8} style={{display: "flex"}}>
                            <div style={{width: "100%"}}>
                                <InvoiceCard item={item} onPay={onPay}/>
                            </div>
                        </Col>
                    ))}
                </Row>
            </div>
        </Content>
    );

}