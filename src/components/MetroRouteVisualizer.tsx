import React, {useEffect, useMemo, useState} from 'react';
import {ArrowLeftRight, RotateCcw, Route} from 'lucide-react';
import {MetroLineGuide} from '../data/directoryData';

interface MetroRouteVisualizerProps {
  lines: MetroLineGuide[];
  lang: 'ar' | 'en';
}

export const MetroRouteVisualizer: React.FC<MetroRouteVisualizerProps> = ({
  lines,
  lang,
}) => {
  const isAr = lang === 'ar';

  const [selectedLineId, setSelectedLineId] = useState<string>(() => lines[0]?.id ?? '');
  const [fromIdx, setFromIdx] = useState<number>(0);
  const [toIdx, setToIdx] = useState<number>(() =>
    lines[0] ? Math.max(0, lines[0].keyStations.length - 1) : 0,
  );
  // Tracks whether the next direct node click sets 'from' or 'to'
  const [pickTurn, setPickTurn] = useState<'from' | 'to'>('from');

  // Sync line and default start/end when city changes
  useEffect(() => {
    const stillExists = lines.some((l) => l.id === selectedLineId);
    if (!stillExists && lines[0]) {
      setSelectedLineId(lines[0].id);
      setFromIdx(0);
      setToIdx(Math.max(0, lines[0].keyStations.length - 1));
      setPickTurn('from');
    }
  }, [lines, selectedLineId]);

  const activeLine = useMemo(
    () => lines.find((l) => l.id === selectedLineId) ?? lines[0],
    [lines, selectedLineId],
  );

  if (!activeLine) return null;

  const stations = activeLine.keyStations;
  const safeFrom = Math.min(fromIdx, stations.length - 1);
  const safeTo = Math.min(toIdx, stations.length - 1);
  const rangeStart = Math.min(safeFrom, safeTo);
  const rangeEnd = Math.max(safeFrom, safeTo);
  const stopsCount = rangeEnd - rangeStart;
  const isReversed = safeFrom > safeTo;

  const handleSelectLine = (line: MetroLineGuide) => {
    setSelectedLineId(line.id);
    setFromIdx(0);
    setToIdx(Math.max(0, line.keyStations.length - 1));
    setPickTurn('from');
  };

  const handleSwapStations = () => {
    setFromIdx(safeTo);
    setToIdx(safeFrom);
  };

  const handleResetRoute = () => {
    setFromIdx(0);
    setToIdx(Math.max(0, stations.length - 1));
    setPickTurn('from');
  };

  const handleStationNodeClick = (idx: number) => {
    if (pickTurn === 'from') {
      setFromIdx(idx);
      setPickTurn('to');
    } else {
      setToIdx(idx);
      setPickTurn('from');
    }
  };

  const fromStation = stations[safeFrom];
  const toStation = stations[safeTo];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
            <Route className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {isAr ? 'مخطط مسار المترو التفاعلي' : 'Interactive Line Route Visualizer'}
            </h3>
            <p className="text-xs text-slate-500">
              {isAr
                ? 'اختر خط المترو ثم حدد محطة الانطلاق والوصول لتمييز المحطات على المسار'
                : 'Pick a line and select origin & destination stations to highlight stops along the route'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleResetRoute}
          className="inline-flex min-h-[38px] items-center gap-1.5 self-start rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:self-auto"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>{isAr ? 'إعادة ضبط' : 'Reset'}</span>
        </button>
      </div>

      {/* Line Selector */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {lines.map((line) => {
          const active = line.id === activeLine.id;
          return (
            <button
              key={line.id}
              type="button"
              onClick={() => handleSelectLine(line)}
              className={`inline-flex min-h-[40px] items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors ${
                active
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span
                className="h-3 w-3 shrink-0 rounded-sm"
                style={{backgroundColor: line.lineColorHex}}
                aria-hidden="true"
              />
              <span>
                {line.lineNumber} · {isAr ? line.nameAr : line.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Origin & Destination Selectors */}
      <div className="mt-4 grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <div>
          <label className="block text-xs font-semibold text-slate-700">
            {isAr ? 'من محطة (الانطلاق)' : 'From Station (Origin)'}
          </label>
          <select
            value={safeFrom}
            onChange={(e) => {
              setFromIdx(Number(e.target.value));
              setPickTurn('to');
            }}
            className="mt-1 min-h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:border-emerald-700 focus:outline-none"
          >
            {stations.map((st, idx) => (
              <option key={st.en} value={idx}>
                {isAr ? `${st.ar} (${st.ru})` : `${st.en} (${st.ru})`}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleSwapStations}
          aria-label={isAr ? 'عكس الاتجاه' : 'Swap origin and destination'}
          className="flex min-h-[42px] min-w-[42px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition-colors hover:bg-slate-100"
        >
          <ArrowLeftRight className="h-4 w-4" />
        </button>

        <div>
          <label className="block text-xs font-semibold text-slate-700">
            {isAr ? 'إلى محطة (الوصول)' : 'To Station (Destination)'}
          </label>
          <select
            value={safeTo}
            onChange={(e) => {
              setToIdx(Number(e.target.value));
              setPickTurn('from');
            }}
            className="mt-1 min-h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:border-emerald-700 focus:outline-none"
          >
            {stations.map((st, idx) => (
              <option key={st.en} value={idx}>
                {isAr ? `${st.ar} (${st.ru})` : `${st.en} (${st.ru})`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Route Summary Strip */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 font-semibold text-slate-900">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{backgroundColor: activeLine.lineColorHex}}
          />
          <span>{isAr ? fromStation.ar : fromStation.en}</span>
          <span className="text-slate-400">→</span>
          <span>{isAr ? toStation.ar : toStation.en}</span>
        </div>
        <div className="font-mono-tabular flex items-center gap-3 text-slate-600">
          <span>
            {stopsCount === 0
              ? isAr
                ? 'نفس المحطة'
                : 'Same station'
              : isAr
                ? `${stopsCount} محطات بينية · ${stopsCount + 1} نقاط رئيسية`
                : `${stopsCount} key hop${stopsCount > 1 ? 's' : ''} · ${stopsCount + 1} stops highlighted`}
          </span>
          {stopsCount > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span>
                {isReversed
                  ? isAr
                    ? 'اتجاه عكسي'
                    : 'Reverse direction'
                  : isAr
                    ? 'اتجاه مباشر'
                    : 'Forward direction'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Visual Transit Line Diagram */}
      <div className="mt-5">
        <p className="mb-3 text-[11px] font-medium text-slate-500">
          {isAr
            ? 'اضغط على أي محطة على الخط لتحديد نقطة البداية أو النهاية مباشرة:'
            : 'Tap any station node directly to set origin or destination:'}
        </p>

        <div className="relative space-y-0">
          {stations.map((st, idx) => {
            const inRoute = idx >= rangeStart && idx <= rangeEnd;
            const isOrigin = idx === safeFrom;
            const isDest = idx === safeTo;
            const isLast = idx === stations.length - 1;
            const segmentBelowActive = idx >= rangeStart && idx < rangeEnd;

            return (
              <div key={st.en} className="relative flex items-stretch gap-3.5">
                {/* Rail + Node Column */}
                <div className="flex w-7 shrink-0 flex-col items-center">
                  <button
                    type="button"
                    onClick={() => handleStationNodeClick(idx)}
                    aria-label={isAr ? st.ar : st.en}
                    className={`relative z-10 mt-3 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-transform hover:scale-110 ${
                      isOrigin || isDest
                        ? 'scale-110 bg-white ring-4 ring-slate-900/10'
                        : inRoute
                          ? 'bg-white'
                          : 'border-slate-300 bg-slate-100'
                    }`}
                    style={
                      inRoute
                        ? {
                            borderColor: activeLine.lineColorHex,
                            backgroundColor:
                              isOrigin || isDest ? activeLine.lineColorHex : '#FFFFFF',
                          }
                        : undefined
                    }
                  >
                    {(isOrigin || isDest) && (
                      <span className="h-2 w-2 rounded-full bg-white" />
                    )}
                  </button>

                  {!isLast && (
                    <div
                      className="w-1 flex-1 rounded-full transition-colors"
                      style={{
                        backgroundColor: segmentBelowActive
                          ? activeLine.lineColorHex
                          : '#E2E8F0',
                        minHeight: '28px',
                      }}
                    />
                  )}
                </div>

                {/* Station Card Row */}
                <button
                  type="button"
                  onClick={() => handleStationNodeClick(idx)}
                  className={`mb-2.5 flex flex-1 flex-col justify-between gap-1 rounded-xl border p-3 text-start transition-all sm:flex-row sm:items-center sm:gap-4 ${
                    inRoute
                      ? 'border-slate-300 bg-white shadow-xs'
                      : 'border-slate-100 bg-slate-50/70 opacity-55 hover:opacity-85'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-sm font-bold ${
                          inRoute ? 'text-slate-900' : 'text-slate-600'
                        }`}
                      >
                        {isAr ? st.ar : st.en}
                      </span>
                      {isOrigin && (
                        <span
                          className="text-[11px] font-bold"
                          style={{color: activeLine.lineColorHex}}
                        >
                          · {isAr ? 'نقطة الانطلاق' : 'Origin'}
                        </span>
                      )}
                      {isDest && !isOrigin && (
                        <span
                          className="text-[11px] font-bold"
                          style={{color: activeLine.lineColorHex}}
                        >
                          · {isAr ? 'نقطة الوصول' : 'Destination'}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {isAr ? st.landmarkAr : st.landmarkEn}
                    </p>
                  </div>

                  <span
                    className="font-mono-tabular shrink-0 text-xs font-medium text-slate-600"
                    dir="ltr"
                  >
                    {st.ru}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
