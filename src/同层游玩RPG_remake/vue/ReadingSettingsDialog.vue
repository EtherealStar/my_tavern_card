<!-- @ts-nocheck -->
<template>
  <div class="modal-mask" @click.self="$emit('close')">
    <div class="modal-card settings-dialog">
      <button class="close-btn" @click="$emit('close')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" />
        </svg>
      </button>

      <div class="modal-body">
        <div class="modal-title">
          <div class="text-xl font-bold text-purple-800">阅读设置</div>
          <div class="mt-1 text-sm text-purple-600">自定义您的阅读体验</div>
        </div>

        <div class="settings-content">
          <!-- 字体选择 -->
          <div class="setting-group">
            <label class="setting-label">字体</label>
            <select v-model="settings.fontFamily" class="setting-input" @change="applySettings">
              <option value="system-ui, -apple-system, 'Microsoft YaHei', 'PingFang SC', sans-serif">系统默认</option>
              <option value="'Noto Serif SC', 'Source Han Serif SC', serif">思源宋体</option>
              <option value="'LXGW WenKai', 'STKaiti', cursive">霞鹜文楷</option>
              <option value="'Ma Shan Zheng', cursive">马善政楷书</option>
              <option value="Georgia, 'Times New Roman', serif">衬线字体</option>
              <option value="'Inter', 'Helvetica Neue', sans-serif">无衬线字体</option>
            </select>
          </div>

          <!-- 字号大小 -->
          <div class="setting-group">
            <label class="setting-label">字号大小：{{ settings.fontSize }}px</label>
            <input
              type="range"
              v-model.number="settings.fontSize"
              min="14"
              max="22"
              step="1"
              class="setting-slider"
              @input="applySettings"
            />
            <div class="slider-labels">
              <span>小</span>
              <span>中</span>
              <span>大</span>
            </div>
          </div>

          <!-- 行高 -->
          <div class="setting-group">
            <label class="setting-label">行高：{{ settings.lineHeight.toFixed(1) }}</label>
            <input
              type="range"
              v-model.number="settings.lineHeight"
              min="1.6"
              max="2.4"
              step="0.1"
              class="setting-slider"
              @input="applySettings"
            />
            <div class="slider-labels">
              <span>紧凑</span>
              <span>适中</span>
              <span>舒适</span>
            </div>
          </div>

          <!-- 文本宽度 -->
          <div class="setting-group">
            <label class="setting-label">文本宽度：{{ settings.maxWidth }}px</label>
            <input
              type="range"
              v-model.number="settings.maxWidth"
              min="600"
              max="1000"
              step="50"
              class="setting-slider"
              @input="applySettings"
            />
            <div class="slider-labels">
              <span>窄</span>
              <span>中</span>
              <span>宽</span>
            </div>
          </div>

          <!-- 段落间距 -->
          <div class="setting-group">
            <label class="setting-label">段落间距：{{ settings.paragraphSpacing }}px</label>
            <input
              type="range"
              v-model.number="settings.paragraphSpacing"
              min="12"
              max="32"
              step="4"
              class="setting-slider"
              @input="applySettings"
            />
            <div class="slider-labels">
              <span>紧密</span>
              <span>适中</span>
              <span>宽松</span>
            </div>
          </div>

          <!-- 预览区域 -->
          <div class="preview-section">
            <div class="preview-title">预览效果</div>
            <div class="preview-content" :style="previewStyle">
              <div class="preview-paragraph user">这是一条用户输入的示例消息，用于预览当前的字体和排版设置效果。</div>
              <div class="preview-paragraph assistant">
                这是AI回复的示例文本。在女尊世界大冒险中，你将体验独特的冒险故事。文字排版的舒适度直接影响阅读体验，选择适合自己的设置可以让长时间阅读更加愉悦。
              </div>
            </div>
          </div>
        </div>

        <!-- 底部按钮 -->
        <div class="button-grid">
          <button class="btn primary" @click="saveSettings">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              />
            </svg>
            保存设置
          </button>
          <button class="btn" @click="resetSettings">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                clip-rule="evenodd"
              />
            </svg>
            重置默认
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive } from 'vue';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

