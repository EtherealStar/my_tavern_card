type CoreFullName = '天王寺 惠' | '天王寺 抚子' | '天王寺 莉音' | '水无月 怜' | '白石 响' | '橘 朋香';

const CORE_NAME_TO_SHORT: Record<CoreFullName, string> = {
  '天王寺 惠': '惠',
  '天王寺 抚子': '抚子',
  '天王寺 莉音': '莉音',
  '水无月 怜': '怜',
  '白石 响': '响',
  '橘 朋香': '朋香',
};

const CORE_FULL_NAMES: CoreFullName[] = ['天王寺 惠', '天王寺 抚子', '天王寺 莉音', '水无月 怜', '白石 响', '橘 朋香'];

function getCorruptionValueOf(data: Mvu.MvuData, shortName: string): number {
  const path = `${shortName}.恶堕值`;
  const val = Mvu.getMvuVariable(data, path, { default_value: undefined });
  if (typeof val === 'number' && Number.isFinite(val)) {
    return val;
  }
  return 0;
}

function computeGdi(data: Mvu.MvuData): number {
  const sum = CORE_FULL_NAMES.map(full => CORE_NAME_TO_SHORT[full])
    .map(short => getCorruptionValueOf(data, short))
    .reduce((acc, cur) => acc + (Number.isFinite(cur) ? cur : 0), 0);

  const gdi = Math.round(sum * 0.1);
  if (gdi < 0) return 0;
  if (gdi > 100) return 100;
  return gdi;
}

function getCurrentGdi(data: Mvu.MvuData): number | undefined {
  const v = Mvu.getMvuVariable(data, 'GDI', { default_value: undefined });
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  return undefined;
}

async function writeGdi(data: Mvu.MvuData, nextGdi: number): Promise<boolean> {
  const ok = await Mvu.setMvuVariable(data, 'GDI[0]', nextGdi, {
    reason: 'GDI自动计算',
    is_recursive: false,
  });
  if (ok) {
    await Mvu.replaceMvuData(data, { type: 'message', message_id: 'latest' });
  }
  return ok;
}

export async function recalcAndUpdateGdi(_mvuData?: Mvu.MvuData): Promise<void> {
  const data = Mvu.getMvuData({ type: 'message', message_id: 'latest' });
  const next = computeGdi(data);
  const prev = getCurrentGdi(data);
  if (prev === next) return;
  await writeGdi(data, next);
}

declare const eventOn: <K extends keyof ListenerType>(
  name: K | string,
  handler: ListenerType[K] | ((...args: any[]) => void),
) => void;

try {
  eventOn?.(Mvu.events.VARIABLE_UPDATE_ENDED, () => {
    void recalcAndUpdateGdi();
  });
} catch (err) {
  console.error('绑定 GDI 计算事件失败:', err);
}

export async function variableUpdateEnded(_variables: Mvu.MvuData, _out_is_updated: boolean): Promise<void> {
  await recalcAndUpdateGdi();
}
