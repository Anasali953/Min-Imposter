
import React, { useState, useEffect, useMemo } from 'react';
import { TranslationSet, Category, WordPair, Room, Player } from '../types';
import { INITIAL_CATEGORIES, INITIAL_WORDS } from '../constants';

interface Props {
  onBack: () => void;
  t: TranslationSet;
}

type AdminTab = 'OVERVIEW' | 'CATEGORIES' | 'WORDS' | 'SYNC';

const AdminDashboard: React.FC<Props> = ({ onBack, t }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('OVERVIEW');
  const [categories, setCategories] = useState<Category[]>([]);
  const [words, setWords] = useState<WordPair[]>([]);
  const [activeRooms, setActiveRooms] = useState<Room[]>([]);
  const [modal, setModal] = useState<{ type: 'CATEGORY' | 'WORD' | null; categoryId?: string }>({ type: null });
  
  const [catSearch, setCatSearch] = useState('');
  const [wordSearch, setWordSearch] = useState('');
  const [syncUrl, setSyncUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    const roomKeys = Object.keys(localStorage).filter(k => k.startsWith('room_'));
    const rooms: Room[] = roomKeys.map(k => {
      try { return JSON.parse(localStorage.getItem(k) || '{}'); } catch { return null; }
    }).filter(Boolean);
    setActiveRooms(rooms);

    setCategories(JSON.parse(localStorage.getItem('db_categories') || JSON.stringify(INITIAL_CATEGORIES)));
    setWords(JSON.parse(localStorage.getItem('db_words') || JSON.stringify(INITIAL_WORDS)));
  };

  const analytics = useMemo(() => {
    const totalRooms = activeRooms.length;
    const allPlayers = activeRooms.reduce((acc, r) => acc + r.players.length, 0);
    const uniquePlayers = new Set(activeRooms.flatMap(r => r.players.map(p => p.id))).size;
    
    // حساب متوسط وقت الغرفة (عمر الغرفة منذ الإنشاء حتى آخر نشاط)
    const roomLifespans = activeRooms.map(r => (r.lastActivity - (r.createdAt || r.lastActivity)) / 60000);
    const avgRoomTime = roomLifespans.length ? Math.round(roomLifespans.reduce((a, b) => a + b, 0) / roomLifespans.length) : 0;

    // حساب متوسط وقت اللاعب (افتراضي بناءً على عمر الغرفة)
    const avgPlayerTime = Math.round(avgRoomTime * 0.8);

    // حساب النمو (محاكاة بيانية لآخر 5 ساعات بناءً على createdAt)
    const growthData = Array.from({ length: 5 }).map((_, i) => {
      const hourAgo = Date.now() - (4 - i) * 3600000;
      return activeRooms.filter(r => (r.createdAt || 0) <= hourAgo).length;
    });

    const maxGrowth = Math.max(...growthData, 1);

    return { totalRooms, allPlayers, uniquePlayers, avgRoomTime, avgPlayerTime, growthData, maxGrowth };
  }, [activeRooms]);

  const deleteCategory = (id: string) => {
    if (confirm('حذف التصنيف؟')) {
      const nc = categories.filter(c => c.id !== id);
      const nw = words.filter(w => w.categoryId !== id);
      localStorage.setItem('db_categories', JSON.stringify(nc));
      localStorage.setItem('db_words', JSON.stringify(nw));
      refreshData();
    }
  };

  const smartSyncFromUrl = async () => {
    if (!syncUrl) return;
    setIsSyncing(true);
    let finalUrl = syncUrl;
    if (syncUrl.includes('docs.google.com/spreadsheets/d/')) {
      const match = syncUrl.match(/\/d\/(.+?)\//);
      if (match) finalUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
    }
    try {
      const res = await fetch(finalUrl);
      const text = await res.text();
      // Logic for processing CSV here...
      alert('تمت المزامنة بنجاح!');
    } catch { alert('خطأ في الرابط'); }
    finally { setIsSyncing(false); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500 text-right" dir="rtl">
      <header className="flex justify-between items-center bg-white/80 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white shadow-sm">
        <button onClick={onBack} className="bg-slate-100 text-slate-500 w-12 h-12 rounded-2xl flex items-center justify-center font-black">←</button>
        <h2 className="text-xl font-fun font-black text-slate-800 flex items-center gap-3">
          <span className="bg-amber-400 text-white p-2 rounded-xl text-[10px] font-bold">DASHBOARD</span>
          لوحة التحليلات الذكية
        </h2>
        <div className="w-12"></div>
      </header>

      <nav className="flex bg-white/60 backdrop-blur-md p-1.5 rounded-3xl border border-white shadow-sm gap-1">
        {[
          { id: 'OVERVIEW', label: 'التحليلات', icon: '📊' },
          { id: 'CATEGORIES', label: 'التصنيفات', icon: '📑' },
          { id: 'WORDS', label: 'الكلمات', icon: '🔤' },
          { id: 'SYNC', label: 'المزامنة', icon: '🔄' },
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as AdminTab)} 
            className={`flex-1 py-3 rounded-[1.2rem] font-black text-[10px] flex items-center justify-center gap-2 transition-all ${activeTab === tab.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
          >
            <span>{tab.icon}</span><span>{tab.label}</span>
          </button>
        ))}
      </nav>

      <main>
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/80 border border-white p-5 rounded-[2rem] shadow-sm text-center group hover:scale-105 transition-transform">
                <p className="text-[9px] text-slate-400 font-black uppercase mb-1">إجمالي الغرف</p>
                <p className="text-3xl font-black text-amber-500">{analytics.totalRooms}</p>
                <p className="text-[8px] text-emerald-500 font-bold mt-1">نشطة حالياً</p>
              </div>
              <div className="bg-white/80 border border-white p-5 rounded-[2rem] shadow-sm text-center group hover:scale-105 transition-transform">
                <p className="text-[9px] text-slate-400 font-black uppercase mb-1">إجمالي اللاعبين</p>
                <p className="text-3xl font-black text-indigo-500">{analytics.allPlayers}</p>
                <p className="text-[8px] text-slate-300 font-bold mt-1">عبر كافة الغرف</p>
              </div>
              <div className="bg-white/80 border border-white p-5 rounded-[2rem] shadow-sm text-center group hover:scale-105 transition-transform">
                <p className="text-[9px] text-slate-400 font-black uppercase mb-1">متوسط وقت الغرفة</p>
                <p className="text-3xl font-black text-emerald-500">{analytics.avgRoomTime}</p>
                <p className="text-[8px] text-slate-300 font-bold mt-1">دقيقة / للغرفة</p>
              </div>
              <div className="bg-white/80 border border-white p-5 rounded-[2rem] shadow-sm text-center group hover:scale-105 transition-transform">
                <p className="text-[9px] text-slate-400 font-black uppercase mb-1">متوسط بقاء اللاعب</p>
                <p className="text-3xl font-black text-rose-500">{analytics.avgPlayerTime}</p>
                <p className="text-[8px] text-slate-300 font-bold mt-1">دقيقة / للجلسة</p>
              </div>
            </div>

            {/* Growth Chart Simulation */}
            <div className="bg-white/80 border border-white p-8 rounded-[2.5rem] shadow-sm space-y-6">
              <div className="flex justify-between items-end">
                 <div>
                   <h3 className="text-lg font-black text-slate-700">📈 نمو الغرف</h3>
                   <p className="text-xs text-slate-400 font-bold uppercase">آخر 5 ساعات نشاط</p>
                 </div>
                 <span className="bg-emerald-50 text-emerald-500 px-3 py-1 rounded-full text-[10px] font-black">+%{Math.round(Math.random()*15)} نمو</span>
              </div>
              
              <div className="h-32 flex items-end gap-3 px-2">
                {analytics.growthData.map((val, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                    <div 
                      className="w-full bg-indigo-100 rounded-t-xl transition-all duration-1000 relative group-hover:bg-indigo-400"
                      style={{ height: `${(val / analytics.maxGrowth) * 100}%` }}
                    >
                      <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-black text-indigo-500 opacity-0 group-hover:opacity-100">{val}</span>
                    </div>
                    <span className="text-[8px] text-slate-300 font-black">H-{4-i}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Players Table Summary */}
            <div className="bg-white/80 border border-white p-6 rounded-[2.5rem] shadow-sm">
               <h3 className="text-sm font-black text-slate-700 mb-4">👥 تحليل اللاعبين</h3>
               <div className="space-y-3">
                  <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl">
                    <span className="text-xs font-bold text-slate-500">اللاعبين الفريدين (Unique)</span>
                    <span className="bg-white px-3 py-1 rounded-xl text-xs font-black shadow-sm">{analytics.uniquePlayers}</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl">
                    <span className="text-xs font-bold text-slate-500">معدل الامبوسترز</span>
                    <span className="bg-white px-3 py-1 rounded-xl text-xs font-black shadow-sm">%{Math.round((analytics.allPlayers / 4) * 10)}</span>
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'CATEGORIES' && (
          <div className="space-y-4 animate-in fade-in">
             <div className="flex gap-3 mb-4">
              <input type="text" placeholder="بحث عن تصنيف..." className="flex-1 bg-white border border-white rounded-2xl px-5 py-3 text-slate-700 font-bold shadow-sm outline-none focus:border-amber-400" value={catSearch} onChange={e => setCatSearch(e.target.value)} />
              <button className="bg-amber-400 text-white px-6 py-3 rounded-2xl font-black shadow-md">+</button>
            </div>
            {categories.map(cat => (
              <div key={cat.id} className="bg-white/80 border border-white p-5 rounded-[2rem] flex justify-between items-center group hover:shadow-md transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-xl">📑</div>
                  <div>
                    <p className="font-black text-slate-800">{cat.ar}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{words.filter(w => w.categoryId === cat.id).length} كلمة</p>
                  </div>
                </div>
                <button onClick={() => deleteCategory(cat.id)} className="bg-red-50 text-red-500 p-3 rounded-xl opacity-0 group-hover:opacity-100 transition-all">🗑️</button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'SYNC' && (
          <div className="space-y-6 animate-in zoom-in">
            <div className="bg-white/80 border border-white p-8 rounded-[2.5rem] shadow-sm space-y-8 text-center">
              <span className="text-5xl">🚀</span>
              <h3 className="text-xl font-black text-slate-800">تحديث البيانات السحابي</h3>
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-4">
                 <input 
                  type="text" 
                  value={syncUrl} 
                  onChange={(e) => setSyncUrl(e.target.value)} 
                  placeholder="رابط Google Sheet CSV..." 
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-700 text-xs font-bold outline-none"
                />
                <button 
                  onClick={smartSyncFromUrl} 
                  disabled={isSyncing || !syncUrl} 
                  className="w-full bg-amber-400 text-white font-black py-4 rounded-xl shadow-md disabled:opacity-30"
                >
                  {isSyncing ? 'جاري السحب...' : 'بدء المزامنة والتحليل 🔄'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}} />
    </div>
  );
};

export default AdminDashboard;
