import {Layout, Typography, Descriptions, Space, Button, Tag, theme} from "antd";
import {useParams, useNavigate} from "react-router-dom";
import {CustomerServiceOutlined, ArrowLeftOutlined} from "@ant-design/icons";
import CustomHeader from "../../components/CustomHeader.jsx";
import NavigationBar from "../../components/NavigationBar.jsx";

const {Content} = Layout;
const {Title, Text} = Typography;

export default function PaymentDetails() {
    const {transactionId} = useParams();
    const navigate = useNavigate();

    const {
        token: {colorBgLayout},
    } = theme.useToken();

    const payment = {
        transaction_id: transactionId,
        timestamp: "2024-06-04T14:23:00Z",
        sender_account: "ACC-123456",
        receiver_account: "ACC-654321",
        amount: 349.99,
        transaction_type: "payment",
        merchant_category: "Retail",
        location: "New York, NY",
        device_used: "mobile",
        is_fraud: true,
        fraud_type: "Geo Anomaly",
        time_since_last_transaction: 2.5,
        spending_deviation_score: 1.75,
        velocity_score: 6,
        geo_anomaly_score: 0.92,
        payment_channel: "card",
        ip_address: "192.168.1.1",
        device_hash: "e98c7af2398f21984cf09a"
    };

    const formatAmount = (amt) => `$${amt.toFixed(2)}`;

    return (
        <Content
            style={{
                overflow: "auto",
                background: colorBgLayout,
                minHeight: 0,
                minWidth: 0,
            }}
        >
            <Space direction="vertical" size="large" style={{width: "100%"}}>
                <Space align="center" style={{justifyContent: "space-between", width: "100%"}}>
                    <Title level={3} style={{margin: 0}}>
                        Payment Details
                    </Title>
                    <Button icon={<ArrowLeftOutlined/>} onClick={() => navigate("/payments")}>Back</Button>
                </Space>

                <Descriptions bordered column={1} size="middle">
                    <Descriptions.Item label="Transaction ID">{payment.transaction_id}</Descriptions.Item>
                    <Descriptions.Item label="Timestamp">{payment.timestamp}</Descriptions.Item>
                    <Descriptions.Item label="Sender Account">{payment.sender_account}</Descriptions.Item>
                    <Descriptions.Item label="Receiver Account">{payment.receiver_account}</Descriptions.Item>
                    <Descriptions.Item label="Amount">{formatAmount(payment.amount)}</Descriptions.Item>
                    <Descriptions.Item label="Transaction Type">{payment.transaction_type}</Descriptions.Item>
                    <Descriptions.Item label="Merchant Category">{payment.merchant_category}</Descriptions.Item>
                    <Descriptions.Item label="Location">{payment.location}</Descriptions.Item>
                    <Descriptions.Item label="Device Used">{payment.device_used}</Descriptions.Item>
                    <Descriptions.Item label="Payment Channel">{payment.payment_channel}</Descriptions.Item>
                    <Descriptions.Item label="IP Address">{payment.ip_address}</Descriptions.Item>
                    <Descriptions.Item label="Device Hash">{payment.device_hash}</Descriptions.Item>
                    <Descriptions.Item label="Velocity Score">{payment.velocity_score}</Descriptions.Item>
                    <Descriptions.Item label="Geo Anomaly Score">{payment.geo_anomaly_score}</Descriptions.Item>
                    <Descriptions.Item
                        label="Time Since Last Txn">{payment.time_since_last_transaction} hrs</Descriptions.Item>
                    <Descriptions.Item
                        label="Spending Deviation Score">{payment.spending_deviation_score}</Descriptions.Item>
                    <Descriptions.Item label="Fraudulent">
                        {payment.is_fraud ? <Tag color="red">Yes</Tag> : <Tag color="green">No</Tag>}
                    </Descriptions.Item>
                    {payment.fraud_type && (
                        <Descriptions.Item label="Fraud Type">{payment.fraud_type}</Descriptions.Item>
                    )}
                </Descriptions>

                <Space>
                    <Button
                        type="primary"
                        icon={<CustomerServiceOutlined/>}
                        onClick={() => navigate("/ai")}
                    >
                        Dispute
                    </Button>
                </Space>
            </Space>
        </Content>
    );
}
