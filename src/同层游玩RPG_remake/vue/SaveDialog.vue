<!-- @ts-nocheck -->
<template>
  <div class="modal-mask">
    <div class="modal-card" :class="{ fullscreen: isFullscreen }">
      <div class="modal-body">
        <!-- 标题区域 -->
        <div class="modal-title">
          <div class="mb-2 text-2xl font-bold text-purple-800">冒险之旅</div>
          <div class="text-sm text-purple-600">存档选择</div>
        </div>

        <!-- 存档列表区域 -->
        <div class="save-list min-h-0 flex-1">
          <div v-if="saves.length > 0" class="space-y-3">
            <label
              v-for="it in saves"
              :key="it.slotId"
              :class="[
                selected.value?.has(it.slotId)
                  ? 'border-2 border-[var(--color-primary)] bg-pink-50/80 ring-1 ring-[var(--color-primary)]'
                  : '',
                expandedSlots.has(it.slotId) ? 'expanded' : '',
              ]"
              @click="toggleExpand(it.slotId)"
            >
              <input type="checkbox" :checked="selected.value?.has(it.slotId)" @change.stop="toggleSelect(it.slotId)" />
              <div class="flex-1">
                <div class="font-semibold">
                  <template v-if="renamingId !== it.slotId">{{ it.name || '未命名存档' }}</template>
                  <template v-else>
                    <input v-model="renameInput" class="w-full rounded border px-2 py-1 text-sm" @click.stop />
                  </template>
                </div>
                <div class="preview-content text-xs text-gray-600">
                  {{ getPreviewText(it.preview, expandedSlots.has(it.slotId)) }}
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button v-if="renamingId !== it.slotId" class="btn-small" @click.stop="beginRename(it)">重命名</button>
                <template v-else>
                  <button class="btn-small" @click.stop="confirmRename(it)">确定</button>
                  <button class="btn-small" @click.stop="cancelRename">取消</button>
                </template>
                <button
                  v-if="renamingId !== it.slotId"
                  class="btn-small primary"
                  :disabled="busy.value"
                  @click.stop="onLoadSingle(it.slotId)"
                >
                  <span v-if="isLoading.value">读档中...</span>
                  <span v-else>读档</span>
                </button>
              </div>
            </label>
          </div>
          <div v-else class="py-8 text-center text-gray-500">暂无存档</div>
        </div>

        <!-- 按钮区域 - 2x2网格布局 -->
        <div class="button-grid">
          <!-- 第一行 -->
          <button class="btn btn-select" :disabled="busy.value" @click="toggleSelectAll">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clip-rule="evenodd"
              />
            </svg>
            {{ isAllSelected ? '全不选' : '全选' }}
          </button>
          <button class="btn btn-danger" :disabled="selected.value?.size === 0 || busy.value" @click="onDelete">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clip-rule="evenodd" />
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clip-rule="evenodd"
              />
            </svg>
            删除选中
          </button>

          <!-- 第二行 -->
          <button class="btn btn-import" :disabled="busy.value" @click="onImport">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                clip-rule="evenodd"
              />
            </svg>
            导入存档
          </button>
          <button class="btn btn-export" :disabled="selected.value?.size !== 1 || busy.value" @click="onExport">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z"
                clip-rule="evenodd"
              />
            </svg>
            导出存档
          </button>
        </div>

        <!-- 创建新存档按钮 - 单独一行 -->
        <button v-if="props.mode === 'playing'" class="btn btn-create" :disabled="busy.value" @click="onCreateNew">
          <svg fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
              clip-rule="evenodd"
            />
          </svg>
          创建新存档
        </button>

        <!-- 返回按钮 -->
        <button class="btn return-btn" :disabled="busy.value" @click="onClose">
          <svg fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
              clip-rule="evenodd"
            />
          </svg>
          返回
        </button>

        <input ref="fileRef" type="file" accept="application/json" class="hidden" @change="onPickFile" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
/* eslint-disable */
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useGameServices } from '../composables/useGameServices';
import { useSaveLoad } from '../composables/useSaveLoad';

// 声明全局函数类型
declare const getVariables: (options?: { type?: string }) => Promise<any>;

type SaveSummary = { slotId: string; name: string; preview: string; updatedAt: string; exists: boolean };

interface Props {
  mode: 'start' | 'playing';
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'start',
});
const emit = defineEmits<{ (e: 'close'): void; (e: 'loaded', data: any): void }>();
function onClose() {
  try {
    emit('close');
  } catch {}
}

// 使用组合式函数
const { showSuccess, showError, showWarning } = useGameServices();
const {
  refreshSaveList,
  deleteSelectedSaves,
  renameSaveWithFeedback,
  loadSaveWithFeedback,
  createNewSaveWithManualMode,
  createNewEmptySave,
  getCurrentSaveInfo,
  isServiceAvailable: isSaveLoadAvailable,
} = useSaveLoad();

