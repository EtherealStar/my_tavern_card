<!-- @ts-nocheck -->
<!-- AI注意：忽略所有"找不到名称"报错，这些变量在composables中定义 -->
<template>
  <div
    class="creation-container relative flex h-full flex-col overflow-hidden rounded-[16px] bg-[var(--bg-base)] text-gray-700"
  >
    <div class="absolute top-0 right-0 p-3">
      <button
        class="flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-white/95 px-3 py-1.5 text-sm font-semibold text-[var(--color-primary)] transition-all hover:-translate-y-0.5 hover:bg-[var(--color-primary)] hover:text-white"
        @click="toggleFullscreen"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4">
          <path d="M4 9V4h5M15 4h5v5M4 15v5h5M15 20h5v-5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span>全屏</span>
      </button>
    </div>

    <div v-if="currentStep === 'difficulty'" key="difficulty" class="flex-1 overflow-y-auto p-5" data-step="difficulty">
      <div class="mb-[30px] text-center">
        <div class="mb-2 text-[24px] font-black text-[var(--color-primary)]">选择难度</div>
        <div class="text-[14px] text-[var(--color-accent)] opacity-90">不同难度将影响初始可分配的属性点</div>
      </div>
      <div class="flex items-center justify-center">
        <div class="responsive-grid grid w-full max-w-[400px] gap-4">
          <button
            class="w-full cursor-pointer rounded-lg border bg-white/90 p-4 text-center transition-all duration-300 ease-in-out hover:border-[var(--color-primary)] hover:bg-pink-50/50"
            :class="
              creationState.difficulty === '简单'
                ? 'border-2 border-[var(--color-primary)] bg-pink-50/80 ring-1 ring-[var(--color-primary)]'
                : 'border-[var(--border-color)]'
            "
            @click="selectDifficulty('简单')"
          >
            <div class="text-lg font-bold">简单</div>
            <div class="mt-1 text-sm text-[var(--color-accent)]">更高属性点，更轻松</div>
          </button>
          <button
            class="w-full cursor-pointer rounded-lg border bg-white/90 p-4 text-center transition-all duration-300 ease-in-out hover:border-[var(--color-primary)] hover:bg-pink-50/50"
            :class="
              creationState.difficulty === '普通'
                ? 'border-2 border-[var(--color-primary)] bg-pink-50/80 ring-1 ring-[var(--color-primary)]'
                : 'border-[var(--border-color)]'
            "
            @click="selectDifficulty('普通')"
          >
            <div class="text-lg font-bold">普通</div>
            <div class="mt-1 text-sm text-[var(--color-accent)]">标准体验</div>
          </button>
          <button
            class="w-full cursor-pointer rounded-lg border bg-white/90 p-4 text-center transition-all duration-300 ease-in-out hover:border-[var(--color-primary)] hover:bg-pink-50/50"
            :class="
              creationState.difficulty === '困难'
                ? 'border-2 border-[var(--color-primary)] bg-pink-50/80 ring-1 ring-[var(--color-primary)]'
                : 'border-[var(--border-color)]'
            "
            @click="selectDifficulty('困难')"
          >
            <div class="text-lg font-bold">困难</div>
            <div class="mt-1 text-sm text-[var(--color-accent)]">更具挑战</div>
          </button>
        </div>
      </div>
    </div>

    <div
      v-else-if="currentStep === 'expansions'"
      key="expansions"
      class="flex-1 overflow-y-auto p-5"
      data-step="expansions"
    >
      <div class="mb-[30px] text-center">
        <div class="mb-2 text-[24px] font-black text-[var(--color-primary)]">世界扩展</div>
        <div class="text-[14px] text-[var(--color-accent)] opacity-90">为当前世界启用可选扩展（可多选）</div>
      </div>
      <div class="flex items-center justify-center">
        <div class="responsive-grid grid w-full max-w-[400px] gap-4">
          <button
            v-for="exp in expansionList"
            :key="exp.id"
            class="w-full rounded-lg border bg-white/90 p-4 text-center"
            :class="
              creationState.expansions.has(exp.id)
                ? 'border-2 border-[var(--color-primary)] bg-pink-50/80 ring-1 ring-[var(--color-primary)]'
                : 'border-[var(--border-color)]'
            "
            @click="toggleExpansion(exp.id)"
          >
            <div class="text-lg font-bold">{{ exp.name }}</div>
            <div class="mt-1 text-sm text-[var(--color-accent)]">{{ exp.desc }}</div>
          </button>
        </div>
      </div>
    </div>

    <div
      v-else-if="currentStep === 'attributes'"
      key="attributes"
      class="flex flex-1 flex-col overflow-y-auto p-5"
      data-step="attributes"
    >
      <div class="mb-[30px] text-center">
        <div class="mb-2 text-[24px] font-black text-[var(--color-primary)]">分配属性与出身</div>
        <div class="text-[14px] text-[var(--color-accent)] opacity-90">
          剩余点数：<span class="text-lg font-bold text-pink-500">{{ creationState.attributes.pointsLeft }}</span>
        </div>
      </div>
      <div class="responsive-attributes-grid mx-auto grid w-full max-w-3xl flex-1 grid-cols-1 gap-8 lg:grid-cols-2">
        <div class="flex flex-col gap-4">
          <div v-for="k in attrKeys" :key="k" class="grid grid-cols-[80px_1fr_40px] items-center gap-3">
            <label class="font-semibold">{{ attrNameMap[k] }}</label>
            <input
              class="h-2 w-full cursor-pointer appearance-none rounded-full bg-pink-200/80"
              type="range"
              min="0"
              :max="maxAttr"
              :value="creationState.attributes[k]"
              @input="onAttrSlide(k, $event)"
            />
            <input
              class="w-full rounded-md border border-gray-300 text-center"
              type="number"
              min="0"
              :max="maxAttr"
              :value="creationState.attributes[k]"
              @input="onAttrNumber(k, $event)"
            />
          </div>
        </div>
        <div class="flex flex-col">
          <div class="mb-4">
            <div class="text-[18px] font-bold">选择出身</div>
            <div class="text-[12px] text-gray-500">不同出身有不同的属性加成，也会影响故事线</div>
          </div>
          <div class="grid h-full content-start gap-3 overflow-y-auto">
            <div
              v-for="bg in backgroundList"
              :key="bg.id"
              class="cursor-pointer rounded-lg border p-3 transition-all"
              :class="
                creationState.background?.id === bg.id
                  ? 'border-2 border-[var(--color-primary)] bg-pink-50/80 ring-1 ring-[var(--color-primary)]'
                  : 'border-[var(--border-color)] bg-white/80 hover:border-[var(--color-primary)] hover:bg-pink-50/50'
              "
              @click="selectBackground(bg)"
            >
              <div class="flex items-baseline justify-between">
                <div class="font-bold">{{ bg.name }}</div>
              </div>
              <div class="mt-1 text-sm text-gray-600">{{ bg.description }}</div>
              <div v-if="bg.genderRestrictions || bg.raceRestrictions" class="mt-2 text-xs text-blue-600">
                <div v-if="bg.genderRestrictions">性别限制：{{ bg.genderRestrictions.join('、') }}</div>
                <div v-if="bg.raceRestrictions">种族限制：{{ bg.raceRestrictions.join('、') }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="currentStep === 'identity'" key="identity" class="flex-1 overflow-y-auto p-5" data-step="identity">
      <div class="mb-[30px] text-center">
        <div class="mb-2 text-[24px] font-black text-[var(--color-primary)]">选择性别与种族</div>
        <div class="text-[14px] text-[var(--color-accent)] opacity-90">请选择您的性别与种族</div>
      </div>
      <div class="mx-auto flex w-full max-w-md flex-col items-center gap-8">
        <div>
          <div class="mb-3 text-lg font-bold">性别</div>
          <div v-if="creationState.background?.genderRestrictions" class="mb-2 text-xs text-amber-600">
            当前出身限制：{{ creationState.background.genderRestrictions.join('、') }}
          </div>
          <div class="grid grid-cols-2 gap-3">
            <button
              v-for="gender in ['男性', '女性', '男生女相', '扶她'] as const"
              :key="gender"
              class="rounded-lg border p-3 transition-colors"
              :class="[
                creationState.gender === gender
                  ? 'border-2 border-[var(--color-primary)] bg-pink-50/80 ring-1 ring-[var(--color-primary)]'
                  : 'border-[var(--border-color)] bg-white/80 hover:bg-pink-50/50',
                !availableGenders.includes(gender) ? 'cursor-not-allowed bg-gray-100 opacity-50' : '',
              ]"
              :disabled="!availableGenders.includes(gender)"
              @click="selectGender(gender)"
            >
              {{ gender }}
            </button>
          </div>
        </div>
        <div>
          <div class="mb-3 text-lg font-bold">种族</div>
          <div v-if="creationState.background?.raceRestrictions" class="mb-2 text-xs text-amber-600">
            当前出身限制：{{ creationState.background.raceRestrictions.join('、') }}
          </div>
          <div class="grid grid-cols-3 gap-3">
            <button
              v-for="race in ['人族', '灵族', '妖族'] as const"
              :key="race"
              class="rounded-lg border p-3 transition-colors"
              :class="[
                creationState.race === race
                  ? 'border-2 border-[var(--color-primary)] bg-pink-50/80 ring-1 ring-[var(--color-primary)]'
                  : 'border-[var(--border-color)] bg-white/80 hover:bg-pink-50/50',
                !availableRaces.includes(race) ? 'cursor-not-allowed bg-gray-100 opacity-50' : '',
              ]"
              :disabled="!availableRaces.includes(race)"
              @click="selectRace(race)"
            >
              {{ race }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="currentStep === 'opening'" key="opening" class="flex-1 overflow-y-auto p-5" data-step="opening">
      <div class="mb-[30px] text-center">
        <div class="mb-2 text-[24px] font-black text-[var(--color-primary)]">选择开局</div>
        <div class="text-[14px] text-[var(--color-accent)] opacity-90">你可以从预置开局中选择，或自定义开局</div>
      </div>
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <!-- 左侧：预置开局 -->
        <div>
          <div class="mb-3 text-lg font-bold">预置开局</div>
          <div class="grid gap-3">
            <button
              v-for="op in openingList"
              :key="op.id"
              class="w-full cursor-pointer rounded-lg border bg-white/90 p-4 text-left transition-all duration-300 ease-in-out hover:border-[var(--color-primary)] hover:bg-pink-50/50"
              :class="
                selectedOpeningId === op.id
                  ? 'border-2 border-[var(--color-primary)] bg-pink-50/80 ring-1 ring-[var(--color-primary)]'
                  : 'border-[var(--border-color)]'
              "
              @click="selectOpeningPreset(op.id)"
            >
              <div class="text-lg font-bold">{{ op.name }}</div>
              <div class="mt-1 text-sm text-[var(--color-accent)]">{{ op.description }}</div>
            </button>
          </div>
        </div>
        <!-- 右侧：自定义 -->
        <div class="flex flex-col">
          <div class="mb-3 text-lg font-bold">自定义开局</div>
          <textarea
            class="min-h-[100px] flex-1 rounded-lg border border-gray-300 p-3 text-sm"
            v-model="customOpeningText"
            placeholder="输入你想要的开局..."
            @input="onCustomOpeningInput"
          />
        </div>
      </div>
    </div>

    <div
      class="bottom-navigation flex flex-shrink-0 items-center justify-between rounded-b-[16px] border-t border-[rgba(220,177,140,0.3)] bg-white/95 px-5 py-4 backdrop-blur-[12px]"
    >
      <div class="flex items-center justify-center gap-3">
        <div
          class="h-2 w-8 rounded-full transition-colors"
          :class="currentStep === 'difficulty' ? 'bg-[var(--color-primary)]' : 'bg-gray-300'"
        ></div>
        <div
          class="h-2 w-8 rounded-full transition-colors"
          :class="currentStep === 'expansions' ? 'bg-[var(--color-primary)]' : 'bg-gray-300'"
        ></div>
        <div
          class="h-2 w-8 rounded-full transition-colors"
          :class="currentStep === 'attributes' ? 'bg-[var(--color-primary)]' : 'bg-gray-300'"
        ></div>
        <div
          class="h-2 w-8 rounded-full transition-colors"
          :class="currentStep === 'identity' ? 'bg-[var(--color-primary)]' : 'bg-gray-300'"
        ></div>
        <div
          class="h-2 w-8 rounded-full transition-colors"
          :class="currentStep === 'opening' ? 'bg-[var(--color-primary)]' : 'bg-gray-300'"
        ></div>
      </div>
      <div class="flex gap-3">
        <button
          class="rounded-lg border border-[rgba(220,177,140,0.4)] bg-white/90 px-5 py-2 text-sm font-semibold text-[var(--color-primary)] backdrop-blur-sm transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:bg-pink-50/50 hover:shadow-lg disabled:transform-none disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="!canPrev"
          @click="prev"
        >
          上一步
        </button>
        <button
          v-if="currentStep !== 'opening'"
          class="rounded-lg border border-[rgba(220,177,140,0.4)] bg-white/90 px-5 py-2 text-sm font-semibold text-[var(--color-primary)] backdrop-blur-sm transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:bg-pink-50/50 hover:shadow-lg disabled:transform-none disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="!canNext"
          @click="next"
        >
          下一步
        </button>
        <button
          v-else
          class="rounded-lg border border-[var(--color-primary)] bg-[var(--color-primary)] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-pink-500/20 backdrop-blur-sm transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:bg-pink-500 hover:shadow-xl hover:shadow-pink-500/30 disabled:transform-none disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="!canStart"
          @click="openSaveModal"
        >
          开始游戏
        </button>
        <button
          class="rounded-lg border border-gray-300 bg-gray-100 px-5 py-2 text-sm font-semibold text-gray-600 backdrop-blur-sm transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:border-gray-400 hover:bg-gray-200/80 hover:shadow-lg disabled:transform-none disabled:cursor-not-allowed disabled:opacity-50"
          @click="backMenu"
        >
          返回
        </button>
      </div>
    </div>

    <!-- 创建完成时的命名弹窗 -->
    <div v-if="showSaveModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div class="w-full max-w-sm rounded-2xl bg-white/95 p-6 shadow-2xl backdrop-blur-lg">
        <div class="text-xl font-bold text-[var(--color-primary)]">创建存档</div>
        <div class="mt-4">
          <div class="relative">
            <input
              class="w-full rounded-lg border p-3 text-sm transition-colors"
              :class="
                nameError
                  ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                  : 'border-gray-300 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]'
              "
              v-model="saveName"
              placeholder="输入存档名"
              @input="clearNameError"
            />
            <div v-if="nameError" class="absolute top-full left-0 mt-1 text-xs text-red-500">{{ nameError }}</div>
          </div>
        </div>
        <div class="mt-6 flex justify-end gap-3">
          <button
            class="rounded-lg border border-[var(--color-primary)] bg-[var(--color-primary)] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-pink-500/20 backdrop-blur-sm transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:bg-pink-500 hover:shadow-xl hover:shadow-pink-500/30 disabled:transform-none disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="isSaving"
            @click="handleConfirmCreateSave"
          >
            确定
          </button>
          <button
            class="rounded-lg border border-gray-300 bg-gray-100 px-5 py-2 text-sm font-semibold text-gray-600 backdrop-blur-sm transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:border-gray-400 hover:bg-gray-200/80 hover:shadow-lg disabled:transform-none disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="isSaving"
            @click="cancelCreateSave"
          >
            取消
          </button>
        </div>
      </div>
    </div>

    <!-- 首条生成等待遮罩 -->
    <div
      v-if="isBootstrapping"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <div class="flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl bg-white/95 p-6 text-center shadow-2xl">
        <div
          class="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent"
        ></div>
        <div class="text-[16px] font-semibold text-[var(--color-primary)]">正在生成开局内容</div>
        <div class="text-[12px] text-gray-600">{{ bootstrapMsg }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { useGameStateManager } from '同层游玩RPG_remake/composables/useGameStateManager';
import { useCharacterCreation } from '../composables/useCharacterCreation';
import { useGlobalState } from '../composables/useGlobalState';
import { usePlayingLogic } from '../composables/usePlayingLogic';
import { usePromptInjector } from '../composables/usePromptInjector';
import { useSaveLoad } from '../composables/useSaveLoad';
import { useWorldbookToggle } from '../composables/useWorldbookToggle';
import { TYPES } from '../core/ServiceIdentifiers';
import { getBackgroundsForWorld } from '../data/backgrounds';
import { getOpeningsForWorld } from '../data/openings';
import { getWorldExpansions } from '../data/worldExpansions';
import {
  ATTRIBUTE_KEYS,
  ATTRIBUTE_NAME_MAP,
  buildEmptyAttributes,
  DifficultySchema,
  GenderSchema,
  RaceSchema,
  validateAndCorrectAttributes,
  type AttributeKey,
  type Background,
} from '../models/CreationSchemas';
import type { SameLayerService } from '../services/SameLayerService';
import type { SaveLoadManagerService } from '../services/SaveLoadManagerService';
const saveLoad = useSaveLoad();
const characterCreation = useCharacterCreation();
const gameState = useGameStateManager();
const { applyBackgroundToggles, applyExpansionToggles } = useWorldbookToggle();
const globalState = useGlobalState();
const emitEvent = (event: string, payload?: any) => {
  try {
    globalState.getEventBus()?.emit?.(event, payload);
  } catch (error) {
    console.warn('[CreationRoot] emitEvent failed:', event, payload, error);
  }
};
const injector = usePromptInjector();

// 使用 usePlayingLogic 获取 postProcessMessage 函数
// 注意：这里只使用 postProcessMessage，不依赖 messages 数组
// 因为创建阶段的消息会在切换到 playing 界面后通过正常流程加载
const { postProcessMessage } = usePlayingLogic();

// 从composables获取方法
const { createNewEmptySave } = saveLoad;

// 服务注入
const sameLayerService = inject<SameLayerService>(TYPES.SameLayerService);
const saveLoadManager = inject<SaveLoadManagerService>(TYPES.SaveLoadManagerService);

// 创建状态
const creationState = ref({
  difficulty: null as '简单' | '普通' | '困难' | null,
  world: '现代：阴阳师' as const,
  expansions: new Set<string>(),
  attributes: buildEmptyAttributes(20),
  background: null as Background | null,
  gender: null as '男性' | '女性' | '男生女相' | '扶她' | null,
  race: null as '人族' | '灵族' | '妖族' | null,
  opening: {
    selectedId: '' as string,
    customText: '' as string,
  },
});

// 属性相关 - 使用统一的属性顺序
const attrKeys = ATTRIBUTE_KEYS;
const attrNameMap = ATTRIBUTE_NAME_MAP;

// 确保ATTRIBUTE_KEYS可用
if (!attrKeys || !Array.isArray(attrKeys)) {
  console.error('ATTRIBUTE_KEYS is not properly imported:', attrKeys);
}

// 计算属性
const maxAttr = computed(() => {
  if (creationState.value.difficulty === '简单') return 30;
  if (creationState.value.difficulty === '困难') return 15;
  return 20;
});

const backgroundList = computed(() => getBackgroundsForWorld('现代：阴阳师'));

const expansionList = computed(() => getWorldExpansions('现代：阴阳师'));

// 开局预置列表
const openingList = computed(() => getOpeningsForWorld('现代：阴阳师'));

// 自定义开局校验
const customOpeningText = computed({
  get: () => creationState.value.opening.customText,
  set: v => (creationState.value.opening.customText = v),
});
const selectedOpeningId = computed({
  get: () => creationState.value.opening.selectedId,
  set: v => (creationState.value.opening.selectedId = v),
});
const customOpeningError = ref('');

const selectOpeningPreset = (id: string) => {
  selectedOpeningId.value = id;
  // 选择预置则清空自定义
  if (customOpeningText.value) {
    customOpeningText.value = '';
    customOpeningError.value = '';
  }
};

const onCustomOpeningInput = () => {
  // 自定义时，清空预置选择
  if (selectedOpeningId.value) {
    selectedOpeningId.value = '';
  }
  const t = (customOpeningText.value || '').trim();
  if (!t) {
    customOpeningError.value = '';
    return;
  }
  if (t.length < 10) {
    customOpeningError.value = '自定义开局过短，建议至少10字';
  } else if (t.length > 2000) {
    customOpeningError.value = '自定义开局过长，请控制在2000字以内';
  } else {
    customOpeningError.value = '';
  }
};

const canProceed = computed(() => {
  switch (currentStep.value) {
    case 'difficulty':
      return creationState.value.difficulty !== null;
    case 'expansions':
      return true;
    case 'attributes':
      return creationState.value.attributes.pointsLeft === 0 && creationState.value.background !== null;
    case 'identity':
      return creationState.value.gender !== null && creationState.value.race !== null;
    case 'opening': {
      const t = (creationState.value.opening.customText || '').trim();
      const hasCustom = t.length >= 10 && t.length <= 2000 && !customOpeningError.value;
      const hasPreset = !!creationState.value.opening.selectedId;
      return hasCustom || hasPreset;
    }
    default:
      return false;
  }
});

const canNext = computed(() => canProceed.value);

const canStart = computed(
  () =>
    creationState.value.difficulty &&
    creationState.value.attributes.pointsLeft === 0 &&
    creationState.value.gender &&
    creationState.value.race &&
    (Boolean(creationState.value.opening.selectedId) ||
      ((creationState.value.opening.customText || '').trim().length >= 10 && !customOpeningError.value)),
);

// 根据选择的出身计算可选的性别
const availableGenders = computed(() => {
  const allGenders: Array<'男性' | '女性' | '男生女相' | '扶她'> = ['男性', '女性', '男生女相', '扶她'];

  if (!creationState.value.background?.genderRestrictions) {
    return allGenders;
  }

  return allGenders.filter(gender => creationState.value.background!.genderRestrictions!.includes(gender));
});

// 根据选择的出身计算可选的种族
const availableRaces = computed(() => {
  const allRaces: Array<'人族' | '灵族' | '妖族'> = ['人族', '灵族', '妖族'];

  if (!creationState.value.background?.raceRestrictions) {
    return allRaces;
  }

  return allRaces.filter(race => creationState.value.background!.raceRestrictions!.includes(race));
});

// 步骤管理
type Step = 'difficulty' | 'expansions' | 'attributes' | 'identity' | 'opening';
const steps: Step[] = ['difficulty', 'expansions', 'attributes', 'identity', 'opening'];
const currentStep = ref<Step>('difficulty');

const canPrev = computed(() => steps.indexOf(currentStep.value) > 0);
const isLast = computed(() => steps.indexOf(currentStep.value) >= steps.length - 1);

// 角色创建方法
const selectDifficulty = async (raw: string) => {
  const parsed = DifficultySchema.safeParse(raw);
  if (!parsed.success) {
    console.info('[CreationRoot] 选择无效: 请选择有效的难度');
    return;
  }

  creationState.value.difficulty = parsed.data;
  const max = maxAttr.value;
  const res = validateAndCorrectAttributes(buildEmptyAttributes(max), max);
  creationState.value.attributes = res.data ?? buildEmptyAttributes(max);

  emitEvent('creation:difficulty-selected', { difficulty: parsed.data });

  if (currentStep.value === 'difficulty') {
    currentStep.value = 'expansions';
  }
};

const selectBackground = async (bg: Background) => {
  creationState.value.background = bg;

  // 应用出身世界书开关
  if (bg.id) {
    try {
      const result = await applyBackgroundToggles(bg.id);
      if (!result.success) {
        console.warn('[CreationRoot] 应用出身世界书开关失败:', result.error);
        // 世界书开关失败不影响出身选择，只记录警告
      }
    } catch (error) {
      console.error('[CreationRoot] 应用出身世界书开关异常:', error);
      // 世界书开关失败不影响出身选择，只记录错误
    }
  }

  emitEvent('creation:background-selected', { background: bg });
};

const toggleExpansion = async (id: string) => {
  const now = new Set(creationState.value.expansions);
  if (now.has(id)) {
    now.delete(id);
  } else {
    now.add(id);
  }
  creationState.value.expansions = now;

  // 只发送事件通知扩展状态变化，世界书开关将在离开扩展选择步骤时统一应用
  emitEvent('creation:expansions-changed', { selected: [...now] });
};

/**
 * 应用扩展世界书开关（在离开扩展选择步骤时调用）
 */
const applyExpansionTogglesLocal = async (): Promise<void> => {
  try {
    const selectedExpansions = Array.from(creationState.value.expansions);
    const result = await applyExpansionToggles('现代：阴阳师', selectedExpansions);

    if (result.success) {
      console.log('[CreationRoot] 扩展世界书开关应用成功');
    } else {
      console.warn('[CreationRoot] 扩展世界书开关应用失败:', result.error);
      // 扩展开关失败不影响角色创建流程，只记录警告
    }
  } catch (error) {
    console.error('[CreationRoot] 应用扩展世界书开关异常:', error);
    // 扩展开关失败不影响角色创建流程，只记录错误
  }
};

const selectGender = (raw: string) => {
  const parsed = GenderSchema.safeParse(raw);
  if (!parsed.success) {
    console.info('[CreationRoot] 选择无效: 请选择有效的性别');
    return;
  }

  // 检查是否被出身限制
  if (!availableGenders.value.includes(parsed.data)) {
    console.info('[CreationRoot] 选择受限: 该性别与当前出身不兼容');
    return;
  }

  creationState.value.gender = parsed.data;
  emitEvent('creation:gender-selected', { gender: parsed.data });
};

const selectRace = (raw: string) => {
  const parsed = RaceSchema.safeParse(raw);
  if (!parsed.success) {
    console.info('[CreationRoot] 选择无效: 请选择有效的种族');
    return;
  }

  // 检查是否被出身限制
  if (!availableRaces.value.includes(parsed.data)) {
    console.info('[CreationRoot] 选择受限: 该种族与当前出身不兼容');
    return;
  }

  creationState.value.race = parsed.data;
  emitEvent('creation:race-selected', { race: parsed.data });
};

const onAttrSlide = (k: AttributeKey, e: Event) => {
  const target = e.target as HTMLInputElement;
  const desired = Math.max(0, Math.floor(Number(target.value) || 0));
  clampAndApply(k, desired);
};

const onAttrNumber = (k: AttributeKey, e: Event) => {
  const target = e.target as HTMLInputElement;
  const desired = Math.max(0, Math.floor(Number(target.value) || 0));
  clampAndApply(k, desired);
};

const clampAndApply = (key: AttributeKey, desired: number) => {
  const max = maxAttr.value;
  const raw: Partial<Record<AttributeKey | 'pointsLeft', number>> = {};
  for (const k of attrKeys) raw[k] = creationState.value.attributes[k];

  const sumOthers = attrKeys.filter(k => k !== key).reduce((acc, k) => acc + (raw[k] || 0), 0);
  const remaining = Math.max(0, max - sumOthers);
  const clamped = Math.min(desired, remaining);
  raw[key] = clamped;

  const result = validateAndCorrectAttributes(raw, max);
  if (!result.success || !result.data) return;
  creationState.value.attributes = result.data;
};

const prev = () => {
  const idx = steps.indexOf(currentStep.value);
  if (idx > 0) currentStep.value = steps[idx - 1];
};

const next = async () => {
  const idx = steps.indexOf(currentStep.value);
  if (idx < steps.length - 1 && canProceed.value) {
    // 如果当前是扩展选择步骤，在进入下一步前应用扩展世界书开关
    if (currentStep.value === 'expansions') {
      await applyExpansionTogglesLocal();
    }

    currentStep.value = steps[idx + 1];
  }
};

// 存档管理状态
const showSaveModal = ref(false);
const saveName = ref('我的大冒险');
const isSaving = ref(false);
const nameError = ref('');

// 首次生成等待态
const isBootstrapping = ref(false);
const bootstrapMsg = ref('正在准备开局...');
const retryCount = ref(0);

const openSaveModal = () => {
  saveName.value = '我的大冒险';
  nameError.value = '';
  showSaveModal.value = true;
};

const cancelCreateSave = () => {
  if (isSaving.value) return;
  showSaveModal.value = false;
};

const clearNameError = () => {
  if (nameError.value) {
    nameError.value = '';
  }
};

// 处理存档创建确认
async function handleConfirmCreateSave() {
  if (isSaving.value) return;

  const name = (saveName.value || '').trim() || '我的大冒险';
  nameError.value = '';
  isSaving.value = true;

  try {
    // 使用改进的 createNewEmptySave 函数创建存档，获取返回的存档信息
    const createResult = await createNewEmptySave(name);
    if (!createResult.success) {
      if (createResult.error === 'DUPLICATE_NAME') {
        nameError.value = '已存在同名存档，请更改名称';
      } else {
        console.warn('[CreationRoot] 创建存档失败', createResult.error || '请稍后重试');
      }
      return;
    }

    showSaveModal.value = false;

    // 准备角色创建数据
    const creationData = {
      difficulty: creationState.value.difficulty!,
      world: creationState.value.world!,
      expansions: Array.from(creationState.value.expansions),
      attributes: creationState.value.attributes,
      background: creationState.value.background?.name,
      gender: creationState.value.gender!,
      race: creationState.value.race!,
    };

    console.log('[CreationRoot] 开始处理角色创建数据:', creationData);

    // 直接调用 useCharacterCreation 组合式函数处理数据并应用 MVU 变量
    const processSuccess = await characterCreation.processCreationData(creationData);

    if (!processSuccess) {
      console.error('[CreationRoot] 角色创建数据处理失败');
      console.warn('[CreationRoot] 角色创建失败', characterCreation.creationError.value || '请稍后重试');
      return;
    }

    console.log('[CreationRoot] 角色创建数据处理成功，MVU变量已应用');

    // 生成首条消息（等待界面 + 3次重试）
    const slotId = createResult.slotId!;
    if (!slotId || !sameLayerService || !saveLoadManager) {
      console.warn('[CreationRoot] 启动游戏失败', '服务不可用或存档无效');
      return;
    }

    // 组装开局提示词并注入为系统提示
    let openingPrompt = (creationState.value.opening.customText || '').trim();
    if (!openingPrompt) {
      const preset = openingList.value.find(p => p.id === creationState.value.opening.selectedId);
      openingPrompt = preset?.prompt || '';
    }
    if (openingPrompt) {
      try {
        injector.addSystemHintNext(openingPrompt, { priority: 100, source: 'opening' });
      } catch (e) {
        console.warn('[CreationRoot] 注入开局提示词失败，将继续生成:', e);
      }
    }

    isBootstrapping.value = true;
    retryCount.value = 0;
    let generated = false;
    let lastError: any = null;

    while (retryCount.value < 3 && !generated) {
      const attempt = retryCount.value + 1;
      bootstrapMsg.value = `正在生成开局内容（第 ${attempt} 次尝试）...`;
      try {
        // 收集下轮注入（含上面的系统提示）
        const injects = (injector as any)?.collectForNextGeneration?.() || undefined;
        // 使用非流式一次性拿结果；user_input 留空串代表"开始"
        const result = await sameLayerService.generateWithSaveHistorySync(
          { user_input: '', slotId },
          undefined,
          injects,
        );

        // 使用统一的 postProcessMessage 进行后处理
        // 这会自动处理：应用MVU数据变更、格式化总结、保存到存档等
        // 传入 slotId 确保在游戏状态切换前也能正确保存消息
        bootstrapMsg.value = '正在处理消息数据...';
        const postProcessSuccess = await postProcessMessage('', result, slotId);

        if (!postProcessSuccess) {
          throw new Error('消息后处理失败');
        }

        generated = true;
        bootstrapMsg.value = '开局内容生成完成';
      } catch (err: any) {
        console.error('[CreationRoot] 开局生成失败:', err);
        lastError = err;
        retryCount.value += 1;
        if (retryCount.value < 3) {
          bootstrapMsg.value = `生成失败，准备第 ${retryCount.value + 1} 次重试...`;
          // 简单退避
          await new Promise(r => setTimeout(r, 800 * retryCount.value));
        }
      }
    }

    if (!generated) {
      isBootstrapping.value = false;
      console.warn('[CreationRoot] 创建开局失败', '已重试 3 次仍失败，请稍后重试');
      console.warn('[CreationRoot] 开局生成连续失败:', lastError);
      return;
    }

    // 先更新创建数据到游戏状态
    gameState.setCreationData(creationData);

    // 然后切换到游戏状态
    const transitionSuccess = await gameState.transitionToPlaying(createResult.saveName || name, createResult.slotId);

    if (!transitionSuccess) {
      console.warn('[CreationRoot] 启动游戏失败');
      return;
    }

    console.log('[CreationRoot] 游戏状态切换成功，角色创建完成');
  } catch (error: any) {
    console.error('[CreationRoot] 创建存档异常:', error);
    console.warn('[CreationRoot] 创建存档失败', error?.message || '请稍后重试');
    globalState.clearPendingSaveData();
  } finally {
    isSaving.value = false;
    isBootstrapping.value = false;
  }
}

async function backMenu() {
  try {
    // 使用组合式函数返回开始界面
    const success = await gameState.transitionToInitial();

    if (!success) {
      console.warn('[CreationRoot] 返回主菜单失败');
    }
  } catch (error) {
    console.error('[CreationRoot] Failed to go back to menu:', error);
    console.warn('[CreationRoot] 返回主菜单失败');
  }
}

async function toggleFullscreen() {
  try {
    const rpgRoot = document.getElementById('rpg-root');
    if (!rpgRoot) return;

    const isFullscreen = rpgRoot.classList.contains('fullscreen');

    if (isFullscreen) {
      // 退出全屏
      rpgRoot.classList.remove('fullscreen');
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } else {
      // 进入全屏
      rpgRoot.classList.add('fullscreen');
      try {
        await rpgRoot.requestFullscreen();
      } catch {
        // 浏览器全屏失败，使用CSS全屏
      }
    }
  } catch {
    // 忽略错误
  }
}

// 组件生命周期
onMounted(async () => {
  // 使用 nextTick 确保 DOM 完全更新
  await nextTick();
  // CSS 修复后不再需要 JavaScript 强制布局调整
});

onUnmounted(() => {
  // 清理工作（如果需要的话）
});
</script>

<style scoped>
@import '../index.css';

/* CreationRoot组件特定样式 - 通用样式已移至index.css */
</style>
