import { useState } from 'react';
import ReelsList from '../components/ReelsList';
import AdsList from '../components/AdsList';
import ChannelsList from '../components/ChannelsList';

export default function TasksPage({ initData, showToast, onRefresh }) {
  const [tab, setTab] = useState('reels');
  return (
    <div className="page">
      <h2 className="page-title">📋 ЗАДАНИЯ</h2>
      <div className="tabs">
        <button className={tab === 'reels' ? 'active' : ''} onClick={() => { setTab('reels'); showToast('Рилсы'); }}>Рилсы</button>
        <button className={tab === 'ads' ? 'active' : ''} onClick={() => { setTab('ads'); showToast('Реклама'); }}>Реклама</button>
        <button className={tab === 'channels' ? 'active' : ''} onClick={() => { setTab('channels'); showToast('Подписки'); }}>Подписки</button>
      </div>
      {tab === 'reels' && <ReelsList initData={initData} showToast={showToast} onRefresh={onRefresh} />}
      {tab === 'ads' && <AdsList initData={initData} showToast={showToast} onRefresh={onRefresh} />}
      {tab === 'channels' && <ChannelsList initData={initData} showToast={showToast} onRefresh={onRefresh} />}
    </div>
  );
}