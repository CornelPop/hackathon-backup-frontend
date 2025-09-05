import React, { useState } from "react";
import { Layout, theme } from "antd";
import { Outlet } from "react-router-dom";
import CustomHeader from "../components/CustomHeader";
import NavigationBar from "../components/NavigationBar";

const { Content } = Layout;

export default function AppLayout() {
    const [collapsed, setCollapsed] = useState(false);
    const [q, setQ] = useState("");
    const [modalOpen, setModalOpen] = useState(false);

    const {
        token: { colorBgLayout },
    } = theme.useToken();

    return (
        <Layout style={{ minHeight: "100vh" }}>
            <CustomHeader
                q={{ value: q }}
                onSearch={setQ}
                onNew={() => setModalOpen(true)}
            />

            <Layout hasSider>
                <NavigationBar
                    collapsed={collapsed}
                    onCollapse={() => setCollapsed(!collapsed)}
                />

                <Content
                    style={{
                        padding: 24,
                        overflow: "auto",
                        background: colorBgLayout,
                        minHeight: 0,
                        minWidth: 0,
                    }}
                >
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
}
