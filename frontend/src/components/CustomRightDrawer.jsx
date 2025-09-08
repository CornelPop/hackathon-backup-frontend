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
                message={<b>Nu introduce date sensibile</b>}
                description="Maschează email / telefon / adresă (ex: i***@exemplu.ro)"
                style={{ marginBottom: 24 }}
            />

            {/* Section 1 */}
            <section id="g1">
                <Typography.Title level={4} style={{ marginBottom: 4 }}>
                    1) Scopul ghidului
                </Typography.Title>
                <Typography.Paragraph>
                    Cum folosești chatbotul pentru dispute: informații, dovezi, recomandare Fight vs Refund și draft.
                </Typography.Paragraph>
            </section>

            {/* Section 2 */}
            <section id="g2">
                <Typography.Title level={4} style={{ marginBottom: 4 }}>
                    2) Ce face asistentul
                </Typography.Title>
                <ul style={{ paddingLeft: 18, lineHeight: 1.55 }}>
                    <li>Colectează date tranzacție + motiv.</li>
                    <li>Generează checklist + lipsuri.</li>
                    <li>
                        Recomandă <Tag color="green">Fight</Tag> / <Tag color="volcano">Refund</Tag>.
                    </li>
                    <li>Produce draft scrisoare.</li>
                </ul>
                <Alert
                    type="warning"
                    showIcon
                    message="Nu inventează date și nu decide în locul tău."
                    style={{ marginTop: 8 }}
                />
            </section>

            {/* Section 3 */}
            <section id="g3">
                <Typography.Title level={4} style={{ marginBottom: 4 }}>
                    3) Înainte să începi
                </Typography.Title>
                <div style={{ display: "grid", gap: 4 }}>
                    <div><b>Motiv</b>: nelivrat / fraudă / neconform / dublă / abonament anulat</div>
                    <div><b>Tranzacție</b>: sumă, monedă, dată, ID</div>
                    <div><b>Comandă/Serviciu</b>: orderId, plan, perioadă</div>
                    <div><b>Dovezi</b>: factură, AWB, loguri, email, anulare</div>
                    <div><b>Confidențialitate</b>: maschează PII</div>
                </div>
            </section>

            {/* Section 4 */}
            <section id="g4">
                <Typography.Title level={4} style={{ marginBottom: 4 }}>
                    4) Primul mesaj
                </Typography.Title>
                <Typography.Paragraph style={{ marginBottom: 6 }}>
                    Trimite motiv + date esențiale. Template:
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
                >{`Motiv: ____________________
Tranzacție: sumă ______, monedă ___, dată ______, ID __________
Client (mascat): ____________________
Comandă/Serviciu: orderId ______, descriere ______
Dovezi avute: Factură / AWB / Confirmare / Loguri / Email client / Contract
Observații: ____________________`}</pre>
                <Typography.Paragraph style={{ marginTop: 8 }}>
                    Răspuns: sinteză, ce lipsește, checklist, recomandare, draft (la cerere).
                </Typography.Paragraph>
            </section>

            {/* Section 5 */}
            <section id="g5">
                <Typography.Title level={4} style={{ marginBottom: 4 }}>
                    5) Comenzi utile
                </Typography.Title>
                <Space direction="vertical" size={4} style={{ fontSize: 13 }}>
                    <code>Fă checklist pentru motivul X.</code>
                    <code>Spune-mi ce lipsește ca să pot trimite apărarea.</code>
                    <code>Pe baza datelor, recomanzi Fight sau Refund? De ce?</code>
                    <code>Generează un draft de scrisoare pentru cazul acesta.</code>
                    <code>Rezumat caz în 5 puncte.</code>
                </Space>
            </section>

            {/* Section 6 */}
            <section id="g6">
                <Typography.Title level={4} style={{ marginBottom: 4 }}>
                    6) Dovezi
                </Typography.Title>
                <div style={{ display: "grid", gap: 12 }}>
                    {[
                        { t: "Produs nelivrat", o: "AWB + confirmare / încercări + factură", r: "Conversație client, poze" },
                        { t: "Fraudă", o: "3DS/AVS/CVV, IP/device, data/ora", r: "Istoric cont, pattern" },
                        { t: "Serviciu neconform", o: "Termeni, perioadă, dovada acces", r: "Loguri, suport" },
                        { t: "Dublă încasare", o: "Ambele tranzacții + confirmare dublu", r: "Jurnal sistem, refund/void" },
                        { t: "Abonament anulat", o: "Dovadă anulare + debit contestat", r: "Loguri post-anulare, politică" },
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
                    message="Lipsește o dovadă obligatorie? Nu trimite încă."
                />
            </section>

            {/* Section 7 */}
            <section id="g7">
                <Typography.Title level={4} style={{ marginBottom: 4 }}>
                    7) Format răspuns
                </Typography.Title>
                <ol style={{ paddingLeft: 20, fontSize: 13, lineHeight: 1.55 }}>
                    <li>Motiv identificat</li>
                    <li>Date primite</li>
                    <li>Date lipsă</li>
                    <li>Checklist (✓/✗)</li>
                    <li>Analiză scurtă</li>
                    <li>Recomandare Fight / Refund</li>
                    <li>Draft (opțional)</li>
                    <li>Pașii următori</li>
                </ol>
            </section>

            {/* Section 8 */}
            <section id="g8">
                <Typography.Title level={4} style={{ marginBottom: 4 }}>
                    8) Exemple
                </Typography.Title>
                <div style={{ display: "grid", gap: 12 }}>
                    {[
                        { h: "A. Nelivrat — AWB OK", u: "Motiv nelivrat; 230 RON, 01.09, TX-11; factură + AWB 123 semnat.", a: "Checklist ✓; Fight." },
                        { h: "B. Nelivrat — fără AWB", u: "Motiv nelivrat; 230 RON; factură.", a: "Lipsește AWB → cere completări." },
                        { h: "C. Abonament anulat", u: "Anulare 15.08, debit 01.09; confirmare email; loguri 0.", a: "Refund recomandat." },
                        { h: "D. Fraudă 3DS", u: "Fraudă; 3DS da; device/IP identic.", a: "Fight; cere AVS/CVV dacă lipsesc." },
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
                    9) Draft scrisoare
                </Typography.Title>
                <Typography.Paragraph style={{ marginBottom: 4 }}>
                    Cere: <code>Generează un draft de scrisoare pentru cazul acesta</code>. Include tranzacție, motiv, dovezi, concluzie.
                </Typography.Paragraph>
                <Alert type="info" showIcon message="Verifică PII înainte de folosire." />
            </section>

            {/* Section 10 */}
            <section id="g10">
                <Typography.Title level={4} style={{ marginBottom: 4 }}>
                    10) Bune practici
                </Typography.Title>
                <ul style={{ paddingLeft: 18, lineHeight: 1.55 }}>
                    <li>Clar + complet pe dovezi.</li>
                    <li>Nu trimite fără obligatorii.</li>
                    <li>Maschează PII.</li>
                    <li>Cere „Rezumat caz”.</li>
                    <li>Întreabă „Ce lipsește?”.</li>
                </ul>
            </section>

            {/* Section 11 */}
            <section id="g11">
                <Typography.Title level={4} style={{ marginBottom: 4 }}>
                    11) Greșeli
                </Typography.Title>
                <ul style={{ paddingLeft: 18, lineHeight: 1.55 }}>
                    <li>Descrieri vagi.</li>
                    <li>Lipsă AWB la nelivrat.</li>
                    <li>Amesteci cazuri.</li>
                    <li>Date card complete.</li>
                    <li>Ceri recomandare fără minime.</li>
                </ul>
            </section>

            {/* Section 12 */}
            <section id="g12">
                <Typography.Title level={4} style={{ marginBottom: 4 }}>
                    12) Întrebări
                </Typography.Title>
                <div style={{ display: "grid", gap: 6, fontSize: 13 }}>
                    <div><b>Decide?</b> Nu, doar recomandă.</div>
                    <div><b>Fără dovezi?</b> Cere ce lipsește.</div>
                    <div><b>Găsește AWB?</b> Nu.</div>
                    <div><b>Nu știu motivul?</b> Dă context.</div>
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
                >{`Motiv: ____________________
Tranzacție: sumă ______, monedă ___, dată ______, ID __________
Comandă/Serviciu: ____________________
Dovezi: Factură / AWB / Confirmare / Loguri / Email client / Contract
Observații: ____________________
Te rog: checklist + ce lipsește + recomandare + draft scrisoare.`}</pre>
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
                        setValue("Checklist fraudă tranzacție 1234");
                        setOpen(false);
                    }}
                >
                    Prompt checklist
                </Tag>
                <Tag
                    color="geekblue"
                    style={{ marginInlineEnd: 0, cursor: "pointer" }}
                    onClick={() => {
                        setValue("Recomandare fight vs refund nelivrat TX-11");
                        setOpen(false);
                    }}
                >
                    Prompt fight/refund
                </Tag>
            </Space>
        </Drawer>
    );
}
