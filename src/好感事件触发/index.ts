// 好感事件触发器（增强版）
// 规则：当 角色(紫音/凛/枫).好感度[0] 达到 50/100/150 阈值时：
// 1) 先更新 角色.好感事件[0] = 对应阶段(1/2/3)，仅单调递增；
// 2) 若 世界.随机事件[0] === '无'，择一触发该角色尚未触发的最低阶段事件，并记录触发痕迹（脚本变量域），确保每阶段只触发一次。

import { TRIGGERED_RANDOM_EVENTS_PATH, userKey } from '../shared/constants';

const ROLES: string[] = ['紫音', '凛', '枫'];
const THRESHOLDS: number[] = [50, 100, 150]; // 对应阶段 1/2/3
const CONFIG_ROOT = '好感事件触发器.配置'; // 存于脚本变量域根下

// 变量路径辅助
const stagePathOf = (role: string) => `tavern_helper.affection_events.stage.${role}`;
const lustStagePathOf = (role: string) => `tavern_helper.lust_events.stage.${role}`;

// 特殊事件：圣女传承
const SAINT_EVENT_NAME = '圣女传承';

// 读取/写入 stat_data.* 的工具（优先走 Mvu，回退到 _.get/_.set）
function getStatValue<T = any>(variables: Record<string, any>, path: string, defaultValue?: T): T {
  try {
    if (typeof Mvu !== 'undefined') {
      const value = Mvu.getMvuVariable(variables as any, path);
      return (value === undefined ? defaultValue : value) as T;
    }
  } catch (_) {
    void 0;
  }
  return _.get(variables, `stat_data.${path}`, defaultValue) as T;
}

async function setStatValue(variables: Record<string, any>, path: string, value: any, reason?: string): Promise<void> {
  try {
    if (typeof Mvu !== 'undefined') {
      await Mvu.setMvuVariable(variables as any, path, value, { reason });
      return;
    }
  } catch (_) {
    void 0;
  }
  _.set(variables, `stat_data.${path}`, value);
}

// 事件命名（支持角色自定义映射）
const CUSTOM_EVENT_NAME_MAP: Record<string, Record<number, string>> = {
  紫音: {
    1: '女仆修行',
    2: '心理评估',
    3: '便利店圣女',
  },
  凛: {
    1: '任务意外',
    2: '家庭性教育',
    3: '后宫失火',
  },
  枫: {
    1: '时光胶囊',
    2: '花火大会',
    3: '素材争夺战',
  },
};

function buildEventName(role: string, stage: number): string {
  const roleMap = CUSTOM_EVENT_NAME_MAP[role];
  if (roleMap && roleMap[stage]) return roleMap[stage];
  return `好感事件-${role}-阶段${stage}`;
}

// 凛·淫堕事件命名映射
const RIN_LUST_EVENT_NAME_MAP: Record<number, string> = {
  1: '浴室惩罚',
  2: '性处理委员',
  3: '极乐婚典',
};
function buildRinLustEventName(stage: number): string {
  return RIN_LUST_EVENT_NAME_MAP[stage] ?? `凛淫堕事件-阶段${stage}`;
}

// 紫音·淫堕事件命名映射（占位，后续可自定义替换）
const ZIYIN_LUST_EVENT_NAME_MAP: Record<number, string> = {
  1: '失控净化',
  2: '青梅目前犯',
  3: '异次元大团圆',
};
function buildZiyinLustEventName(stage: number): string {
  return ZIYIN_LUST_EVENT_NAME_MAP[stage] ?? `紫音淫堕事件-阶段${stage}`;
}

type TriggerConfig = {
  globalEnabled: boolean;
  roleEnabled: Record<string, boolean>;
  saintEnabled: boolean;
  saintThreshold: number;
};

