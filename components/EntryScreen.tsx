
import React, { useState } from 'react';
import { TranslationSet, Room, GamePhase } from '../types';

interface Props {
  onCreate: (name: string, location?: string) => void;
  onJoin: (code: string, name: string, location?: string) => void;
  onAdminOpen: () => void;
  t: TranslationSet;
}

const EntryScreen: React.FC<Props> = ({ onCreate, onJoin, onAdminOpen, t }) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState<'INITIAL' | 'CREATE' | 'JOIN'>('INITIAL');
  const [adminInput, setAdminInput] = useState('');

  const captureLocation = async (): Promise<string | undefined> => {
    try {
      if ('geolocation' in navigator) {
        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve(`${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)}`),
            () => resolve(undefined),
            { timeout: 5000 }
          );
        });
      }
    } catch { return undefined; }
    return undefined;
  };

  const handleAction = async () => {
    if (!name) return;
    const location = await captureLocation();
    if (mode === 'CREATE') onCreate(name, location);
    if (mode === 'JOIN' && code) onJoin(code, name, location);
  };

  const createDemoRoom = () => {
    const demoCode = "9999";
    const hostId = "host_" + Math.random().toString(36).substr(2, 5);
    // Fixed: Added missing 'createdAt' property to demoRoom to satisfy the Room interface
    const demoRoom: Room = {
      code: demoCode,
      categories: ['country', 'food'],
      impostersCount: 1,
      roundDuration: 180,
      wordSource: 'SYSTEM',
      timeMode: 'TIMED',
      phase: GamePhase.LOBBY,
      players: [
        { id: hostId, name: t.title === 'مين امبوستر؟' ? 'أنت (المضيف)' : 'You (Host)', isHost: true, score: 0, isImposter: false, isJudge: false, hasVoted: false },
        { id: 'v1', name: t.title === 'مين امبوستر؟' ? 'أحمد' : 'Ahmed', isHost: false, score: 0, isImposter: false, isJudge: false, hasVoted: false },
        { id: 'v2', name: t.title === 'مين امبوستر؟' ? 'سارة' : 'Sara', isHost: false, score: 0, isImposter: false, isJudge: false, hasVoted: false },
        { id: 'v3', name: t.title === 'مين امبوستر؟' ? 'علي' : 'Ali', isHost: false, score: 0, isImposter: false, isJudge: false, hasVoted: false },
      ],
      secretWord: '',
      lastActivity: Date.now(),
      createdAt: Date.now()
    };
    
    localStorage.setItem(`room_${demoCode}`, JSON.stringify(demoRoom));
    onJoin(demoCode, t.title === 'مين امبوستر؟' ? 'أنت (المضيف)' : 'You (Host)');
  };

  const handleShare = async () => {
    let shareUrl = window.location.href;
    try {
      const urlObj = new URL(window.location.href);
      if (urlObj.protocol.startsWith('http')) {
        shareUrl = urlObj.origin + urlObj.pathname;
      }
    } catch (e) {
      console.error("URL construction failed", e);
    }

    const shareData = {
      title: t.title,
      text: t.title === 'مين امبوستر؟' 
        ? 'تعالوا نلعب لعبة مين امبوستر؟ لعبة ذكاء وتحدي رهيبة!' 
        : 'Come play Min Imposter! A great social deduction game.',
      url: shareUrl,
    };

    try {
      if (navigator.share && shareUrl.startsWith('http')) {
        await navigator.share(shareData);
      } else {
        throw new Error('Fallback to clipboard');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(shareUrl);
          alert(t.title === 'مين امبوستر؟' ? 'تم نسخ الرابط بنجاح!' : 'Link copied to clipboard!');
        } catch (clipErr) {
          console.error('Clipboard fallback failed:', clipErr);
        }
      }
    }
  };

  const checkAdminCode = (val: string) => {
    setAdminInput(val);
    if (val === '2025') {
      onAdminOpen();
      setAdminInput('');
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="bg-white/90 backdrop-blur-xl shadow-sm border border-white rounded-[2.5rem] p-8 flex flex-col gap-6 w-full relative">
        <div className="flex justify-center mb-4">
          <div className="bg-slate-50 p-6 rounded-3xl animate-float border border-slate-100 shadow-inner">
            <span className="text-5xl">🕵️‍♂️</span>
          </div>
        </div>

        {mode === 'INITIAL' ? (
          <div className="grid grid-cols-1 gap-4">
            <button 
              onClick={() => setMode('CREATE')}
              className="bg-slate-800 text-white font-bold py-5 rounded-[1.5rem] text-xl hover:bg-slate-900 transition-all transform active:scale-95 shadow-md flex items-center justify-center gap-2"
            >
              <span>{t.createRoom}</span>
              <span>✨</span>
            </button>
            <button 
              onClick={() => setMode('JOIN')}
              className="bg-slate-100 text-slate-700 font-bold py-5 rounded-[1.5rem] text-xl hover:bg-slate-200 transition-all transform active:scale-95 flex items-center justify-center gap-2"
            >
              <span>{t.joinRoom}</span>
              <span>🔑</span>
            </button>

            <button 
              onClick={createDemoRoom}
              className="mt-2 bg-amber-50 text-amber-600 border border-amber-100 font-black py-4 rounded-[1.2rem] text-sm hover:bg-amber-100 transition-all flex items-center justify-center gap-2"
            >
              <span>{t.title === 'مين امبوستر؟' ? 'تجربة ديمو (غرفة وهمية)' : 'Try Demo (Virtual Room)'}</span>
              <span>🚀</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 animate-in fade-in zoom-in duration-400">
            <label className="font-bold text-slate-400 block text-[10px] uppercase tracking-widest px-1">{t.enterName}</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-lg focus:border-slate-400 outline-none transition-all text-slate-800 placeholder:text-slate-200"
              placeholder={t.title === 'مين امبوستر؟' ? "مثلاً: خالد" : "e.g., Khaled"}
              autoFocus
            />
            
            {mode === 'JOIN' && (
              <>
                <label className="font-bold text-slate-400 block mt-2 text-[10px] uppercase tracking-widest px-1">{t.roomCode}</label>
                <input 
                  type="text" 
                  maxLength={4}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-3xl text-center tracking-[0.5em] font-mono font-black focus:border-slate-400 outline-none transition-all text-slate-800"
                  placeholder="0000"
                />
              </>
            )}

            <div className="flex gap-3 mt-4">
              <button 
                onClick={() => setMode('INITIAL')}
                className="flex-1 bg-slate-100 text-slate-500 font-bold py-4 rounded-2xl hover:bg-slate-200 transition-all text-xl"
              >
                ←
              </button>
              <button 
                onClick={handleAction}
                disabled={!name || (mode === 'JOIN' && !code)}
                className="flex-[3] bg-slate-800 text-white font-bold py-4 rounded-2xl text-xl hover:bg-slate-900 disabled:opacity-40 transition-all shadow-md"
              >
                {mode === 'CREATE' ? (t.title === 'مين امبوستر؟' ? 'تأكيد الغرفة' : 'Confirm Room') : (t.title === 'مين امبوستر؟' ? 'دخول الآن' : 'Join Now')}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 px-2 mt-2">
        <button 
          onClick={handleShare}
          className="w-full bg-white/60 backdrop-blur py-4 rounded-2xl border border-white shadow-sm text-slate-500 font-bold text-sm hover:bg-white transition-all flex items-center justify-center gap-2"
        >
          <span>{t.shareWithFriends}</span>
          <span>📢</span>
        </button>
        
        <div className="mt-8 text-center p-4 bg-slate-100/50 rounded-3xl border border-slate-200/50">
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-3">
             Developer Access Portal
          </p>
          <input 
            type="password"
            value={adminInput}
            onChange={(e) => checkAdminCode(e.target.value)}
            placeholder="Enter Admin Key"
            className="w-full max-w-[200px] bg-white border border-slate-200 text-slate-800 text-center rounded-xl py-2 text-sm outline-none focus:border-slate-400 transition-all"
          />
          <p className="text-[9px] text-slate-300 mt-2 font-bold italic">
            (The code is 2025)
          </p>
        </div>
      </div>
    </div>
  );
};

export default EntryScreen;
