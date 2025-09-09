import { Layout, Menu, theme, Typography, Button, List } from "antd";
import {
    DollarOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    RobotOutlined,
    UserOutlined,
    PlusOutlined,

    ProfileOutlined,

} from "@ant-design/icons";
import React, { useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
const stripePromise = loadStripe("pk_test_51S1Pqw3DMcWFm5QSfFiA675aURjuokjahd4vyju0KyrFCB9Vdk00y5fCDuOxRiefwJDZMxrfEFrxtjeTWR3ttvGx00N05xeUQL");

const { Sider } = Layout;
const { Text } = Typography;

export default function NavigationBar({ collapsed, onCollapse, topOffset = 72 }) {
    const {
        token: { colorBgContainer, colorBorderSecondary, paddingSM },
    } = theme.useToken();

    const navigate = useNavigate();
    const location = useLocation();

    const activeItem = useMemo(() => {
        if (location.pathname.startsWith("/payments")) return "payments";

        if (location.pathname.startsWith("/ai")) return "ai";
        if (location.pathname.startsWith("/profile")) return "profile";

    if (location.pathname.startsWith("/cases/analytics")) return "cases-analytics";
    if (location.pathname.startsWith("/cases")) return "cases";

        return "";
    }, [location.pathname]);

    const items = [
        {
            key: "profile",
            icon: <UserOutlined />,
            label: "Profile",
            onClick: () => navigate("/profile"),
        },
        {
            key: "payments",
            icon: <DollarOutlined />,
            label: "Payments",
            onClick: () => navigate("/payments"),
        },
        {

            key: "cases",
            icon: <ProfileOutlined />,
            label: "Cases",
            onClick: () => navigate("/cases"),
        },
        {
            key: "cases-analytics",
            icon: <ProfileOutlined />,
            label: "Analytics",
            onClick: () => navigate("/cases/analytics"),
        },
        {

            key: "ai",
            icon: <RobotOutlined />,
            label: "AI Chat",
            onClick: () => navigate("/ai"),
        },
    ];

    const chats = [
        { id: "c1", title: "Chat with Support" },
        { id: "c2", title: "Refund Case" },
        { id: "c3", title: "New Feature Ideas" },
    ];

    const handleClick = async () => {
        const res = await fetch("http://localhost:8000/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ payment_id: 'abcd' }),
        });
        const data = await res.json();
        const stripe = await stripePromise;
        await stripe.redirectToCheckout({ sessionId: data.id });
        window.location.href = data.url; // fallback redirect
    };

    return (
        <Sider
            width={240}
            collapsedWidth={80}
            collapsed={collapsed}
            collapsible
            onCollapse={onCollapse}
            style={{
                background: colorBgContainer,
                borderRight: `1px solid ${colorBorderSecondary}`,
                position: "sticky",
                top: topOffset,
                height: `calc(100vh - ${topOffset}px)`,
                display: "flex",
                flexDirection: "column",
            }}
            trigger={null}
        >
            {/* Top Menu */}
            <Menu
                mode="inline"
                selectedKeys={[activeItem]}
                onClick={(e) => {
                    const clickedItem = items.find((item) => item.key === e.key);
                    if (clickedItem?.onClick) clickedItem.onClick();
                }}
                inlineCollapsed={collapsed}
                items={[
                    {
                        key: "__toggle__",
                        icon: collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />,
                        label: collapsed ? "Expand" : "Collapse",
                        onClick: () => onCollapse(!collapsed),
                    },
                    ...items,
                ]}
            />

            <div
                style={{
                    flex: 1,
                    padding: paddingSM,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                }}
            >
                {!collapsed && (
                    <Text strong style={{ marginBottom: 8, fontSize: 13 }}>
                        Chats
                    </Text>
                )}

                <div style={{ flex: 1, overflowY: "auto" }}>
                    <List
                        size="small"
                        dataSource={chats}
                        renderItem={(chat) => (
                            <List.Item
                                style={{
                                    padding: "4px 8px",
                                    cursor: "pointer",
                                    borderRadius: 6,
                                }}
                                //onClick={() => navigate(`/chat/${chat.id}`)}
                            >
                                <Text
                                    ellipsis
                                    style={{ fontSize: 13, width: "100%" }}
                                >
                                    {chat.title}
                                </Text>
                            </List.Item>
                        )}
                    />
                </div>

                <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    block
                    style={{ marginTop: 8 }}
                    onClick={() => {
                        console.log("Create new chat");
                        navigate("/ai")
                    }}
                >
                    {!collapsed && "New Chat"}
                </Button>

                <Button onClick={handleClick}>
                    Pay
                </Button>
            </div>
        </Sider>
    );
}
