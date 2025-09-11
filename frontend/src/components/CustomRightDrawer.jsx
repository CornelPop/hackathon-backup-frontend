import React from "react";
import {
    Drawer,
    Typography,
    Space,
    Tag,
    Divider,
    Alert,
    theme,
} from "antd";

export default function CustomRightDrawer({ open, setOpen, setValue }) {
    const { token } = theme.useToken();

    const cardStyle = {
        background: token.colorBgContainer,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        padding: 12,
    };

    return (
        <Drawer
            title="User Guide — Dispute Assistant"
            placement="right"
            width={620}
            destroyOnClose
            open={open}
            onClose={() => setOpen(false)}
            styles={{
                body: {
                    padding: "12px 20px 40px",
                    overflowY: "auto",
                    background: token.colorBgContainer,
                },
                header: { background: token.colorBgContainer },
                footer: { background: token.colorBgContainer },
            }}
        >
            <Divider style={{ margin: "8px 0 12px", borderColor: token.colorSplit }} />

            <Alert
                type="info"
                showIcon
                message={<b>Don't input sensitive data</b>}
                description="Mask email / phone / address (eg: j***@example.com)"
                style={{ marginBottom: 24 }}
            />

            {/* Section 1 */}
            <section id="g1">
                <Typography.Title level={4} style={{ marginBottom: 4 }}>
                    1) Guide purpose
                </Typography.Title>
                <Typography.Paragraph>
                    How to use the dispute assistant: info, evidence, Fight vs Refund recommendation and draft.
                </Typography.Paragraph>
            </section>

            {/* Section 2 */}
            <section id="g2">
                <Typography.Title level={4} style={{ marginBottom: 4 }}>
                    2) What the assistant does
                </Typography.Title>
                <ul style={{ paddingLeft: 18, lineHeight: 1.55 }}>
                    <li>Collects transaction data + reason.</li>
                    <li>Generates checklist + missing items.</li>
                    <li>Recommends <Tag color="green">Fight</Tag> / <Tag color="volcano">Refund</Tag>.</li>
                    <li>Produces dispute letter draft.</li>
                </ul>
                <Alert
                    type="warning"
                    showIcon
                    message="Doesn't fabricate data and doesn't decide for you."
                    style={{ marginTop: 8 }}
                />
            </section>

            {/* Section 3 */}
            <section id="g3">
                <Typography.Title level={4} style={{ marginBottom: 4 }}>
                    3) Before you start
                </Typography.Title>
                <div style={{ display: "grid", gap: 4 }}>
                    <div><b>Reason</b>: undelivered / fraud / not as described / double / canceled subscription</div>
                    <div><b>Transaction</b>: amount, currency, date, ID</div>
                    <div><b>Order/Service</b>: orderId, plan, period</div>
                    <div><b>Evidence</b>: invoice, tracking, logs, email, cancellation</div>
                    <div><b>Privacy</b>: mask PII</div>
                </div>
            </section>

            {/* Section 4 */}
            <section id="g4">
                <Typography.Title level={4} style={{ marginBottom: 4 }}>
                    4) First message
                </Typography.Title>
                <Typography.Paragraph style={{ marginBottom: 6 }}>
                    Send reason + essential data. Template:
                </Typography.Paragraph>
                <pre
                    style={{
                        background: token.colorFillTertiary,
                        color: token.colorText,
                        padding: 12,
                        borderRadius: 8,
                        fontSize: 12,
                        lineHeight: 1.5,
                        overflowX: "auto",
                        border: `1px solid ${token.colorBorderSecondary}`,
                    }}
                >{`Reason: ____________________
Transaction: amount ______, currency ___, date ______, ID __________
Customer (masked): ____________________
Order/Service: orderId ______, description ______
Evidence owned: Invoice / Tracking / Confirmation / Logs / Customer email / Contract
Notes: ____________________`}</pre>
                <Typography.Paragraph style={{ marginTop: 8 }}>
                    Response: summary, what's missing, checklist, recommendation, draft (if requested).
                </Typography.Paragraph>
            </section>

            {/* Section 5 */}
            <section id="g5">
                <Typography.Title level={4} style={{ marginBottom: 4 }}>
                    5) Useful prompts
                </Typography.Title>
                <Space direction="vertical" size={4} style={{ fontSize: 13 }}>
                    <code>Create a checklist for reason X.</code>
                    <code>Tell me what's missing before I can submit.</code>
                    <code>Based on the data, do you recommend Fight or Refund? Why?</code>
                    <code>Generate a dispute letter draft for this case.</code>
                    <code>Case summary in 5 bullet points.</code>
                </Space>
            </section>

            {/* Section 6 */}
            <section id="g6">
                <Typography.Title level={4} style={{ marginBottom: 4 }}>
                    6) Evidence
                </Typography.Title>
                <div style={{ display: "grid", gap: 12 }}>
                    {[
                        { t: "Undelivered product", o: "Tracking + delivery confirmation / attempts + invoice", r: "Customer conversation, photos" },
                        { t: "Fraud", o: "3DS/AVS/CVV, IP/device, date/time", r: "Account history, pattern" },
                        { t: "Not as described", o: "Terms, period, access proof", r: "Logs, support" },
                        { t: "Double charge", o: "Both transactions + duplicate confirmation", r: "System log, refund/void" },
                        { t: "Canceled subscription", o: "Cancellation proof + disputed debit", r: "Post-cancel logs, policy" },
                    ].map((row) => (
                        <div key={row.t} style={cardStyle}>
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>{row.t}</div>
                            <div style={{ fontSize: 12 }}>
                                <Tag color="green">Obligatorii</Tag> {row.o}
                            </div>
                            <div style={{ fontSize: 12, marginTop: 2 }}>
                                <Tag color="blue">Recomandate</Tag> {row.r}
                            </div>
                        </div>
                    ))}
                </div>
                <Alert
                    type="warning"
                    showIcon
                    style={{ marginTop: 10 }}
                    message="Missing required evidence? Don't send yet."
                />
            </section>

            {/* Section 7 */}
            <section id="g7">
                <Typography.Title level={4} style={{ marginBottom: 4 }}>
                    7) Response format
                </Typography.Title>
                <ol style={{ paddingLeft: 20, fontSize: 13, lineHeight: 1.55 }}>
                    <li>Identified reason</li>
                    <li>Data received</li>
                    <li>Missing data</li>
                    <li>Checklist (✓/✗)</li>
                    <li>Short analysis</li>
                    <li>Fight / Refund recommendation</li>
                    <li>Draft (optional)</li>
                    <li>Next steps</li>
                </ol>
            </section>

            {/* Section 8 */}
            <section id="g8">
                <Typography.Title level={4} style={{ marginBottom: 4 }}>
                    8) Examples
                </Typography.Title>
                <div style={{ display: "grid", gap: 12 }}>
                    {[
                        { h: "A. Undelivered — tracking OK", u: "Reason undelivered; 230 RON, 01.09, TX-11; invoice + tracking 123 signed.", a: "Checklist ✓; Fight." },
                        { h: "B. Undelivered — no tracking", u: "Reason undelivered; 230 RON; invoice only.", a: "Missing tracking → request completion." },
                        { h: "C. Canceled subscription", u: "Cancel 15.08, charge 01.09; email confirmation; zero usage logs.", a: "Refund recommended." },
                        { h: "D. Fraud 3DS", u: "Fraud; 3DS yes; device/IP consistent.", a: "Fight; request AVS/CVV if missing." },
                    ].map((ex) => (
                        <div key={ex.h} style={cardStyle}>
                            <b>{ex.h}</b>
                            <div style={{ fontSize: 12, marginTop: 4 }}>
                                <b>User:</b> {ex.u}
                            </div>
                            <div style={{ fontSize: 12, marginTop: 4 }}>
                                <b>Asistent:</b> {ex.a}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Section 9 */}
            <section id="g9">
                <Typography.Title level={4} style={{ marginBottom: 4 }}>
                    9) Letter draft
                </Typography.Title>
                <Typography.Paragraph style={{ marginBottom: 4 }}>
                    Ask: <code>Generate a dispute letter draft for this case</code>. Include transaction, reason, evidence, conclusion.
                </Typography.Paragraph>
                <Alert type="info" showIcon message="Verify PII before use." />
            </section>

            {/* Section 10 */}
            <section id="g10">
                <Typography.Title level={4} style={{ marginBottom: 4 }}>
                    10) Best practices
                </Typography.Title>
                <ul style={{ paddingLeft: 18, lineHeight: 1.55 }}>
                    <li>Clear + complete on evidence.</li>
                    <li>Don't send without required items.</li>
                    <li>Mask PII.</li>
                    <li>Ask for "Case summary".</li>
                    <li>Ask "What is missing?"</li>
                </ul>
            </section>

            {/* Section 11 */}
            <section id="g11">
                <Typography.Title level={4} style={{ marginBottom: 4 }}>
                    11) Mistakes
                </Typography.Title>
                <ul style={{ paddingLeft: 18, lineHeight: 1.55 }}>
                    <li>Vague descriptions.</li>
                    <li>Missing tracking on undelivered.</li>
                    <li>Mixing multiple cases.</li>
                    <li>Full card data present.</li>
                    <li>Asking recommendation without basics.</li>
                </ul>
            </section>

            {/* Section 12 */}
            <section id="g12">
                <Typography.Title level={4} style={{ marginBottom: 4 }}>
                    12) Questions
                </Typography.Title>
                <div style={{ display: "grid", gap: 6, fontSize: 13 }}>
                    <div><b>Does it decide?</b> No, only recommends.</div>
                    <div><b>No evidence?</b> It asks for what's missing.</div>
                    <div><b>Finds tracking?</b> No.</div>
                    <div><b>Don't know the reason?</b> Provide context.</div>
                </div>
            </section>

            {/* Section 13 */}
            <section id="g13">
                <Typography.Title level={4} style={{ marginBottom: 4 }}>
                    13) Template
                </Typography.Title>
                <pre
                    style={{
                        background: token.colorFillTertiary,
                        color: token.colorText,
                        padding: 12,
                        borderRadius: 8,
                        fontSize: 12,
                        lineHeight: 1.5,
                        overflowX: "auto",
                        border: `1px solid ${token.colorBorderSecondary}`,
                    }}
                >{`Reason: ____________________
Transaction: amount ______, currency ___, date ______, ID __________
Order/Service: ____________________
Evidence: Invoice / Tracking / Confirmation / Logs / Customer email / Contract
Notes: ____________________
Please: checklist + missing items + recommendation + letter draft.`}</pre>
            </section>

            <Divider style={{ borderColor: token.colorSplit }} />

            <Space wrap>
                <Tag color="purple" style={{ marginInlineEnd: 0 }}>
                    Beta
                </Tag>
                <Tag
                    color="geekblue"
                    style={{ marginInlineEnd: 0, cursor: "pointer" }}
                    onClick={() => {
                        setValue("Checklist fraud transaction 1234");
                        setOpen(false);
                    }}
                >
                    Prompt checklist
                </Tag>
                <Tag
                    color="geekblue"
                    style={{ marginInlineEnd: 0, cursor: "pointer" }}
                    onClick={() => {
                        setValue("Fight vs Refund recommendation undelivered TX-11");
                        setOpen(false);
                    }}
                >
                    Prompt fight/refund
                </Tag>
            </Space>
        </Drawer>
    );
}
