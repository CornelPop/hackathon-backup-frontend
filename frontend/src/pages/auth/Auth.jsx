import React from "react";
import { useNavigate } from "react-router-dom";
import {
    Layout,
    Card,
    Tabs,
    Form,
    Input,
    Button,
    Typography,
    Checkbox,
    Divider,
    Space,
    Row,
    Col,
} from "antd";
import { UserOutlined, LockOutlined, MailOutlined } from "@ant-design/icons";
import "antd/dist/reset.css"; // Ant Design v5 reset
import styles from "./Auth.module.css";

const { Title, Text } = Typography;

const AuthPage = () => {
    const navigate = useNavigate();

    const goHome = () => navigate('/payments');

    const onLogin = (values) => {
        console.log("Login:", values);
        goHome();
    };

    const onSignup = (values) => {
        console.log("Sign up:", values);
        goHome();
    };

    return (
        <Layout className={styles.layout}>
            {/* Background layers */}
            <div className={styles.gradient} />
            <div className={styles.blurOverlay} />

            {/* Centered content */}
            <div className={styles.centerWrap}>
                <Row justify="center" style={{ width: "100%" }}>
                    <Col>
                        <Card className={styles.card} bordered={false}>
                            <div className={styles.header}>
                                <Title level={3} style={{ marginBottom: 0 }}>
                                    Welcome
                                </Title>
                                <Text type="secondary">
                                    Sign in to continue or create an account
                                </Text>
                            </div>

                            <Tabs
                                defaultActiveKey="login"
                                items={[
                                    {
                                        key: "login",
                                        label: "Login",
                                        children: (
                                            <Form
                                                name="login"
                                                layout="vertical"
                                                onFinish={onLogin}
                                                requiredMark={false}
                                                size="large"
                                            >
                                                <Form.Item
                                                    name="email"
                                                    label="Email"
                                                    rules={[
                                                        { required: true, message: "Please enter your email" },
                                                        { type: "email", message: "Please enter a valid email" },
                                                    ]}
                                                >
                                                    <Input
                                                        prefix={<MailOutlined />}
                                                        placeholder="you@example.com"
                                                        allowClear
                                                    />
                                                </Form.Item>

                                                <Form.Item
                                                    name="password"
                                                    label="Password"
                                                    rules={[{ required: true, message: "Please enter your password" }]}
                                                >
                                                    <Input.Password
                                                        prefix={<LockOutlined />}
                                                        placeholder="••••••••"
                                                    />
                                                </Form.Item>

                                                <Form.Item
                                                    name="remember"
                                                    valuePropName="checked"
                                                    style={{ marginBottom: 8 }}
                                                >
                                                    <Checkbox>Remember me</Checkbox>
                                                </Form.Item>

                                                <Space
                                                    direction="vertical"
                                                    style={{ width: "100%" }}
                                                    size="middle"
                                                >
                                                    <Button type="primary" htmlType="submit" block>
                                                        Log in
                                                    </Button>
                                                    <Button type="default" block>
                                                        Continue with Google
                                                    </Button>
                                                </Space>
                                            </Form>
                                        ),
                                    },
                                    {
                                        key: "signup",
                                        label: "Sign Up",
                                        children: (
                                            <Form
                                                name="signup"
                                                layout="vertical"
                                                onFinish={onSignup}
                                                requiredMark={false}
                                                size="large"
                                            >
                                                <Form.Item
                                                    name="name"
                                                    label="Full Name"
                                                    rules={[{ required: true, message: "Please enter your name" }]}
                                                >
                                                    <Input
                                                        prefix={<UserOutlined />}
                                                        placeholder="Jane Doe"
                                                        allowClear
                                                    />
                                                </Form.Item>

                                                <Form.Item
                                                    name="email"
                                                    label="Email"
                                                    rules={[
                                                        { required: true, message: "Please enter your email" },
                                                        { type: "email", message: "Please enter a valid email" },
                                                    ]}
                                                >
                                                    <Input
                                                        prefix={<MailOutlined />}
                                                        placeholder="you@example.com"
                                                        allowClear
                                                    />
                                                </Form.Item>

                                                <Form.Item
                                                    name="password"
                                                    label="Password"
                                                    rules={[{ required: true, message: "Please create a password" }]}
                                                >
                                                    <Input.Password
                                                        prefix={<LockOutlined />}
                                                        placeholder="Create a strong password"
                                                    />
                                                </Form.Item>

                                                <Form.Item
                                                    name="confirm"
                                                    label="Confirm Password"
                                                    dependencies={["password"]}
                                                    rules={[
                                                        { required: true, message: "Please confirm your password" },
                                                        ({ getFieldValue }) => ({
                                                            validator(_, value) {
                                                                if (!value || getFieldValue("password") === value) {
                                                                    return Promise.resolve();
                                                                }
                                                                return Promise.reject(
                                                                    new Error("The two passwords do not match")
                                                                );
                                                            },
                                                        }),
                                                    ]}
                                                >
                                                    <Input.Password
                                                        prefix={<LockOutlined />}
                                                        placeholder="Repeat your password"
                                                    />
                                                </Form.Item>

                                                <Space
                                                    direction="vertical"
                                                    style={{ width: "100%" }}
                                                    size="middle"
                                                >
                                                    <Button type="primary" htmlType="submit" block>
                                                        Create account
                                                    </Button>
                                                    <Button type="default" block>
                                                        Sign up with Google
                                                    </Button>
                                                </Space>
                                            </Form>
                                        ),
                                    },
                                ]}
                            />

                            <Divider style={{ marginTop: 8, marginBottom: 0 }} />
                            <div className={styles.footerText}>
                                <Text>
                                    By continuing, you agree to our{" "}
                                    <a href="#">Terms</a> and <a href="#">Privacy Policy</a>.
                                </Text>
                            </div>
                        </Card>
                    </Col>
                </Row>
            </div>
        </Layout>
    );
};

export default AuthPage;
