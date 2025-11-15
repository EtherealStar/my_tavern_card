import { TRIGGERED_RANDOM_EVENTS_PATH, userKey } from '../shared/constants';

// 等待MVU框架初始化
await waitGlobalInitialized('Mvu');

type EventItem = {
  name: string;
  allowedPeriods?: string[];
  allowedLocations?: string[];
};

// 事件池定义
const EVENT_POOL: EventItem[] = [
  { name: '姐姐的书架', allowedPeriods: ['上午', '下午'], allowedLocations: ['{{user}}的家'] },
  { name: '不听话的咖啡机', allowedPeriods: ['上午'], allowedLocations: ['{{user}}的家'] },
  { name: '蔬菜的转移', allowedPeriods: ['上午', '下午'], allowedLocations: ['守护支部'] },
  { name: '天台的午餐', allowedPeriods: ['上午'], allowedLocations: ['花丘高中'] },
  { name: '冰雕', allowedPeriods: ['下午'], allowedLocations: ['{{user}}的家'] },
  { name: '晚高峰电车', allowedPeriods: ['下午'], allowedLocations: ['花丘高中'] },
  { name: '图书馆的守护', allowedPeriods: ['上午', '下午'], allowedLocations: ['花丘高中'] },
  { name: '出浴意外', allowedPeriods: ['下午', '晚间'], allowedLocations: ['{{user}}的家'] },
  { name: '特别辅导', allowedPeriods: ['下午', '晚间'], allowedLocations: ['花丘高中'] },
  { name: '雨天的伞下', allowedPeriods: ['下午', '晚间'], allowedLocations: ['花丘高中'] },
  { name: '失窃的丝袜', allowedPeriods: ['下午', '晚间'], allowedLocations: ['{{user}}的家'] },
  { name: '天台的午睡', allowedPeriods: ['上午', '下午'], allowedLocations: ['花丘高中'] },
  { name: '旧伤疤的故事', allowedPeriods: ['下午'], allowedLocations: ['花丘高中'] },
  { name: '家庭餐厅的紧急补习', allowedPeriods: ['下午', '晚间'] },
  { name: '食堂的限定布丁争夺战', allowedPeriods: ['上午', '下午'], allowedLocations: ['守护支部'] },
  { name: '输掉的惩罚', allowedLocations: ['{{user}}的家'] },
  { name: '特训', allowedPeriods: ['上午', '下午'], allowedLocations: ['守护支部'] },
  { name: '体育课', allowedPeriods: ['下午'], allowedLocations: ['花丘高中'] },
  { name: 'VR游戏', allowedPeriods: ['下午', '晚间'] },
  { name: '大姐头的房间', allowedPeriods: ['下午', '晚间'] },
  { name: '被弄湿的教科书', allowedPeriods: ['上午', '下午'], allowedLocations: ['花丘高中'] },
  { name: '迷路的小猫', allowedPeriods: ['下午', '晚间'] },
  { name: '商业街的橱窗', allowedPeriods: ['下午', '晚间'] },
  { name: '关于过去的噩梦', allowedPeriods: ['上午', '下午'], allowedLocations: ['花丘高中'] },
  { name: '训练室的意外', allowedLocations: ['守护支部'] },
  { name: '对决', allowedLocations: ['守护支部'] },
  { name: '购物之旅', allowedPeriods: ['下午', '晚间'] },
  { name: '更衣室的意外', allowedPeriods: ['下午'], allowedLocations: ['花丘高中'] },
  { name: '小巷里的邀请', allowedPeriods: ['下午', '晚间'], allowedLocations: ['花丘高中'] },
  { name: '雨夜的误会', allowedPeriods: ['下午', '晚间'], allowedLocations: ['花丘高中'] },
  { name: '奢侈品店的插曲', allowedPeriods: ['下午', '晚间'] },
  { name: '商业街的调戏', allowedPeriods: ['下午', '晚间'] },
  { name: '迷路的女游客', allowedPeriods: ['上午', '下午'] },
  { name: '后台突袭', allowedPeriods: ['下午', '晚间'] },
  { name: '风纪注意', allowedPeriods: ['上午', '下午'], allowedLocations: ['花丘高中'] },
  { name: '美术社的缪斯', allowedPeriods: ['上午', '下午'], allowedLocations: ['花丘高中'] },
  { name: '夜间呻吟', allowedPeriods: ['晚间'], allowedLocations: ['{{user}}的家'] },
  { name: '警官的关心', allowedPeriods: ['晚间'] },
];

// 工具函数
function normalizeLocation(loc: string): string {
  return loc.replace(/{{user}}/g, userKey);
}

function getCurrentPeriod(variables: Mvu.MvuData): string | undefined {
  return Mvu.getMvuVariable(variables, '世界.时段[0]');
}

function getCurrentLocation(variables: Mvu.MvuData): string | undefined {
  return Mvu.getMvuVariable(variables, `${userKey}.地点[0]`);
}

// 脚本域配置与状态
const RANDOM_EVENT_CONFIG_ROOT = '随机事件触发器.配置';
const RANDOM_EVENT_STATE_ROOT = '随机事件触发器.状态';

function getCooldownReplies(scriptVars: Record<string, any>): number {
  const value = _.get(scriptVars, `${RANDOM_EVENT_CONFIG_ROOT}.冷却回复数`, 1);
  return typeof value === 'number' && value >= 0 ? value : 1;
}

