import React, { useState } from "react";
import { Layout, theme } from "antd";
import {Outlet, useLocation} from "react-router-dom";
import CustomHeader from "../components/CustomHeader";
import { usePayments } from '../pages/payments/PaymentsContext';
import NavigationBar from "../components/NavigationBar";

const { Content } = Layout;

export default function AppLayout() {
    const [collapsed, setCollapsed] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    let addPayment;
    try {
        ({ addPayment } = usePayments());
    } catch(_) {}

    const location = useLocation();

    const isAiPage = location.pathname.startsWith("/ai");

    const {
        token: { colorBgLayout },
    } = theme.useToken();

    return (
        <Layout style={{ minHeight: "100vh" }}>
            <CustomHeader onCreated={p => addPayment?.(p)} />

            <Layout hasSider>
                <NavigationBar
                    collapsed={collapsed}
                    onCollapse={() => setCollapsed(!collapsed)}
                />

                <Content
                    style={{
                        padding: isAiPage ? 0 : 24,
                        //overflow: "auto",
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
