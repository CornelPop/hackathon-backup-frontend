import React, { useState } from "react";
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
import img from "../assets/images/placeholder logo.jpg";

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

export default function CustomHeader({ sticky = true }) {
    const [modalOpen, setModalOpen] = useState(false);
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [form] = Form.useForm();

    const {
        token: { colorPrimary, colorBgContainer },
    } = theme.useToken();

    const handleOpen = () => setModalOpen(true);
    const handleCancel = () => {
        setModalOpen(false);
        form.resetFields();
    };

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            setConfirmLoading(true);
            await new Promise((resolve) => setTimeout(resolve, 1500));
            console.log("Form submitted:", values);
            message.success("Invoice created");
            setModalOpen(false);
            form.resetFields();
        } catch (err) {
            console.log("Validation failed:", err);
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
                        height={50}
                        style={{ objectFit: "contain" }}
                    />
                </div>

                <Button type="primary" icon={<PlusOutlined />} size="large" onClick={handleOpen}>
                    New invoice
                </Button>

                <ThemeSwitcher />
            </Header>

            <Modal
                title="New Invoice"
                open={modalOpen}
                onOk={handleOk}
                confirmLoading={confirmLoading}
                onCancel={handleCancel}
                okText="Submit"
            >
                <Form layout="vertical" form={form}>
                    <Form.Item
                        label="Receiver Account"
                        name="receiver"
                        rules={[{ required: true, message: "Please select a receiver" }]}
                    >
                        <Select
                            showSearch
                            placeholder="Search and select"
                            filterOption={(input, option) =>
                                option?.label?.toLowerCase().includes(input.toLowerCase())
                            }
                            options={receiverOptions}
                        />
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