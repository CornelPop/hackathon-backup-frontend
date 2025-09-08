import { Layout, Menu, theme } from "antd";
import {
    DollarOutlined,
    CustomerServiceOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    RobotOutlined,
    ProfileOutlined,
} from "@ant-design/icons";
import React, { useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const { Sider } = Layout;

export default function NavigationBar({ collapsed, onCollapse, topOffset = 72 }) {
    const {
        token: { colorBgContainer, colorBorderSecondary },
    } = theme.useToken();

    const navigate = useNavigate();
    const location = useLocation();

    const activeItem = useMemo(() => {
        if (location.pathname.startsWith("/payments")) return "payments";
    if (location.pathname.startsWith("/cases/analytics")) return "cases-analytics";
    if (location.pathname.startsWith("/cases")) return "cases";
    if (location.pathname.startsWith("/support")) return "support";
    if (location.pathname.startsWith("/ai")) return "ai";
        return "";
    }, [location.pathname]);

    const items = [
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
            key: "support",
            icon: <CustomerServiceOutlined />,
            label: "Support",
            onClick: () => navigate("/support"),
        },
        {
            key: "ai",
            icon: <RobotOutlined />,
            label: "AI Chat",
            onClick: () => navigate("/ai"),
        },
    ];

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
                overflow: "auto",
            }}
            trigger={null}
        >
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
        </Sider>
    );
}