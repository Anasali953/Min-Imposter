
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

  const processSmartData = (rows: string[][]) => {
    const newCats: Category[] = [...categories];
    const newWords: WordPair[] = [...words];
    let addedCount = 0;

    rows.forEach((row, idx) => {
      if (row.length < 2 || !row[0] || !row[1]) return;
      const catName = row[0].trim(); 
      const secret = row[1].trim();  
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
    alert(`✅ نجاح! تم إضافة ${addedCount} كلمة جديدة وتحديث التصنيفات.`);
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
    try {
      const response = await fetch(syncUrl);
      if (!response.ok) throw new Error('Network response was not ok');
      const text = await response.text();
      const rows = text.split('\n').filter(line => line.trim()).map(row => 
        row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, ''))
      );
      processSmartData(rows);
    } catch (err) {
      alert('❌ فشل سحب البيانات');
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

  // Statistics Calculation
  const stats = useMemo(() => {
    const totalFinished = activeRooms.filter(r => r.winner).length;
    const playerWins = activeRooms.filter(r => r.winner === 'PLAYERS').length;
    const imposterWins = activeRooms.filter(r => r.winner === 'IMPOSTERS').length;
    
    const catPopularity: Record<string, number> = {};
    activeRooms.forEach(r => {
      r.categories.forEach(cid => {
        catPopularity[cid] = (catPopularity[cid] || 0) + 1;
      });
    });

    const sortedCats = Object.entries(catPopularity)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({
        name: categories.find(c => c.id === id)?.ar || id,
        count
      }));

    return { totalFinished, playerWins, imposterWins, sortedCats };
  }, [activeRooms, categories]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
      {/* Modals */}
      {modal.type && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in duration-200">
            <h3 className="text-2xl font-black text-slate-800 mb-6 text-center">
              {modal.type === 'CATEGORY' ? 'إضافة تصنيف' : 'إضافة كلمات'}
            </h3>
            <div className="space-y-4 text-right">
              {modal.type === 'CATEGORY' ? (
                <input type="text" placeholder="اسم التصنيف" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-slate-900 font-bold outline-none focus:border-amber-400" value={catForm.ar} onChange={e => setCatForm({...catForm, ar: e.target.value})} autoFocus />
              ) : (
                <input type="text" placeholder="الكلمة السرية" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-slate-900 font-bold outline-none focus:border-emerald-400" value={wordForm.secret} onChange={e => setWordForm({...wordForm, secret: e.target.value})} autoFocus onKeyDown={e => e.key === 'Enter' && handleAddWord(true)} />
              )}
              <div className="flex gap-2">
                <button onClick={() => modal.type === 'WORD' ? handleAddWord(true) : handleAddCategory()} className="flex-1 bg-emerald-50 text-emerald-600 font-black py-4 rounded-2xl border border-emerald-100">حفظ مستمر</button>
                <button onClick={() => modal.type === 'WORD' ? handleAddWord(false) : handleAddCategory()} className="flex-1 bg-slate-800 text-white font-black py-4 rounded-2xl">حفظ وإغلاق</button>
              </div>
              <button onClick={() => setModal({ type: null })} className="w-full text-slate-400 font-bold py-2 text-sm">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-center bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl gap-6">
        <div className="text-center md:text-right">
          <h2 className="text-3xl font-black text-white flex items-center justify-center md:justify-start gap-3">
             <span className="bg-amber-500 text-slate-950 p-2 rounded-xl text-[10px] font-black uppercase">DASHBOARD</span>
             لوحة التحكم والتحليل
          </h2>
        </div>
        <button onClick={onBack} className="bg-white text-slate-900 px-8 py-2 rounded-xl font-black hover:bg-slate-100 shadow-lg active:scale-95 transition-all">خروج 🎮</button>
      </header>

      {/* Navigation - Fixed to show CATEGORIES */}
      <nav className="sticky top-4 z-50 flex bg-slate-900/90 backdrop-blur-md p-2 rounded-3xl border border-slate-800/50 shadow-2xl overflow-x-auto no-scrollbar">
        {[
          { id: 'OVERVIEW', label: 'الإحصائيات', icon: '📊' },
          { id: 'CATEGORIES', label: 'التصنيفات', icon: '📑' },
          { id: 'WORDS', label: 'بنك الكلمات', icon: '🔤' },
          { id: 'SYNC', label: 'المزامنة والرفع', icon: '🔄' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as AdminTab)} className={`flex-1 min-w-[120px] py-4 rounded-2xl font-black text-[11px] flex items-center justify-center gap-2 transition-all ${activeTab === tab.id ? 'bg-slate-700 text-white border border-slate-600 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
            <span className="text-lg">{tab.icon}</span><span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main>
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4">
            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 text-center shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 blur-3xl rounded-full"></div>
                <p className="text-[10px] text-slate-500 font-black mb-4 uppercase tracking-widest">التصنيفات</p>
                <p className="text-7xl font-black text-emerald-400">{categories.length}</p>
              </div>
              <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 text-center shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 blur-3xl rounded-full"></div>
                <p className="text-[10px] text-slate-500 font-black mb-4 uppercase tracking-widest">إجمالي الكلمات</p>
                <p className="text-7xl font-black text-amber-400">{words.length}</p>
              </div>
              <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 text-center shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-3xl rounded-full"></div>
                <p className="text-[10px] text-slate-500 font-black mb-4 uppercase tracking-widest">الغرف النشطة</p>
                <p className="text-7xl font-black text-white">{activeRooms.length}</p>
              </div>
            </div>

            {/* Performance Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-slate-900 p-10 rounded-[3rem] border border-slate-800 shadow-2xl space-y-8">
                <h3 className="text-xl font-black text-white flex items-center gap-3">
                  <span className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">📈</span> تحليل توازن اللعبة
                </h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-[10px] font-black text-slate-400 mb-2 uppercase">
                      <span>فوز المواطنين</span>
                      <span className="text-emerald-400">%{stats.totalFinished ? Math.round((stats.playerWins / stats.totalFinished) * 100) : 0}</span>
                    </div>
                    <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all duration-1000" style={{ width: `${stats.totalFinished ? (stats.playerWins / stats.totalFinished) * 100 : 0}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-black text-slate-400 mb-2 uppercase">
                      <span>فوز المنتحل (Imposter)</span>
                      <span className="text-red-400">%{stats.totalFinished ? Math.round((stats.imposterWins / stats.totalFinished) * 100) : 0}</span>
                    </div>
                    <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden">
                      <div className="bg-red-500 h-full shadow-[0_0_15px_rgba(239,68,68,0.5)] transition-all duration-1000" style={{ width: `${stats.totalFinished ? (stats.imposterWins / stats.totalFinished) * 100 : 0}%` }}></div>
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-800 text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center">
                  بناءً على {stats.totalFinished} جولة مكتملة
                </div>
              </div>

              <div className="bg-slate-900 p-10 rounded-[3rem] border border-slate-800 shadow-2xl space-y-6">
                <h3 className="text-xl font-black text-white flex items-center gap-3">
                  <span className="p-2 bg-amber-500/20 rounded-lg text-amber-400">🔥</span> التصنيفات الأكثر لعباً
                </h3>
                <div className="space-y-4">
                  {stats.sortedCats.length > 0 ? stats.sortedCats.map((cat, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-950/50 p-4 rounded-2xl border border-slate-800 group hover:border-amber-500/30 transition-all">
                      <div className="flex items-center gap-4">
                        <span className="text-slate-600 font-black text-xs">{i + 1}</span>
                        <span className="text-white font-bold">{cat.name}</span>
                      </div>
                      <span className="bg-slate-800 text-slate-400 px-3 py-1 rounded-full text-[10px] font-black">
                        {cat.count} مرة
                      </span>
                    </div>
                  )) : (
                    <div className="text-center py-20 text-slate-600 font-bold italic">لا توجد بيانات استخدام حالياً</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'CATEGORIES' && (
          <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in duration-500">
            <div className="p-8 border-b border-slate-800 bg-slate-950/20 flex flex-col md:flex-row justify-between items-center gap-4">
               <div>
                  <h3 className="text-xl font-black text-white">📑 إدارة التصنيفات</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">المجموع: {categories.length}</p>
               </div>
               <div className="flex gap-4 w-full md:w-auto">
                 <input 
                   type="text" 
                   placeholder="بحث عن تصنيف..."
                   className="flex-1 md:w-64 bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-white text-sm focus:border-amber-500 outline-none transition-all"
                   value={catSearch}
                   onChange={e => setCatSearch(e.target.value)}
                 />
                 <button onClick={() => setModal({ type: 'CATEGORY' })} className="bg-emerald-500 text-slate-950 px-6 py-3 rounded-2xl font-black text-sm hover:bg-emerald-400 transition-all">
                   + تصنيف جديد
                 </button>
               </div>
            </div>
            <div className="divide-y divide-slate-800 max-h-[600px] overflow-y-auto custom-scrollbar">
              {filteredCategories.length > 0 ? filteredCategories.map(cat => (
                <div key={cat.id} className="p-6 md:p-8 flex justify-between items-center hover:bg-slate-800/30 group">
                  <div className="flex-1">
                    <p className="font-black text-xl text-white group-hover:text-emerald-400 transition-colors">{cat.ar}</p>
                    <p className="text-[9px] text-slate-600 font-bold uppercase mt-1">ID: {cat.id}</p>
                  </div>
                  <div className="flex gap-6 items-center">
                    <div className="text-left hidden md:block">
                        <p className="text-[9px] font-black text-slate-500 uppercase">الكلمات</p>
                        <p className="font-black text-white text-xl">{words.filter(w => w.categoryId === cat.id).length}</p>
                    </div>
                    <button onClick={() => deleteCategory(cat.id)} className="bg-red-500/10 text-red-500 p-4 rounded-2xl hover:bg-red-500 hover:text-white transition-all">🗑️</button>
                  </div>
                </div>
              )) : (
                <div className="p-20 text-center text-slate-600 font-bold">لم يتم العثور على تصنيفات</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'WORDS' && (
          <div className="space-y-6">
            <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800 sticky top-[90px] z-40 flex gap-4 shadow-2xl backdrop-blur-md bg-opacity-80">
              <input type="text" placeholder="بحث سريع عن كلمة..." className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-emerald-500 shadow-inner" value={wordSearch} onChange={e => setWordSearch(e.target.value)} />
            </div>
            {categories.map(cat => {
              const catWords = filteredWordsGrouped[cat.id] || [];
              if (wordSearch && catWords.length === 0) return null;
              return (
                <div key={cat.id} className="bg-slate-900 rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-xl animate-in fade-in duration-500">
                  <div className="p-6 bg-slate-950/50 border-b border-slate-800 flex justify-between items-center px-10">
                    <h3 className="font-black text-xl text-white">{cat.ar} <span className="text-slate-600 text-xs font-bold">({catWords.length} كلمة)</span></h3>
                    <button onClick={() => setModal({ type: 'WORD', categoryId: cat.id })} className="bg-emerald-500 text-slate-950 px-5 py-2 rounded-xl font-black text-xs hover:bg-emerald-400 transition-all shadow-lg">+ إضافة سريع</button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 p-8 max-h-[500px] overflow-y-auto custom-scrollbar">
                    {catWords.length > 0 ? catWords.map(word => (
                      <div key={word.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex justify-between items-center group hover:border-emerald-500 transition-all">
                        <span className="text-slate-300 font-bold text-xs truncate">{word.secret}</span>
                        <button onClick={() => deleteWord(word.id)} className="text-slate-700 hover:text-red-500 text-[10px] opacity-0 group-hover:opacity-100 transition-all p-1">✕</button>
                      </div>
                    )) : (
                      <p className="col-span-full text-center text-slate-600 py-10 italic">لا توجد كلمات مطابقة</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'SYNC' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in zoom-in duration-500">
            <div className="bg-slate-900 p-10 rounded-[3rem] border border-slate-800 space-y-12 shadow-2xl relative overflow-hidden">
              <div className="text-center relative z-10">
                <h3 className="text-4xl font-black text-white mb-4">🚀 المزامنة والرفع الذكي</h3>
                <p className="text-slate-400 font-medium">أضف مئات الكلمات في ثوانٍ عبر Excel أو Google Sheets</p>
              </div>

              <div className="space-y-6 relative z-10">
                <div className="bg-slate-950 border border-slate-800 rounded-[2.5rem] p-10 space-y-8">
                  <h4 className="text-amber-500 font-black text-xl flex items-center gap-3">
                    <span className="bg-amber-500 text-slate-950 w-8 h-8 rounded-full flex items-center justify-center text-sm">!</span>
                    دليل تجهيز الملف (CSV)
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-3 shadow-lg">
                      <div className="text-emerald-400 text-3xl font-black opacity-30">01</div>
                      <p className="text-white font-bold text-sm">تجهيز الجدول</p>
                      <p className="text-slate-500 text-xs leading-relaxed">افتح ملف Excel واجعل العمود الأول (A) لاسم التصنيف، والعمود الثاني (B) للكلمة السرية.</p>
                    </div>
                    <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-3 shadow-lg">
                      <div className="text-emerald-400 text-3xl font-black opacity-30">02</div>
                      <p className="text-white font-bold text-sm">تنسيق الحفظ</p>
                      <p className="text-slate-500 text-xs leading-relaxed">اختر "حفظ باسم" ثم حدد الصيغة بصيغة CSV.</p>
                    </div>
                    <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-3 shadow-lg">
                      <div className="text-emerald-400 text-3xl font-black opacity-30">03</div>
                      <p className="text-white font-bold text-sm">بدء الرفع</p>
                      <p className="text-slate-500 text-xs leading-relaxed">ارفع الملف من جهازك أو استخدم الرابط المباشر.</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-slate-950 p-10 rounded-[2.5rem] border border-slate-800 flex flex-col items-center justify-center gap-6 shadow-2xl hover:border-emerald-500/30 transition-all group">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">📁</div>
                    <div className="text-center">
                      <h5 className="text-white font-black mb-2">رفع ملف محلي</h5>
                      <label className="bg-emerald-500 text-slate-950 px-8 py-4 rounded-2xl font-black cursor-pointer hover:bg-emerald-400 transition-all shadow-xl inline-block">
                        اختر الملف الآن
                        <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                      </label>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-10 rounded-[2.5rem] border border-slate-800 flex flex-col items-center justify-center gap-4 shadow-2xl hover:border-amber-500/30 transition-all group">
                    <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">🌐</div>
                    <div className="text-center w-full">
                      <h5 className="text-white font-black mb-2">المزامنة السحابية</h5>
                      <input 
                        type="text" 
                        value={syncUrl} 
                        onChange={(e) => setSyncUrl(e.target.value)} 
                        placeholder="رابط ملف CSV..." 
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm mb-4 outline-none focus:border-amber-500 font-bold"
                      />
                      <button 
                        onClick={smartSyncFromUrl} 
                        disabled={isSyncing || !syncUrl} 
                        className="w-full bg-amber-500 text-slate-950 font-black py-4 rounded-xl hover:bg-amber-400 shadow-xl disabled:opacity-30 transition-all"
                      >
                        {isSyncing ? 'جاري السحب...' : 'مزامنة الرابط 🚀'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}} />
    </div>
  );
};

export default AdminDashboard;
