import React, { useState } from "react";
import {
    Descriptions,
    Typography,
    theme,
    Button,
    Space,
    Layout,
    Modal,
    Form,
    Input,
    message,
} from "antd";
import {
    UserOutlined,
    MailOutlined,
    PhoneOutlined,
    IdcardOutlined,
    TeamOutlined,
} from "@ant-design/icons";

const { Content } = Layout;
const { Title } = Typography;

export default function Profile({ user }) {
    const {
        token: {
            colorBorderSecondary,
            colorBgContainer,
            colorText,
            colorPrimary,
            colorError,
        },
    } = theme.useToken();

    const [form] = Form.useForm();

    // State for modals
    const [editOpen, setEditOpen] = useState(false);
    const [signOutOpen, setSignOutOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);

    const [mockUser, setMockUser] = useState({
        id: "12345",
        email: "jane.doe@example.com",
        full_name: "Jane Doe",
        phone: "+40 721 123 456",
        role: "Admin",
    });

    // Handle edit save
    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setMockUser((prev) => ({ ...prev, ...values }));
            message.success("Profile updated successfully");
            setEditOpen(false);
        } catch (err) {
            console.log("Validation failed", err);
        }
    };

    // Handle sign out
    const handleSignOut = () => {
        message.info("Signed out");
        setSignOutOpen(false);
        // TODO: implement real sign out logic
    };

    // Handle delete account
    const handleDelete = () => {
        message.error("Account deleted");
        setDeleteOpen(false);
        // TODO: implement real delete logic
    };

    return (
        <Content style={{ padding: 12, background: colorBgContainer, borderRadius: 16 }}>
            <Title level={2} style={{ marginBottom: 24, color: colorPrimary }}>
                Profile
            </Title>

            <Descriptions
                bordered column={1} size="middle" style={{marginBottom: 12}}
            >
                <Descriptions.Item label={<><IdcardOutlined /> ID</>}>
                    {mockUser.id}
                </Descriptions.Item>

                <Descriptions.Item label={<><UserOutlined /> Full Name</>}>
                    {mockUser.full_name || "—"}
                </Descriptions.Item>

                <Descriptions.Item label={<><MailOutlined /> Email</>}>
                    {mockUser.email}
                </Descriptions.Item>

                <Descriptions.Item label={<><PhoneOutlined /> Phone</>}>
                    {mockUser.phone || "—"}
                </Descriptions.Item>

                <Descriptions.Item label={<><TeamOutlined /> Role</>}>
                    {mockUser.role}
                </Descriptions.Item>
            </Descriptions>

            <Space>
                <Button type="primary" onClick={() => {
                    form.setFieldsValue(mockUser); // preload form
                    setEditOpen(true);
                }}>
                    Edit Profile
                </Button>

                <Button danger onClick={() => setSignOutOpen(true)}>
                    Sign out
                </Button>

                <Button danger onClick={() => setDeleteOpen(true)}>
                    Delete Account
                </Button>
            </Space>

            {/* Edit Profile Modal */}
            <Modal
                title="Edit Profile"
                open={editOpen}
                onOk={handleSave}
                onCancel={() => setEditOpen(false)}
                okText="Save"
            >
                <Form form={form} layout="vertical">
                    <Form.Item label="Full Name" name="full_name">
                        <Input />
                    </Form.Item>
                    <Form.Item label="Email" name="email">
                        <Input type="email" />
                    </Form.Item>
                    <Form.Item label="Phone" name="phone">
                        <Input />
                    </Form.Item>
                    <Form.Item label="Role" name="role">
                        <Input />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Sign Out Confirmation */}
            <Modal
                title="Sign Out"
                open={signOutOpen}
                onOk={handleSignOut}
                onCancel={() => setSignOutOpen(false)}
                okText="Yes, sign out"
                cancelText="Cancel"
            >
                <p>Are you sure you want to sign out?</p>
            </Modal>

            {/* Delete Confirmation */}
            <Modal
                title="Delete Account"
                open={deleteOpen}
                onOk={handleDelete}
                onCancel={() => setDeleteOpen(false)}
                okText="Yes, delete"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
            >
                <p>This action cannot be undone. Are you sure you want to delete your account?</p>
            </Modal>
        </Content>
    );
}