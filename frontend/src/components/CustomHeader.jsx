import React, { useEffect, useState } from "react";
import {
    Button,
    Input,
    Space,
    Typography,
    Layout,
    Modal,
    Form,
    message,
    Select,
    theme, Image,
} from "antd";
import {
    PlusOutlined,
    SearchOutlined,
} from "@ant-design/icons";
import ThemeSwitcher from "./ThemeSwitcher.jsx";
import img from "../assets/images/image_1.png";

const { Header } = Layout;
const { Title, Text } = Typography;
const { Option, OptGroup } = Select;

const receiverOptions = [
    { label: "Alice Smith", value: "alice" },
    { label: "Bob Johnson", value: "bob" },
    { label: "Charlie Lee", value: "charlie" },
];

const currencyOptions = ["USD", "EUR", "GBP", "RON"];

const merchantCategoryOptions = [
    {
        label: "Health",
        options: [
            { label: "Pharmacy", value: "pharmacy" },
            { label: "Clinic", value: "clinic" },
        ],
    },
    {
        label: "Entertainment",
        options: [
            { label: "Movies", value: "movies" },
            { label: "Games", value: "games" },
        ],
    },
];

const paymentChannels = ["Bank Transfer", "Card", "Cash"];

export default function CustomHeader({ sticky = true, onCreated }) {
    const [modalOpen, setModalOpen] = useState(false);
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [form] = Form.useForm();
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(()=>{
        try { setCurrentUser(JSON.parse(localStorage.getItem('cb_user'))); } catch(_) { /* ignore */ }
    }, []);

    const {
        token: { colorPrimary, colorBgContainer },
    } = theme.useToken();

    const handleOpen = () => {
        setModalOpen(true);
        // Pre-fill receiver with current user email if available
        const email = currentUser?.email;
        if(email){
            form.setFieldsValue({ receiver: email });
        }
    };
    const handleCancel = () => {
        setModalOpen(false);
        form.resetFields();
    };

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            setConfirmLoading(true);
            const payload = {
                amount: parseFloat(values.amount),
                currency: values.currency,
                label: values.description || 'No description',
                receiver_account: currentUser?.email || values.receiver,
                transaction_type: values.transaction_type || null,
                payment_channel: values.channel,
                merchant_category: values.category,
                fraud_type: values.fraud_type || null,
                status: values.status || 'OPEN'
            };
            const resp = await fetch('http://localhost:8000/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if(!resp.ok){
                const t = await resp.text();
                throw new Error('Create failed '+resp.status+': '+t.slice(0,140));
            }
            const data = await resp.json();
            message.success('Invoice created');
            onCreated?.(data); // pass to parent/context if provided
            setModalOpen(false);
            form.resetFields();
        } catch (err) {
            if(err?.errorFields){
                // form validation errors already shown by antd
            } else {
                console.log("Create payment error:", err);
                message.error(err.message || 'Error');
            }
        } finally {
            setConfirmLoading(false);
        }
    };

    return (
        <>
            <Header
                style={{
                    position: sticky ? "sticky" : "static",
                    top: 0,
                    zIndex: 100,
                    display: "flex",
                    gap: 16,
                    alignItems: "center",
                    background: colorBgContainer,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.36)",
                    paddingInline: 24,
                    height: 72,
                }}
            >
                <div style={{ flex: 1 }}>
                    <Image
                        src={img}
                        alt="Logo"
                        preview={false}
                        height={90}
                        width={90}
                        style={{ objectFit: "contain" }}
                    />
                </div>

                <Button type="primary" icon={<PlusOutlined />} onClick={handleOpen}>New Payment</Button>

                <ThemeSwitcher />
            </Header>

            <Modal
                title="New Payment"
                open={modalOpen}
                onOk={handleOk}
                confirmLoading={confirmLoading}
                onCancel={handleCancel}
                okText="Submit"
            >
                <Form layout="vertical" form={form}>
                    <Form.Item label="Status" name="status" initialValue="OPEN" rules={[{ required: true, message: 'Select status'}]}>
                        <Select options={[
                            {label:'Open', value:'OPEN'},
                            {label:'Successful', value:'SUCCESSFUL'},
                            {label:'Flagged', value:'FLAGGED'},
                            {label:'Failed', value:'FAILED'},
                        ]} />
                    </Form.Item>
                    <Form.Item label="Receiver (current user)" name="receiver" initialValue={currentUser?.email} rules={[{ required: true, message: 'Receiver required'}]}>
                        <Input readOnly value={currentUser?.email} placeholder="Not logged" />
                    </Form.Item>
                    <Form.Item label="Transaction Type" name="transaction_type">
                        <Input placeholder="e.g. purchase / refund" />
                    </Form.Item>
                    <Form.Item label="Fraud Type" name="fraud_type">
                        <Input placeholder="optional fraud category" />
                    </Form.Item>

                    <Form.Item
                        label="Amount"
                        name="amount"
                        rules={[{ required: true, message: "Please enter an amount" }]}
                    >
                        <Input type="number" placeholder="49.00" />
                    </Form.Item>

                    <Form.Item
                        label="Currency"
                        name="currency"
                        rules={[{ required: true, message: "Select currency" }]}
                    >
                        <Select placeholder="Select currency">
                            {currencyOptions.map((cur) => (
                                <Select.Option key={cur} value={cur}>
                                    {cur}
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item label="Description" name="description">
                        <Input.TextArea placeholder="Optional description..." rows={3} />
                    </Form.Item>

                    <Form.Item
                        label="Merchant Category"
                        name="category"
                        rules={[{ required: true, message: "Select a category" }]}
                    >
                        <Select placeholder="Select merchant category">
                            {merchantCategoryOptions.map((group) => (
                                <OptGroup key={group.label} label={group.label}>
                                    {group.options.map((item) => (
                                        <Option key={item.value} value={item.value}>
                                            {item.label}
                                        </Option>
                                    ))}
                                </OptGroup>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        label="Payment Channel"
                        name="channel"
                        rules={[{ required: true, message: "Select a payment channel" }]}
                    >
                        <Select placeholder="Select payment channel">
                            {paymentChannels.map((ch) => (
                                <Option key={ch} value={ch}>
                                    {ch}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
}