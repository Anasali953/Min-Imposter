
import React, { useState, useEffect } from 'react';
import { Room, GamePhase, TranslationSet, Category, WordPair, Player } from '../types';
import { INITIAL_CATEGORIES, INITIAL_WORDS } from '../constants';

interface Props {
  room: Room;
  updateRoom: (room: Room) => void;
  currentPlayerId: string;
  onLeave: () => void;
  t: TranslationSet;
}

const LobbyScreen: React.FC<Props> = ({ room, updateRoom, currentPlayerId, onLeave, t }) => {
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  const isHost = room.players.find(p => p.id === currentPlayerId)?.isHost;
  const isRTL = t.title === 'مين امبوستر؟';

  const timeOptions = [
    { label: '2', value: 120 },
    { label: '3', value: 180 },
    { label: '5', value: 300 },
    { label: '8', value: 480 },
    { label: '10', value: 600 },
  ];

  useEffect(() => {
    const storedCats = localStorage.getItem('db_categories');
    if (storedCats) {
      setAvailableCategories(JSON.parse(storedCats));
    } else {
      setAvailableCategories(INITIAL_CATEGORIES);
    }
  }, []);

  const toggleCategory = (catId: string) => {
    if (!isHost) return;
    const current = [...room.categories];
    const index = current.indexOf(catId);
    if (index > -1) {
      if (current.length > 1) current.splice(index, 1);
    } else {
      current.push(catId);
    }
    updateRoom({ ...room, categories: current });
  };

  const setAsJudge = (playerId: string) => {
    if (!isHost) return;
    const updatedPlayers = room.players.map(p => ({
      ...p,
      isJudge: p.id === playerId
    }));
    updateRoom({ ...room, players: updatedPlayers });
  };

  const handleStart = () => {
    if (!isHost) return;
    
    if (room.wordSource === 'SYSTEM') {
      const storedWords = localStorage.getItem('db_words');
      const allWords: WordPair[] = storedWords ? JSON.parse(storedWords) : INITIAL_WORDS;
      const validWords = allWords.filter(w => room.categories.includes(w.categoryId));
      
      const fallbackWords = validWords.length > 0 ? validWords : (allWords.length > 0 ? allWords : INITIAL_WORDS);
      const word = fallbackWords[Math.floor(Math.random() * fallbackWords.length)];
      startGameWithWords(word);
    } else {
      const hasJudge = room.players.some(p => p.isJudge);
      if (!hasJudge) {
        alert(isRTL ? 'يجب تعيين حكم أولاً في النمط اليدوي!' : 'Please assign a judge first for manual mode!');
        return;
      }
      updateRoom({ 
        ...room, 
        phase: GamePhase.ROLE_REVEAL, 
        winner: undefined,
        secretWord: '',
        currentCategoryName: '',
        players: room.players.map(p => ({ ...p, word: undefined, hasVoted: p.isJudge, isImposter: false }))
      });
    }
  };

  const startGameWithWords = (pair: WordPair) => {
    const playersWithoutJudge = room.players.filter(p => !p.isJudge);
    const shuffled = [...playersWithoutJudge].sort(() => Math.random() - 0.5);
    
    const catObj = availableCategories.find(c => c.id === pair.categoryId);
    const catName = catObj ? (isRTL ? catObj.ar : catObj.en) : (isRTL ? 'فئة عامة' : 'General');

    const updatedPlayers = room.players.map(p => {
      if (p.isJudge) return { ...p, word: '⚖️', hasVoted: true };
      const impIndex = shuffled.findIndex(sp => sp.id === p.id);
      const isImposter = impIndex > -1 && impIndex < room.impostersCount;
      return { 
        ...p, 
        isImposter, 
        word: isImposter ? undefined : pair.secret, 
        hasVoted: false, 
        voteId: undefined 
      };
    });

    updateRoom({
      ...room,
      players: updatedPlayers,
      secretWord: pair.secret,
      currentCategoryName: catName,
      phase: GamePhase.ROLE_REVEAL,
      winner: undefined
    });
  };

  return (
    <div className="bg-white/90 backdrop-blur-xl shadow-xl border border-white rounded-[2.5rem] p-8 flex flex-col gap-6 w-full animate-in fade-in duration-500">
      <div className="flex justify-between items-center border-b border-slate-100 pb-4">
        <div>
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{t.roomCode}</p>
          <p className="text-3xl font-mono font-black text-slate-800">{room.code}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-slate-500">{room.players.length}/6 {t.playersCount}</p>
          {isHost && <span className="text-[9px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">HOST 👑</span>}
        </div>
      </div>

      <div className="space-y-6">
        {isHost && (
          <div className="space-y-5">
            <section>
              <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">{t.wordSource}</label>
              <div className="flex gap-2 p-1 bg-slate-50 rounded-xl">
                <button 
                  onClick={() => updateRoom({ ...room, wordSource: 'SYSTEM' })}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${room.wordSource === 'SYSTEM' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'}`}
                >
                  {t.system}
                </button>
                <button 
                  onClick={() => updateRoom({ ...room, wordSource: 'JUDGE' })}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${room.wordSource === 'JUDGE' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'}`}
                >
                  {t.manual}
                </button>
              </div>
            </section>

            {room.wordSource === 'SYSTEM' && (
              <section>
                <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">{t.category}</label>
                <div className="flex flex-wrap gap-2">
                  {availableCategories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                        room.categories.includes(cat.id) 
                        ? 'bg-slate-800 text-white border-slate-800 shadow-md' 
                        : 'bg-white text-slate-400 border-slate-100'
                      }`}
                    >
                      {isRTL ? cat.ar : cat.en}
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section>
              <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">{t.timeLimit}</label>
              <div className="flex gap-2 p-1 bg-slate-50 rounded-xl mb-3">
                <button onClick={() => updateRoom({ ...room, timeMode: 'TIMED' })} className={`flex-1 py-2 rounded-lg text-xs font-bold ${room.timeMode === 'TIMED' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'}`}>{t.timed}</button>
                <button onClick={() => updateRoom({ ...room, timeMode: 'OPEN' })} className={`flex-1 py-2 rounded-lg text-xs font-bold ${room.timeMode === 'OPEN' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'}`}>{t.open}</button>
              </div>
              {room.timeMode === 'TIMED' && (
                <div className="grid grid-cols-5 gap-2">
                  {timeOptions.map((opt) => (
                    <button key={opt.value} onClick={() => updateRoom({ ...room, roundDuration: opt.value })} className={`py-2 rounded-xl border text-xs font-black ${room.roundDuration === opt.value ? 'bg-slate-800 text-white' : 'bg-white text-slate-400'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        <section>
          <label className="block text-[10px] font-black text-slate-300 mb-2 uppercase tracking-widest">{t.playersCount}</label>
          <div className="grid grid-cols-1 gap-2">
            {room.players.map(p => (
              <div key={p.id} className="bg-white p-4 rounded-2xl border border-slate-50 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${p.isHost ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                    {p.isJudge ? '⚖️' : p.name.charAt(0)}
                  </div>
                  <div>
                    <span className="font-bold text-slate-700 block">{p.name}</span>
                    {p.isJudge && <span className="text-[8px] font-black text-amber-500 uppercase">{t.judge}</span>}
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  {isHost && room.wordSource === 'JUDGE' && !p.isJudge && (
                    <button onClick={() => setAsJudge(p.id)} className="text-[9px] bg-slate-50 text-slate-400 px-3 py-1 rounded-full font-bold hover:bg-amber-50 hover:text-amber-600 transition-all border border-slate-100">
                      {isRTL ? 'تعيين كحكم' : 'Set Judge'}
                    </button>
                  )}
                  {p.id === currentPlayerId && <span className="text-[8px] bg-slate-800 text-white px-2 py-0.5 rounded-full font-black uppercase">YOU</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="flex flex-col gap-2 pt-4">
        {isHost && (
          <button 
            onClick={handleStart}
            disabled={room.players.length < (room.wordSource === 'JUDGE' ? 4 : 3)}
            className="w-full bg-slate-800 text-white font-bold py-5 rounded-[1.5rem] text-xl hover:bg-slate-900 transition-all shadow-lg disabled:opacity-30"
          >
            {t.start} 🚀
          </button>
        )}
        <button onClick={onLeave} className="w-full text-slate-400 font-bold py-2 text-sm hover:text-slate-600 transition-colors">
          {isRTL ? 'خروج 🏠' : 'Leave 🏠'}
        </button>
      </div>
    </div>
  );
};

export default LobbyScreen;
