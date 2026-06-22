import { useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DateNavProps {
  dates: string[];
  selectedDate: string;
  onSelect: (date: string) => void;
}

function formatDateShort(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return {
    day: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
    date: d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
  };
}

export default function DateNav({ dates, selectedDate, onSelect }: DateNavProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [selectedDate]);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
  };

  if (!dates.length) return null;

  return (
    <div className="relative flex items-center bg-pitch-800 border-b border-pitch-700">
      <button
        onClick={() => scroll('left')}
        className="absolute left-0 z-10 h-full px-2 bg-gradient-to-r from-pitch-800 to-transparent text-pitch-300 hover:text-white transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div
        ref={scrollRef}
        className="flex items-center gap-0 overflow-x-auto scrollbar-hide px-8 w-full"
      >
        {dates.map(date => {
          const { day, date: dateLabel } = formatDateShort(date);
          const isSelected = date === selectedDate;
          const isToday = date === new Date().toISOString().split('T')[0];

          return (
            <button
              key={date}
              ref={isSelected ? selectedRef : undefined}
              onClick={() => onSelect(date)}
              className={`flex-shrink-0 flex flex-col items-center px-4 py-3 transition-all duration-150 border-b-2 min-w-[72px] ${
                isSelected
                  ? 'bg-gold-gradient text-pitch-900 border-transparent'
                  : 'text-pitch-200 border-transparent hover:text-white hover:border-pitch-500'
              }`}
            >
              <span className={`text-[10px] font-bold uppercase tracking-widest ${
                isSelected ? 'text-pitch-900' : isToday ? 'text-gold-400' : ''
              }`}>
                {day}
              </span>
              <span className={`text-sm font-bold mt-0.5 ${
                isSelected ? 'text-pitch-900' : ''
              }`}>
                {dateLabel}
              </span>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => scroll('right')}
        className="absolute right-0 z-10 h-full px-2 bg-gradient-to-l from-pitch-800 to-transparent text-pitch-300 hover:text-white transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
