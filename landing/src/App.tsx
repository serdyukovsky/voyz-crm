import { useState, useEffect } from 'react';
import { Database, BarChart3, Zap, Users, CheckCircle2, Shield, Workflow, TrendingUp, ArrowRight, Layers, Bell, Search, Link2, History, LineChart, Calendar, Check, X, MousePointerClick, PenLine, MessageSquare, Send, MoreHorizontal, ChevronDown, Plus } from 'lucide-react';
import Grainient from './Grainient';

// --- Kanban Demo Data ---
interface MockDeal {
  id: string;
  name: string;
  responsible: string;
  responsibleInitials: string;
  link: string;
  directions: string[];
  updatedAt: string;
  contactMethod?: string;
  contactInfo?: string;
}

interface MockColumn {
  id: string;
  name: string;
  color: string;
  deals: MockDeal[];
}

const INITIAL_COLUMNS: MockColumn[] = [
  {
    id: 'new', name: 'Новая', color: '#3b82f6',
    deals: [
      { id: 'd1', name: 'Мария Петрова', responsible: 'Екатерина Костенко', responsibleInitials: 'ЕК', link: 'instagram.com/maria_guide_rome', directions: ['Рим', 'Флоренция'], updatedAt: '2 часа' },
      { id: 'd2', name: 'Laura Bianchi', responsible: 'Екатерина Костенко', responsibleInitials: 'ЕК', link: 'instagram.com/laura.bcn.tours', directions: ['Барселона'], updatedAt: '5 часов' },
      { id: 'd3', name: 'Дмитрий Орлов', responsible: 'Константин Сердюк', responsibleInitials: 'КС', link: 'instagram.com/istanbul_dmitry', directions: ['Стамбул'], updatedAt: '1 день' },
    ],
  },
  {
    id: 'contacted', name: 'Написали', color: '#eab308',
    deals: [
      { id: 'd4', name: 'Георгий Чхеидзе', responsible: 'Константин Сердюк', responsibleInitials: 'КС', link: 'instagram.com/geo_tbilisi_walks', directions: ['Тбилиси'], updatedAt: '3 часа' },
      { id: 'd5', name: 'Алексей Ким', responsible: 'Екатерина Костенко', responsibleInitials: 'ЕК', link: 'instagram.com/bali_with_alex', directions: ['Бали', 'Убуд'], updatedAt: '1 день' },
    ],
  },
  {
    id: 'presentation', name: 'Отправили презу', color: '#f97316',
    deals: [
      { id: 'd6', name: 'Sophie Martin', responsible: 'Екатерина Костенко', responsibleInitials: 'ЕК', link: 'instagram.com/sophie_paris_guide', directions: ['Париж'], updatedAt: '4 часа' },
    ],
  },
  {
    id: 'call', name: 'Готовы на созвон', color: '#a855f7',
    deals: [
      { id: 'd7', name: 'Анна Сидорова', responsible: 'Константин Сердюк', responsibleInitials: 'КС', link: 'instagram.com/prague_anna', directions: ['Прага', 'Вена'], updatedAt: '6 часов' },
    ],
  },
  {
    id: 'materials', name: 'Ждем материалы', color: '#22c55e',
    deals: [
      { id: 'd8', name: 'Kenji Tanaka', responsible: 'Екатерина Костенко', responsibleInitials: 'ЕК', link: 'instagram.com/kenji_tokyo_tours', directions: ['Токио'], updatedAt: '2 дня' },
    ],
  },
];

const MOVES = [
  { dealId: 'd2', from: 'new', to: 'contacted' },
  { dealId: 'd5', from: 'contacted', to: 'presentation' },
  { dealId: 'd6', from: 'presentation', to: 'call' },
  { dealId: 'd7', from: 'call', to: 'materials' },
  { dealId: 'd3', from: 'new', to: 'contacted' },
];

const DIRECTION_COLORS: Record<string, string> = {
  'Рим': 'bg-blue-500/15 text-blue-300/80',
  'Флоренция': 'bg-blue-500/15 text-blue-300/80',
  'Барселона': 'bg-amber-500/15 text-amber-300/80',
  'Стамбул': 'bg-orange-500/15 text-orange-300/80',
  'Тбилиси': 'bg-emerald-500/15 text-emerald-300/80',
  'Бали': 'bg-teal-500/15 text-teal-300/80',
  'Убуд': 'bg-teal-500/15 text-teal-300/80',
  'Париж': 'bg-rose-500/15 text-rose-300/80',
  'Прага': 'bg-violet-500/15 text-violet-300/80',
  'Вена': 'bg-violet-500/15 text-violet-300/80',
  'Токио': 'bg-sky-500/15 text-sky-300/80',
};

function deepCopyColumns(cols: MockColumn[]) {
  return cols.map(c => ({ ...c, deals: c.deals.map(d => ({ ...d, directions: [...d.directions] })) }));
}

