import React, { useMemo, useState } from 'react';
import { Card, Row, Col, Select, Segmented, Tooltip, Statistic, Divider, Slider, Switch, Typography, Space, Tag, Progress } from 'antd';
import { Line } from '@ant-design/charts';
import { Bar } from '@ant-design/charts';
import { InfoCircleOutlined } from '@ant-design/icons';
import { useCases } from './CasesContext';

const { Title, Text } = Typography;

/*
  Analytics page: KPIs + Charts + What-if simulator.
  This is an initial implementation placeholder.
*/

const PERIOD_OPTIONS = [
  { label: '7 zile', value: 7 },
  { label: '30 zile', value: 30 },
  { label: '90 zile', value: 90 }
];

const REASONS = ['Fraudă','Nelivrat','Neconform','Dublă','Abonament'];

function midnightDaysAgo(n){
  const d = new Date();
  d.setHours(0,0,0,0);
  return d.getTime() - (n*24*60*60*1000);
}

export default function AnalyticsPage(){
  const { cases } = useCases();
  const [period, setPeriod] = useState(30);
  const [reasonFilter, setReasonFilter] = useState();
  const [operatorFilter, setOperatorFilter] = useState();
  const [statusFilter, setStatusFilter] = useState();
  // What-if controls
  const [threshold, setThreshold] = useState(70); // percent
  const [includeFees, setIncludeFees] = useState(true);

  // Assumptions (could move to settings)
  const feeRep = 60; // RON
  const costOperare = 50 * 0.3; // 15 RON
  const costOperareRefund = 0; // simplified

  const periodStart = useMemo(()=> midnightDaysAgo(period), [period]);

  // Filter cases by period (using history[0].at as created_at proxy)
  const enriched = useMemo(()=> cases.map(c => ({
    ...c,
    created_at: c.history?.[0]?.at || Date.now(),
    submitted_at: c.events?.find(e=>e.action==='status_change' && e.details.status==='Sent')?.at,
    closed_at: c.events?.find(e=>e.action==='status_change' && ['Won','Lost'].includes(e.details.status))?.at,
    decision: c.recommendation, // simplification: actual decision not persisted separately
    result: c.status === 'Won' ? 'win' : (c.status === 'Lost' ? 'lose' : undefined),
    win_prob: c.probability
  })), [cases]);

  const filtered = useMemo(()=> enriched.filter(c => c.created_at >= periodStart
    && (!reasonFilter || c.reason === reasonFilter)
    && (!operatorFilter || c.owner === operatorFilter)
    && (!statusFilter || c.status === statusFilter)
  ), [enriched, periodStart, reasonFilter, operatorFilter, statusFilter]);

  // KPI calculations
  const sentCases = filtered.filter(c => c.events?.some(e=> e.action==='status_change' && e.details.status==='Sent'));
  const wonCases = filtered.filter(c => c.status === 'Won');
  const winRate = sentCases.length ? (wonCases.length / sentCases.length * 100) : 0;

  // Money saved vs baseline refund direct (baseline = -amount for any sent case ignoring costs)
  const { moneySaved, baselineLoss } = useMemo(()=>{
    let saved = 0; let baseline = 0;
    sentCases.forEach(c => {
      const amount = c.amount || 0;
      baseline += -amount; // if would have refunded immediately
      const costFight = feeRep + costOperare;
      if(c.status === 'Won') saved += (amount - costFight); // recovered minus cost
      else if(c.status === 'Lost') saved += (-amount - costFight); // lost plus cost
      else saved += 0; // still pending
    });
    return { moneySaved: saved, baselineLoss: baseline };
  }, [sentCases]);

  // Top reason frequency among sent cases
  const reasonCounts = {};
  sentCases.forEach(c => { reasonCounts[c.reason] = (reasonCounts[c.reason]||0)+1; });
  const topReason = Object.entries(reasonCounts).sort((a,b)=>b[1]-a[1])[0]?.[0];

  // Average time to submit (created->submitted) among submitted
  const timeToSubmitMs = sentCases
    .filter(c=>c.submitted_at)
    .map(c=> c.submitted_at - c.created_at)
    .filter(x=> x>0);
  const avgSubmitH = timeToSubmitMs.length ? (timeToSubmitMs.reduce((a,b)=>a+b,0)/timeToSubmitMs.length/3600000) : 0;

  // Additional KPIs
  const slaRespect = useMemo(()=>{
    const withDeadline = sentCases.filter(c=>c.deadline && c.submitted_at);
    if(!withDeadline.length) return 0;
    const ok = withDeadline.filter(c=> c.submitted_at < c.deadline).length;
    return ok / withDeadline.length * 100;
  }, [sentCases]);
  const overrideEvents = filtered.flatMap(c => (c.events||[]).filter(e=> e.action==='override_decision'));
  const decisionEvents = filtered.flatMap(c => (c.events||[]).filter(e=> e.action==='status_change' && ['Sent','Won','Lost'].includes(e.details.status)));
  const overrideRate = decisionEvents.length ? overrideEvents.length/decisionEvents.length*100 : 0;
  const checklistComplete = useMemo(()=>{
    const submitted = sentCases.filter(c=>c.submitted_at);
    if(!submitted.length) return 0;
    const ok = submitted.filter(c=>{
      const required = c.checklist.filter(i=>i.required && i.status!=='na');
      return required.every(i=> i.status==='ok');
    }).length;
    return ok/submitted.length*100;
  }, [sentCases]);

  // Motive bar chart data
  const motiveChartData = useMemo(()=> {
    const map = {};
    filtered.forEach(c => {
      if(!map[c.reason]) map[c.reason] = { reason: c.reason, total:0, won:0, lost:0 };
      map[c.reason].total += 1;
      if(c.status==='Won') map[c.reason].won += 1;
      if(c.status==='Lost') map[c.reason].lost += 1;
    });
    return Object.values(map);
  }, [filtered]);

  // Win rate evolution weekly (group by week number)
  const winRateEvolution = useMemo(()=> {
    const buckets = {};
    filtered.forEach(c => {
      const week = new Date(c.created_at).toISOString().slice(0,10); // daily granularity for small demo
      if(!buckets[week]) buckets[week] = { date: week, sent:0, won:0 };
      if(c.events?.some(e=> e.action==='status_change' && e.details.status==='Sent')) buckets[week].sent += 1;
      if(c.status==='Won') buckets[week].won += 1;
    });
    return Object.values(buckets).map(b => ({ date:b.date, winRate: b.sent? b.won/b.sent*100:0 }));
  }, [filtered]);

  // Operator performance
  const operatorData = useMemo(()=> {
    const map = {};
    filtered.forEach(c => {
      if(!map[c.owner]) map[c.owner] = { operator:c.owner, sent:0, won:0, timeSum:0, timeCount:0 };
      const bucket = map[c.owner];
      if(c.events?.some(e=> e.action==='status_change' && e.details.status==='Sent')) {
        bucket.sent += 1;
        if(c.submitted_at) {
          bucket.timeSum += (c.submitted_at - c.created_at);
          bucket.timeCount += 1;
        }
      }
      if(c.status==='Won') bucket.won += 1;
    });
    return Object.values(map).map(b => ({
      operator: b.operator,
      winRate: b.sent? b.won/b.sent*100:0,
      avgHours: b.timeCount? b.timeSum/b.timeCount/3600000:0
    }));
  }, [filtered]);

  // What-if simulator (compute delta vs current heuristic: recommendation 'Fight' -> fight else refund)
  const whatIf = useMemo(()=> {
    const th = threshold/100;
    let fightCases = 0; let fightWinProbSum = 0; let totalEV = 0; let currentEV = 0;
    filtered.forEach(c => {
      const amount = c.amount || 0; const p = c.win_prob || 0.5;
      const feeTotal = includeFees ? (feeRep + costOperare) : 0;
      // scenario EV based on threshold
      if(p >= th){
        fightCases += 1; fightWinProbSum += p;
        totalEV += (2*p - 1) * amount - feeTotal;
      } else {
        totalEV += -amount; // refund baseline (refund op cost ignored)
      }
      // current policy: use recommendation
      if(c.recommendation === 'Fight') currentEV += (2*p - 1) * amount - feeTotal; else currentEV += -amount;
    });
    const winRateEst = fightCases ? fightWinProbSum / fightCases * 100 : 0;
    const delta = totalEV - currentEV;
    return { fightCases, winRateEst, totalEV, delta, currentEV };
  }, [filtered, threshold, includeFees]);

  return (
    <div style={{ padding: 16 }}>
      <Title level={3}>Analytics</Title>
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Segmented options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />
          <Select allowClear placeholder="Motiv" style={{ width:160 }} value={reasonFilter} onChange={setReasonFilter} options={REASONS.map(r=>({label:r,value:r}))} />
          <Select allowClear placeholder="Operator" style={{ width:160 }} value={operatorFilter} onChange={setOperatorFilter} options={[...new Set(cases.map(c=>c.owner))].map(o=>({label:o,value:o}))} />
          <Select allowClear placeholder="Status" style={{ width:140 }} value={statusFilter} onChange={setStatusFilter} options={['Open','In Progress','Sent','Won','Lost'].map(s=>({label:s,value:s}))} />
        </Space>
      </Card>
  <Row gutter={[16,16]}>
        <Col xs={24} md={6}>
          <Card size="small" title={<Space>Win rate <Tooltip title="Cazuri câștigate din totalul trimis."><InfoCircleOutlined /></Tooltip></Space>}>
            <Statistic value={winRate} precision={1} suffix="%" />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card size="small" title={<Space>Bani salvați <Tooltip title="Diferența netă vs refund direct (incl. fee-uri)."><InfoCircleOutlined /></Tooltip></Space>}>
            <Statistic value={moneySaved} precision={0} suffix=" RON" valueStyle={{ color: moneySaved>=0?'#3f8600':'#cf1322' }} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card size="small" title={<Space>Top motiv <Tooltip title="Primele cauze după frecvență (cu win rate)."><InfoCircleOutlined /></Tooltip></Space>}>
            <Text>{topReason || '—'}</Text>
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card size="small" title={<Space>Timp mediu trimitere <Tooltip title="Media între creare și trimitere."><InfoCircleOutlined /></Tooltip></Space>}>
            <Statistic value={avgSubmitH} precision={1} suffix="h" />
          </Card>
        </Col>
      </Row>
      <Row gutter={[16,16]} style={{ marginTop:8 }}>
        <Col xs={24} md={8}>
          <Card size="small" title={<Space>SLA respectat <Tooltip title="% cazuri trimise înainte de deadline."><InfoCircleOutlined /></Tooltip></Space>}>
            <Statistic value={slaRespect} precision={1} suffix="%" />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card size="small" title={<Space>Override rate <Tooltip title="% decizii unde omul a ignorat recomandarea AI/reguli."><InfoCircleOutlined /></Tooltip></Space>}>
            <Statistic value={overrideRate} precision={1} suffix="%" />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card size="small" title={<Space>Checklist complet <Tooltip title="% cazuri cu dovezile required bifate la submit."><InfoCircleOutlined /></Tooltip></Space>}>
            <Statistic value={checklistComplete} precision={1} suffix="%" />
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
    </div>
  );
}