function getTriggerConfig(scriptVars: Record<string, any>): TriggerConfig {
  const globalEnabled = _.get(scriptVars, `${CONFIG_ROOT}.启用全局`, true) as boolean;
  const roleEnabled: Record<string, boolean> = {};
  for (const role of ROLES) {
    roleEnabled[role] = _.get(scriptVars, `${CONFIG_ROOT}.启用角色.${role}`, true) as boolean;
  }
  const saintEnabled = _.get(scriptVars, `${CONFIG_ROOT}.启用圣女传承`, true) as boolean;
  const saintThreshold = _.get(scriptVars, `${CONFIG_ROOT}.圣女传承阈值`, 70) as number;
  return { globalEnabled, roleEnabled, saintEnabled, saintThreshold };
}

function calcStageFromAffection(affection: number): number {
  if (affection >= THRESHOLDS[2]) return 3;
  if (affection >= THRESHOLDS[1]) return 2;
  if (affection >= THRESHOLDS[0]) return 1;
  return 0;
}

async function trySyncStagesAndTriggerEvent(variables: Record<string, any>): Promise<void> {
  try {
    const scriptVars = getVariables({ type: 'script', script_id: getScriptId() });
    const config = getTriggerConfig(scriptVars);

    if (!config.globalEnabled) return;

    // 1) 同步所有角色的状态
    for (const role of ROLES) {
      const affection: number = getStatValue<number>(variables, `${role}.好感度[0]`, 0);
      const currentState: number = _.get(variables, stagePathOf(role), 0) as number;
      const targetAffectionStage = calcStageFromAffection(affection);
      const currentAchievedStage = Math.ceil(currentState / 2);

      if (targetAffectionStage > currentAchievedStage) {
        const newState = targetAffectionStage * 2 - 1;
        _.set(variables, stagePathOf(role), newState);
      }

      // 同步“凛”的淫堕阶段（50/100/150），采用奇/偶状态表示达成/已触发
      if (role === '凛') {
        const rinLust: number = getStatValue<number>(variables, '凛.淫堕值[0]', 0);
        const rinTargetStage = calcStageFromAffection(rinLust);
        const rinCurrentState: number = _.get(variables, lustStagePathOf('凛'), 0) as number;
        const rinAchievedStage = Math.ceil(rinCurrentState / 2);

        if (rinTargetStage > rinAchievedStage) {
          const newRinState = rinTargetStage * 2 - 1; // 奇数=已达到未触发
          _.set(variables, lustStagePathOf('凛'), newRinState);
        }
      }

      // 同步“紫音”的淫堕阶段（50/100/150），采用奇/偶状态表示达成/已触发
      if (role === '紫音') {
        const ziyinLust: number = getStatValue<number>(variables, '紫音.淫堕值[0]', 0);
        const ziyinTargetStage = calcStageFromAffection(ziyinLust);
        const ziyinCurrentState: number = _.get(variables, lustStagePathOf('紫音'), 0) as number;
        const ziyinAchievedStage = Math.ceil(ziyinCurrentState / 2);

        if (ziyinTargetStage > ziyinAchievedStage) {
          const newZiyinState = ziyinTargetStage * 2 - 1; // 奇数=已达到未触发
          _.set(variables, lustStagePathOf('紫音'), newZiyinState);
        }
      }
    }

    // 2) 若随机事件空闲，优先触发“圣女传承”（一次性），否则择一触发“待触发”的角色事件
    const currentRandomEvent = getStatValue<string>(variables, '世界.随机事件[0]', '无');
    if (currentRandomEvent === '无') {
      // 圣女传承优先
      const lust: number = getStatValue<number>(variables, `${userKey}.淫堕值[0]`, 0);
      const power: string = getStatValue<string>(variables, `${userKey}.实力等级[0]`, '');
      const triggeredEvents: string[] = _.get(variables, TRIGGERED_RANDOM_EVENTS_PATH, []);

      if (
        config.saintEnabled &&
        lust >= config.saintThreshold &&
        power === 'S' &&
        !triggeredEvents.includes(SAINT_EVENT_NAME)
      ) {
        await setStatValue(variables, '世界.随机事件[0]', SAINT_EVENT_NAME, '圣女传承');
        const existed: string[] = _.get(variables, TRIGGERED_RANDOM_EVENTS_PATH, []);
        _.set(
          variables,
          TRIGGERED_RANDOM_EVENTS_PATH,
          _.uniq([...(Array.isArray(existed) ? existed : []), SAINT_EVENT_NAME]),
        );
      } else {
        // 先尝试“凛”的淫堕事件：当状态为奇数表示待触发，触发最低阶段一次
        if (config.roleEnabled['凛']) {
          const rinCurrentState: number = _.get(variables, lustStagePathOf('凛'), 0) as number;
          if (rinCurrentState > 0 && rinCurrentState % 2 !== 0) {
            const rinTriggerStage = (rinCurrentState + 1) / 2;
            const rinLustEventName = buildRinLustEventName(rinTriggerStage);

            await setStatValue(variables, '世界.随机事件[0]', rinLustEventName, '凛淫堕值触发');
            // 标记已触发：由奇数（待触发）变为偶数（已触发）
            _.set(variables, lustStagePathOf('凛'), rinCurrentState + 1);

            return; // 本轮仅触发一个事件
          }
        }

        // 再尝试"紫音"的淫堕事件
        if (config.roleEnabled['紫音']) {
          const ziyinCurrentState: number = _.get(variables, lustStagePathOf('紫音'), 0) as number;
          if (ziyinCurrentState > 0 && ziyinCurrentState % 2 !== 0) {
            const ziyinTriggerStage = (ziyinCurrentState + 1) / 2;
            const ziyinLustEventName = buildZiyinLustEventName(ziyinTriggerStage);

            await setStatValue(variables, '世界.随机事件[0]', ziyinLustEventName, '紫音淫堕值触发');
            // 紫音淫堕阶段2触发时，设置心魔为0
            if (ziyinTriggerStage === 2) {
              await setStatValue(variables, '紫音.心魔[0]', 0, '紫音淫堕阶段2触发');
            }
            // 标记已触发：由奇数（待触发）变为偶数（已触发）
            _.set(variables, lustStagePathOf('紫音'), ziyinCurrentState + 1);

            return; // 本轮仅触发一个事件
          }
        }

        // 否则尝试触发角色事件
        outer: for (const role of ROLES) {
          if (!config.roleEnabled[role]) continue;

          const currentState: number = _.get(variables, stagePathOf(role), 0) as number;
          // 状态值为奇数，表示“已达到但未触发”
          if (currentState > 0 && currentState % 2 !== 0) {
            const triggerStage = (currentState + 1) / 2;
            const eventName = buildEventName(role, triggerStage);

            await setStatValue(variables, '世界.随机事件[0]', eventName, '好感事件触发');
            // 紫音 第三阶段（便利店圣女）触发时，仅在心魔为初始值2时设置心魔为 1
            if (role === '紫音' && triggerStage === 3) {
              const currentXinmo = getStatValue<number>(variables, '紫音.心魔[0]', 2);
              // 只有心魔为初始值2(被心魔困扰)时才设置为1(正在面对心魔)，避免覆盖淫堕事件设置的0
              if (currentXinmo === 2) {
                await setStatValue(variables, '紫音.心魔[0]', 1, '便利店圣女触发');
              }
            }
            // 状态+1，变为“已触发”的偶数值（显式持久化）
            _.set(variables, stagePathOf(role), currentState + 1);

            break outer; // 每轮只触发一个
          }
        }
      }
    }
  } catch (error) {
    console.error('[好感事件触发器] 运行出错:', error);
  }
}

eventOn(
  typeof Mvu !== 'undefined' ? Mvu.events.VARIABLE_UPDATE_ENDED : 'mag_variable_update_ended',
  trySyncStagesAndTriggerEvent,
);
