<!-- @ts-nocheck -->
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
        <div class="text-[14px] text-[var(--color-accent)] opacity-90">不同难度将影响初始可分配的属性点与天命点</div>
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
            <div class="mt-1 text-sm text-[var(--color-accent)]">更高天命与属性点，更轻松</div>
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

    <div v-else-if="currentStep === 'world'" key="world" class="flex-1 overflow-y-auto p-5" data-step="world">
      <div class="mb-[30px] text-center">
        <div class="mb-2 text-[24px] font-black text-[var(--color-primary)]">选择世界</div>
        <div class="text-[14px] text-[var(--color-accent)] opacity-90">不同世界拥有不同的背景与遭遇</div>
      </div>
      <div class="flex items-center justify-center">
        <div class="responsive-grid grid w-full max-w-[400px] gap-4">
          <button
            class="w-full cursor-pointer rounded-lg border bg-white/90 p-4 text-center transition-all duration-300 ease-in-out hover:border-[var(--color-primary)] hover:bg-pink-50/50"
            :class="
              creationState.world === '现代：阴阳师'
                ? 'border-2 border-[var(--color-primary)] bg-pink-50/80 ring-1 ring-[var(--color-primary)]'
                : 'border-[var(--border-color)]'
            "
            @click="selectWorld('现代：阴阳师')"
          >
            <div class="text-lg font-bold">现代：阴阳师</div>
            <div class="mt-1 text-sm text-[var(--color-accent)]">现代都市与阴阳师传说</div>
          </button>
          <button
            class="w-full cursor-pointer rounded-lg border bg-white/90 p-4 text-center transition-all duration-300 ease-in-out hover:border-[var(--color-primary)] hover:bg-pink-50/50"
            :class="
              creationState.world === '西幻'
                ? 'border-2 border-[var(--color-primary)] bg-pink-50/80 ring-1 ring-[var(--color-primary)]'
                : 'border-[var(--border-color)]'
            "
            @click="selectWorld('西幻')"
          >
            <div class="text-lg font-bold">西幻</div>
            <div class="mt-1 text-sm text-[var(--color-accent)]">剑与魔法的大陆</div>
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
                <div class="text-xs text-amber-700">花费 {{ bg.cost }}</div>
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
          :class="currentStep === 'world' ? 'bg-[var(--color-primary)]' : 'bg-gray-300'"
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
          v-if="!isLast"
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
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useGameServices } from '../composables/useGameServices';
import { useGameStateManager } from '../composables/useGameStateManager';
import { useSaveLoad } from '../composables/useSaveLoad';
import { useWorldbookToggle } from '../composables/useWorldbookToggle';
import { getBackgroundsForWorld } from '../data/backgrounds';
import { getWorldExpansions } from '../data/worldExpansions';
import {
  ATTRIBUTE_KEYS,
  ATTRIBUTE_NAME_MAP,
  buildEmptyAttributes,
  DifficultySchema,
  GameWorldSchema,
  GenderSchema,
  RaceSchema,
  validateAndCorrectAttributes,
  type AttributeKey,
  type Background,
} from '../models/CreationSchemas';
// 获取 composables
const { createNewEmptySave } = useSaveLoad();
const { showError, showInfo, emitEvent } = useGameServices();
const gameStateManager = useGameStateManager();
const { applyBackgroundToggles, applyExpansionToggles } = useWorldbookToggle();

