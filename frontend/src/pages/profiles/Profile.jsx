import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
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

export default function Profile() {
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
    const navigate = useNavigate();

    // State for modals
    const [editOpen, setEditOpen] = useState(false);
    const [signOutOpen, setSignOutOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Load current user from localStorage (saved at login/signup) then refresh from backend
    useEffect(() => {
        try {
            const raw = localStorage.getItem('cb_user');
            if(raw){
                const parsed = JSON.parse(raw);
                setUser(parsed);
                // Fetch fresh details
                if(parsed.id){
                    fetch(`http://localhost:8000/users/${parsed.id}`)
                        .then(r=> r.ok ? r.json(): null)
                        .then(data => { if(data){ setUser(prev => ({...prev, ...data})); } })
                        .finally(()=> setLoading(false));
                } else {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        } catch(e){ setLoading(false); }
    }, []);

    // Handle edit save
    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            if(!user?.id) return;
            const res = await fetch(`http://localhost:8000/users/${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: values.full_name, phone: values.phone })
            });
            if(!res.ok){
                return message.error('Update failed');
            }
            const updated = await res.json();
            const merged = { ...user, ...updated, full_name: updated.name };
            setUser(merged);
            localStorage.setItem('cb_user', JSON.stringify(merged));
            message.success("Profile updated");
            setEditOpen(false);
        } catch (err) {
            console.log("Validation failed", err);
        }
    };

    // Handle sign out
    const handleSignOut = () => {
        try { localStorage.removeItem('cb_user'); } catch(_) {}
        message.success('Signed out');
        setSignOutOpen(false);
        navigate('/auth');
    };

    // Handle delete account
    const handleDelete = () => {
        message.error("Account deleted");
        setDeleteOpen(false);
        // TODO: implement real delete logic
    };

    if(loading) return <div style={{padding:24}}>Loading...</div>;
    if(!user) return <div style={{padding:24}}>No user logged in.</div>;

    return (
        <Content style={{ padding: 12, background: colorBgContainer, borderRadius: 16 }}>
            <Title level={2} style={{ marginBottom: 24, color: colorPrimary }}>
                Profile
            </Title>

            <Descriptions
                bordered column={1} size="middle" style={{marginBottom: 12}}
            >
                <Descriptions.Item label={<><IdcardOutlined /> ID</>}>
                    {user.id}
                </Descriptions.Item>

                <Descriptions.Item label={<><UserOutlined /> Full Name</>}>
                    {user.name || user.full_name || "—"}
                </Descriptions.Item>

                <Descriptions.Item label={<><MailOutlined /> Email</>}>
                    {user.email}
                </Descriptions.Item>

                <Descriptions.Item label={<><PhoneOutlined /> Phone</>}>
                    {user.phone || "—"}
                </Descriptions.Item>

                <Descriptions.Item label={<><TeamOutlined /> Role</>}>
                    {user.role}
                </Descriptions.Item>
            </Descriptions>

            <Space>
                <Button type="primary" onClick={() => {
                    form.setFieldsValue({ full_name: user.name || user.full_name, email: user.email, phone: user.phone, role: user.role });
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
                        <Input type="email" disabled />
                    </Form.Item>
                    <Form.Item label="Phone" name="phone">
                        <Input />
                    </Form.Item>
                    <Form.Item label="Role" name="role">
                        <Input disabled />
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