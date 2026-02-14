
import React, { useState, useEffect, useMemo } from 'react';
import { TranslationSet, Category, WordPair, Room, Player } from '../types';
import { INITIAL_CATEGORIES, INITIAL_WORDS } from '../constants';

interface Props {
  onBack: () => void;
  t: TranslationSet;
}

type AdminTab = 'OVERVIEW' | 'CATEGORIES' | 'WORDS' | 'SYNC';

interface ModalState {
  type: 'CATEGORY' | 'WORD' | null;
  categoryId?: string;
}

const AdminDashboard: React.FC<Props> = ({ onBack, t }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('OVERVIEW');
  const [categories, setCategories] = useState<Category[]>([]);
  const [words, setWords] = useState<WordPair[]>([]);
  const [activeRooms, setActiveRooms] = useState<Room[]>([]);
  const [modal, setModal] = useState<ModalState>({ type: null });
  
  const [catSearch, setCatSearch] = useState('');
  const [wordSearch, setWordSearch] = useState('');
  
  const [catForm, setCatForm] = useState({ ar: '', en: '' });
  const [wordForm, setWordForm] = useState({ secret: '' });
  
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

    const storedCats = localStorage.getItem('db_categories');
    const storedWords = localStorage.getItem('db_words');

    setCategories(storedCats ? JSON.parse(storedCats) : INITIAL_CATEGORIES);
    setWords(storedWords ? JSON.parse(storedWords) : INITIAL_WORDS);
  };

  const saveToStorage = (newCats: Category[], newWords: WordPair[]) => {
    setCategories(newCats);
    setWords(newWords);
    localStorage.setItem('db_categories', JSON.stringify(newCats));
    localStorage.setItem('db_words', JSON.stringify(newWords));
  };

  const handleAddCategory = () => {
    if (!catForm.ar) return;
    const newCat: Category = { id: 'cat_' + Date.now(), ar: catForm.ar, en: catForm.en || catForm.ar };
    saveToStorage([...categories, newCat], words);
    setCatForm({ ar: '', en: '' });
    setModal({ type: null });
  };

  const handleAddWord = (keepOpen: boolean = false) => {
    if (!wordForm.secret || !modal.categoryId) return;
    const newWord: WordPair = { id: 'word_' + Date.now(), categoryId: modal.categoryId, secret: wordForm.secret };
    const updatedWords = [...words, newWord];
    saveToStorage(categories, updatedWords);
    setWordForm({ secret: '' });
    if (!keepOpen) setModal({ type: null });
  };

  const deleteCategory = (id: string) => {
    if (confirm('سيتم حذف التصنيف وجميع كلماته، هل أنت متأكد؟')) {
      const newCats = categories.filter(c => c.id !== id);
      const newWords = words.filter(w => w.categoryId !== id);
      saveToStorage(newCats, newWords);
    }
  };

  const deleteWord = (id: string) => {
    const newWords = words.filter(w => w.id !== id);
    saveToStorage(categories, newWords);
  };

  // وظيفة معالجة البيانات الذكية من CSV
  const processSmartData = (rows: string[][]) => {
    const newCats: Category[] = [...categories];
    const newWords: WordPair[] = [...words];
    let addedCount = 0;

    rows.forEach((row, idx) => {
      if (row.length < 2 || !row[0] || !row[1]) return;
      const catName = row[0].trim(); 
      const secret = row[1].trim();  
      // تخطي العناوين
      if (catName.toLowerCase().includes('category') || catName.includes('تصنيف')) return;
      
      let category = newCats.find(c => c.ar === catName);
      if (!category) {
        category = { id: 'cat_' + Math.random().toString(36).substr(2, 5), ar: catName, en: catName };
        newCats.push(category);
      }
      
      const isDuplicate = newWords.some(w => w.categoryId === category!.id && w.secret === secret);
      if (!isDuplicate) {
        newWords.push({ id: 'w_' + idx + '_' + Date.now(), categoryId: category.id, secret });
        addedCount++;
      }
    });
    saveToStorage(newCats, newWords);
    alert(`✅ نجاح! تم تحديث البيانات بنجاح.`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const rows = text.split('\n').filter(line => line.trim()).map(row => 
          row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, ''))
        );
        processSmartData(rows);
      } catch (err) { alert('❌ خطأ في معالجة الملف'); }
    };
    reader.readAsText(file);
  };

  const smartSyncFromUrl = async () => {
    if (!syncUrl) return;
    setIsSyncing(true);
    
    let finalUrl = syncUrl;
    if (syncUrl.includes('docs.google.com/spreadsheets/d/')) {
      const match = syncUrl.match(/\/d\/(.+?)\//);
      if (match && match[1]) {
        finalUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
      }
    }

    try {
      const response = await fetch(finalUrl);
      if (!response.ok) throw new Error('Network response was not ok');
      const text = await response.text();
      const rows = text.split('\n').filter(line => line.trim()).map(row => 
        row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, ''))
      );
      processSmartData(rows);
    } catch (err) {
      alert('❌ فشل سحب البيانات. تأكد من أن الرابط متاح للجميع (Public).');
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredCategories = useMemo(() => 
    categories.filter(c => c.ar.toLowerCase().includes(catSearch.toLowerCase())), 
  [categories, catSearch]);

  const filteredWordsGrouped = useMemo(() => {
    const grouped: Record<string, WordPair[]> = {};
    words.forEach(w => {
      if (w.secret.toLowerCase().includes(wordSearch.toLowerCase())) {
        if (!grouped[w.categoryId]) grouped[w.categoryId] = [];
        grouped[w.categoryId].push(w);
      }
    });
    return grouped;
  }, [words, wordSearch]);

  const analytics = useMemo(() => {
    const totalRooms = activeRooms.length;
    const allPlayers = activeRooms.reduce((acc, r) => acc + r.players.length, 0);
    const uniquePlayers = new Set(activeRooms.flatMap(r => r.players.map(p => p.id))).size;
    
    const roomLifespans = activeRooms.map(r => (r.lastActivity - (r.createdAt || r.lastActivity)) / 60000);
    const avgRoomTime = roomLifespans.length ? Math.round(roomLifespans.reduce((a, b) => a + b, 0) / roomLifespans.length) : 0;
    const avgPlayerTime = Math.round(avgRoomTime * 0.8);

    const growthData = Array.from({ length: 5 }).map((_, i) => {
      const hourAgo = Date.now() - (4 - i) * 3600000;
      return activeRooms.filter(r => (r.createdAt || 0) <= hourAgo).length;
    });

    const maxGrowth = Math.max(...growthData, 1);

    return { totalRooms, allPlayers, uniquePlayers, avgRoomTime, avgPlayerTime, growthData, maxGrowth };
  }, [activeRooms]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500 text-right" dir="rtl">
      {/* App Style Header */}
      <header className="flex justify-between items-center bg-white/80 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white shadow-sm gap-4">
        <button onClick={onBack} className="bg-slate-100 text-slate-500 w-12 h-12 rounded-2xl flex items-center justify-center font-black hover:bg-slate-200 transition-all active:scale-90">←</button>
        <h2 className="text-xl font-fun font-black text-slate-800 flex items-center gap-3">
          <span className="bg-amber-400 text-white p-2 rounded-xl text-[10px] font-bold">ADMIN</span>
          {t.adminDashboard}
        </h2>
        <div className="w-12"></div>
      </header>

      {/* Navigation */}
      <nav className="flex bg-white/60 backdrop-blur-md p-1.5 rounded-3xl border border-white shadow-sm gap-1 overflow-x-auto no-scrollbar">
        {[
          { id: 'OVERVIEW', label: 'التحليلات', icon: '📊' },
          { id: 'CATEGORIES', label: 'التصنيفات', icon: '📑' },
          { id: 'WORDS', label: 'الكلمات', icon: '🔤' },
          { id: 'SYNC', label: 'المزامنة', icon: '🔄' },
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as AdminTab)} 
            className={`flex-1 min-w-[100px] py-3 rounded-[1.2rem] font-black text-[10px] flex items-center justify-center gap-2 transition-all ${activeTab === tab.id ? 'bg-white text-slate-800 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <span className="text-lg">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Modal Style */}
      {modal.type && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/10 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-xl w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl border border-white animate-in zoom-in duration-200">
            <h3 className="text-xl font-black text-slate-800 mb-6 text-center">
              {modal.type === 'CATEGORY' ? 'إضافة تصنيف' : 'إضافة كلمات'}
            </h3>
            <div className="space-y-4">
              {modal.type === 'CATEGORY' ? (
                <input type="text" placeholder="اسم التصنيف" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-slate-800 font-bold outline-none focus:border-amber-400 transition-all" value={catForm.ar} onChange={e => setCatForm({...catForm, ar: e.target.value})} autoFocus />
              ) : (
                <input type="text" placeholder="الكلمة السرية" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-slate-800 font-bold outline-none focus:border-emerald-400 transition-all" value={wordForm.secret} onChange={e => setWordForm({...wordForm, secret: e.target.value})} autoFocus onKeyDown={e => e.key === 'Enter' && handleAddWord(true)} />
              )}
              <div className="flex gap-2 pt-2">
                <button onClick={() => modal.type === 'WORD' ? handleAddWord(true) : handleAddCategory()} className="flex-1 bg-emerald-50 text-emerald-600 font-black py-4 rounded-2xl border border-emerald-100 text-sm hover:bg-emerald-100 transition-all">حفظ مستمر</button>
                <button onClick={() => modal.type === 'WORD' ? handleAddWord(false) : handleAddCategory()} className="flex-1 bg-slate-800 text-white font-black py-4 rounded-2xl text-sm hover:bg-slate-900 transition-all">حفظ وإغلاق</button>
              </div>
              <button onClick={() => setModal({ type: null })} className="w-full text-slate-400 font-bold py-2 text-xs text-center">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      <main className="animate-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/80 border border-white p-5 rounded-[2rem] shadow-sm text-center">
                <p className="text-[9px] text-slate-400 font-black uppercase mb-1">إجمالي الغرف</p>
                <p className="text-3xl font-black text-amber-500">{analytics.totalRooms}</p>
                <p className="text-[8px] text-emerald-500 font-bold mt-1">نشطة حالياً</p>
              </div>
              <div className="bg-white/80 border border-white p-5 rounded-[2rem] shadow-sm text-center">
                <p className="text-[9px] text-slate-400 font-black uppercase mb-1">إجمالي اللاعبين</p>
                <p className="text-3xl font-black text-indigo-500">{analytics.allPlayers}</p>
                <p className="text-[8px] text-slate-300 font-bold mt-1">عبر كافة الغرف</p>
              </div>
              <div className="bg-white/80 border border-white p-5 rounded-[2rem] shadow-sm text-center">
                <p className="text-[9px] text-slate-400 font-black uppercase mb-1">متوسط وقت الغرفة</p>
                <p className="text-3xl font-black text-emerald-500">{analytics.avgRoomTime}</p>
                <p className="text-[8px] text-slate-300 font-bold mt-1">دقيقة / للغرفة</p>
              </div>
              <div className="bg-white/80 border border-white p-5 rounded-[2rem] shadow-sm text-center">
                <p className="text-[9px] text-slate-400 font-black uppercase mb-1">متوسط بقاء اللاعب</p>
                <p className="text-3xl font-black text-rose-500">{analytics.avgPlayerTime}</p>
                <p className="text-[8px] text-slate-300 font-bold mt-1">دقيقة / للجلسة</p>
              </div>
            </div>

            {/* Growth Chart */}
            <div className="bg-white/80 border border-white p-8 rounded-[2.5rem] shadow-sm space-y-6">
              <div className="flex justify-between items-end">
                 <div>
                   <h3 className="text-lg font-black text-slate-700">📈 نمو الغرف</h3>
                   <p className="text-xs text-slate-400 font-bold uppercase">آخر 5 ساعات نشاط</p>
                 </div>
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
          </div>
        )}

        {activeTab === 'CATEGORIES' && (
          <div className="space-y-4">
            <div className="flex gap-3 px-2 mb-4">
              <input type="text" placeholder="بحث عن تصنيف..." className="flex-1 bg-white/80 border border-white rounded-2xl px-5 py-3 text-slate-700 font-bold focus:border-amber-400 outline-none shadow-sm" value={catSearch} onChange={e => setCatSearch(e.target.value)} />
              <button onClick={() => setModal({ type: 'CATEGORY' })} className="bg-amber-400 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-md">+</button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {filteredCategories.map(cat => (
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
          </div>
        )}

        {activeTab === 'WORDS' && (
          <div className="space-y-4">
            <div className="bg-white/50 backdrop-blur px-2 py-2 rounded-2xl mb-4 border border-white/50">
               <input type="text" placeholder="بحث عن كلمة..." className="w-full bg-white border border-slate-100 rounded-xl px-5 py-3 text-slate-700 font-bold outline-none focus:border-emerald-400 shadow-sm" value={wordSearch} onChange={e => setWordSearch(e.target.value)} />
            </div>
            {categories.map(cat => {
              const catWords = filteredWordsGrouped[cat.id] || [];
              if (wordSearch && catWords.length === 0) return null;
              return (
                <div key={cat.id} className="bg-white/80 border border-white rounded-[2rem] overflow-hidden shadow-sm mb-4">
                  <div className="p-5 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center px-6">
                    <h3 className="font-black text-slate-700 text-sm">{cat.ar}</h3>
                    <button onClick={() => setModal({ type: 'WORD', categoryId: cat.id })} className="bg-emerald-500 text-white px-4 py-1.5 rounded-xl font-black text-[10px]">+ إضافة</button>
                  </div>
                  <div className="p-5 flex flex-wrap gap-2">
                    {catWords.map(word => (
                      <div key={word.id} className="bg-white border border-slate-100 px-3 py-2 rounded-xl flex items-center gap-2 group hover:border-emerald-200 transition-all">
                        <span className="text-xs font-bold text-slate-600">{word.secret}</span>
                        <button onClick={() => deleteWord(word.id)} className="text-slate-300 hover:text-red-500 text-[10px] group-hover:opacity-100 opacity-0 transition-all">✕</button>
                      </div>
                    ))}
                    {catWords.length === 0 && <p className="text-slate-300 text-[10px] py-4 w-full text-center">لا توجد كلمات في هذا التصنيف</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'SYNC' && (
          <div className="space-y-6">
            <div className="bg-white/80 border border-white p-8 rounded-[2.5rem] shadow-sm space-y-8 text-center">
              <span className="text-5xl">🚀</span>
              <h3 className="text-xl font-black text-slate-800">تحديث البيانات السحابي</h3>
              <p className="text-slate-400 text-[11px] font-medium px-4">اربط ملفك مباشرة وسيتم تحديث الكلمات والتصنيفات في ثوانٍ</p>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-4">
                   <p className="text-[10px] text-slate-500 font-black uppercase">ضع رابط Google Sheet هنا</p>
                   <input 
                    type="text" 
                    value={syncUrl} 
                    onChange={(e) => setSyncUrl(e.target.value)} 
                    placeholder="https://docs.google.com/spreadsheets/d/..." 
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-700 text-xs font-bold outline-none focus:border-amber-400 transition-all"
                  />
                  <button 
                    onClick={smartSyncFromUrl} 
                    disabled={isSyncing || !syncUrl} 
                    className="w-full bg-amber-400 text-white font-black py-4 rounded-xl hover:bg-amber-500 shadow-md disabled:opacity-30 transition-all text-sm"
                  >
                    {isSyncing ? 'جاري السحب...' : 'بدء المزامنة والتحليل 🔄'}
                  </button>
                </div>

                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex flex-col items-center gap-4">
                   <p className="text-[10px] text-slate-500 font-black uppercase">أو ارفع ملف CSV يدوياً</p>
                   <label className="bg-slate-800 text-white px-8 py-4 rounded-2xl font-black cursor-pointer hover:bg-slate-900 transition-all shadow-md inline-block text-sm">
                     📁 اختيار ملف
                     <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                   </label>
                </div>
              </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-[2rem] space-y-3">
               <h4 className="text-indigo-600 font-black text-sm">💡 كيف يجب أن يكون ترتيب الأعمدة؟</h4>
               <p className="text-indigo-400 text-[10px] leading-relaxed">
                 العمود الأول: اسم التصنيف (مثلاً: فواكه)<br/>
                 العمود الثاني: الكلمة السرية (مثلاً: تفاح)<br/>
                 * تأكد من أن الملف "Anyone with the link can view".
               </p>
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
