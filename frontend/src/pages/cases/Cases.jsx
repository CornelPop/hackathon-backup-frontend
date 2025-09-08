import React, { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Input, Progress, Space, Table, Tag, Tooltip, Typography, Empty, Dropdown } from 'antd';
import { FilterOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useCases, STATUS_COLORS } from './CasesContext';

function formatSLA(deadline) {
  const now = Date.now();
  const diff = deadline - now;
  if (diff <= 0) return { text: 'Expirat', color: 'default', percent: 100, danger: true };
  const hours = diff / 3600000;
  const d = Math.floor(hours / 24);
  const h = Math.floor(hours % 24);
  const m = Math.floor((diff / 60000) % 60);
  const text = d > 0 ? `${d}d ${h}h` : (hours >= 1 ? `${Math.floor(hours)}h` : `${m}m`);
  let color = 'green';
  if (hours < 24) color = 'red'; else if (hours < 48) color = 'gold';
  const totalWindow = 10 * 24; // assume 10 days window for progress indicator
  const percent = Math.min(100, 100 - (hours / (totalWindow)) * 100);
  return { text, color, percent, danger: hours < 24 };
}

export default function CasesPage() {
  const { cases, changeStatus, generateLetter } = useCases();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState([]);
  const [search, setSearch] = useState('');

  // Debug mount log
  useEffect(()=>{
    console.log('[CasesPage] mounted. cases=', cases);
  }, [cases]);

  const data = useMemo(() => cases.filter(c => {
    if (statusFilter.length && !statusFilter.includes(c.status)) return false;
    if (search) {
      const s = search.toLowerCase();
      return c.id.toLowerCase().includes(s) || c.reason.toLowerCase().includes(s);
    }
    return true;
  }), [cases, statusFilter, search]);

  const columns = [
    {
      title: 'Case', dataIndex: 'id', key: 'id', width: 120, fixed: 'left', render: (v, record) => <Button type="link" onClick={() => navigate(`/cases/${record.id}`)} style={{paddingLeft:0}}>{v}</Button>
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 140,
      filters: Object.keys(STATUS_COLORS).map(s => ({ text: s, value: s })),
      filteredValue: statusFilter,
      onFilter: (val, rec) => rec.status === val,
      render: v => <Tag color={STATUS_COLORS[v] || 'default'} style={{marginRight:0}}>{v}</Tag>
    },
    { title: 'Reason', dataIndex: 'reason', key: 'reason', width: 140 },
    { title: 'Amount', key: 'amount', width: 120, sorter: (a,b)=> (a.amount - b.amount), render: (_,r)=> <span style={{fontWeight:r.amount>1000?600:500}}>{r.amount} {r.currency}</span> },
    { title: 'Prob.', dataIndex: 'probability', key: 'probability', width: 110, render: v => <Progress percent={Math.round(v*100)} size="small" strokeColor={v>0.6? '#52c41a': v>0.4? '#1677ff':'#faad14'} /> },
    { title: 'Rec.', dataIndex: 'recommendation', key: 'recommendation', width: 110, render: v => <Tag color={v==='Fight'?'green':'volcano'} style={{marginRight:0}}>{v}</Tag> },
    { title: 'Owner', dataIndex: 'owner', key: 'owner', width: 110 },
    { title: 'Last update', dataIndex: 'lastUpdate', key: 'lastUpdate', width: 140, sorter:(a,b)=>a.lastUpdate-b.lastUpdate, render: v=> new Date(v).toLocaleString([], { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'short'}) },
    { title: 'SLA', dataIndex: 'deadline', key: 'deadline', width: 140, render: d => {
        const s = formatSLA(d);
        return <Space size={4}><Badge color={s.color==='gold'?'gold':s.color} text={s.text} /><span style={{width:54}}><Progress percent={Math.round(s.percent)} size="small" status={s.danger? 'exception':'active'} showInfo={false} /></span></Space>;
      }
    },
    { title: 'Action', key: 'actions', fixed: 'right', width: 120, render: (_, record) => (
        <Button size='small' type='primary' onClick={()=>navigate(`/cases/${record.id}`)}>Open</Button>
      ) }
  ];

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <Typography.Title level={3} style={{margin:0}}>Cases</Typography.Title>
        <span style={{fontSize:12,opacity:.6}}>Total: {cases.length}</span>
      </div>
      <Card bodyStyle={{padding:16}} style={{borderRadius:16}}>
        <Space wrap size={12} style={{display:'flex'}}>
          <Input.Search value={search} onChange={e=>setSearch(e.target.value)} placeholder='Search case ID / reason' style={{width:240}} allowClear />
          <Dropdown
            menu={{
              selectedKeys: statusFilter,
              items: Object.keys(STATUS_COLORS).map(s => ({
                key: s,
                label: <span>{s}</span>,
                onClick: ()=> setStatusFilter(prev => prev.includes(s) ? prev.filter(p=>p!==s) : [...prev, s])
              })),
              onSelect: ()=>{},
            }}
            trigger={['click']}
          >
            <Button icon={<FilterOutlined/>}>Status</Button>
          </Dropdown>
          {statusFilter.length>0 && <Tag color='blue' closable onClose={()=>setStatusFilter([])} style={{marginInlineStart:0}}>Clear filters</Tag>}
          <Tooltip title='Add mock case'>
            <Button type='dashed' icon={<ThunderboltOutlined/>} onClick={()=>{
              const id = 'CB-'+Math.floor(1000+Math.random()*9000);
              // simple add
              const now = Date.now();
              const extra = { id, status: 'Open', reason: 'Abonament', amount: Math.floor(Math.random()*900+50), currency: 'RON', probability: Math.random(), recommendation: Math.random()>0.5? 'Fight':'Refund', owner: '—', lastUpdate: now, deadline: now + 1000*60*60*(24+Math.random()*120), letter: '', history:[{at:now,text:'Case created'}] };
              // use changeStatus trick by updating context via updateCase
              // We'll directly update by localStorage bypass (quick hack) - better to expose addCase but fine now
              // patch using localStorage state mutation pattern
              // We'll import provider? Simpler: window.dispatchEvent to let provider reload? We'll just use localStorage and reload page.
              const raw = localStorage.getItem('cb_cases');
              let arr = [];
              try { arr = raw? JSON.parse(raw): []; } catch(_) {}
              arr.unshift(extra);
              localStorage.setItem('cb_cases', JSON.stringify(arr));
              window.location.reload();
            }}>New mock</Button>
          </Tooltip>
        </Space>
      </Card>
      <Card bodyStyle={{padding:0}} style={{borderRadius:18,overflow:'hidden'}}>
        {data.length === 0 ? (
          <div style={{padding:48}}>
            <Empty description='No cases match filters' />
          </div>
        ) : (
          <Table
            size='small'
            rowKey='id'
            sticky
            dataSource={data}
            columns={columns}
            pagination={{ pageSize: 10, showSizeChanger:false }}
            scroll={{ x: 1200 }}
          />
        )}
      </Card>
    </div>
  );
}
