
import React, { useState, useEffect } from 'react';
import { GamePhase, Language, Room, Player } from './types';
import { TRANSLATIONS } from './constants';
import EntryScreen from './components/EntryScreen';
import LobbyScreen from './components/LobbyScreen';
import GameScreen from './components/GameScreen';
import AdminDashboard from './components/AdminDashboard';
import GuideModal from './components/GuideModal';

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('ar');
  const [room, setRoom] = useState<Room | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [titleClicks, setTitleClicks] = useState(0);

  useEffect(() => {
    if (!room) return;
    const handleStorage = (e: StorageEvent) => {
      if (e.key === `room_${room.code}`) {
        setRoom(JSON.parse(e.newValue || 'null'));
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [room?.code]);

  const updateRoom = (updatedRoom: Room) => {
    setRoom(updatedRoom);
    localStorage.setItem(`room_${updatedRoom.code}`, JSON.stringify(updatedRoom));
    window.dispatchEvent(new Event('storage'));
  };

  const t = TRANSLATIONS[lang];
  const isRTL = lang === 'ar';

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang, isRTL]);

  const handleTitleClick = () => {
    const newClicks = titleClicks + 1;
    if (newClicks >= 5) {
      setShowAdmin(true);
      setTitleClicks(0);
    } else {
      setTitleClicks(newClicks);
      setTimeout(() => setTitleClicks(0), 2000);
    }
  };

  if (showAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
        <AdminDashboard onBack={() => setShowAdmin(false)} t={t} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-stone-50 to-slate-100 p-4 md:p-8 flex flex-col items-center justify-start text-slate-700 selection:bg-slate-200`}>
      <header className="w-full max-w-lg flex justify-between items-center mb-6">
        <button 
          onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
          className="bg-white/70 backdrop-blur-md px-4 py-2 rounded-2xl font-bold hover:bg-white transition-all border border-slate-200 text-slate-500 shadow-sm text-xs"
        >
          {lang === 'ar' ? 'English' : 'العربية'}
        </button>
        <h1 
          onClick={handleTitleClick}
          className="text-2xl font-fun font-extrabold tracking-tight text-center flex-1 mx-4 text-slate-800 opacity-90 cursor-default select-none active:scale-95 transition-transform"
        >
          {t.title}
        </h1>
        <div className="w-[80px] flex justify-end">
          <button 
            onClick={() => setShowGuide(true)} 
            className="p-2 bg-white/70 backdrop-blur-md border border-slate-200 text-slate-500 rounded-xl hover:bg-white transition-all shadow-sm"
          >
             📖
          </button>
        </div>
      </header>

      <main className="w-full max-w-lg animate-in fade-in slide-in-from-bottom-6 duration-700">
        {!room || room.phase === GamePhase.ENTRY ? (
          <EntryScreen 
            onJoin={(code, name, location) => {
              const existing = localStorage.getItem(`room_${code}`);
              const roomData: Room | null = existing ? JSON.parse(existing) : null;
              if (roomData) {
                // Check if user is already in (like in demo)
                const existingPlayer = roomData.players.find(p => p.name === name);
                if (existingPlayer) {
                  setRoom(roomData);
                  setCurrentPlayerId(existingPlayer.id);
                } else {
                  const newId = Math.random().toString(36).substr(2, 9);
                  const updated = {
                    ...roomData,
                    players: [...roomData.players, { 
                      id: newId, 
                      name, 
                      isHost: false, 
                      score: 0, 
                      isImposter: false, 
                      isJudge: false, 
                      hasVoted: false,
                      location 
                    }]
                  };
                  updateRoom(updated);
                  setCurrentPlayerId(newId);
                }
              } else {
                alert(isRTL ? 'الغرفة غير موجودة' : 'Room not found');
              }
            }}
            onCreate={(name, location) => {
              const code = Math.floor(1000 + Math.random() * 9000).toString();
              const newId = Math.random().toString(36).substr(2, 9);
              // Removed 'imposterWord' as it's not defined in the Room type
              const newRoom: Room = {
                code,
                categories: ['country'],
                impostersCount: 1,
                roundDuration: 180,
                wordSource: 'SYSTEM',
                timeMode: 'TIMED',
                phase: GamePhase.LOBBY,
                players: [{ 
                  id: newId, 
                  name, 
                  isHost: true, 
                  score: 0, 
                  isImposter: false, 
                  isJudge: false, 
                  hasVoted: false,
                  location 
                }],
                secretWord: '',
                lastActivity: Date.now()
              };
              updateRoom(newRoom);
              setCurrentPlayerId(newId);
            }}
            onAdminOpen={() => setShowAdmin(true)}
            t={t}
          />
        ) : room.phase === GamePhase.LOBBY ? (
          <LobbyScreen 
            room={room} 
            updateRoom={updateRoom} 
            currentPlayerId={currentPlayerId!} 
            onLeave={() => setRoom(null)}
            t={t} 
          />
        ) : (
          <GameScreen 
            room={room} 
            updateRoom={updateRoom} 
            currentPlayerId={currentPlayerId!} 
            t={t} 
          />
        )}
      </main>

      {showGuide && <GuideModal onClose={() => setShowGuide(false)} t={t} />}

      <footer className="mt-auto py-8 opacity-30 text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
        Min Imposter • Premium Social Gaming
      </footer>
    </div>
  );
};

export default App;