const saves = ref<SaveSummary[]>([]);
const selected = ref<Set<string>>(new Set<string>());
const busy = ref(false);
const isLoading = ref(false);
const renamingId = ref<string | null>(null);
const renameInput = ref('');
const fileRef = ref<HTMLInputElement | null>(null);
const isMounted = ref(true);
const isFullscreen = ref(false);
const expandedSlots = ref<Set<string>>(new Set<string>());

// 计算属性：是否全选
const isAllSelected = computed(() => {
  return saves.value.length > 0 && selected.value?.size === saves.value.length;
});

// 检测是否全屏
function checkFullscreen() {
  try {
    isFullscreen.value =
      document.fullscreenElement !== null ||
      (document as any).webkitFullscreenElement !== null ||
      (document as any).mozFullScreenElement !== null ||
      (document as any).msFullscreenElement !== null;
  } catch {
    isFullscreen.value = false;
  }
}

// 切换展开状态
function toggleExpand(slotId: string) {
  const currentExpanded = expandedSlots.value || new Set<string>();
  const s = new Set(currentExpanded);
  if (s.has(slotId)) {
    s.delete(slotId);
  } else {
    s.add(slotId);
  }
  expandedSlots.value = s;
}

// 获取预览文本
function getPreviewText(preview: string, isExpanded: boolean) {
  if (!preview) return '暂无预览内容';

  if (isExpanded) {
    return preview;
  } else {
    // 限制为大约10个字符
    return preview.length > 10 ? preview.substring(0, 10) + '...' : preview;
  }
}

async function refresh() {
  try {
    // 使用组合式函数的包装方法
    if (isSaveLoadAvailable()) {
      saves.value = await refreshSaveList();
    } else {
      console.error('[SaveDialog] SaveLoadManagerService不可用');
      saves.value = [];
    }
  } catch (error) {
    console.error('[SaveDialog] 刷新存档列表失败:', error);
    saves.value = [];
  }
}

function toggleSelect(id: string) {
  const currentSelected = selected.value || new Set<string>();
  const s = new Set(currentSelected);
  if (s.has(id)) s.delete(id);
  else s.add(id);
  selected.value = s;
}

// 全选/全不选功能
function toggleSelectAll() {
  if (isAllSelected.value) {
    selected.value = new Set();
  } else {
    selected.value = new Set(saves.value.map(s => s.slotId));
  }
}

function beginRename(it: SaveSummary) {
  renamingId.value = it.slotId;
  renameInput.value = it.name || '';
}
async function confirmRename(it: SaveSummary) {
  try {
    busy.value = true;

    // 使用组合式函数的包装方法
    if (isSaveLoadAvailable()) {
      const success = await renameSaveWithFeedback(it.slotId, String(renameInput.value || '').trim());
      if (!success) {
        showError('重命名失败');
        return;
      }
    } else {
      console.error('[SaveDialog] SaveLoadManagerService不可用，无法重命名');
      showError('重命名失败', '重命名服务不可用');
      return;
    }

    if (isMounted.value) {
      renamingId.value = null;
      renameInput.value = '';
      await refresh();
    }
  } catch {
    if (isMounted.value) {
      showError('重命名失败');
    }
  } finally {
    if (isMounted.value) {
      busy.value = false;
    }
  }
}
function cancelRename() {
  renamingId.value = null;
  renameInput.value = '';
}

async function onLoad() {
  const currentSelected = selected.value || new Set<string>();
  const ids = [...currentSelected];
  if (ids.length !== 1) return;

  try {
    busy.value = true;

    // 使用组合式函数的包装方法
    if (isSaveLoadAvailable()) {
      const loadResult = await loadSaveWithFeedback(ids[0]);
      if (!loadResult.success || !loadResult.data) {
        return showError('读档失败', loadResult.error || '未找到存档');
      }

      // 检查组件是否仍然挂载
      if (isMounted.value) {
        emit('loaded', loadResult.data);
      }
    } else {
      console.error('[SaveDialog] SaveLoadManagerService不可用，无法读档');
      showError('读档失败', '读档服务不可用');
      return;
    }
  } catch {
    if (isMounted.value) {
      showError('读档失败');
    }
  } finally {
    if (isMounted.value) {
      busy.value = false;
    }
  }
}

async function onLoadSingle(slotId: string) {
  try {
    isLoading.value = true;
    busy.value = true;

    // 使用组合式函数的包装方法
    if (isSaveLoadAvailable()) {
      // 1. 获取存档数据
      const loadResult = await loadSaveWithFeedback(slotId);
      if (!loadResult.success || !loadResult.data) {
        return showError('读档失败', loadResult.error || '未找到存档');
      }

      // 2. 读档数据验证
      console.log('[SaveDialog] 读档数据获取成功:', loadResult.data.name);

      // 3. 触发界面跳转
      if (isMounted.value) {
        emit('loaded', loadResult.data);
      }
    } else {
      console.error('[SaveDialog] SaveLoadManagerService不可用，无法读档');
      showError('读档失败', '读档服务不可用');
      return;
    }
  } catch (error) {
    console.error('[SaveDialog] 读档异常:', error);
    if (isMounted.value) {
      showError('读档失败', error instanceof Error ? error.message : '未知错误');
    }
  } finally {
    if (isMounted.value) {
      isLoading.value = false;
      busy.value = false;
    }
  }
}

