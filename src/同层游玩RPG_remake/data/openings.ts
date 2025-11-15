// 开局预置配置（示例占位，后续可自行扩充/替换）
export type OpeningPreset = {
  id: string;
  name: string;
  description: string;
  prompt: string;
};

export const OPENING_PRESETS: OpeningPreset[] = [
  {
    id: 'modern_onmyoji_baseline',
    name: '阴阳寮的清晨',
    description: '从阴阳寮的一次例行巡查开始，你接到异常灵压的报告，准备前往调查。',
    prompt:
      '<system>请以“现代：阴阳师”世界观开篇，叙述一次例行巡查遇到异常灵压的开局，以细致的环境描写与人物心理为主，适合互动小说的第一幕。</system>',
  },
  {
    id: 'school_encounter',
    name: '校园异动',
    description: '你还在校园读书，一场突如其来的灵异事件打破了宁静的日常。',
    prompt:
      '<system>以校园为舞台，描述主角在傍晚的旧教学楼中遭遇“看不见的脚步声”的开局。强调氛围与可互动线索。</system>',
  },
  {
    id: 'night_call',
    name: '深夜来电',
    description: '半夜手机响起，来电者自称“只剩十分钟”，请求你的帮助。',
    prompt:
      '<system>请用悬疑风格开场，主角深夜接到求援电话，地点模糊，只能凭线索判断去向。适度留白以便玩家选择。</system>',
  },
];

export function getOpeningsForWorld(_world: string): OpeningPreset[] {
  // 以后可按 world 过滤；当前直接返回全部
  return OPENING_PRESETS;
}
