/**
 * 变量修正脚本
 * 用于检测和修正AI不正确修改变量的问题
 *
 * 问题场景：
 * - 发送给AI的stat_data中经验值为0
 * - AI知道经验值为0，但在返回时将其改为50
 * - 然后对50使用_.add函数增加，display_data显示为50->55
 * - 实际应该是0->5
 *
 * 解决方案：
 * - 保存发送给AI时的原始stat_data
 * - 检查display_data中的"前一个数值"是否与原始值相同
 * - 如果不同，则将display_data中的值替换为原始值
 */

// 保存发送给AI时的原始stat_data
let originalStatData: Record<string, any> = {};
let isMessageSending = false;

// 获取用户键名
const userKey = substitudeMacros('<user>');

/**
 * 保存原始stat_data
 * 在发送消息给AI之前调用
 */
function saveOriginalStatData() {
  try {
    const variables = getVariables({ type: 'chat' });
    if (variables && variables.stat_data) {
      // 深度复制原始数据，避免引用问题
      originalStatData = _.cloneDeep(variables.stat_data);
      console.log('已保存原始stat_data:', originalStatData);
    }
  } catch (error) {
    console.error('保存原始stat_data时出错:', error);
  }
}

/**
 * 检查并修正display_data中的变量
 * 在接收AI回复后调用
 */
function correctDisplayData() {
  try {
    const variables = getVariables({ type: 'chat' });
    if (!variables || !variables.display_data || !originalStatData) {
      return;
    }

    const displayData = variables.display_data;
    let correctedCount = 0;

    // 遍历display_data，检查每个变量
    for (const [path, value] of Object.entries(displayData)) {
      if (Array.isArray(value) && value.length > 0 && _.has(originalStatData, path)) {
        const originalValue = _.get(originalStatData, path);
        const displayValue = value[0]; // display_data中的"前一个数值"

        // 检查值是否被AI修改
        if (displayValue !== originalValue) {
          // AI修改了原始值，需要修正
          const oldValue = value[0];
          value[0] = originalValue;
          correctedCount++;

          console.warn(`修正变量 ${path}: ${oldValue} -> ${originalValue}`);

          // 记录修正日志
          logCorrection(path, oldValue, originalValue);
        }
      }
    }

    if (correctedCount > 0) {
      console.log(`共修正了 ${correctedCount} 个变量`);
    }
  } catch (error) {
    console.error('修正display_data时出错:', error);
  }
}

/**
 * 记录变量修正日志
 */
function logCorrection(path: string, oldValue: any, newValue: any) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    path,
    oldValue,
    newValue,
    userKey,
  };

  console.log('变量修正日志:', logEntry);
}

/**
 * 检查变量是否被AI修改
 * @param path 变量路径
 * @param currentValue 当前值
 * @returns 是否被修改
 */
function isVariableModified(path: string, currentValue: any): boolean {
  if (!originalStatData || !_.has(originalStatData, path)) {
    return false;
  }

  const originalValue = _.get(originalStatData, path);
  return currentValue !== originalValue;
}

/**
 * 获取变量的原始值
 * @param path 变量路径
 * @returns 原始值
 */
function getOriginalValue(path: string): any {
  if (!originalStatData || !_.has(originalStatData, path)) {
    return null;
  }

  return _.get(originalStatData, path);
}

/**
 * 重置原始数据
 * 在需要重新开始跟踪时调用
 */
function resetOriginalData() {
  originalStatData = {};
  console.log('已重置原始数据');
}

/**
 * 获取修正统计信息
 */
function getCorrectionStats() {
  const variables = getVariables({ type: 'chat' });
  if (!variables || !variables.display_data || !originalStatData) {
    return { total: 0, corrected: 0, details: [] };
  }

  const displayData = variables.display_data;
  const details: Array<{ path: string; original: any; current: any; corrected: boolean }> = [];
  let correctedCount = 0;

  for (const [path, value] of Object.entries(displayData)) {
    if (Array.isArray(value) && value.length > 0 && _.has(originalStatData, path)) {
      const originalValue = _.get(originalStatData, path);
      const currentValue = value[0];
      const corrected = currentValue !== originalValue;

      details.push({
        path,
        original: originalValue,
        current: currentValue,
        corrected,
      });

      if (corrected) {
        correctedCount++;
      }
    }
  }

  return {
    total: details.length,
    corrected: correctedCount,
    details,
  };
}

// 事件监听函数

/**
 * 消息发送前事件处理
 * 保存原始stat_data
 */
function onMessageSending() {
  isMessageSending = true;
  saveOriginalStatData();
  console.log('消息发送前：已保存原始stat_data');
}

/**
 * 消息接收后事件处理
 * 检查并修正display_data
 */
function onMessageReceived() {
  if (isMessageSending) {
    // 延迟执行，确保display_data已更新
    setTimeout(() => {
      correctDisplayData();
      isMessageSending = false;
      console.log('消息接收后：已检查并修正display_data');
    }, 100);
  }
}

/**
 * 变量更新事件处理
 * 在变量更新过程中进行额外检查
 */
function onVariableUpdateStarted(variables: any, out_is_updated: boolean) {
  // 如果正在发送消息，不进行额外处理
  if (isMessageSending) {
    return;
  }

  // 可以在这里添加额外的变量保护逻辑
  console.log('变量更新开始');
}

function onVariableUpdated(stat_data: any, path: string, oldValue: any, newValue: any) {
  // 如果正在发送消息，不进行额外处理
  if (isMessageSending) {
    return;
  }

  // 检查变量是否被AI修改
  if (isVariableModified(path, newValue)) {
    const originalValue = getOriginalValue(path);
    console.warn(`检测到变量被修改: ${path}`, {
      original: originalValue,
      old: oldValue,
      new: newValue,
    });
  }
}

function onVariableUpdateEnded(variables: any, out_is_updated: boolean) {
  // 如果正在发送消息，不进行额外处理
  if (isMessageSending) {
    return;
  }

  console.log('变量更新结束');
}

// 注册事件监听器
eventOn('mag_variable_update_started', onVariableUpdateStarted);
eventOn('mag_variable_updated', onVariableUpdated);
eventOn('mag_variable_update_ended', onVariableUpdateEnded);

// 监听消息发送和接收事件
// 注意：这些事件名称可能需要根据实际情况调整
eventOn('message_sending', onMessageSending);
eventOn('message_received', onMessageReceived);

// 导出函数供外部调用
(window as any).variableCorrection = {
  saveOriginalStatData,
  correctDisplayData,
  isVariableModified,
  getOriginalValue,
  resetOriginalData,
  getCorrectionStats,
};

console.log('变量修正脚本已加载');