// 默认设置
const DEFAULT_SETTINGS = {
  fontFamily: "system-ui, -apple-system, 'Microsoft YaHei', 'PingFang SC', sans-serif",
  fontSize: 16,
  lineHeight: 2.0,
  maxWidth: 900,
  paragraphSpacing: 20,
};

// 当前设置
const settings = reactive({ ...DEFAULT_SETTINGS });

// 预览样式
const previewStyle = computed(() => ({
  fontFamily: settings.fontFamily,
  fontSize: `${settings.fontSize}px`,
  lineHeight: String(settings.lineHeight),
  maxWidth: `${settings.maxWidth}px`,
}));

// 从 localStorage 加载设置
function loadSettings() {
  try {
    const saved = localStorage.getItem('rpg_reading_settings');
    if (saved) {
      Object.assign(settings, JSON.parse(saved));
      applySettings();
    }
  } catch (error) {
    console.error('[ReadingSettings] 加载设置失败:', error);
  }
}

// 应用设置到页面
function applySettings() {
  try {
    const root = document.getElementById('rpg-root');
    if (root) {
      root.style.setProperty('--reading-font-family', settings.fontFamily);
      root.style.setProperty('--reading-font-size', `${settings.fontSize}px`);
      root.style.setProperty('--reading-line-height', String(settings.lineHeight));
      root.style.setProperty('--reading-max-width', `${settings.maxWidth}px`);
      root.style.setProperty('--reading-paragraph-spacing', `${settings.paragraphSpacing}px`);
    }
  } catch (error) {
    console.error('[ReadingSettings] 应用设置失败:', error);
  }
}

// 保存设置
function saveSettings() {
  try {
    localStorage.setItem('rpg_reading_settings', JSON.stringify(settings));
    applySettings();
    emit('close');

    // 显示成功提示
    const ui = (window as any).__RPG_UI_SERVICE__;
    if (ui?.showSuccess) {
      ui.showSuccess('设置已保存');
    } else {
      // 降级方案：使用 toastr
      if (typeof toastr !== 'undefined') {
        toastr.success('设置已保存');
      }
    }
  } catch (error) {
    console.error('[ReadingSettings] 保存设置失败:', error);
    const ui = (window as any).__RPG_UI_SERVICE__;
    if (ui?.showError) {
      ui.showError('保存设置失败');
    }
  }
}

// 重置设置
function resetSettings() {
  Object.assign(settings, DEFAULT_SETTINGS);
  applySettings();
}

onMounted(() => {
  loadSettings();
});
</script>

<style scoped>
.settings-dialog {
  width: min(90vw, 500px);
  max-height: min(90vh, 700px);
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 0;
}

.setting-group {
  margin-bottom: 24px;
}

.setting-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.setting-input {
  width: 100%;
  padding: 8px 12px;
  border: 2px solid var(--border-color);
  border-radius: 6px;
  font-size: 14px;
  background: white;
  transition: all 0.2s;
}

.setting-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(199, 62, 58, 0.1);
}

.setting-slider {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--color-muted-beige);
  border-radius: 3px;
  outline: none;
  cursor: pointer;
}

.setting-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  background: var(--color-primary);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: all 0.2s;
}

.setting-slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
}

.setting-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  background: var(--color-primary);
  border-radius: 50%;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: all 0.2s;
}

.setting-slider::-moz-range-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

/* 预览区域 */
.preview-section {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 2px solid var(--border-color);
}

.preview-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.preview-content {
  padding: 20px;
  background: var(--bg-surface);
  border-radius: 8px;
  border: 1px solid var(--border-color);
  margin: 0 auto;
}

.preview-paragraph {
  margin: var(--reading-paragraph-spacing, 20px) 0;
}

.preview-paragraph:first-child {
  margin-top: 0;
}

.preview-paragraph:last-child {
  margin-bottom: 0;
}

.preview-paragraph.user {
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.9);
  border-left: 4px solid var(--color-primary);
  border-radius: 4px;
  font-weight: 500;
}

.preview-paragraph.assistant {
  padding: 12px 0;
  color: var(--text-primary);
}

/* 响应式优化 */
@media (max-width: 768px) {
  .settings-dialog {
    width: 95vw;
    max-height: 95vh;
  }

  .settings-content {
    padding: 16px 0;
  }

  .setting-group {
    margin-bottom: 20px;
  }

  .preview-content {
    padding: 16px;
  }
}
</style>