async function onDelete() {
  const currentSelected = selected.value || new Set<string>();
  if (currentSelected.size === 0) return;
  if (!confirm('确定要删除所选存档吗？此操作不可恢复。')) return;

  try {
    busy.value = true;

    // 使用组合式函数的包装方法
    if (isSaveLoadAvailable()) {
      const success = await deleteSelectedSaves([...currentSelected]);
      if (!success) {
        showError('删除失败');
        return;
      }
    } else {
      console.error('[SaveDialog] SaveLoadManagerService不可用，无法删除存档');
      showError('删除失败', '删除服务不可用');
      return;
    }

    if (isMounted.value) {
      selected.value = new Set();
      await refresh();
      showSuccess('已删除');
    }
  } catch {
    if (isMounted.value) {
      showError('删除失败');
    }
  } finally {
    if (isMounted.value) {
      busy.value = false;
    }
  }
}

function onImport() {
  try {
    if (fileRef.value) fileRef.value.value = '';
    fileRef.value?.click();
  } catch {
    showWarning('导入存档', '暂未实现');
  }
}

function onPickFile(e: Event) {
  showWarning('导入存档', '暂未实现');
}

// 导出存档功能
async function onExport() {
  const currentSelected = selected.value || new Set<string>();
  const ids = [...currentSelected];
  if (ids.length !== 1) return;

  try {
    busy.value = true;

    if (isSaveLoadAvailable()) {
      const loadResult = await loadSaveWithFeedback(ids[0]);
      if (!loadResult.success || !loadResult.data) {
        return showError('导出失败', loadResult.error || '未找到存档');
      }

      const data = loadResult.data;
      // 创建下载链接
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${data.name || '存档'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showSuccess('导出成功');
    } else {
      console.error('[SaveDialog] SaveLoadManagerService不可用，无法导出存档');
      showError('导出失败', '导出服务不可用');
    }
  } catch (error) {
    console.error('[SaveDialog] 导出存档失败:', error);
    showError('导出失败');
  } finally {
    busy.value = false;
  }
}

async function onCreateNew() {
  try {
    busy.value = true;

    if (!isSaveLoadAvailable()) {
      console.error('[SaveDialog] SaveLoadManagerService不可用，无法创建存档');
      showError('创建存档失败', '创建服务不可用');
      return;
    }

    // 在游玩模式下，尝试基于当前存档创建备份
    if (props.mode === 'playing') {
      try {
        // 1. 获取当前存档信息
        const currentSaveInfo = await getCurrentSaveInfo();

        if (currentSaveInfo?.slotId && currentSaveInfo?.saveName) {
          // 2. 基于当前存档创建备份
          const success = await createNewSaveWithManualMode(currentSaveInfo.slotId, currentSaveInfo.saveName);
          if (success) {
            await refresh();
            showSuccess('已创建备份存档');
            return;
          } else {
            showError('创建备份存档失败');
            return;
          }
        } else {
          // 3. 如果没有当前存档，创建全新存档
          console.log('[SaveDialog] 没有找到当前存档，创建全新存档');
          const success = await createNewEmptySave('我的大冒险');
          if (success) {
            await refresh();
            showSuccess('已创建新存档');
            return;
          } else {
            showError('创建存档失败');
            return;
          }
        }
      } catch (error) {
        console.error('[SaveDialog] 获取当前存档信息失败:', error);
        // 降级到创建全新存档
        const success = await createNewEmptySave('我的大冒险');
        if (success) {
          await refresh();
          showSuccess('已创建新存档');
          return;
        } else {
          showError('创建存档失败');
          return;
        }
      }
    } else {
      // 在开始模式下，直接创建全新存档
      const success = await createNewEmptySave('我的大冒险');
      if (success) {
        await refresh();
        showSuccess('已创建新存档');
      } else {
        showError('创建存档失败');
      }
    }
  } catch (error) {
    console.error('[SaveDialog] 创建存档异常:', error);
    showError('创建存档失败');
  } finally {
    busy.value = false;
  }
}

onMounted(() => {
  isMounted.value = true;
  checkFullscreen();

  // 监听全屏状态变化
  document.addEventListener('fullscreenchange', checkFullscreen);
  document.addEventListener('webkitfullscreenchange', checkFullscreen);
  document.addEventListener('mozfullscreenchange', checkFullscreen);
  document.addEventListener('MSFullscreenChange', checkFullscreen);

  void refresh();
});

onUnmounted(() => {
  isMounted.value = false;

  // 移除全屏状态监听
  document.removeEventListener('fullscreenchange', checkFullscreen);
  document.removeEventListener('webkitfullscreenchange', checkFullscreen);
  document.removeEventListener('mozfullscreenchange', checkFullscreen);
  document.removeEventListener('MSFullscreenChange', checkFullscreen);
});
</script>

<style scoped>
@import '../index.css';
</style>
