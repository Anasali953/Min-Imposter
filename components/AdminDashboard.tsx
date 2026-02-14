
import React, { useState, useEffect } from 'react';
import { TranslationSet, Category, WordPair, Room, Player } from '../types';
import { INITIAL_CATEGORIES, INITIAL_WORDS } from '../constants';

interface Props {
  onBack: () => void;
  t: TranslationSet;
}

type AdminTab = 'OVERVIEW' | 'CATEGORIES' | 'WORDS' | 'SYNC' | 'ANALYTICS';

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
      try {
        return JSON.parse(localStorage.getItem(k) || '{}');
      } catch {
        return null;
      }
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
    const newCat: Category = { 
      id: 'cat_' + Date.now(), 
      ar: catForm.ar, 
      en: catForm.en || catForm.ar 
    };
    saveToStorage([...categories, newCat], words);
    setCatForm({ ar: '', en: '' });
    setModal({ type: null });
  };

  const handleAddWord = () => {
    if (!wordForm.secret || !modal.categoryId) return;
    const newWord: WordPair = { 
      id: 'word_' + Date.now(), 
      categoryId: modal.categoryId, 
      secret: wordForm.secret 
    };
    saveToStorage(categories, [...words, newWord]);
    setWordForm({ secret: '' });
    setModal({ type: null });
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

  const clearDatabase = () => {
    if (confirm('تحذير: سيتم حذف جميع التصنيفات والكلمات المخصصة والعودة للإعدادات الأصلية. هل تريد المتابعة؟')) {
      localStorage.removeItem('db_categories');
      localStorage.removeItem('db_words');
      refreshData();
      alert('✅ تم تصفير قاعدة البيانات');
    }
  };

  const processSmartData = (rows: string[][]) => {
    const newCats: Category[] = [...categories];
    const newWords: WordPair[] = [];

    rows.slice(1).forEach((row, idx) => {
      if (row.length < 2 || !row[0] || !row[1]) return;
      
      const catName = row[0].trim(); 
      const secret = row[1].trim();  

      let category = newCats.find(c => c.ar === catName);
      if (!category) {
        category = { id: 'cat_' + Math.random().toString(36).substr(2, 5), ar: catName, en: catName };
        newCats.push(category);
      }

      newWords.push({
        id: 'w_' + idx + '_' + Date.now(),
        categoryId: category.id,
        secret
      });
    });

    if (newWords.length > 0) {
      saveToStorage(newCats, newWords);
      alert(`✅ نجاح! تم تحديث ${newCats.length} تصنيف و ${newWords.length} كلمة.`);
    } else {
      alert('⚠️ لم يتم العثور على بيانات صالحة في الملف.');
    }
  };

  const handleLocalSmartFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const rows = text.split('\n').map(row => 
          row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, ''))
        );
        processSmartData(rows);
      } catch (err) {
        alert('❌ خطأ في قراءة ملف CSV');
      }
    };
    reader.readAsText(file);
  };

  const smartSyncFromUrl = async () => {
    if (!syncUrl) return;
    setIsSyncing(true);
    try {
      const response = await fetch(syncUrl);
      const csvData = await response.text();
      const rows = csvData.split('\n').map(row => 
        row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, ''))
      );
      processSmartData(rows);
    } catch (e) {
      alert('❌ فشل المزامنة. تأكد من أن الرابط منشور للويب بصيغة CSV.');
    } finally {
      setIsSyncing(false);
    }
  };

  const getAnalytics = () => {
    const totalPlayers = activeRooms.reduce((acc, r) => acc + (r.players?.length || 0), 0);
    const locations = activeRooms.flatMap(r => (r.players || []).map(p => p.location)).filter(Boolean);
    const winnerStats = activeRooms.filter(r => r.winner).reduce((acc, r) => {
      if (r.winner === 'PLAYERS') acc.players++;
      else acc.imposters++;
      return acc;
    }, { players: 0, imposters: 0 });

    const categoryUsage: Record<string, number> = {};
    activeRooms.forEach(r => {
      (r.categories || []).forEach(catId => {
        categoryUsage[catId] = (categoryUsage[catId] || 0) + 1;
      });
    });

    return { totalPlayers, locations, winnerStats, categoryUsage };
  };

  const analytics = getAnalytics();

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {modal.type && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in duration-200">
            <h3 className="text-2xl font-black text-slate-800 mb-6 text-center">
              {modal.type === 'CATEGORY' ? 'إضافة تصنيف' : 'إضافة كلمة'}
            </h3>
            
            <div className="space-y-4 text-right">
              {modal.type === 'CATEGORY' ? (
                <>
                  <label className="text-xs font-bold text-slate-400 block px-1">اسم التصنيف</label>
                  <input 
                    type="text" 
                    placeholder="مثال: مدن سعودية 🇸🇦" 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-slate-900 font-bold outline-none focus:border-amber-400 transition-all"
                    value={catForm.ar} 
                    onChange={e => setCatForm({...catForm, ar: e.target.value})}
                  />
                  <button onClick={handleAddCategory} className="w-full bg-slate-800 text-white font-black py-5 rounded-2xl mt-4 hover:bg-slate-900 shadow-lg active:scale-95 transition-all">حفظ ✅</button>
                </>
              ) : (
                <>
                  <label className="text-xs font-bold text-slate-400 block px-1">الكلمة السرية (للمواطنين)</label>
                  <input 
                    type="text" 
                    placeholder="مثال: كبسة"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-slate-900 font-bold outline-none focus:border-emerald-400"
                    value={wordForm.secret} 
                    onChange={e => setWordForm({...wordForm, secret: e.target.value})}
                  />
                  <p className="text-[10px] text-slate-400 font-bold">ملاحظة: الامبوستر لن يعرف هذه الكلمة.</p>
                  <button onClick={handleAddWord} className="w-full bg-slate-800 text-white font-black py-5 rounded-2xl mt-4 hover:bg-slate-900 shadow-lg active:scale-95 transition-all">تأكيد ✅</button>
                </>
              )}
              <button onClick={() => setModal({ type: null })} className="w-full text-slate-400 font-bold py-2">إغلاق</button>
            </div>
          </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row justify-between items-center bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl gap-6">
        <div className="text-center md:text-right">
          <h2 className="text-3xl font-black text-white flex items-center justify-center md:justify-start gap-3">
             <span className="bg-amber-500 text-slate-950 p-2 rounded-xl text-xs font-black uppercase tracking-tighter">ADMIN</span>
             لوحة الإدارة والتقارير
          </h2>
          <p className="text-xs text-slate-500 font-bold mt-2 opacity-80">نظام المراقبة والتحكم في المحتوى</p>
        </div>
        <div className="flex gap-3">
            <button onClick={clearDatabase} className="bg-red-500/10 text-red-500 border border-red-500/20 px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-500/20">تصفير 🗑️</button>
            <button onClick={onBack} className="bg-white text-slate-900 px-8 py-2 rounded-xl font-black hover:bg-slate-100 shadow-lg active:scale-95 transition-all">خروج 🎮</button>
        </div>
      </header>

      <nav className="flex bg-slate-900/50 p-2 rounded-2xl border border-slate-800/50 shadow-inner overflow-x-auto no-scrollbar">
        {[
          { id: 'OVERVIEW', label: 'الرئيسية', icon: '📊' },
          { id: 'ANALYTICS', label: 'التقارير', icon: '📈' },
          { id: 'CATEGORIES', label: 'التصنيفات', icon: '📑' },
          { id: 'WORDS', label: 'الكلمات', icon: '🔤' },
          { id: 'SYNC', label: 'المزامنة', icon: '🔄' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as AdminTab)}
            className={`flex-1 min-w-[100px] py-4 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${
              activeTab === tab.id ? 'bg-slate-800 text-white shadow-xl border border-slate-700' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      <main className="min-h-[500px]">
        {activeTab === 'OVERVIEW' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-500">
            <div className="bg-slate-900 p-10 rounded-[2.5rem] border border-slate-800 text-center shadow-xl">
              <p className="text-xs font-black text-slate-500 mb-4 uppercase tracking-[0.2em]">عدد التصنيفات</p>
              <p className="text-7xl font-black text-emerald-400">{categories.length}</p>
            </div>
            <div className="bg-slate-900 p-10 rounded-[2.5rem] border border-slate-800 text-center shadow-xl">
              <p className="text-xs font-black text-slate-500 mb-4 uppercase tracking-[0.2em]">إجمالي الكلمات</p>
              <p className="text-7xl font-black text-amber-400">{words.length}</p>
            </div>
            <div className="bg-slate-900 p-10 rounded-[2.5rem] border border-slate-800 text-center shadow-xl">
              <p className="text-xs font-black text-slate-500 mb-4 uppercase tracking-[0.2em]">الغرف النشطة</p>
              <p className="text-7xl font-black text-white">{activeRooms.length}</p>
            </div>
          </div>
        )}

        {activeTab === 'ANALYTICS' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800">
                <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2"><span>🎯</span> توازن اللعبة (نسبة الفوز)</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                        <span>فوز المواطنين</span>
                        <span>{analytics.winnerStats.players}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full transition-all duration-1000" 
                          style={{ width: `${(analytics.winnerStats.players / (Math.max(1, activeRooms.filter(r => r.winner).length))) * 100}%` }}
                        ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                        <span>فوز الامبوسترز</span>
                        <span>{analytics.winnerStats.imposters}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
                        <div 
                          className="bg-red-500 h-full transition-all duration-1000" 
                          style={{ width: `${(analytics.winnerStats.imposters / (Math.max(1, activeRooms.filter(r => r.winner).length))) * 100}%` }}
                        ></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800">
                <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2"><span>📍</span> مواقع اللاعبين النشطة</h3>
                <div className="max-h-[200px] overflow-y-auto no-scrollbar space-y-3">
                  {analytics.locations.length > 0 ? (
                    [...new Set(analytics.locations)].map((loc, idx) => (
                      <div key={idx} className="bg-slate-950 p-4 rounded-2xl flex justify-between items-center border border-slate-800">
                        <span className="text-slate-300 font-mono text-xs">{loc}</span>
                        <span className="bg-amber-500 text-slate-950 px-3 py-1 rounded-full text-[10px] font-black uppercase">LIVE</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-slate-600 font-bold py-10 italic">لا توجد بيانات حالياً</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'CATEGORIES' && (
          <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6">
            <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-950/20">
               <h3 className="text-xl font-black text-white">📑 التصنيفات</h3>
               <button onClick={() => setModal({ type: 'CATEGORY' })} className="bg-emerald-500 text-slate-950 px-6 py-3 rounded-2xl font-black text-sm hover:bg-emerald-400 active:scale-95 transition-all">
                 + إضافة تصنيف جديد
               </button>
            </div>
            <div className="divide-y divide-slate-800">
              {categories.map(cat => (
                <div key={cat.id} className="p-8 flex justify-between items-center hover:bg-slate-800/30 group">
                  <div>
                    <p className="font-black text-2xl text-white group-hover:text-emerald-400 transition-colors">{cat.ar}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">ID: {cat.id}</p>
                  </div>
                  <div className="flex gap-6 items-center">
                    <div className="text-left">
                        <p className="text-[10px] font-black text-slate-500 uppercase">Words</p>
                        <p className="font-black text-white text-xl">{words.filter(w => w.categoryId === cat.id).length}</p>
                    </div>
                    <button onClick={() => deleteCategory(cat.id)} className="bg-red-500/10 text-red-500 p-4 rounded-2xl hover:bg-red-500 hover:text-white transition-all">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'WORDS' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-6 pb-20">
            {categories.map(cat => (
              <div key={cat.id} className="bg-slate-900 rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-xl">
                <div className="p-6 bg-slate-950/50 border-b border-slate-800 flex justify-between items-center px-10">
                  <h3 className="font-black text-xl text-white">{cat.ar}</h3>
                  <button onClick={() => setModal({ type: 'WORD', categoryId: cat.id })} className="text-[10px] bg-emerald-500 text-slate-950 px-4 py-2 rounded-xl font-black">
                    + إضافة كلمة
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-8">
                  {words.filter(w => w.categoryId === cat.id).map(word => (
                    <div key={word.id} className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800 flex justify-between items-center group hover:border-slate-500 transition-all">
                      <div>
                        <p className="text-white font-black text-lg">{word.secret}</p>
                        <p className="text-[10px] text-slate-600 font-bold uppercase">Secret Word</p>
                      </div>
                      <button onClick={() => deleteWord(word.id)} className="text-slate-700 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'SYNC' && (
          <div className="max-w-3xl mx-auto space-y-8 animate-in zoom-in duration-500">
            <div className="bg-slate-900 p-10 rounded-[3rem] border border-slate-800 space-y-8 shadow-2xl relative overflow-hidden">
              <div className="text-center relative z-10">
                <h3 className="text-3xl font-black text-white mb-3">🔄 مزامنة البيانات</h3>
                <p className="text-slate-500 font-medium">اربط جدول Google Sheet (بصيغة CSV) لسحب الكلمات تلقائياً</p>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 p-8 rounded-[2rem] space-y-5">
                <p className="text-amber-500 font-black text-center">تنسيق الجدول المطلوبة:</p>
                <div className="grid grid-cols-2 gap-3 text-center">
                   <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                       <p className="text-[10px] text-slate-500 font-bold mb-1">العمود A</p>
                       <p className="text-white font-black text-sm">اسم التصنيف</p>
                   </div>
                   <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                       <p className="text-[10px] text-slate-500 font-bold mb-1">العمود B</p>
                       <p className="text-white font-black text-sm">الكلمة السرية</p>
                   </div>
                </div>
              </div>

              <div className="space-y-4">
                <input 
                  type="text" 
                  value={syncUrl}
                  onChange={(e) => setSyncUrl(e.target.value)}
                  placeholder="ضع رابط الـ CSV هنا..."
                  className="w-full bg-white border-4 border-slate-100 rounded-[1.5rem] px-6 py-5 text-slate-900 font-black outline-none focus:border-amber-400 transition-all shadow-inner"
                />
                <button 
                  onClick={smartSyncFromUrl}
                  disabled={isSyncing || !syncUrl}
                  className="w-full bg-amber-500 text-slate-950 font-black py-6 rounded-[1.5rem] hover:bg-amber-400 active:scale-95 transition-all shadow-xl disabled:opacity-40"
                >
                  {isSyncing ? 'جاري المزامنة...' : 'تحديث قاعدة البيانات الآن 🚀'}
                </button>
              </div>

              <div className="text-center">
                <p className="text-slate-600 font-bold text-xs mb-4">أو قم برفع ملف يدوي</p>
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleLocalSmartFile}
                  className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-slate-800 file:text-slate-200"
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