/**
 * 确保好感事件优先、且保证写入持久化：
 * - 直接在事件回调中修改传入的 variables，并置 out_is_updated = true，由宿主环境负责持久化；
 * - 若任一角色存在"待触发"的好感事件（阶段值为奇数），则本轮放弃随机事件（保证好感事件优先级）；
 * - 若当前"世界.随机事件"非"无"，放弃随机触发；否则以 45% 概率抽取并写入。
 */

async function tryTriggerRandomEvent(variables: Mvu.MvuData, _out_is_updated?: boolean): Promise<void> {
  try {
    // 检查是否为0层消息，如果是则不触发随机事件
    const currentMessageId = getLastMessageId();
    if (currentMessageId === 0) {
      return;
    }

    // 若存在"好感事件待触发"（阶段为奇数），优先让好感事件占用，跳过本次随机触发
    const affectionStages = Mvu.getMvuVariable(variables, 'tavern_helper.affection_events.stage', {
      default_value: {},
    });
    const hasPendingAffection =
      affectionStages &&
      typeof affectionStages === 'object' &&
      Object.values(affectionStages).some(v => typeof v === 'number' && v > 0 && v % 2 !== 0);
    if (hasPendingAffection) {
      return;
    }

    const currentEvent = Mvu.getMvuVariable(variables, '世界.随机事件[0]', { default_value: '无' });

    // 读写脚本域状态（用于避免随机事件连发）：至少间隔一条回复
    const svars = getVariables({ type: 'script', script_id: getScriptId() });
    const cooldownTotal = getCooldownReplies(svars);
    const lastEventName: string = _.get(svars, `${RANDOM_EVENT_STATE_ROOT}.上次事件名`, '无');
    let cooldownRemaining: number = _.get(svars, `${RANDOM_EVENT_STATE_ROOT}.冷却剩余回复数`, 0);

    let skipThisRound = false;
    // 若上一轮非“无”，当前为“无”，说明事件刚结束 → 启动冷却
    if (lastEventName !== '无' && currentEvent === '无') {
      // 刚结束一条事件：本条回复启用冷却并跳过触发
      cooldownRemaining = Math.max(0, cooldownTotal - 1);
      skipThisRound = true;
    } else if (cooldownRemaining > 0) {
      // 冷却中：本轮递减并跳过随机事件
      cooldownRemaining = Math.max(0, cooldownRemaining - 1);
      skipThisRound = true;
    }

    // 更新脚本域状态（记录上次事件名与冷却剩余）
    _.set(svars, `${RANDOM_EVENT_STATE_ROOT}.上次事件名`, currentEvent);
    _.set(svars, `${RANDOM_EVENT_STATE_ROOT}.冷却剩余回复数`, cooldownRemaining);
    await replaceVariables(svars, { type: 'script', script_id: getScriptId() });

    if (currentEvent !== '无') {
      // 已被好感事件或其他系统占用，放弃本次随机触发（但仍然已记录 lastEventName）
      return;
    }

    if (skipThisRound) {
      return;
    }

    const currentPeriod = getCurrentPeriod(variables);
    const currentLocation = getCurrentLocation(variables);
    if (!currentPeriod || !currentLocation) return;

    // 获取已触发的事件列表
    const triggeredEventsPath = TRIGGERED_RANDOM_EVENTS_PATH.replace('tavern_helper.', '');
    const triggeredEvents: string[] = Mvu.getMvuVariable(variables, triggeredEventsPath, { default_value: [] });

    // 事件筛选（兼容未设置限制的事件），并排除已触发的事件
    const availableEvents = EVENT_POOL.filter(event => {
      if (triggeredEvents.includes(event.name)) {
        return false; // 排除已触发的事件
      }
      const periodOk = !event.allowedPeriods || event.allowedPeriods.includes(currentPeriod);
      const locationOk =
        !event.allowedLocations || event.allowedLocations.map(normalizeLocation).includes(currentLocation);
      return periodOk && locationOk;
    });

    if (availableEvents.length === 0) return;

    // 45% 概率触发
    const probability = 0.45;
    if (Math.random() >= probability) return;

    // 随机选择一个事件
    const idx = Math.floor(Math.random() * availableEvents.length);
    const selectedEvent = availableEvents[idx];

    // 在事件回调中直接修改传入的 variables，由宿主在回调结束时统一持久化
    const existedTriggered: string[] = Mvu.getMvuVariable(variables, triggeredEventsPath, { default_value: [] });
    await Mvu.setMvuVariable(variables, '世界.随机事件[0]', selectedEvent.name, { reason: '随机事件触发' });
    const newTriggered = _.uniq([...(Array.isArray(existedTriggered) ? existedTriggered : []), selectedEvent.name]);
    await Mvu.setMvuVariable(variables, triggeredEventsPath, newTriggered, { reason: '添加已触发事件' });
    // 标记已更新，交由宿主持久化
    _out_is_updated = true;

    // 事件已开始：将脚本域的上次事件名更新为本次选中事件，避免事件结束时无法识别“刚结束”
    const svarsAfter = getVariables({ type: 'script', script_id: getScriptId() });
    _.set(svarsAfter, `${RANDOM_EVENT_STATE_ROOT}.上次事件名`, selectedEvent.name);
    await replaceVariables(svarsAfter, { type: 'script', script_id: getScriptId() });
  } catch (error) {
    console.error('[随机事件触发器] 出错:', error);
  }
}

// 监听变量更新完成钩子
eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, tryTriggerRandomEvent);
