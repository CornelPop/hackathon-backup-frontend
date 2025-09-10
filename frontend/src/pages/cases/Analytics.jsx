import React, { useEffect, useMemo, useState } from 'react';
import { Card, Row, Col, Select, Tooltip, Statistic, Divider, Slider, Switch, Typography, Space, Tag, Spin, Alert } from 'antd';
import { Line } from '@ant-design/charts';
import { Bar } from '@ant-design/charts';
import { InfoCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { useCases } from './CasesContext';

const { Text } = Typography;

/*
  Analytics page: KPIs + Charts + What-if simulator.
  This is an initial implementation placeholder.
*/

// Removed segmented period selector; using a default window for analytics
const DEFAULT_DAYS = 90;

const REASONS = ['Fraudă','Nelivrat','Neconform','Dublă','Abonament'];

function midnightDaysAgo(n){
  const d = new Date();
  d.setHours(0,0,0,0);
  return d.getTime() - (n*24*60*60*1000);
}

export default function AnalyticsPage(){
  const { cases } = useCases();
  const [reasonFilter, setReasonFilter] = useState();
  const [operatorFilter, setOperatorFilter] = useState();
  const [statusFilter, setStatusFilter] = useState();
  const [threshold, setThreshold] = useState(70);
  const [includeFees, setIncludeFees] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
  const params = new URLSearchParams({ days:String(DEFAULT_DAYS), threshold:String(threshold), include_fees: includeFees? 'true':'false' });
      if(reasonFilter) params.append('reason', reasonFilter);
      if(operatorFilter) params.append('owner', operatorFilter);
      if(statusFilter) params.append('status', statusFilter);
      const res = await fetch('http://localhost:8000/analytics/cases?'+params.toString());
      if(!res.ok) throw new Error('HTTP '+res.status);
      const json = await res.json();
      setData(json);
    } catch(e){ setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(()=> { load(); /* eslint-disable-next-line */ }, [reasonFilter, operatorFilter, statusFilter, threshold, includeFees]);

  const motiveChartData = data?.motive_chart || [];
  const winRateEvolution = data?.win_rate_evolution || [];
  const operatorData = data?.operator_performance || [];
  const whatIf = data?.what_if || { fightCases:0, winRateEst:0, totalEV:0, delta:0, currentEV:0 };

  return (
    <div style={{ padding: 16 }}>
  {/* Removed Ant Typography Title to avoid unwanted dev-only class */}
  <Card style={{ marginBottom: 16 }} extra={<Tooltip title="Reîmprospătează"><ReloadOutlined onClick={load} style={{ cursor:'pointer' }} /></Tooltip>}>
        <div style={{fontSize:18,fontWeight:600,marginBottom:12,display:'flex',alignItems:'center',gap:10}}>
          <span style={{letterSpacing:.5}}>Analysis</span>
          <span style={{fontSize:11,opacity:.55,fontWeight:400}}>Filtre & KPIs cazuri</span>
        </div>
        <Space wrap>
          <Select
            allowClear
            placeholder="Motiv"
            style={{ width:180 }}
            value={reasonFilter}
            onChange={setReasonFilter}
            options={[{label:'None', value:undefined}, ...(data?.distinct_reasons||REASONS).map(r=>({label:r,value:r}))]}
          />
          <Select
            allowClear
            placeholder="Operator"
            style={{ width:180 }}
            value={operatorFilter}
            onChange={setOperatorFilter}
            options={[{label:'None', value:undefined}, ...[...(data?.distinct_owners||new Set(cases.map(c=>c.owner)))].map(o=>({label:o,value:o}))]}
          />
          <Select
            allowClear
            placeholder="Status"
            style={{ width:160 }}
            value={statusFilter}
            onChange={setStatusFilter}
            options={[{label:'None', value:undefined}, ...((data?.statuses)||['Open','In Progress','Sent','Won','Lost']).map(s=>({label:s,value:s}))]}
          />
        </Space>
      </Card>
  {loading && <div style={{padding:40, textAlign:'center'}}><Spin /></div>}
  {error && <Alert type='error' message='Eroare încărcare analytics' description={error} style={{marginBottom:16}} />}
  {!loading && data && <>
  <Row gutter={[16,16]}>
        <Col xs={24} md={6}>
          <Card size="small" title={<Space>Win rate <Tooltip title="Cazuri câștigate din totalul trimis."><InfoCircleOutlined /></Tooltip></Space>}>
    <Statistic value={data.win_rate} precision={1} suffix="%" />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card size="small" title={<Space>Bani salvați <Tooltip title="Diferența netă vs refund direct (incl. fee-uri)."><InfoCircleOutlined /></Tooltip></Space>}>
    <Statistic value={data.money_saved} precision={0} suffix=" RON" valueStyle={{ color: data.money_saved>=0?'#3f8600':'#cf1322' }} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card size="small" title={<Space>Top motiv <Tooltip title="Primele cauze după frecvență (cu win rate)."><InfoCircleOutlined /></Tooltip></Space>}>
    <Text>{data.top_reason || '—'}</Text>
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card size="small" title={<Space>Timp mediu trimitere <Tooltip title="Media între creare și trimitere."><InfoCircleOutlined /></Tooltip></Space>}>
    <Statistic value={data.avg_submit_hours} precision={1} suffix="h" />
          </Card>
        </Col>
      </Row>
      <Row gutter={[16,16]} style={{ marginTop:8 }}>
        <Col xs={24} md={8}>
          <Card size="small" title={<Space>SLA respectat <Tooltip title="% cazuri trimise înainte de deadline."><InfoCircleOutlined /></Tooltip></Space>}>
    <Statistic value={data.sla_respect} precision={1} suffix="%" />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card size="small" title={<Space>Override rate <Tooltip title="% decizii unde omul a ignorat recomandarea AI/reguli."><InfoCircleOutlined /></Tooltip></Space>}>
    <Statistic value={data.override_rate} precision={1} suffix="%" />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card size="small" title={<Space>Checklist complet <Tooltip title="% cazuri cu dovezile required bifate la submit."><InfoCircleOutlined /></Tooltip></Space>}>
    <Statistic value={data.checklist_complete} precision={1} suffix="%" />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16,16]} style={{ marginTop: 8 }}>
        <Col xs={24} md={16}>
          <Row gutter={[16,16]}>
            <Col span={24}>
              <Card size="small" title="Motive">
                <Bar data={motiveChartData} xField="reason" yField="total" seriesField="reason" height={260} />
                <Divider style={{ margin: '12px 0' }} />
                <Space wrap>
                  {motiveChartData.map(d => <Tag key={d.reason}>{d.reason}: {d.won}/{d.total} câștigate ({(d.total?d.won/d.total*100:0).toFixed(0)}%)</Tag>)}
                </Space>
              </Card>
            </Col>
            <Col span={24}>
              <Card size="small" title="Evoluție win rate (zi)">
                <Line data={winRateEvolution} xField="date" yField="winRate" height={240} point />
              </Card>
            </Col>
            <Col span={24}>
              <Card size="small" title="Performanță operator">
                <Bar data={operatorData} xField="operator" yField="winRate" seriesField="operator" height={260} />
                <Divider style={{ margin: '8px 0' }} />
                <Space direction="vertical" size={4}>
                  {operatorData.map(o => <Text key={o.operator}>{o.operator}: win {(o.winRate).toFixed(1)}% • timp {(o.avgHours).toFixed(1)}h</Text>)}
                </Space>
              </Card>
            </Col>
          </Row>
        </Col>
        <Col xs={24} md={8}>
          <Card size="small" title={<Space>What-if <Tooltip title="Mută pragul Fight și vezi impactul estimat. Valorile sunt aproximări."><InfoCircleOutlined /></Tooltip></Space>}>
            <Space direction="vertical" style={{ width:'100%' }}>
              <Text>Prag Fight: {threshold}%</Text>
              <Slider min={0} max={100} value={threshold} onChange={setThreshold} />
              <Space>
                <Switch checked={includeFees} onChange={setIncludeFees} />
                <Text>Include fee-uri și cost operare</Text>
              </Space>
              <Divider style={{ margin: '8px 0' }} />
              <Statistic title="Cazuri Fight" value={whatIf.fightCases} />
              <Statistic title="Win rate estimat" value={whatIf.winRateEst} precision={1} suffix="%" />
              <Statistic title="Impact total estimat (EV nou)" value={whatIf.totalEV} precision={0} suffix=" RON" valueStyle={{ color: whatIf.totalEV>=0?'#3f8600':'#cf1322' }} />
              <Statistic title="Delta vs politic curent" value={whatIf.delta} precision={0} suffix=" RON" valueStyle={{ color: whatIf.delta>=0?'#3f8600':'#cf1322' }} />
              <Divider style={{ margin: '8px 0' }} />
              <Text type="secondary" style={{ fontSize:12 }}>Formula EV fight: (2p - 1) * amount - fee_rep - cost_operare</Text>
            </Space>
          </Card>
        </Col>
      </Row>
      </>}
    </div>
  );
}
