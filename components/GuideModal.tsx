
import React from 'react';
import { TranslationSet } from '../types';

interface Props {
  onClose: () => void;
  t: TranslationSet;
}

const GuideModal: React.FC<Props> = ({ onClose, t }) => {
  const isRTL = t.title === 'مين امبوستر؟';
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white/95 backdrop-blur-xl w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl border border-white animate-in zoom-in duration-300">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-slate-800">{t.howToPlay}</h2>
          <span className="text-3xl">💡</span>
        </div>
        
        <div className="space-y-6">
          <div className="flex gap-4 items-start">
            <div className="bg-amber-100 w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-amber-600">1</div>
            <div>
              <p className="text-slate-800 font-bold text-sm mb-1">{isRTL ? 'توزيع الأدوار' : 'Roles Distribution'}</p>
              <p className="text-slate-500 text-xs leading-relaxed">{t.rule1}</p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="bg-emerald-100 w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-emerald-600">2</div>
            <div>
              <p className="text-slate-800 font-bold text-sm mb-1">{isRTL ? 'طرق اللعب' : 'Game Modes'}</p>
              <p className="text-slate-500 text-xs leading-relaxed">{t.rule2}</p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-blue-600">3</div>
            <div>
              <p className="text-slate-800 font-bold text-sm mb-1">{isRTL ? 'النقاش والوقت' : 'Discussion & Time'}</p>
              <p className="text-slate-500 text-xs leading-relaxed">{isRTL ? 'يبدأ وقت النقاش الموحد للجميع، يجب عليك وصف كلمتك بحذر. عند انتهاء الوقت، يبدأ التصويت فوراً!' : 'A global timer starts for everyone. Describe your word carefully. Once time is up, voting begins immediately!'}</p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="bg-red-100 w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-red-600">4</div>
            <div>
              <p className="text-slate-800 font-bold text-sm mb-1">{isRTL ? 'التصويت والفوز' : 'Voting & Winning'}</p>
              <p className="text-slate-500 text-xs leading-relaxed">{t.rule3}</p>
            </div>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full mt-8 bg-slate-800 text-white font-bold py-4 rounded-2xl hover:bg-slate-900 transition-all shadow-md active:scale-95"
        >
          {t.close}
        </button>
      </div>
    </div>
  );
};

export default GuideModal;