function KanbanDemo() {
  const [columns, setColumns] = useState(() => deepCopyColumns(INITIAL_COLUMNS));
  const [movingDealId, setMovingDealId] = useState<string | null>(null);
  const [phase, setPhase] = useState<'idle' | 'fadeOut' | 'fadeIn'>('idle');
  const [moveIndex, setMoveIndex] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      const move = MOVES[moveIndex];
      setMovingDealId(move.dealId);
      setPhase('fadeOut');

      setTimeout(() => {
        setColumns(prev => {
          const next = prev.map(col => ({ ...col, deals: [...col.deals] }));
          const src = next.find(c => c.id === move.from);
          const dst = next.find(c => c.id === move.to);
          if (src && dst) {
            const idx = src.deals.findIndex(d => d.id === move.dealId);
            if (idx !== -1) {
              const [deal] = src.deals.splice(idx, 1);
              dst.deals.unshift(deal);
            }
          }
          return next;
        });
        setPhase('fadeIn');

        setTimeout(() => {
          setMovingDealId(null);
          setPhase('idle');
          setMoveIndex(prev => {
            const next = (prev + 1) % MOVES.length;
            if (next === 0) {
              setColumns(deepCopyColumns(INITIAL_COLUMNS));
            }
            return next;
          });
        }, 400);
      }, 400);
    }, 3500);

    return () => clearInterval(intervalId);
  }, [moveIndex]);

  return (
    <div className="w-full flex gap-3 sm:gap-4 overflow-x-auto overflow-y-hidden p-3 sm:p-5 h-[340px] sm:h-[420px]">
      {columns.map(column => (
        <div key={column.id} className="flex-1 min-w-[160px] flex flex-col">
          {/* Column header */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: column.color }} />
            <span className="text-xs sm:text-sm font-semibold text-white/80 truncate">{column.name}</span>
            <span className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded bg-white/10 text-white/50 font-medium">{column.deals.length}</span>
          </div>

          {/* Cards */}
          <div className="space-y-2">
            {column.deals.map(deal => (
              <div
                key={deal.id}
                className={`rounded-lg border border-white/[0.08] bg-white/[0.04] p-3 transition-all duration-[400ms] ease-in-out ${
                  movingDealId === deal.id && phase === 'fadeOut'
                    ? 'opacity-0 scale-95 -translate-y-1'
                    : movingDealId === deal.id && phase === 'fadeIn'
                    ? 'opacity-100 scale-100 shadow-[0_0_20px_rgba(168,85,247,0.3)] border-purple-500/40'
                    : 'opacity-100 scale-100'
                }`}
              >
                {/* Deal name */}
                <div className="text-xs sm:text-sm font-medium text-white/90 mb-2 line-clamp-2">{deal.name}</div>

                {/* Responsible */}
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
                    <span className="text-[7px] sm:text-[8px] font-semibold text-white/70">{deal.responsibleInitials}</span>
                  </div>
                  <span className="text-[10px] sm:text-xs text-white/60">{deal.responsible}</span>
                </div>

                {/* Link */}
                <div className="flex items-center gap-1.5 mb-2">
                  <Link2 className="w-3 h-3 text-white/30 flex-shrink-0" />
                  <span className="text-[10px] sm:text-xs text-white/40 truncate">{deal.link}</span>
                </div>

                {/* Directions */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {deal.directions.map((dir, i) => (
                    <span key={i} className={`text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded ${DIRECTION_COLORS[dir] || 'bg-white/[0.08] text-white/50'}`}>
                      {dir}
                    </span>
                  ))}
                </div>

                {/* Updated date */}
                <div className="text-[9px] sm:text-[10px] text-white/30">{deal.updatedAt} назад</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Tasks Demo ---
interface DemoTask {
  id: string;
  title: string;
  dealName: string;
  dueDate: string;
  responsible: string;
  responsibleInitials: string;
}

interface TaskCol {
  id: string;
  name: string;
  color: string;
  tasks: DemoTask[];
}

const INIT_TASK_COLS: TaskCol[] = [
  {
    id: 'overdue', name: 'Просрочено', color: '#ef4444',
    tasks: [
      { id: 't1', title: 'Написать в инстаграм', dealName: 'Мария Петрова', dueDate: '10 фев', responsible: 'Екатерина Костенко', responsibleInitials: 'ЕК' },
    ],
  },
  {
    id: 'today', name: 'Сегодня', color: '#f59e0b',
    tasks: [
      { id: 't2', title: 'Отправить презентацию', dealName: 'Laura Bianchi', dueDate: '12 фев', responsible: 'Екатерина Костенко', responsibleInitials: 'ЕК' },
      { id: 't3', title: 'Назначить созвон', dealName: 'Sophie Martin', dueDate: '12 фев', responsible: 'Константин Сердюк', responsibleInitials: 'КС' },
    ],
  },
  {
    id: 'done', name: 'Выполнено', color: '#10b981',
    tasks: [
      { id: 't4', title: 'Первый контакт в директ', dealName: 'Алексей Ким', dueDate: '11 фев', responsible: 'Константин Сердюк', responsibleInitials: 'КС' },
    ],
  },
];

const TASK_SEQUENCE = [
  { taskId: 't2', from: 'today', result: 'Презентация отправлена на email' },
  { taskId: 't1', from: 'overdue', result: 'Написали в директ, ждём ответ' },
];

type TaskPhase = 'idle' | 'highlight' | 'modal' | 'typing' | 'complete' | 'closing' | 'fadeOut' | 'fadeIn' | 'done';

function cloneTaskCols(cols: TaskCol[]) {
  return cols.map(c => ({ ...c, tasks: c.tasks.map(t => ({ ...t })) }));
}

function findTask(cols: TaskCol[], id: string): DemoTask | undefined {
  for (const col of cols) {
    const t = col.tasks.find(t => t.id === id);
    if (t) return t;
  }
}

function TasksDemo() {
  const [columns, setColumns] = useState(() => cloneTaskCols(INIT_TASK_COLS));
  const [seqIdx, setSeqIdx] = useState(0);
  const [phase, setPhase] = useState<TaskPhase>('idle');
  const [typedText, setTypedText] = useState('');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const step = TASK_SEQUENCE[seqIdx];
  const activeTask = activeTaskId ? findTask(columns, activeTaskId) : null;
  const showModal = activeTask && ['modal', 'typing', 'complete'].includes(phase);

  // Phase state machine
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    switch (phase) {
      case 'idle':
        t = setTimeout(() => {
          setActiveTaskId(step.taskId);
          setPhase('highlight');
        }, 3500);
        break;
      case 'highlight':
        t = setTimeout(() => {
          setPhase('modal');
        }, 1200);
        break;
      case 'modal':
        t = setTimeout(() => {
          setPhase('typing');
        }, 1200);
        break;
      case 'typing':
        break;
      case 'complete':
        t = setTimeout(() => {
          setPhase('closing');
        }, 1800);
        break;
      case 'closing':
        t = setTimeout(() => {
          setPhase('fadeOut');
        }, 400);
        break;
      case 'fadeOut':
        t = setTimeout(() => {
          setColumns(prev => {
            const next = prev.map(col => ({ ...col, tasks: [...col.tasks] }));
            const src = next.find(c => c.id === step.from);
            const dst = next.find(c => c.id === 'done');
            if (src && dst) {
              const idx = src.tasks.findIndex(tt => tt.id === step.taskId);
              if (idx !== -1) {
                const [task] = src.tasks.splice(idx, 1);
                dst.tasks.unshift(task);
              }
            }
            return next;
          });
          setPhase('fadeIn');
        }, 400);
        break;
      case 'fadeIn':
        t = setTimeout(() => {
          setPhase('done');
        }, 500);
        break;
      case 'done':
        t = setTimeout(() => {
          setActiveTaskId(null);
          setTypedText('');
          const nextIdx = (seqIdx + 1) % TASK_SEQUENCE.length;
          if (nextIdx === 0) {
            setColumns(cloneTaskCols(INIT_TASK_COLS));
          }
          setSeqIdx(nextIdx);
          setPhase('idle');
        }, 2500);
        break;
    }
    return () => clearTimeout(t);
  }, [phase, seqIdx]);

  // Typing effect
  useEffect(() => {
    if (phase !== 'typing') return;
    const target = step.result;
    if (typedText.length < target.length) {
      const t = setTimeout(() => {
        setTypedText(target.slice(0, typedText.length + 1));
      }, 70);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => {
        setPhase('complete');
      }, 400);
      return () => clearTimeout(t);
    }
  }, [phase, typedText, seqIdx]);

  // Active step for sidebar
  const activeStep = (() => {
    if (phase === 'highlight') return 0;
    if (['modal', 'typing'].includes(phase)) return 1;
    if (['complete', 'closing', 'fadeOut', 'fadeIn', 'done'].includes(phase)) return 2;
    return -1;
  })();

  const steps = [
    { title: 'Выберите задачу', desc: 'Просроченные задачи выделяются автоматически — система не даст забыть ни об одном дедлайне', icon: MousePointerClick },
    { title: 'Напишите результат', desc: 'Каждая задача привязана к сделке — вы видите контекст и сразу фиксируете результат выполнения', icon: PenLine },
    { title: 'Задача выполнена', desc: 'Один клик — задача перемещается в выполненные. Вся история действий сохраняется автоматически', icon: CheckCircle2 },
  ];

  return (
    <div className="w-full flex flex-col lg:flex-row">
      {/* Sidebar — cards (LEFT, always visible) */}
      <div className="flex lg:flex-1 min-w-0 p-6 lg:p-8 flex-col justify-center gap-3">
        {steps.map((s, i) => {
          const isActive = activeStep === i;
          const isPast = activeStep > i;
          const Icon = s.icon;
          return (
            <div
              key={i}
              className={`rounded-xl p-5 border transition-all duration-700 ease-out ${
                isActive
                  ? 'bg-white/[0.06] border-white/[0.12] -translate-x-2 scale-[1.02]'
                  : isPast
                  ? 'bg-white/[0.03] border-white/[0.06] translate-x-0 scale-100'
                  : 'bg-transparent border-white/[0.03] translate-x-0 scale-100 opacity-40'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-700 ${
                  isActive ? 'bg-white/[0.1]' : 'bg-white/[0.03]'
                }`}>
                  {isPast ? (
                    <Check className="w-5 h-5 text-white/50" strokeWidth={2.5} />
                  ) : (
                    <Icon className={`w-5 h-5 transition-all duration-700 ${isActive ? 'text-white/80' : 'text-white/30'}`} />
                  )}
                </div>
                <div className="min-w-0">
                  <div className={`text-base font-semibold mb-1 transition-all duration-700 ${
                    isActive ? 'text-white' : isPast ? 'text-white/70' : 'text-white/50'
                  }`}>
                    {s.title}
                  </div>
                  <p className={`text-sm leading-relaxed transition-all duration-700 ${
                    isActive ? 'text-white/50' : isPast ? 'text-white/35' : 'text-white/30'
                  }`}>
                    {s.desc}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Demo area (RIGHT, hidden on mobile) */}
      <div className="hidden lg:block w-full lg:w-[720px] flex-shrink-0 relative h-[320px] sm:h-[420px]">
        {/* Kanban columns behind */}
        <div className={`flex gap-3 sm:gap-4 overflow-x-auto overflow-y-hidden py-3 sm:py-5 pl-3 sm:pl-5 pr-2 transition-all duration-300 h-[320px] sm:h-[420px] ${showModal ? 'blur-[2px] opacity-50' : ''}`}>
          {columns.map(column => (
            <div key={column.id} className="w-[200px] sm:w-[220px] flex-shrink-0 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: column.color }} />
                <span className="text-xs sm:text-sm font-semibold text-white/80 truncate">{column.name}</span>
                <span className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded bg-white/10 text-white/50 font-medium">{column.tasks.length}</span>
              </div>
              <div className="space-y-2">
                {column.tasks.map(task => (
                  <div
                    key={task.id}
                    className={`rounded-lg border border-white/[0.08] bg-white/[0.04] p-3 transition-all duration-[400ms] ease-in-out ${
                      activeTaskId === task.id && phase === 'highlight'
                        ? 'scale-[1.03] border-amber-500/50 bg-white/[0.07] shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                        : activeTaskId === task.id && phase === 'fadeOut'
                        ? 'opacity-0 scale-95 -translate-y-2'
                        : activeTaskId === task.id && (phase === 'fadeIn' || phase === 'done')
                        ? 'shadow-[0_0_20px_rgba(16,185,129,0.3)] border-emerald-500/40'
                        : ''
                    }`}
                  >
                    <div className="text-xs sm:text-sm font-medium text-white/90 mb-2">{task.title}</div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Link2 className="w-3 h-3 text-white/30 flex-shrink-0" />
                      <span className="text-[10px] sm:text-xs text-white/50 truncate">{task.dealName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-white/30" />
                        <span className="text-[10px] sm:text-xs text-white/40">{task.dueDate}</span>
                      </div>
                      <div className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center">
                        <span className="text-[7px] sm:text-[8px] font-semibold text-white/70">{task.responsibleInitials}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Modal overlay */}
        {activeTask && (showModal || phase === 'closing') && (
          <div className={`absolute inset-0 flex items-center justify-center z-20 transition-opacity duration-300 ${phase === 'closing' ? 'opacity-0' : 'opacity-100'}`}>
            <div className={`w-[90%] max-w-md bg-[#1a1a2e]/95 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-5 shadow-[0_0_40px_rgba(0,0,0,0.5)] transition-all duration-300 ${phase === 'closing' ? 'scale-95' : 'scale-100'}`}>
              {/* Modal header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400 flex-shrink-0" />
                  <span className="text-sm sm:text-base font-semibold text-white/90">{activeTask.title}</span>
                </div>
                <div className="w-6 h-6 rounded-md flex items-center justify-center bg-white/[0.06]">
                  <X className="w-3.5 h-3.5 text-white/40" />
                </div>
              </div>

              {/* Deal + date row */}
              <div className="flex items-center justify-between mb-4 text-xs">
                <div className="flex items-center gap-1.5 text-white/50">
                  <Link2 className="w-3.5 h-3.5" />
                  <span className="text-white/70">{activeTask.dealName}</span>
                </div>
                <div className="flex items-center gap-1.5 text-white/50">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="font-medium text-white/70">{activeTask.dueDate}</span>
                </div>
              </div>

              {/* Result section */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs sm:text-sm font-medium text-white/70">Результат</span>
                  <span className="text-[10px] sm:text-xs text-white/40">{activeTask.responsible}</span>
                </div>
                <div className="relative">
                  <div className="rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 py-2.5 min-h-[80px] text-xs sm:text-sm text-white/80 leading-relaxed">
                    {typedText}
                    {phase === 'typing' && (
                      <span className="inline-block w-[2px] h-4 bg-white/60 ml-[1px] animate-[pulse_0.8s_ease-in-out_infinite]" />
                    )}
                    {phase === 'modal' && !typedText && (
                      <span className="text-white/25">Напишите результат выполнения...</span>
                    )}
                  </div>
                  {/* Complete button */}
                  <div className={`absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${
                    phase === 'complete'
                      ? 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)] scale-110'
                      : 'bg-white/10'
                  }`}>
                    <Check className={`w-4 h-4 transition-colors duration-500 ${phase === 'complete' ? 'text-white' : 'text-white/30'}`} strokeWidth={3} />
                  </div>
                </div>
              </div>

              {/* Footer info */}
              <div className="text-[10px] text-white/25">
                12 фев 2025, 10:30
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Kanban Process Demo (for tab) ---
const KANBAN_PROC_COLS: MockColumn[] = [
  {
    id: 'contacted', name: 'Написали', color: '#eab308',
    deals: [
      { id: 'kd1', name: 'Laura Bianchi', responsible: 'Екатерина Костенко', responsibleInitials: 'ЕК', link: 'instagram.com/laura.bcn.tours', directions: ['Барселона'], updatedAt: '5 часов', contactMethod: 'Telegram', contactInfo: '@laura_guide' },
      { id: 'kd2', name: 'Дмитрий Орлов', responsible: 'Константин Сердюк', responsibleInitials: 'КС', link: 'instagram.com/istanbul_dmitry', directions: ['Стамбул'], updatedAt: '1 день', contactMethod: 'WhatsApp', contactInfo: '+7 (905) 123-45-67' },
    ],
  },
  {
    id: 'presentation', name: 'Отправили презу', color: '#f97316',
    deals: [
      { id: 'kd3', name: 'Sophie Martin', responsible: 'Екатерина Костенко', responsibleInitials: 'ЕК', link: 'instagram.com/sophie_paris_guide', directions: ['Париж'], updatedAt: '4 часа', contactMethod: 'Direct', contactInfo: '@sophie_paris' },
    ],
  },
  {
    id: 'call', name: 'Готовы на созвон', color: '#a855f7',
    deals: [
      { id: 'kd4', name: 'Анна Сидорова', responsible: 'Константин Сердюк', responsibleInitials: 'КС', link: 'instagram.com/prague_anna', directions: ['Прага', 'Вена'], updatedAt: '6 часов', contactMethod: 'Telegram', contactInfo: '@anna_prague' },
    ],
  },
];

const KANBAN_PROC_SEQ = [
  { dealId: 'kd1', from: 'contacted', to: 'presentation', comment: 'Согласовали встречу в Zoom на пятницу' },
  { dealId: 'kd3', from: 'presentation', to: 'call', comment: 'Презентация отправлена, ждём обратную связь' },
];

function KanbanProcessDemo() {
  const [columns, setColumns] = useState(() => KANBAN_PROC_COLS.map(c => ({ ...c, deals: c.deals.map(d => ({ ...d, directions: [...d.directions] })) })));
  const [seqIdx, setSeqIdx] = useState(0);
  const [phase, setPhase] = useState<TaskPhase>('idle');
  const [typedText, setTypedText] = useState('');
  const [activeDealId, setActiveDealId] = useState<string | null>(null);

  const step = KANBAN_PROC_SEQ[seqIdx];
  const activeDeal = activeDealId ? (() => { for (const c of columns) { const d = c.deals.find(d => d.id === activeDealId); if (d) return d; } })() : null;
  const showModal = activeDeal && ['modal', 'typing', 'complete'].includes(phase);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    switch (phase) {
      case 'idle':
        t = setTimeout(() => { setActiveDealId(step.dealId); setPhase('highlight'); }, 3500);
        break;
      case 'highlight':
        t = setTimeout(() => setPhase('modal'), 1200);
        break;
      case 'modal':
        t = setTimeout(() => setPhase('typing'), 1200);
        break;
      case 'typing':
        break;
      case 'complete':
        t = setTimeout(() => setPhase('closing'), 1800);
        break;
      case 'closing':
        t = setTimeout(() => setPhase('fadeOut'), 400);
        break;
      case 'fadeOut':
        t = setTimeout(() => {
          setColumns(prev => {
            const next = prev.map(col => ({ ...col, deals: [...col.deals] }));
            const src = next.find(c => c.id === step.from);
            const dst = next.find(c => c.id === step.to);
            if (src && dst) {
              const idx = src.deals.findIndex(d => d.id === step.dealId);
              if (idx !== -1) { const [deal] = src.deals.splice(idx, 1); dst.deals.unshift(deal); }
            }
            return next;
          });
          setPhase('fadeIn');
        }, 400);
        break;
      case 'fadeIn':
        t = setTimeout(() => setPhase('done'), 500);
        break;
      case 'done':
        t = setTimeout(() => {
          setActiveDealId(null);
          setTypedText('');
          const nextIdx = (seqIdx + 1) % KANBAN_PROC_SEQ.length;
          if (nextIdx === 0) setColumns(KANBAN_PROC_COLS.map(c => ({ ...c, deals: c.deals.map(d => ({ ...d, directions: [...d.directions] })) })));
          setSeqIdx(nextIdx);
          setPhase('idle');
        }, 2500);
        break;
    }
    return () => clearTimeout(t);
  }, [phase, seqIdx]);

  useEffect(() => {
    if (phase !== 'typing') return;
    const target = step.comment;
    if (typedText.length < target.length) {
      const t = setTimeout(() => setTypedText(target.slice(0, typedText.length + 1)), 70);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => setPhase('complete'), 400);
      return () => clearTimeout(t);
    }
  }, [phase, typedText, seqIdx]);

  const activeStep = (() => {
    if (phase === 'highlight') return 0;
    if (['modal', 'typing'].includes(phase)) return 1;
    if (['complete', 'closing', 'fadeOut', 'fadeIn', 'done'].includes(phase)) return 2;
    return -1;
  })();

  const steps = [
    { title: 'Откройте сделку', desc: 'Выберите сделку на любом этапе воронки — вся информация о гиде в одной карточке', icon: MousePointerClick },
    { title: 'Добавьте комментарий', desc: 'Зафиксируйте результат общения — комментарии сохраняются в хронологии сделки', icon: MessageSquare },
    { title: 'Сделка продвигается', desc: 'Карточка автоматически перемещается на следующий этап воронки', icon: ArrowRight },
  ];

  return (
    <div className="w-full flex flex-col lg:flex-row">
      {/* Sidebar — left (always visible) */}
      <div className="flex lg:flex-1 min-w-0 p-6 lg:p-8 flex-col justify-center gap-3">
        {steps.map((s, i) => {
          const isActive = activeStep === i;
          const isPast = activeStep > i;
          const Icon = s.icon;
          return (
            <div
              key={i}
              className={`rounded-xl p-5 border transition-all duration-700 ease-out ${
                isActive
                  ? 'bg-white/[0.06] border-white/[0.12] -translate-x-2 scale-[1.02]'
                  : isPast
                  ? 'bg-white/[0.03] border-white/[0.06] translate-x-0 scale-100'
                  : 'bg-transparent border-white/[0.03] translate-x-0 scale-100 opacity-40'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-700 ${
                  isActive ? 'bg-white/[0.1]' : 'bg-white/[0.03]'
                }`}>
                  {isPast ? (
                    <Check className="w-5 h-5 text-white/50" strokeWidth={2.5} />
                  ) : (
                    <Icon className={`w-5 h-5 transition-all duration-700 ${isActive ? 'text-white/80' : 'text-white/30'}`} />
                  )}
                </div>
                <div className="min-w-0">
                  <div className={`text-base font-semibold mb-1 transition-all duration-700 ${
                    isActive ? 'text-white' : isPast ? 'text-white/70' : 'text-white/50'
                  }`}>
                    {s.title}
                  </div>
                  <p className={`text-sm leading-relaxed transition-all duration-700 ${
                    isActive ? 'text-white/50' : isPast ? 'text-white/35' : 'text-white/30'
                  }`}>
                    {s.desc}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Demo — right (hidden on mobile) */}
      <div className="hidden lg:block w-full lg:w-[720px] flex-shrink-0 relative h-[380px] sm:h-[480px]">
        <div className={`flex gap-3 sm:gap-4 overflow-x-auto overflow-y-hidden py-3 sm:py-5 pl-3 sm:pl-5 pr-2 transition-all duration-300 h-[380px] sm:h-[480px] ${showModal ? 'blur-[2px] opacity-50' : ''}`}>
          {columns.map(column => (
            <div key={column.id} className="w-[200px] sm:w-[220px] flex-shrink-0 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: column.color }} />
                <span className="text-xs sm:text-sm font-semibold text-white/80 truncate">{column.name}</span>
                <span className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded bg-white/10 text-white/50 font-medium">{column.deals.length}</span>
              </div>
              <div className="space-y-2">
                {column.deals.map(deal => (
                  <div
                    key={deal.id}
                    className={`rounded-lg border border-white/[0.08] bg-white/[0.04] p-3 transition-all duration-[400ms] ease-in-out ${
                      activeDealId === deal.id && phase === 'highlight'
                        ? 'scale-[1.03] border-amber-500/50 bg-white/[0.07] shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                        : activeDealId === deal.id && phase === 'fadeOut'
                        ? 'opacity-0 scale-95 -translate-y-2'
                        : activeDealId === deal.id && (phase === 'fadeIn' || phase === 'done')
                        ? 'shadow-[0_0_20px_rgba(168,85,247,0.3)] border-purple-500/40'
                        : ''
                    }`}
                  >
                    <div className="text-xs sm:text-sm font-medium text-white/90 mb-2">{deal.name}</div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
                        <span className="text-[7px] sm:text-[8px] font-semibold text-white/70">{deal.responsibleInitials}</span>
                      </div>
                      <span className="text-[10px] sm:text-xs text-white/60">{deal.responsible}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Link2 className="w-3 h-3 text-white/30 flex-shrink-0" />
                      <span className="text-[10px] sm:text-xs text-white/40 truncate">{deal.link}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {deal.directions.map((dir, i) => (
                        <span key={i} className={`text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded ${DIRECTION_COLORS[dir] || 'bg-white/[0.08] text-white/50'}`}>
                          {dir}
                        </span>
                      ))}
                    </div>
                    <div className="text-[9px] sm:text-[10px] text-white/30">{deal.updatedAt} назад</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Deal detail modal — two-column layout like real CRM */}
        {activeDeal && (showModal || phase === 'closing') && (() => {
          const currentCol = columns.find(c => c.id === step.from);
          return (
          <div className={`absolute inset-0 z-20 transition-opacity duration-300 ${phase === 'closing' ? 'opacity-0' : 'opacity-100'}`}>
            <div className={`w-full h-full bg-[#13131f]/98 backdrop-blur-xl border border-white/[0.08] rounded-xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.6)] transition-all duration-300 flex ${phase === 'closing' ? 'scale-[0.97] opacity-0' : 'scale-100'}`}>

              {/* Left column — Deal info fields */}
              <div className="w-[280px] sm:w-[300px] flex-shrink-0 border-r border-white/[0.06] flex flex-col bg-white/[0.01]">
                {/* Header */}
                <div className="px-5 py-4 border-b border-white/[0.06] flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-semibold text-white/90 truncate leading-tight">{activeDeal.name}</h2>
                    <span className="text-[11px] text-white/25 font-mono mt-1 block">CRM-{activeDeal.id === 'kd1' ? '0042' : activeDeal.id === 'kd3' ? '0038' : '0041'}</span>
                  </div>
                  <button className="w-7 h-7 rounded-md flex items-center justify-center bg-white/[0.04] hover:bg-white/[0.08] flex-shrink-0 mt-0.5">
                    <MoreHorizontal className="w-4 h-4 text-white/30" />
                  </button>
                </div>

                {/* Fields */}
                <div className="px-5 py-4 space-y-3.5 overflow-y-auto flex-1">
                  {/* Stage */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-white/35 w-[90px] flex-shrink-0">Этап</span>
                    <div className="flex-1 flex items-center justify-between gap-1.5 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: currentCol?.color }} />
                        <span className="text-sm text-white/70 truncate">{currentCol?.name}</span>
                      </div>
                      <ChevronDown className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />
                    </div>
                  </div>

                  {/* Responsible */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-white/35 w-[90px] flex-shrink-0">Ответственный</span>
                    <div className="flex-1 flex items-center gap-2 min-w-0">
                      <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-[8px] font-semibold text-white/60">{activeDeal.responsibleInitials}</span>
                      </div>
                      <span className="text-sm text-white/60 truncate">{activeDeal.responsible}</span>
                    </div>
                  </div>

                  <div className="border-t border-white/[0.05]" />

                  {/* Link */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-white/35 w-[90px] flex-shrink-0">Ссылка</span>
                    <span className="text-sm text-white/40 truncate flex-1">{activeDeal.link}</span>
                  </div>

                  {/* Subscriber count */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-white/35 w-[90px] flex-shrink-0">Подписчики</span>
                    <span className="text-sm text-white/50 truncate flex-1">12.4k</span>
                  </div>

                  {/* Directions */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-white/35 w-[90px] flex-shrink-0">Направление</span>
                    <span className="text-sm text-white/60 truncate flex-1">{activeDeal.directions.join(', ')}</span>
                  </div>

                  {/* Contact method */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-white/35 w-[90px] flex-shrink-0">Способ связи</span>
                    <span className="text-sm text-white/60 truncate flex-1">{activeDeal.contactMethod || 'Telegram'}</span>
                  </div>

                  {/* Website */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-white/35 w-[90px] flex-shrink-0">Сайт, тг канал</span>
                    <span className="text-sm text-white/40 truncate flex-1">{activeDeal.contactInfo || '@guide'}</span>
                  </div>

                  {/* Contact info */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-white/35 w-[90px] flex-shrink-0">Контакт</span>
                    <span className="text-sm text-white/50 truncate flex-1">{activeDeal.contactInfo || '@guide'}</span>
                  </div>

                  <div className="border-t border-white/[0.05]" />

                  {/* Tasks */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-white/50">Задачи</span>
                      <button className="flex items-center gap-0.5 text-xs text-white/30 hover:text-white/50">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="text-xs text-white/20 pl-0.5">Нет задач</div>
                  </div>
                </div>
              </div>

              {/* Right column — Activity + Comments */}
              <div className="flex-1 flex flex-col min-w-0">
                {/* Activity timeline */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                  <h3 className="text-xs font-semibold text-white/40 mb-4">Активность</h3>
                  <div className="space-y-4">
                    {/* Mock activity item 1 */}
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[9px] font-semibold text-white/40">ЕК</span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs text-white/50 leading-relaxed">
                          <span className="text-white/70 font-medium">Екатерина Костенко</span>{' '}
                          сменила этап с <span className="text-white/60">«Новая»</span> на <span className="text-white/60">«{currentCol?.name}»</span>
                        </div>
                        <div className="text-[11px] text-white/20 mt-1">2 часа назад</div>
                      </div>
                    </div>

                    {/* Mock activity item 2 */}
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[9px] font-semibold text-white/40">ЕК</span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs text-white/50 leading-relaxed">
                          <span className="text-white/70 font-medium">Екатерина Костенко</span>{' '}
                          добавила ссылку: <span className="text-white/40">{activeDeal.link}</span>
                        </div>
                        <div className="text-[11px] text-white/20 mt-1">5 часов назад</div>
                      </div>
                    </div>

                    {/* Mock activity item 3 */}
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[9px] font-semibold text-white/40">КС</span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs text-white/50 leading-relaxed">
                          <span className="text-white/70 font-medium">Константин Сердюк</span>{' '}
                          создал сделку
                        </div>
                        <div className="text-[11px] text-white/20 mt-1">1 день назад</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Comment panel at bottom — matches real CRM DealCommentsPanel */}
                <div className="border-t border-white/[0.06] px-5 py-4 flex-shrink-0">
                  <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] relative overflow-hidden" style={{ borderBottomRightRadius: '24px' }}>
                    <div className="flex items-start">
                      <span className="pl-3 pt-3 text-sm text-purple-400/70 underline underline-offset-2 whitespace-nowrap cursor-default">Комментарий</span>
                      <span className="text-sm text-white/25 pt-3">:</span>
                      <div className="flex-1 px-2 pt-3 pb-12 text-sm text-white/80 leading-relaxed min-h-[76px]">
                        {typedText}
                        {phase === 'typing' && (
                          <span className="inline-block w-[2px] h-4 bg-white/60 ml-[1px] animate-[pulse_0.8s_ease-in-out_infinite] align-text-bottom" />
                        )}
                        {phase === 'modal' && !typedText && (
                          <span className="text-white/20">введите текст</span>
                        )}
                      </div>
                    </div>
                    <div className={`absolute bottom-2.5 right-2.5 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-500 ${
                      phase === 'complete' ? 'bg-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.5)] scale-110' : 'bg-white/[0.06]'
                    }`}>
                      <Send className={`w-4 h-4 transition-colors duration-500 ${phase === 'complete' ? 'text-white' : 'text-white/25'}`} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          );
        })()}
      </div>
    </div>
  );
}

export default function TripSystemLanding() {
  const [activeTab, setActiveTab] = useState('tasks');

  const features = [
    {
      id: 'tasks',
      title: 'Управление задачами',
      shortTitle: 'Задачи',
      description: 'Создание и отслеживание задач по работе с гидами',
      icon: CheckCircle2
    },
    {
      id: 'kanban',
      title: 'Kanban воронка',
      shortTitle: 'Kanban',
      description: 'Визуальное управление процессом привлечения гидов',
      icon: Workflow
    },
    {
      id: 'dashboard',
      title: 'Дашборд',
      shortTitle: 'Дашборд',
      description: 'Аналитика и ключевые метрики в реальном времени',
      icon: BarChart3
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Animated Background Grid */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/50 to-black"></div>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-transparent">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-xl font-semibold tracking-tight">TripSystem</div>
          <a href="/app/" className="px-6 py-2 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors">
            Войти в систему
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-8 sm:pb-24 px-4 sm:px-6 relative overflow-hidden">
        {/* Grainient Background */}
        <div className="absolute inset-0 z-0">
          <Grainient
            color1="#212121"
            color2="#b8b2d2"
            color3="#B19EEF"
            timeSpeed={0.25}
            colorBalance={0}
            warpStrength={1}
            warpFrequency={5}
            warpSpeed={2}
            warpAmplitude={50}
            blendAngle={0}
            blendSoftness={0.05}
            rotationAmount={500}
            noiseScale={2}
            grainAmount={0.1}
            grainScale={2}
            grainAnimated={false}
            contrast={1.5}
            gamma={1}
            saturation={1}
            centerX={0}
            centerY={0}
            zoom={0.9}
          />
        </div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="max-w-4xl mx-auto text-center mb-8 sm:mb-16">
            <div className="inline-flex items-center gap-3 mb-6 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-sm text-white/70">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              300+ гидов уже в базе
            </div>
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-4 sm:mb-6 bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
              CRM для работы с гидами
            </h1>
            <p className="text-base sm:text-xl text-white/60 mb-8 sm:mb-12 max-w-2xl mx-auto leading-relaxed">
              Управляйте базой гидов, отслеживайте воронку привлечения и автоматизируйте процессы — всё в одной системе
            </p>
            <div className="flex gap-4 justify-center">
              <a href="/app/" className="px-8 py-3 rounded-full bg-white text-black font-medium hover:bg-white/90 transition-colors flex items-center gap-2">
                Войти
                <ArrowRight className="w-4 h-4" />
              </a>
              <a href="https://t.me/iamserdyuk" target="_blank" rel="noopener noreferrer" className="px-8 py-3 rounded-full border border-white/10 hover:bg-white/5 transition-colors">
                Связаться с нами
              </a>
            </div>
          </div>

          {/* Hero Visual Element */}
          <div className="relative w-full">
            <div className="sm:border sm:border-white/10 sm:rounded-2xl overflow-hidden bg-black/70 backdrop-blur-sm">
              <div className="sm:bg-gradient-to-br sm:from-purple-500/10 sm:via-transparent sm:to-green-500/10">
                <KanbanDemo />
              </div>
            </div>
          </div>
        </div>
        {/* Fade to black at bottom of hero */}
        <div className="absolute bottom-0 left-0 right-0 h-[200px] sm:h-[500px] bg-gradient-to-b from-transparent via-black/70 to-black z-30 pointer-events-none"></div>
      </section>

      {/* Why TripSystem Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
              Почему TripSystem?
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto">
              Система создана с учетом специфики тревел-бизнеса и реальных потребностей команды
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            <div className="border border-white/10 rounded-2xl p-8 bg-gradient-to-b from-white/5 to-transparent hover:border-white/20 transition-all">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-6">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Адаптирован под работу с гидами</h3>
              <p className="text-white/60 leading-relaxed">
                Все процессы настроены под специфику привлечения и работы с гидами — от первого контакта до публикации туров на платформе VOYZ.
              </p>
            </div>

            <div className="border border-white/10 rounded-2xl p-8 bg-gradient-to-b from-white/5 to-transparent hover:border-white/20 transition-all">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6">
                <CheckCircle2 className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Только нужные инструменты</h3>
              <p className="text-white/60 leading-relaxed">
                Чистый интерфейс без лишних модулей. Мы не перегружаем систему функциями, которые вам не понадобятся — только то, что действительно работает.
              </p>
            </div>

            <div className="border border-white/10 rounded-2xl p-8 bg-gradient-to-b from-white/5 to-transparent hover:border-white/20 transition-all">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-6">
                <Link2 className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Связь сделок и задач</h3>
              <p className="text-white/60 leading-relaxed">
                Система автоматически напомнит о созвоне, запросе материалов или любой другой задаче. Ничего не потеряется и не будет забыто.
              </p>
            </div>

            <div className="border border-white/10 rounded-2xl p-8 bg-gradient-to-b from-white/5 to-transparent hover:border-white/20 transition-all">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-6">
                <Layers className="w-6 h-6 text-orange-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Прозрачная система</h3>
              <p className="text-white/60 leading-relaxed">
                Интуитивно понятная структура — от воронки сделок до дашбордов. Вся команда понимает, что происходит, с первого взгляда.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
              Ключевые возможности CRM
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto">
              Всё необходимое для эффективного управления процессом привлечения гидов
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                <Workflow className="w-5 h-5 text-white/80" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Kanban воронка сделок</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Визуально отслеживайте каждого гида на всех этапах: от первого контакта до публикации туров. Перетаскивайте карточки, меняйте статус.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                <Database className="w-5 h-5 text-white/80" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">База гидов</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Централизованное хранение всех данных: контакты, направления, статусы, история взаимодействий. Мощный поиск и фильтрация.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-white/80" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Система задач</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Создавайте задачи прямо из карточки гида: «Напомнить о созвоне в 15:00», «Запросить фото для профиля», «Отправить гайд по оформлению». Система напомнит в нужное время.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                <Link2 className="w-5 h-5 text-white/80" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Связь задач со сделками</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Все задачи автоматически привязаны к конкретному гиду. Видите контекст, не теряете важные детали, не забываете о договорённостях.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white/80" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Realtime обновления</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  WebSocket соединение обеспечивает мгновенное обновление данных для всей команды. Изменения видны всем сразу.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                <History className="w-5 h-5 text-white/80" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">История взаимодействий</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Полная история общения с каждым гидом: когда связывались, что обсуждали, какие материалы отправляли.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-white/80" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Умные напоминания</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Система сама напомнит о дедлайнах, просроченных задачах и важных событиях. Ничего не упустите.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                <Search className="w-5 h-5 text-white/80" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Быстрый поиск</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Находите нужного гида или задачу за секунды. Поиск работает по всем полям: имя, локация, направление, статус.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white/80" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Безопасность данных</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  JWT-аутентификация, ролевой доступ для команды, защищённое хранение контактов гидов.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Showcase with Tabs */}
      <section className="py-12 sm:py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 tracking-tight">
              Интерфейс системы
            </h2>
            <p className="text-sm sm:text-base text-white/60 max-w-2xl mx-auto">
              Современный и интуитивно понятный интерфейс для эффективной работы
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 sm:gap-2 mb-6 sm:mb-8 max-w-3xl mx-auto border border-white/10 rounded-xl p-1 bg-white/5">
            {features.map(feature => {
              const Icon = feature.icon;
              return (
                <button
                  key={feature.id}
                  onClick={() => setActiveTab(feature.id)}
                  className={`flex-1 px-2 sm:px-6 py-2 sm:py-3 rounded-lg transition-all ${
                    activeTab === feature.id
                      ? 'bg-white text-black'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="font-medium text-xs sm:text-sm truncate sm:hidden">{feature.shortTitle}</span>
                    <span className="font-medium text-xs sm:text-sm truncate hidden sm:inline">{feature.title}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="w-full">
            <div className="border border-white/10 rounded-2xl overflow-hidden bg-gradient-to-b from-white/5 to-transparent">
              <div className="bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 overflow-hidden">
                {activeTab === 'kanban' && (
                  <KanbanProcessDemo />
                )}
                {activeTab === 'dashboard' && (
                  <div className="w-full h-full flex items-center justify-center p-12">
                    <div className="text-center space-y-4">
                      <BarChart3 className="w-16 h-16 text-white/20 mx-auto" />
                      <h3 className="text-2xl font-semibold">Дашборд</h3>
                      <p className="text-white/60 max-w-md mx-auto">
                        Следите за ключевыми метриками в реальном времени: конверсия, активные задачи,
                        воронка продаж и тренды роста.
                      </p>
                    </div>
                  </div>
                )}
                {activeTab === 'tasks' && (
                  <TasksDemo />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
              Продукты TripSystem
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto">
              Экосистема инструментов для управления тревел-бизнесом
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* CRM Product */}
            <div className="group relative border border-white/10 rounded-2xl p-8 bg-gradient-to-b from-white/5 to-transparent hover:border-white/20 transition-all">
              <div className="absolute top-4 right-4">
                <span className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium">
                  Доступно
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:bg-white/10 transition-colors">
                <Database className="w-6 h-6 text-white/80" />
              </div>
              <h3 className="text-2xl font-semibold mb-3">CRM для работы с гидами</h3>
              <p className="text-white/60 leading-relaxed mb-6">
                Полноценная система для управления базой гидов, воронкой привлечения, задачами и аналитикой.
                Адаптирована под специфику тревел-бизнеса.
              </p>
              <a href="/app/" className="inline-block px-6 py-2 rounded-full border border-white/10 hover:bg-white/5 transition-colors text-sm">
                Войти в CRM
              </a>
            </div>

            {/* Analytics Product */}
            <div className="group relative border border-white/10 rounded-2xl p-8 bg-gradient-to-b from-white/5 to-transparent hover:border-white/20 transition-all">
              <div className="absolute top-4 right-4">
                <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
                  Скоро
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:bg-white/10 transition-colors">
                <BarChart3 className="w-6 h-6 text-white/80" />
              </div>
              <h3 className="text-2xl font-semibold mb-3">Аналитика</h3>
              <p className="text-white/60 leading-relaxed mb-6">
                Глубокая аналитика для принятия решений на основе данных:
              </p>

              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-3">
                  <LineChart className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-white/90 mb-1">Сквозная аналитика</div>
                    <div className="text-sm text-white/60">От первого касания гида до его продаж на платформе VOYZ</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-white/90 mb-1">Сегментация по направлениям</div>
                    <div className="text-sm text-white/60">Анализ эффективности по локациям и специализациям гидов</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-white/90 mb-1">Аналитика по менеджерам</div>
                    <div className="text-sm text-white/60">Сколько гидов привлёк каждый менеджер, конверсии и эффективность</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <BarChart3 className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-white/90 mb-1">Фокус на нужных метриках</div>
                    <div className="text-sm text-white/60">Только действительно важные показатели без перегрузки лишними данными</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 tracking-tight">
              Современные технологии
            </h2>
            <p className="text-lg text-white/60 leading-relaxed mb-8">
              Построено на передовом стеке: <span className="text-white/80 font-medium">React 19, NestJS, PostgreSQL, WebSocket</span>
            </p>
            <p className="text-white/60">
              Быстро, безопасно, масштабируемо
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mx-auto text-center border border-white/10 rounded-3xl p-12 bg-gradient-to-b from-white/5 to-transparent relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5"></div>
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
                Готовы начать?
              </h2>
              <p className="text-lg text-white/60 mb-8">
                Войдите в систему и начните эффективно управлять процессом привлечения гидов
              </p>
              <a href="/app/" className="px-8 py-3 rounded-full bg-white text-black font-medium hover:bg-white/90 transition-colors inline-flex items-center gap-2">
                Войти в систему
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-white/40">
              &copy; {new Date().getFullYear()} TripSystem. Все права защищены.
            </div>
            <div className="flex gap-6 text-sm text-white/60">
              <a href="https://t.me/iamserdyuk" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Контакты</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
