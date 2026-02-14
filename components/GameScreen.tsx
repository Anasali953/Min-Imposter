
import React, { useState, useEffect } from 'react';
import { Room, GamePhase, TranslationSet, Player } from '../types';

interface Props {
  room: Room;
  updateRoom: (room: Room) => void;
  currentPlayerId: string;
  t: TranslationSet;
}

const GameScreen: React.FC<Props> = ({ room, updateRoom, currentPlayerId, t }) => {
  const [showRole, setShowRole] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(room.roundDuration);
  const [judgeSecret, setJudgeSecret] = useState('');
  const [judgeCategory, setJudgeCategory] = useState('');
  
  const player = room.players.find(p => p.id === currentPlayerId);
  const isRTL = t.title === 'مين امبوستر؟';

  useEffect(() => {
    let timer: any;
    if (room.phase === GamePhase.DISCUSSION && room.timeMode === 'TIMED' && room.timerEndsAt) {
      const updateTimer = () => {
        const remaining = Math.max(0, Math.ceil((room.timerEndsAt! - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining <= 0) {
          clearInterval(timer);
          if (player?.isHost) nextPhase();
        }
      };
      updateTimer();
      timer = setInterval(updateTimer, 1000);
    } else {
      setTimeLeft(room.roundDuration);
    }
    return () => clearInterval(timer);
  }, [room.phase, room.timerEndsAt]);

  if (!player) return null;

  const handleJudgeSubmit = () => {
    if (!judgeSecret || !judgeCategory) return;
    
    const playersWithoutJudge = room.players.filter(p => !p.isJudge);
    const shuffled = [...playersWithoutJudge].sort(() => Math.random() - 0.5);
    
    const updatedPlayers = room.players.map(p => {
      if (p.isJudge) return { ...p, word: '⚖️', hasVoted: true };
      const impIndex = shuffled.findIndex(sp => sp.id === p.id);
      const isImposter = impIndex > -1 && impIndex < room.impostersCount;
      return { 
        ...p, 
        isImposter, 
        word: isImposter ? undefined : judgeSecret, 
        hasVoted: false, 
        voteId: undefined 
      };
    });

    updateRoom({
      ...room,
      players: updatedPlayers,
      secretWord: judgeSecret,
      currentCategoryName: judgeCategory
    });
  };

  const handleVote = (votedId: string) => {
    if (player.hasVoted) return;
    const updatedPlayers = room.players.map(p => 
      p.id === currentPlayerId ? { ...p, hasVoted: true, voteId: votedId } : p
    );
    
    const allVoted = updatedPlayers.every(p => p.hasVoted);
    let nextPhaseVal = room.phase;
    let winner = room.winner;

    if (allVoted) {
      const voteCounts: Record<string, number> = {};
      updatedPlayers.forEach(p => {
        if (p.voteId) voteCounts[p.voteId] = (voteCounts[p.voteId] || 0) + 1;
      });

      const maxVotes = Math.max(...Object.values(voteCounts));
      const votedOutIds = Object.keys(voteCounts).filter(id => voteCounts[id] === maxVotes);
      const caughtImposters = updatedPlayers.filter(p => votedOutIds.includes(p.id) && p.isImposter);
      const totalImposters = updatedPlayers.filter(p => p.isImposter).length;

      winner = caughtImposters.length === totalImposters ? 'PLAYERS' : 'IMPOSTERS';
      nextPhaseVal = GamePhase.RESULTS;

      updatedPlayers.forEach(p => {
        if (winner === 'PLAYERS' && !p.isImposter && !p.isJudge) p.score += 2;
        if (winner === 'IMPOSTERS' && p.isImposter) p.score += 2;
        if (winner === 'IMPOSTERS' && !p.isImposter && !p.isJudge) p.score += 1;
      });
    }

    updateRoom({ ...room, players: updatedPlayers, phase: nextPhaseVal, winner });
  };

  const nextPhase = () => {
    if (room.phase === GamePhase.ROLE_REVEAL) {
      const timerEndsAt = Date.now() + (room.roundDuration * 1000);
      updateRoom({ ...room, phase: GamePhase.DISCUSSION, timerEndsAt });
    }
    else if (room.phase === GamePhase.DISCUSSION) {
      updateRoom({ ...room, phase: GamePhase.VOTING, timerEndsAt: undefined });
    }
    else if (room.phase === GamePhase.RESULTS) {
      updateRoom({ ...room, phase: GamePhase.LOBBY, winner: undefined });
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const isWaitingForJudge = room.wordSource === 'JUDGE' && !room.secretWord;

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="bg-white/70 backdrop-blur shadow-sm rounded-3xl p-4 text-slate-800 text-center flex justify-between items-center border border-white">
        <div className="flex-1 text-right font-bold text-slate-600 truncate max-w-[100px]">{player.name}</div>
        <div className="bg-slate-100 px-4 py-1.5 rounded-full text-slate-700 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
          {room.phase === GamePhase.ROLE_REVEAL && '🤫'}
          {room.phase === GamePhase.DISCUSSION && '🗣️'}
          {room.phase === GamePhase.VOTING && '🗳️'}
          {room.phase === GamePhase.RESULTS && '🏁'}
          <span>{t[room.phase.toLowerCase() as keyof TranslationSet] || room.phase}</span>
        </div>
        <div className="flex-1 text-left font-bold text-slate-500">⭐ {player.score}</div>
      </div>

      <div className="bg-white/80 backdrop-blur border border-white text-slate-800 rounded-[2.5rem] p-6 shadow-sm min-h-[420px] flex flex-col items-center justify-center gap-6 relative overflow-hidden">
        
        {room.phase === GamePhase.ROLE_REVEAL && (
          <div className="text-center space-y-8 w-full animate-in zoom-in duration-500">
            {isWaitingForJudge ? (
              player.isJudge ? (
                <div className="space-y-6 w-full max-w-xs mx-auto animate-in slide-in-from-bottom-4">
                  <h2 className="text-xl font-black text-slate-800">⚖️ {isRTL ? 'إعداد الجولة' : 'Set Up Round'}</h2>
                  <div className="space-y-3">
                    <input 
                      type="text" 
                      placeholder={t.categoryInput}
                      className="w-full bg-amber-50 border-2 border-amber-100 rounded-2xl px-5 py-4 text-slate-900 font-bold outline-none focus:border-amber-400"
                      value={judgeCategory}
                      onChange={e => setJudgeCategory(e.target.value)}
                    />
                    <input 
                      type="text" 
                      placeholder={isRTL ? "الكلمة السرية (للمواطنين فقط)" : "Secret Word"}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-slate-900 font-bold outline-none focus:border-emerald-400"
                      value={judgeSecret}
                      onChange={e => setJudgeSecret(e.target.value)}
                    />
                    <p className="text-[10px] text-slate-400 font-bold">{isRTL ? 'سيتم تنبيه الامبوستر تلقائياً بأنه لا يعرف الكلمة' : 'Imposter will be automatically alerted'}</p>
                    <button 
                      onClick={handleJudgeSubmit}
                      disabled={!judgeSecret || !judgeCategory}
                      className="w-full bg-slate-800 text-white font-black py-4 rounded-2xl mt-4 shadow-lg active:scale-95 disabled:opacity-30"
                    >
                      {isRTL ? 'توزيع الكلمات 🚀' : 'Distribute Words 🚀'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-6xl animate-bounce">⏳</div>
                  <p className="text-slate-500 font-bold">{isRTL ? 'بانتظار الحكم لإدخال الكلمات...' : 'Waiting for judge to set words...'}</p>
                </div>
              )
            ) : (
              <>
                <h2 className="text-xl font-bold text-slate-400 uppercase tracking-widest">🤫 {t.yourWord}</h2>
                {!showRole ? (
                  <button onClick={() => setShowRole(true)} className="bg-slate-700 text-white w-32 h-32 rounded-full font-black text-lg shadow-lg hover:bg-slate-800 active:scale-90 border-[10px] border-slate-100 flex items-center justify-center animate-pulse">TOUCH</button>
                ) : (
                  <div className="space-y-4 animate-in fade-in scale-in duration-300">
                    <div className="mb-4">
                       <span className="text-[10px] bg-slate-100 text-slate-500 px-3 py-1 rounded-full font-black uppercase tracking-tighter">
                         {t.category}: {room.currentCategoryName}
                       </span>
                    </div>

                    <div className={`p-8 rounded-[2.5rem] border-2 shadow-inner transition-colors duration-500 ${player.isImposter ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100'}`}>
                      {player.isImposter && (
                        <div className="mb-4 animate-bounce">
                          <p className="text-red-600 font-black text-xl">{t.imposterAlert}</p>
                        </div>
                      )}
                      
                      <p className={`text-5xl font-black mb-3 ${player.isImposter ? 'text-red-700' : 'text-slate-800'}`}>
                        {player.isImposter ? (isRTL ? '؟؟؟' : '???') : (player.word || (isRTL ? '???' : '???'))}
                      </p>
                      
                      <span className={`px-4 py-1 rounded-full font-bold uppercase tracking-widest text-xs ${player.isImposter ? 'bg-red-100 text-red-600' : (player.isJudge ? 'bg-amber-50 text-amber-500' : 'bg-green-50 text-green-500')}`}>
                        {player.isImposter ? '🎭 ' + t.imposter : (player.isJudge ? '⚖️ ' + t.judge : '🕵️‍♂️ ' + t.detective)}
                      </span>
                    </div>

                    {player.isHost && (
                      <button onClick={nextPhase} className="bg-slate-700 text-white font-bold px-10 py-4 rounded-2xl hover:bg-slate-800 shadow-md transition-all active:scale-95">
                        {t.start} {t.discussion} 🗣️
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {room.phase === GamePhase.DISCUSSION && (
          <div className="text-center space-y-6 w-full animate-in slide-in-from-right duration-500 px-4">
            <div className={`text-4xl font-mono font-black mb-2 ${timeLeft < 20 ? 'text-red-400 animate-pulse' : 'text-slate-300'}`}>{formatTime(timeLeft)}</div>
            <div className="bg-slate-50 px-4 py-1 rounded-full inline-block border border-slate-100 mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{t.category}: {room.currentCategoryName}</span>
            </div>
            <div className="text-6xl animate-bounce">🗣️</div>
            <h2 className="text-2xl font-black text-slate-800">{t.discussion}</h2>
            <p className="text-slate-500 leading-relaxed font-medium text-sm">
              {player.isJudge ? (isRTL ? 'أنت الحكم، راقب المناقشة ولا تتدخل!' : 'You are the judge, watch the discussion!') : (isRTL ? 'صف كلمتك بهدوء، ولا تدع الامبوستر يعرفها!' : 'Describe your word clue by clue!')}
            </p>
            {player.isHost && (
              <button onClick={nextPhase} className="w-full bg-slate-700 text-white font-bold py-4 rounded-2xl text-xl shadow-md mt-8 hover:bg-slate-800 flex items-center justify-center gap-2">
                <span>{t.voteNow}</span><span>🗳️</span>
              </button>
            )}
          </div>
        )}

        {room.phase === GamePhase.VOTING && (
          <div className="w-full space-y-4 animate-in fade-in duration-500">
            <h2 className="text-center text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">🗳️ {t.voteNow}</h2>
            <div className="grid grid-cols-2 gap-3">
              {room.players.map(p => (
                <button 
                  key={p.id}
                  disabled={player.hasVoted || p.id === currentPlayerId || p.isJudge}
                  onClick={() => handleVote(p.id)}
                  className={`p-4 rounded-2xl font-bold flex flex-col items-center gap-2 border transition-all ${
                    player.voteId === p.id ? 'bg-slate-700 text-white border-slate-600 shadow-md' : 'bg-slate-50/50 text-slate-600 border-slate-100'
                  } ${p.id === currentPlayerId || p.isJudge ? 'opacity-30 grayscale cursor-not-allowed' : ''}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm ${player.voteId === p.id ? 'bg-slate-600' : 'bg-slate-200'}`}>
                    {p.isJudge ? '⚖️' : p.name.charAt(0)}
                  </div>
                  <span className="text-sm truncate w-full">{p.name}</span>
                  {p.hasVoted && <span className="text-[9px] text-slate-400 font-bold">✅ {isRTL ? 'صوّت' : 'VOTED'}</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {room.phase === GamePhase.RESULTS && (
          <div className="text-center space-y-6 w-full animate-in zoom-in duration-500">
             <div className="text-6xl drop-shadow-lg">{room.winner === 'PLAYERS' ? '🏆' : '👺'}</div>
             <h2 className="text-3xl font-black text-slate-800 tracking-tight">
               {room.winner === 'PLAYERS' ? (isRTL ? 'المواطنون فازوا!' : 'Citizens Won!') : (isRTL ? 'الالامبوستر فاز!' : 'Imposter Won!')}
             </h2>
             <div className="flex justify-center gap-6 mt-4">
                <div className="text-center">
                  <span className="block text-[10px] text-slate-400 uppercase">{isRTL ? 'الكلمة السرية' : 'Secret Word'}</span>
                  <span className="font-bold text-slate-700 text-lg">{room.secretWord}</span>
                </div>
             </div>
             <div className="border-t border-slate-100 pt-4 space-y-2 w-full text-right">
                {room.players.sort((a,b) => b.score - a.score).map(p => (
                  <div key={p.id} className="flex justify-between items-center py-2 border-b border-slate-50">
                    <span className={`font-bold text-sm ${p.isImposter ? 'text-slate-400' : (p.isJudge ? 'text-amber-500' : 'text-slate-700')} flex items-center gap-2`}>
                      {p.name} {p.isImposter && '🎭'} {p.isJudge && '⚖️'}
                    </span>
                    <span className="font-black text-slate-500 text-sm">⭐ {p.score}</span>
                  </div>
                ))}
             </div>
             {player.isHost && (
                <button onClick={nextPhase} className="w-full bg-slate-800 text-white font-bold py-4 rounded-2xl text-xl shadow-md mt-4 hover:bg-slate-900 flex items-center justify-center gap-2">
                  <span>{t.backToLobby}</span><span>🏠</span>
                </button>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GameScreen;