// 创建状态
const creationState = ref({
  difficulty: null as '简单' | '普通' | '困难' | null,
  world: null as '现代：阴阳师' | '西幻' | null,
  expansions: new Set<string>(),
  attributes: buildEmptyAttributes(20),
  background: null as Background | null,
  gender: null as '男性' | '女性' | '男生女相' | '扶她' | null,
  race: null as '人族' | '灵族' | '妖族' | null,
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

const backgroundList = computed(() =>
  creationState.value.world ? getBackgroundsForWorld(creationState.value.world) : [],
);

const expansionList = computed(() => (creationState.value.world ? getWorldExpansions(creationState.value.world) : []));

const canProceed = computed(() => {
  switch (currentStep.value) {
    case 'difficulty':
      return creationState.value.difficulty !== null;
    case 'world':
      return creationState.value.world !== null;
    case 'expansions':
      return true;
    case 'attributes':
      return creationState.value.attributes.pointsLeft === 0;
    case 'identity':
      return creationState.value.gender !== null && creationState.value.race !== null;
    default:
      return false;
  }
});

const canNext = computed(() => canProceed.value);

const canStart = computed(
  () =>
    creationState.value.difficulty &&
    creationState.value.world &&
    creationState.value.attributes.pointsLeft === 0 &&
    creationState.value.gender &&
    creationState.value.race,
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
type Step = 'difficulty' | 'world' | 'expansions' | 'attributes' | 'identity';
const steps: Step[] = ['difficulty', 'world', 'expansions', 'attributes', 'identity'];
const currentStep = ref<Step>('difficulty');

const canPrev = computed(() => steps.indexOf(currentStep.value) > 0);
const isLast = computed(() => steps.indexOf(currentStep.value) >= steps.length - 1);

// 监听世界变化，重置相关状态
watch(
  () => creationState.value.world,
  () => {
    creationState.value.background = null;
    creationState.value.expansions = new Set();
  },
);

// 监听出身变化，自动调整性别和种族选择
watch(
  () => creationState.value.background,
  newBackground => {
    if (!newBackground) return;

    // 检查当前性别是否还可用
    if (creationState.value.gender && newBackground.genderRestrictions) {
      if (!newBackground.genderRestrictions.includes(creationState.value.gender)) {
        // 如果当前性别不可用，选择第一个可用的性别
        creationState.value.gender = availableGenders.value[0] || null;
      }
    }

    // 检查当前种族是否还可用
    if (creationState.value.race && newBackground.raceRestrictions) {
      if (!newBackground.raceRestrictions.includes(creationState.value.race)) {
        // 如果当前种族不可用，选择第一个可用的种族
        creationState.value.race = availableRaces.value[0] || null;
      }
    }
  },
);

// 角色创建方法
const selectDifficulty = async (raw: string) => {
  const parsed = DifficultySchema.safeParse(raw);
  if (!parsed.success) {
    showInfo('选择无效', '请选择有效的难度');
    return;
  }

  creationState.value.difficulty = parsed.data;
  const max = maxAttr.value;
  const res = validateAndCorrectAttributes(buildEmptyAttributes(max), max);
  creationState.value.attributes = res.data ?? buildEmptyAttributes(max);

  emitEvent?.('creation:difficulty-selected', { difficulty: parsed.data });

  if (currentStep.value === 'difficulty') {
    currentStep.value = 'world';
  }
};

const selectWorld = async (raw: string) => {
  const parsed = GameWorldSchema.safeParse(raw);
  if (!parsed.success) {
    showInfo('选择无效', '请选择有效的世界');
    return;
  }
  if (parsed.data !== '现代：阴阳师' && parsed.data !== '西幻') {
    showInfo('该世界即将开放', '目前只支持现代：阴阳师和西幻世界');
    return;
  }

  creationState.value.world = parsed.data;
  emitEvent?.('creation:world-selected', { world: parsed.data });

  if (currentStep.value === 'world') {
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

  emitEvent?.('creation:background-selected', { background: bg });
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
  emitEvent?.('creation:expansions-changed', { selected: [...now] });
};

/**
 * 应用扩展世界书开关（在离开扩展选择步骤时调用）
 */
const applyExpansionTogglesLocal = async (): Promise<void> => {
  if (!creationState.value.world) {
    console.warn('[CreationRoot] 无法应用扩展开关：未选择世界');
    return;
  }

  try {
    const selectedExpansions = Array.from(creationState.value.expansions);
    const result = await applyExpansionToggles(creationState.value.world, selectedExpansions);

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
    showInfo('选择无效', '请选择有效的性别');
    return;
  }

  // 检查是否被出身限制
  if (!availableGenders.value.includes(parsed.data)) {
    showInfo('选择受限', '该性别与当前出身不兼容');
    return;
  }

  creationState.value.gender = parsed.data;
  emitEvent?.('creation:gender-selected', { gender: parsed.data });
};

const selectRace = (raw: string) => {
  const parsed = RaceSchema.safeParse(raw);
  if (!parsed.success) {
    showInfo('选择无效', '请选择有效的种族');
    return;
  }

  // 检查是否被出身限制
  if (!availableRaces.value.includes(parsed.data)) {
    showInfo('选择受限', '该种族与当前出身不兼容');
    return;
  }

  creationState.value.race = parsed.data;
  emitEvent?.('creation:race-selected', { race: parsed.data });
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
        showError('创建存档失败', createResult.error || '请稍后重试');
      }
      return;
    }

    showSaveModal.value = false;

    // 使用新的状态管理器进行状态切换，传递 slotId
    const creationData = {
      difficulty: creationState.value.difficulty || undefined,
      world: creationState.value.world || undefined,
      expansions: Array.from(creationState.value.expansions),
      attributes: creationState.value.attributes,
      background: creationState.value.background?.name || undefined,
      gender: creationState.value.gender || undefined,
      race: creationState.value.race || undefined,
    };

    const transitionSuccess = await gameStateManager.transitionToPlaying({
      saveName: createResult.saveName || name,
      slotId: createResult.slotId, // 传递新创建的 slotId
      creationData,
    });

    if (!transitionSuccess) {
      showError('启动游戏失败');
      return;
    }

    // 确保初始化文本
    setTimeout(() => {
      const storyPayload = {
        difficulty: creationState.value.difficulty,
        world: creationState.value.world,
        expansions: Array.from(creationState.value.expansions),
        attributes: creationState.value.attributes,
        background: creationState.value.background?.name,
        gender: creationState.value.gender,
        race: creationState.value.race,
      };
      emitEvent?.('game:init-story', storyPayload);
    }, 0);
  } catch (error: any) {
    console.error('[CreationRoot] 创建存档异常:', error);
    showError('创建存档失败', error?.message || '请稍后重试');
  } finally {
    isSaving.value = false;
  }
}

async function backMenu() {
  try {
    // 使用新的状态管理器返回开始界面
    const success = await gameStateManager.transitionToInitial();

    if (!success) {
      showError('返回主菜单失败');
    }
  } catch (error) {
    console.error('[CreationRoot] Failed to go back to menu:', error);
    showError('返回主菜单失败');
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

// 窗口大小变化监听
let resizeObserver: ResizeObserver | null = null;

// 组件生命周期
onMounted(async () => {
  // 使用 nextTick 确保 DOM 完全更新后再进行布局调整
  await nextTick();

  // 强制重新计算布局，确保底部导航栏正确定位
  const resetLayout = () => {
    const container = document.querySelector('.creation-container') as HTMLElement;
    const bottomNav = document.querySelector('.bottom-navigation') as HTMLElement;

    if (container && bottomNav) {
      // 重置容器布局
      container.style.display = 'none';
      container.offsetHeight; // 强制重排
      container.style.display = '';

      // 确保底部导航栏正确定位
      bottomNav.style.position = '';
      bottomNav.style.bottom = '';
      bottomNav.offsetHeight; // 强制重排

      // 重新应用 sticky 定位
      requestAnimationFrame(() => {
        bottomNav.style.position = 'sticky';
        bottomNav.style.bottom = '0';
      });
    }
  };

  // 立即执行一次
  resetLayout();

  // 延迟执行一次，确保所有样式都已应用
  setTimeout(resetLayout, 100);

  // 添加窗口大小变化监听
  const handleResize = () => {
    setTimeout(resetLayout, 50);
  };

  window.addEventListener('resize', handleResize);

  // 使用 ResizeObserver 监听容器大小变化
  const container = document.querySelector('.creation-container');
  if (container && window.ResizeObserver) {
    resizeObserver = new ResizeObserver(() => {
      setTimeout(resetLayout, 50);
    });
    resizeObserver.observe(container);
  }
});

onUnmounted(() => {
  // 清理事件监听器
  window.removeEventListener('resize', () => {});

  // 清理 ResizeObserver
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
});
</script>

<style scoped>
@import '../index.css';

/* CreationRoot组件特定样式 - 通用样式已移至index.css */
</style>
