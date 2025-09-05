import React, { useState } from "react";
import {
    Layout,
    Input,
    Button,
    Typography,
    Space,
    theme,
    Upload,
    Image,
} from "antd";
import {UploadOutlined, SendOutlined, CloseCircleFilled} from "@ant-design/icons";

const { Content } = Layout;
const { TextArea } = Input;
const { Title, Text } = Typography;

export default function AIAssistant() {
    const [messages, setMessages] = useState([]);
    const [value, setValue] = useState("");
    const [attachments, setAttachments] = useState([]);

    const {
        token: { colorBgLayout, colorBgContainer, colorPrimary },
    } = theme.useToken();

    const onSend = async (val) => {
        if (!val.trim() && attachments.length === 0) return;

        const userMessage = { sender: "user", text: val, attachments };
        const botMessage = { sender: "bot", text: "works", attachments: [] };

        setMessages((prev) => [...prev, userMessage, botMessage]);
        setValue("");
        setAttachments([]);
    };

    const handleUpload = (file) => {
        const isImage = file.type.startsWith("image/");
        if (!isImage) {
            return Upload.LIST_IGNORE; // Ignore non-image
        }
        const url = URL.createObjectURL(file);
        setAttachments((prev) => [...prev, { name: file.name, url }]);
        return false;
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend(value);
        }
    };

    return (
        <Content style={{ position: 'relative', paddingInline: 300, height: '100vh', background: colorBgLayout }}>
            {messages.length === 0 ? (
                <div style={{ textAlign: "center", marginTop: 80 }}>
                    <div style={{ fontSize: 48, opacity: 0.4 }}>💳</div>
                    <Title level={3}>Welcome to Payment Assistant</Title>
                    <Text>
                        Ask about recent transactions, get help with invoices, or find insights into your payment
                        history.
                    </Text>
                </div>
            ) : (
                <Space direction="vertical" style={{ width: "100%" }} size="middle">
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            width: "100%",
                        }}
                    >
                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                style={{
                                    width: "100%",
                                    display: "flex",
                                    justifyContent: msg.sender === "user" ? "flex-end" : "flex-start",
                                    marginBottom: 12,
                                }}
                            >
                                <div
                                    style={{
                                        maxWidth: 600,
                                        background: msg.sender === "user" ? colorPrimary : colorBgContainer,
                                        color: msg.sender === "user" ? "white" : undefined,
                                        padding: 16,
                                        borderRadius: 16,
                                        whiteSpace: "pre-wrap",
                                    }}
                                >
                                    {msg.text}
                                    {msg.attachments?.length > 0 && (
                                        <div style={{ marginTop: 12 }}>
                                            <Space wrap>
                                                {msg.attachments.map((file, i) => (
                                                    <Image
                                                        key={i}
                                                        src={file.url}
                                                        width={80}
                                                        height={80}
                                                        style={{ objectFit: "cover", borderRadius: 8 }}
                                                        alt={file.name}
                                                    />
                                                ))}
                                            </Space>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                </Space>
            )}

            <div style={
                messages.length === 0
                    ? { marginTop: 24, position: "relative"}
                    : { marginTop: 48, position: "relative" }
            }>
                <TextArea
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Type your message..."
                    autoSize={{ minRows: 3, maxRows: 6 }}
                    style={{ paddingRight: 150, fontSize: 15 }}
                />

                <div
                    style={{
                        position: "absolute",
                        right: 12,
                        bottom: attachments.length === 0 ? 32 : 124,
                        display: "flex",
                        gap: 8,
                    }}
                >
                    <Upload
                        accept="image/*"
                        beforeUpload={handleUpload}
                        showUploadList={false}
                    >
                        <Button icon={<UploadOutlined />} />
                    </Upload>
                    <Button
                        type="primary"
                        icon={<SendOutlined />}
                        onClick={() => onSend(value)}
                        disabled={!value.trim() && attachments.length === 0}
                    >
                        Send
                    </Button>
                </div>

                {attachments.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                        <Space wrap>
                            {attachments.map((file, i) => (
                                <div key={i} style={{ position: "relative", display: "inline-block" }}>
                                    <Image
                                        src={file.url}
                                        width={80}
                                        height={80}
                                        style={{ objectFit: "cover", borderRadius: 8 }}
                                        alt={file.name}
                                        preview={false}
                                    />
                                    <CloseCircleFilled
                                        onClick={() =>
                                            setAttachments((prev) => prev.filter((_, idx) => idx !== i))
                                        }
                                        style={{
                                            position: "absolute",
                                            top: -6,
                                            right: -6,
                                            fontSize: 18,
                                            color: "indianred",
                                            cursor: "pointer",
                                            background: "white",
                                            borderRadius: "50%",
                                        }}
                                    />
                                </div>
                            ))}
                        </Space>
                    </div>
                )}


                <div style={{ fontSize: 12, color: "gray", marginTop: 8 }}>
                    Press Enter to send, Shift+Enter for newline
                </div>
            </div>
        </Content>
    );
}