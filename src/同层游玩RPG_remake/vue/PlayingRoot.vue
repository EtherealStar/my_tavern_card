<!-- @ts-nocheck -->
<template>
  <div ref="rootRef" class="playing-container rpg-app" :class="containerClass">
    <div class="main-content-grid">
      <aside class="left-sidebar">
        <!-- 世界信息 -->
        <div class="time-panel">
          <div class="rpg-title">世界信息</div>
          <div class="time-info">
            <div class="date-display">{{ currentDate }}</div>
            <div class="time-display">{{ currentTime }}</div>
            <div class="location-display">{{ currentLocation }}</div>
          </div>
        </div>

        <!-- 随机事件 -->
        <div v-if="isRandomEventActive" class="random-event-panel">
          <div class="rpg-title">随机事件</div>
          <div class="event-info">
            <div class="event-display">{{ currentRandomEvent }}</div>
          </div>
        </div>

        <!-- 个人信息 -->
        <div class="character-panel">
          <div class="user-avatar-wrap">
            <div class="avatar-square-container">
              <div class="avatar-wrapper">
                <div id="user-avatar" class="user_avatar"></div>
              </div>
              <div v-if="customAvatarUrl" class="custom-avatar">
                <img :src="customAvatarUrl" alt="自定义头像" />
              </div>
            </div>
          </div>
          <div class="character-title">{{ characterName }}</div>
          <!-- 角色基本信息 -->
          <div class="character-info">
            <div class="info-row">
              <span class="info-label">性别</span>
              <span class="info-value">{{ gender }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">种族</span>
              <span class="info-value">{{ race }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">年龄</span>
              <span class="info-value">{{ age }}</span>
            </div>
          </div>
        </div>

        <!-- 道基属性 -->
        <div class="attributes-panel">
          <div class="rpg-title">
            玩家属性
            <span v-if="isMvuDataLoaded" class="mvu-indicator" title="MVU 数据已加载"></span>
          </div>
          <div class="attributes-list">
            <div v-for="name in attrOrder" :key="name" class="attr-row">
              <span class="attr-name">{{ name }}</span>
              <div class="attr-value-container">
                <!-- 只显示当前属性值 -->
                <span
                  class="attr-value"
                  :class="{
                    highlight: isAttributeModified(name) || isMvuAttributeModified(name),
                    'mvu-modified': isMvuAttributeModified(name),
                  }"
                >
                  {{ getCurrentAttributeValue(name) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 装备状态 -->
        <div class="rpg-panel equipment-panel">
          <div class="rpg-title">
            装备状态
            <span v-if="isMvuDataLoaded" class="mvu-indicator" title="MVU 数据已加载"></span>
          </div>
          <div class="equipment-list">
            <div class="equip-row">
              <div class="equip-icon" v-html="icon('weapon')"></div>
              <div class="equip-info">
                <div class="equip-name">
                  {{ equipmentText(mvuEquipment.weapon || equipment.weapon, '武器') }}
                  <span v-if="mvuEquipment.weapon" class="mvu-data-indicator" title="来自 MVU 数据"></span>
                </div>
                <div class="equip-actions">
                  <button
                    v-if="mvuEquipment.weapon || equipment.weapon"
                    class="action-btn unequip-btn"
                    @click="addUnequipCommand('weapon')"
                    title="卸下武器"
                  >
                    卸下
                  </button>
                </div>
              </div>
            </div>
            <div class="equip-row">
              <div class="equip-icon" v-html="icon('armor')"></div>
              <div class="equip-info">
                <div class="equip-name">
                  {{ equipmentText(mvuEquipment.armor || equipment.armor, '防具') }}
                  <span v-if="mvuEquipment.armor" class="mvu-data-indicator" title="来自 MVU 数据">📊</span>
                </div>
                <div class="equip-actions">
                  <button
                    v-if="mvuEquipment.armor || equipment.armor"
                    class="action-btn unequip-btn"
                    @click="addUnequipCommand('armor')"
                    title="卸下防具"
                  >
                    卸下
                  </button>
                </div>
              </div>
            </div>
            <div class="equip-row">
              <div class="equip-icon" v-html="icon('accessory')"></div>
              <div class="equip-info">
                <div class="equip-name">
                  {{ equipmentText(mvuEquipment.accessory || equipment.accessory, '饰品') }}
                  <span v-if="mvuEquipment.accessory" class="mvu-data-indicator" title="来自 MVU 数据">📊</span>
                </div>
                <div class="equip-actions">
                  <button
                    v-if="mvuEquipment.accessory || equipment.accessory"
                    class="action-btn unequip-btn"
                    @click="addUnequipCommand('accessory')"
                    title="卸下饰品"
                  >
                    卸下
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 物品栏 -->
        <div class="rpg-panel inventory-panel" @click="openInventoryDialog">
          <div class="rpg-title">
            物品栏
            <span v-if="isMvuDataLoaded" class="mvu-indicator" title="MVU 数据已加载"></span>
          </div>
          <div v-if="getTotalInventoryCount() === 0" class="inventory-empty">
            <div class="empty-icon">📦</div>
            <div class="empty-text">背包为空</div>
            <div class="empty-hint">点击打开完整背包</div>
          </div>
          <div v-else class="inventory-scroll-container">
            <div class="inventory-grid">
              <div v-for="(item, index) in getDisplayInventoryItems()" :key="index" class="inventory-item">
                <div class="item-icon" v-html="item.icon || '📦'"></div>
                <div class="item-name">{{ item.name }}</div>
                <div class="item-count">{{ item.quantity || item.count || 1 }}</div>
                <span v-if="item.fromMvu" class="mvu-data-indicator" title="来自 MVU 数据"></span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="isNarrow" class="sidebar-actions">
          <button class="drawer-toggle-btn btn w-full" @click="leftOpen = !leftOpen">
            {{ leftOpen ? '◀ 收起' : '▶ 展开' }}
          </button>
        </div>
      </aside>

      <section class="center-pane">
        <!-- 标题区域 -->
        <div class="center-header" @mouseenter="showEventDetails = true" @mouseleave="showEventDetails = false">
          <div class="event-banner">
            <span class="event-label">当前事件</span>
            <div v-if="showEventDetails" class="event-expanded">
              <div class="event-name">{{ currentRandomEvent || '无' }}</div>
            </div>
          </div>
        </div>

        <div ref="scrollRef" class="novel-content" @scroll.passive="onScroll">
          <div class="space-y-4">
            <template v-for="item in renderItems" :key="item.key">
              <div
                class="paragraph"
                :class="[item.role, item.ephemeral ? 'error' : '']"
                @contextmenu.prevent="onContextMenu(item)"
              >
                <div v-html="item.html"></div>
              </div>
              <!-- 在用户消息和AI消息后都显示分隔线 -->
              <div v-if="item.role === 'user' || item.role === 'assistant'" class="turn-divider"></div>
            </template>

            <template v-if="isStreaming">
              <div class="paragraph streaming assistant">
                <div v-html="streamingHtml"></div>
              </div>
              <!-- 流式消息后也显示分隔线 -->
              <div class="turn-divider"></div>
            </template>
          </div>
        </div>

        <div class="composer group relative overflow-hidden transition-all duration-400">
          <div
            class="pointer-events-none absolute inset-0 animate-[spellCharge_4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-pink-100 to-transparent opacity-0 group-focus-within:opacity-100"
          ></div>

          <div class="relative z-10 flex items-center gap-3 p-4">
            <!-- 指令队列按钮 -->
            <button
              class="command-queue-btn relative flex flex-shrink-0 items-center justify-center rounded-xl border-2 border-pink-200 bg-white/90 backdrop-blur-sm transition-all duration-300 hover:border-pink-400 hover:bg-white/95 hover:shadow-[0_0_20px_rgba(255,144,151,0.3)] focus:border-pink-400 focus:bg-white/95 focus:shadow-[0_0_20px_rgba(255,144,151,0.3)] focus:outline-none"
              @click="showCommandQueueDialog = true"
              :title="`指令队列 (${commandQueueLength})`"
            >
              <svg class="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
              <!-- 队列数量指示器 -->
              <span
                v-if="commandQueueLength > 0"
                class="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white"
              >
                {{ commandQueueLength > 9 ? '9+' : commandQueueLength }}
              </span>
            </button>

            <textarea
              v-model="inputText"
              class="input flex-1 resize-none rounded-2xl border-2 border-pink-200 bg-white/90 px-4 py-2 text-purple-800 backdrop-blur-sm transition-all duration-300 placeholder:text-purple-400 focus:border-pink-400 focus:bg-white/95 focus:shadow-[0_0_20px_rgba(255,144,151,0.3)] focus:outline-none"
              placeholder="输入你的行动..."
              rows="2"
              @keydown.enter.exact.prevent="onSend"
              @keydown.enter.shift.stop
            />
            <div class="buttons flex flex-col gap-2">
              <button
                class="btn primary transform transition-all duration-300 hover:scale-105"
                :disabled="isBusy || !canSend"
                @click="onSend"
              >
                <span class="flex items-center gap-2">
                  <svg v-if="!isBusy" class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"
                    />
                  </svg>
                  <div
                    v-else
                    class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                  ></div>
                  {{ isBusy ? '施法中...' : '发送' }}
                </span>
              </button>
              <button v-if="isStreaming" class="btn" @click="onStop">停止</button>
            </div>
          </div>
        </div>
      </section>

      <aside class="right-sidebar">
        <!-- 全屏按钮 -->
        <div class="right-sidebar-header">
          <button class="fs-btn" @click="toggleFullscreen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 9V4h5M15 4h5v5M4 15v5h5M15 20h5v-5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span>全屏</span>
          </button>
        </div>

        <!-- 探索功能 -->
        <div class="menu-category">
          <div class="category-title">探索功能</div>
          <div class="menu-buttons">
            <button class="menu-btn" disabled>
              <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M12 1.586l-4 4v12.828l4-4V1.586zM3.707 3.293A1 1 0 002 4v10a1 1 0 00.293.707L6 18.414V5.586L3.707 3.293zM17.707 5.293L14 1.586v12.828l2.293 2.293A1 1 0 0018 16V6a1 1 0 00-.293-.707z"
                  clip-rule="evenodd"
                />
              </svg>
              地图
            </button>
            <button class="menu-btn" @click="openCharacter">
              <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
              </svg>
              人物
            </button>
            <button class="menu-btn" @click="openRelations">
              <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              关系
            </button>
          </div>
        </div>

        <!-- 游戏记录 -->
        <div class="menu-category">
          <div class="category-title">游戏记录</div>
          <div class="menu-buttons">
            <button class="menu-btn" disabled>
              <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path
                  fill-rule="evenodd"
                  d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z"
                  clip-rule="evenodd"
                />
              </svg>
              历史
            </button>
            <button class="menu-btn" disabled>
              <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                  clip-rule="evenodd"
                />
              </svg>
              日志
            </button>
          </div>
        </div>

        <!-- 系统功能 -->
        <div class="menu-category">
          <div class="category-title">系统功能</div>
          <div class="menu-buttons">
            <button class="menu-btn" @click="openSaveDialog">
              <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z"
                />
              </svg>
              存档
            </button>
            <button class="menu-btn" @click="openSettings">
              <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                  clip-rule="evenodd"
                />
              </svg>
              设置
            </button>
          </div>
        </div>

        <div v-if="isNarrow" class="mt-6">
          <button class="drawer-toggle-btn btn w-full" @click="rightOpen = !rightOpen">
            {{ rightOpen ? '▶ 收起' : '◀ 展开' }}
          </button>
        </div>
      </aside>
    </div>

    <button
      v-if="isNarrow && !leftOpen"
      class="drawer-toggle left fixed top-1/2 left-4 z-50 -translate-y-1/2 transform rounded-full bg-pink-400 p-2 text-white shadow-lg transition-all duration-300 hover:scale-110 hover:bg-pink-500"
      @click="leftOpen = !leftOpen"
    >
      ◀
    </button>
    <button
      v-if="isNarrow && !rightOpen"
      class="drawer-toggle right fixed top-1/2 right-4 z-50 -translate-y-1/2 transform rounded-full bg-pink-400 p-2 text-white shadow-lg transition-all duration-300 hover:scale-110 hover:bg-pink-500"
      @click="rightOpen = !rightOpen"
    >
      ▶
    </button>

    <div
      v-if="showSettings"
      class="modal-mask fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <div
        class="modal-card settings-modal transform animate-[subtleGlow_4s_ease-in-out_infinite_alternate] rounded-3xl bg-gradient-to-br from-white via-pink-50 to-white p-6 shadow-[var(--rune-glow)] transition-all duration-500 hover:scale-105"
      >
        <!-- 标题栏和关闭按钮 -->
        <div class="modal-header relative mb-4 flex items-center justify-between">
          <div class="modal-title text-xl font-bold text-purple-800">✦ 系统设置 ✦</div>
          <button
            class="close-btn flex h-8 w-8 items-center justify-center rounded-full bg-pink-100 text-pink-600 transition-all duration-200 hover:scale-110 hover:bg-pink-200 hover:text-pink-700"
            @click="showSettings = false"
            title="关闭设置"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="modal-body mb-4 max-h-[70vh] space-y-4 overflow-y-auto">
          <!-- 流式传输设置 -->
          <div class="setting-group">
            <label
              class="flex cursor-pointer items-center gap-2 rounded-lg bg-pink-50 p-3 transition-colors hover:bg-pink-100"
            >
              <input
                v-model="shouldStream"
                type="checkbox"
                class="h-4 w-4 rounded border-pink-300 text-pink-500 focus:ring-pink-200"
              />
              <span class="text-sm font-medium text-purple-700">流式传输</span>
            </label>
          </div>

          <!-- 智能历史管理设置 -->
          <div class="setting-group">
            <div class="setting-header mb-2">
              <h3 class="text-base font-semibold text-purple-800">智能历史管理</h3>
              <p class="text-xs text-purple-600">控制存档消息的处理方式和数量限制</p>
            </div>

            <div class="grid grid-cols-1 gap-3">
              <!-- 助手消息限制 -->
              <div class="setting-item">
                <label class="mb-1 block text-xs font-medium text-purple-700">助手消息限制</label>
                <input
                  v-model.number="smartHistorySettings.assistantMessageLimit"
                  type="number"
                  min="1"
                  max="1000"
                  class="w-full rounded-md border border-pink-200 px-2 py-1.5 text-sm focus:border-pink-400 focus:ring-1 focus:ring-pink-300"
                />
                <p class="mt-0.5 text-xs text-purple-500">最多保留的助手消息数量 (1-1000)</p>
              </div>

              <!-- 用户消息限制 -->
              <div class="setting-item">
                <label class="mb-1 block text-xs font-medium text-purple-700">用户消息限制</label>
                <input
                  v-model.number="smartHistorySettings.userMessageLimit"
                  type="number"
                  min="1"
                  max="1000"
                  class="w-full rounded-md border border-pink-200 px-2 py-1.5 text-sm focus:border-pink-400 focus:ring-1 focus:ring-pink-300"
                />
                <p class="mt-0.5 text-xs text-purple-500">最多保留的用户消息数量 (1-1000)</p>
              </div>

              <!-- 短摘要阈值 -->
              <div class="setting-item">
                <label class="mb-1 block text-xs font-medium text-purple-700">短摘要阈值</label>
                <input
                  v-model.number="smartHistorySettings.shortSummaryThreshold"
                  type="number"
                  min="1"
                  max="100"
                  class="w-full rounded-md border border-pink-200 px-2 py-1.5 text-sm focus:border-pink-400 focus:ring-1 focus:ring-pink-300"
                />
                <p class="mt-0.5 text-xs text-purple-500">超过此数量时使用短摘要 (1-100)</p>
              </div>

              <!-- 长摘要阈值 -->
              <div class="setting-item">
                <label class="mb-1 block text-xs font-medium text-purple-700">长摘要阈值</label>
                <input
                  v-model.number="smartHistorySettings.longSummaryThreshold"
                  type="number"
                  min="1"
                  max="100"
                  class="w-full rounded-md border border-pink-200 px-2 py-1.5 text-sm focus:border-pink-400 focus:ring-1 focus:ring-pink-300"
                />
                <p class="mt-0.5 text-xs text-purple-500">超过此数量时使用长摘要 (1-100)</p>
              </div>
            </div>

            <!-- 确定按钮 -->
            <div class="mt-3 flex justify-end">
              <button
                class="rounded-lg bg-pink-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:scale-105 hover:bg-pink-600 focus:ring-2 focus:ring-pink-300 focus:outline-none"
                @click="showSettings = false"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 右键菜单 -->
    <div
      v-if="contextMenu.visible"
      class="fixed z-50 min-w-[120px] rounded-md border border-gray-200 bg-white p-1 text-sm shadow-lg"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
    >
      <button class="block w-full rounded px-3 py-1 text-left hover:bg-gray-100" @click="copyCurrent">复制</button>
      <button class="block w-full rounded px-3 py-1 text-left text-red-600 hover:bg-red-50" @click="deleteCurrent">
        删除
      </button>
    </div>

    <div
      v-if="showCharacter"
      class="modal-mask fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <div
        class="modal-card character-card max-h-[90vh] w-full max-w-4xl transform animate-[subtleGlow_4s_ease-in-out_infinite_alternate] overflow-y-auto rounded-3xl bg-gradient-to-br from-white via-pink-50 to-white p-8 shadow-[var(--rune-glow)]"
      >
        <div class="modal-title mb-6 text-center text-2xl font-bold text-purple-800">✦ 人物名片 ✦</div>
        <div class="modal-body character-body grid gap-8 lg:grid-cols-2">
          <div class="character-left space-y-6">
            <div class="avatar-box flex flex-col items-center">
              <div
                class="avatar-container relative mb-4 overflow-hidden rounded-full border-4 border-pink-200 bg-gradient-to-br from-pink-100 to-white shadow-xl"
              >
                <div class="avatar-wrapper">
                  <div id="user-avatar-modal" class="user_avatar h-32 w-32 rounded-full"></div>
                </div>
                <div v-if="customAvatarUrl" class="custom-avatar absolute inset-0">
                  <img :src="customAvatarUrl" alt="自定义头像" class="h-full w-full rounded-full object-cover" />
                </div>
              </div>
            </div>
          </div>
          <div class="character-right">
            <div class="attributes-grid grid grid-cols-4 gap-2">
              <div v-for="name in attrOrder" :key="'c' + name" class="attr-card group aspect-square p-2">
                <div class="attr-icon mb-1 text-pink-500 opacity-80" v-html="attrIcon(name)"></div>
                <div class="attr-current text-lg font-bold text-purple-800 group-hover:text-pink-500">
                  {{ displayAttr(currentAttributes[name]) }}
                </div>
                <div class="attr-name text-xs font-medium text-purple-600">{{ name }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- 存档弹窗 -->
    <SaveDialog v-if="showSaveDialog" mode="playing" @close="() => (showSaveDialog = false)" @loaded="onDialogLoaded" />
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { userKey } from '../../shared/constants';
import { useCharacterCreation } from '../composables/useCharacterCreation';
import { useGameServices } from '../composables/useGameServices';
import { useGameSettings } from '../composables/useGameSettings';
import { useGameStateManager } from '../composables/useGameStateManager';
import { usePlayingLogic } from '../composables/usePlayingLogic';
import { useSaveLoad } from '../composables/useSaveLoad';
import { useStatData } from '../composables/useStatData';
import SaveDialog from './SaveDialog.vue';

// 使用 useGameSettings 提供的功能
const {
  shouldStream,
  smartHistorySettings,
  loadSettings,
  saveSettings,
  registerGameSettings,
  updateSmartHistorySettings,
} = useGameSettings();

// 使用 useGameServices 提供的 UI 反馈方法
const { showSuccess, showError, showWarning, showInfo } = useGameServices();

// 使用状态管理器
const gameStateManager = useGameStateManager();

// 清理函数存储
const gameStateUnsubscribe = ref<(() => void) | null>(null);

// 使用 usePlayingLogic 提供的功能
const {
  isNarrow,
  leftOpen,
  rightOpen,
  streamingHtml,
  isStreaming,
  isSending,
  messages,
  scrollToBottom,
  rootRef,
  initialize, // 添加initialize方法
  generateMessage, // 添加生成消息函数
  stopGeneration, // 添加停止生成函数
  addUserMessage, // 添加用户消息函数
  deleteMessage, // 添加删除消息函数
  filterEphemeralMessages, // 添加过滤临时消息函数
  clearMessages, // 添加清空消息函数
  registerPlayingLogic, // 添加状态管理协调注册方法
} = usePlayingLogic();

// 使用 useSaveLoad 提供的完整存读档功能
const {
  loadToUI,
  createNewSaveWithManualMode,
  loadSaveWithFeedback,
  deleteSelectedSaves,
  refreshSaveList,
  createNewEmptySave,
  getCurrentSaveInfo,
  isServiceAvailable: isSaveLoadAvailable,
  registerSaveLoad, // 添加状态管理协调注册方法
} = useSaveLoad();

// 类型定义
type Role = 'user' | 'assistant' | 'system';
type AttrName = '力量' | '敏捷' | '智力' | '体质' | '魅力' | '幸运' | '意志';
type Paragraph = {
  id: string;
  html: string;
  role: Role;
  ephemeral?: boolean;
};

// 角色相关变量
const characterName = ref<string>('玩家');
const customAvatarUrl = ref<string>('');

// 使用新的统计数据绑定服务
const {
  getAttributeValue,
  currentAttributes,
  baseAttributes,
  equipment,
  inventory,
  getAttributeDisplay,
  isAttributeModified,
  getAttributeDeltaValue,
  // 游戏状态相关
  currentDate,
  currentTime,
  currentLocation,
  currentRandomEvent,
  isRandomEventActive,
  loadGameStateData,
  registerStatData, // 添加状态管理协调注册方法
  dataUpdateTrigger, // 添加数据更新触发器
  updateFromPlayingLogic, // 添加从usePlayingLogic获取数据更新的接口
  // 角色基本信息
  gender,
  race,
  age,
} = useStatData();

// 使用角色创建组合式函数
const {
  isProcessing: isCharacterCreationProcessing,
  creationError,
  processCreationData,
  setupEventListeners: setupCharacterCreationListeners,
  cleanupEventListeners: cleanupCharacterCreationListeners,
} = useCharacterCreation();

// 添加缺失的响应式变量定义
const inputText = ref<string>('');
const showSettings = ref<boolean>(false);
const showCharacter = ref<boolean>(false);
const showSaveDialog = ref<boolean>(false);
const showInventoryDialog = ref<boolean>(false);
const showCommandQueueDialog = ref<boolean>(false);
const showRelations = ref<boolean>(false);

// 其他缺失的变量
const showEventDetails = ref<boolean>(false);
const commandQueueLength = ref<number>(0);
const commandQueue = ref<any>(null);

// 右键菜单
const contextMenu = ref<{
  visible: boolean;
  x: number;
  y: number;
  target?: any;
}>({
  visible: false,
  x: 0,
  y: 0,
});

// 属性顺序
const attrOrder = ref<string[]>(['力量', '敏捷', '智力', '体质', '魅力', '幸运', '意志']);

// 显示背包数据
const displayInventory = computed(() => {
  const result: Record<string, any[]> = {
    weapons: [],
    armors: [],
    accessories: [],
    others: [],
  };

  if (inventory.value && typeof inventory.value === 'object') {
    // 确保每个分类都是数组，并过滤有效物品
    ['weapons', 'armors', 'accessories', 'others'].forEach(category => {
      const items = inventory.value[category];
      if (Array.isArray(items)) {
        result[category] = items
          .filter(item => item && item.name && item.name.trim() !== '')
          .map(item => ({
            ...item,
            fromMvu: true, // 标记为来自MVU数据
          }));
      }
    });
  }

  return result;
});

// 使用现有的响应式数据作为 MVU 数据
const mvuEquipment = equipment;
const mvuInventory = inventory;

// 使用现有的函数作为 MVU 函数
const isMvuDataLoaded = computed(() => {
  // 通过检查数据是否存在来判断MVU数据是否已加载
  return currentAttributes.value && Object.keys(currentAttributes.value).length > 0;
});
const loadMvuData = async () => {
  try {
    // 通过 useStatData 加载数据，而不是直接使用 statDataBinding
    await loadGameStateData();
  } catch (err) {
    console.error('[PlayingRoot] 加载MVU数据失败:', err);
  }
};

const getMvuAttributeDisplayValue = getAttributeDisplay;
const getMvuAttributeDeltaValue = getAttributeDeltaValue;
const isMvuAttributeModified = isAttributeModified;
const hasMvuAttributeDisplay = (attributeName: string): boolean => {
  return getAttributeDisplay(attributeName) !== '—';
};
const hasMvuAttributeDelta = (attributeName: string): boolean => {
  return getAttributeDeltaValue(attributeName) !== '';
};

// 获取背包总数量
const getTotalInventoryCount = (): number => {
  if (!displayInventory.value || typeof displayInventory.value !== 'object') {
    return 0;
  }

  let total = 0;
  ['weapons', 'armors', 'accessories', 'others'].forEach(category => {
    const items = displayInventory.value[category];
    if (Array.isArray(items)) {
      total += items.length;
    }
  });

  return total;
};

// 获取用于显示的背包物品列表（扁平化）
const getDisplayInventoryItems = (): any[] => {
  if (!displayInventory.value || typeof displayInventory.value !== 'object') {
    return [];
  }

  const result: any[] = [];
  ['weapons', 'armors', 'accessories', 'others'].forEach(category => {
    const items = displayInventory.value[category];
    if (Array.isArray(items)) {
      items.forEach(item => {
        result.push({
          ...item,
          category,
        });
      });
    }
  });

  return result;
};

// 容器类名
const containerClass = computed(() => ({
  'narrow-layout': isNarrow.value,
  'left-open': leftOpen.value,
  'right-open': rightOpen.value,
}));

const canSend = computed(() => inputText.value.trim().length > 0);
const isBusy = computed(() => isSending.value || isStreaming.value);

// 渲染列表：简化逻辑，分隔线现在直接在用户消息后显示
type RenderItem = { type: 'paragraph'; key: string; html: string; role: Role; id: string; ephemeral?: boolean };
const renderItems = computed<RenderItem[]>(() => {
  const out: RenderItem[] = [];
  for (let i = 0; i < messages.value.length; i++) {
    const m = messages.value[i];
    out.push({
      type: 'paragraph',
      key: m.id,
      html: m.html || m.content || '',
      role: m.role,
      id: m.id,
      ephemeral: 'ephemeral' in m ? m.ephemeral : undefined,
    });
  }
  return out;
});
// Save/Load 依赖 - 现在直接通过依赖注入获取
// 自动存档相关变量已移除，接口保留以确保向后兼容

function collectUiMessages(): { role: 'user' | 'assistant'; text: string }[] {
  const out: { role: 'user' | 'assistant'; text: string }[] = [];

  try {
    for (const m of messages.value) {
      if (m.role === 'user' || m.role === 'assistant') {
        // 优先使用content字段，回退到html字段
        const text = String((m.content || m.html || '').replace(/<[^>]+>/g, '')).trim();
        if (text) {
          out.push({ role: m.role as 'user' | 'assistant', text });
        }
      }
    }

    if (isStreaming.value && streamingHtml.value) {
      const text = String(streamingHtml.value)
        .replace(/<[^>]+>/g, '')
        .trim();
      if (text) {
        out.push({ role: 'assistant', text });
      }
    }
  } catch (error) {
    console.error('[PlayingRoot] 收集UI消息失败:', error);
  }

  // 提供给 SaveLoadManagerService 自动存档功能
  (window as any).__RPG_UI_MESSAGES__ = out;
  return out;
}

function openSaveDialog() {
  showSaveDialog.value = true;
}

async function onDialogLoaded(data: any) {
  try {
    // 读档前先清空当前消息数组，确保显示的是存档中的消息
    clearMessages();

    // 直接调用组合式函数的统一读档接口
    // Vue组件不需要关心数据源分离的具体实现
    const uiContext = {
      messages,
      streamingHtml,
      isStreaming,
      isSending,
      scrollToBottom,
      nextTick,
    };

    // 传递 slotId 而不是 saveName
    await loadToUI(data.slotId, uiContext);

    showSaveDialog.value = false;
  } catch (error) {
    console.error('[PlayingRoot] 读档失败:', error);
    showError('读档失败');
  }
}

// onToggleAuto1 函数已移除，自动存档功能已移除

async function manualSave(slotId: string, defaultName: string) {
  try {
    const name = slotId.startsWith('m') ? (prompt('输入存档名', defaultName) ?? '') : defaultName;
    if (slotId.startsWith('m') && !name.trim()) return;

    // 使用 useSaveLoad 的方法
    const success = await createNewSaveWithManualMode(slotId, name.trim() || defaultName);

    if (success) {
      showSuccess('存档成功');
    } else {
      showError('存档失败');
    }
  } catch (error) {
    console.error('[PlayingRoot] 存档失败:', error);
    showError('存档失败');
  }
}

async function loadSlot(slotId: string) {
  try {
    const result = await loadSaveWithFeedback(slotId);

    if (result.success && result.data) {
      const uiContext = {
        messages,
        streamingHtml,
        isStreaming,
        isSending,
        scrollToBottom,
        nextTick,
      };
      await loadToUI(slotId, uiContext);
      showSaveDialog.value = false;
    } else {
      showError('读档失败', result.error || '未找到存档');
    }
  } catch (error) {
    console.error('[PlayingRoot] 读档失败:', error);
    showError('读档失败');
  }
}

async function deleteSlot(slotId: string) {
  try {
    if (!confirm('确定要删除该存档吗？此操作不可恢复。')) return;

    if (isSaveLoadAvailable()) {
      const success = await deleteSelectedSaves([slotId]);
      if (success) {
        showSuccess('已删除');
      } else {
        showError('删除失败');
      }
    } else {
      showError('删除失败', '删除服务不可用');
    }
  } catch (error) {
    console.error('[PlayingRoot] 删除存档失败:', error);
    showError('删除失败');
  }
}

function createManual(slotId: string) {
  void manualSave(slotId, '我的大冒险');
}

function onPickAvatar() {
  // 选择头像逻辑
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = e => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = e => {
        customAvatarUrl.value = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };
  input.click();
}

function clearAvatar() {
  customAvatarUrl.value = '';
}

function openSettings() {
  showSettings.value = true;
}

function openCharacter() {
  showCharacter.value = true;
}

function openRelations() {
  showRelations.value = true;
}

// 重置智能历史管理设置
function resetSmartHistorySettings() {
  updateSmartHistorySettings({
    assistantMessageLimit: 30,
    userMessageLimit: 20,
    shortSummaryThreshold: 15,
    longSummaryThreshold: 30,
  });
  showSuccess('智能历史管理设置已重置为默认值');
}

// 打开背包弹窗
function openInventoryDialog() {
  showInventoryDialog.value = true;
}

// 关闭背包弹窗
function closeInventoryDialog() {
  showInventoryDialog.value = false;
}

// 添加卸下装备命令
function addUnequipCommand(type: string) {
  // 实现卸下装备逻辑
}

// 其他缺失的函数
async function onSend() {
  if (!canSend.value || isBusy.value) return;
  const text = inputText.value.trim();
  if (!text) return;

  inputText.value = '';

  // 用户发送新一条消息时，清理上一次的临时错误消息
  filterEphemeralMessages();

  // 安全执行指令队列
  let commandQueueSuccess = true;
  try {
    if (commandQueue.value && typeof commandQueue.value.isEmpty === 'function' && !commandQueue.value.isEmpty()) {
      // 设置执行超时，避免阻塞发送流程
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => reject(new Error('指令队列执行超时')), 3000);
      });

      const executePromise = commandQueue.value.executeAll();

      commandQueueSuccess = await Promise.race([executePromise, timeoutPromise]);

      if (commandQueueSuccess) {
        showSuccess('指令已执行完成');
      } else {
        console.warn('[PlayingRoot] 指令队列执行失败');
        showWarning('部分指令执行失败');
      }
    }
  } catch (error) {
    console.error('[PlayingRoot] 执行指令队列异常:', error);
    commandQueueSuccess = false;
    showWarning('指令队列执行异常');
  }

  // 无论指令队列是否成功，都继续发送流程
  try {
    // 使用统一的生成函数，自动处理MVU数据、消息保存和UI更新
    const success = await generateMessage(text, shouldStream.value);

    if (!success) {
      showError('生成失败', '请重试');
    }
  } catch (error) {
    console.error('[PlayingRoot] 生成消息失败:', error);
    showError('生成失败', '请求发送异常');
  }
}

function onStop() {
  // 使用新的统一停止生成接口
  stopGeneration();
}

function onScroll() {
  // 可扩展为触顶加载历史
}

function onContextMenu(item: Paragraph) {
  contextMenu.value = {
    visible: true,
    x: (window as any).event?.clientX ?? 0,
    y: (window as any).event?.clientY ?? 0,
    target: item,
  };
  try {
    document.addEventListener('click', hideMenuOnce, { once: true });
  } catch {}
}

function hideMenuOnce() {
  contextMenu.value.visible = false;
}

async function copyCurrent() {
  try {
    const t = String(contextMenu.value?.target?.html ?? '').replace(/<[^>]+>/g, '');
    await navigator.clipboard.writeText(t);
    showSuccess('已复制');
  } catch {
    showError('复制失败');
  } finally {
    contextMenu.value.visible = false;
  }
}

async function deleteCurrent() {
  try {
    const target = contextMenu.value.target;
    if (!target) return;
    // 使用组合式函数的方法删除消息
    deleteMessage(target.id);
    // 同步世界书记录：以当前 UI 的 user/ai 列表覆盖写入（不包含 system/ephemeral）
    // 世界书内容同步已集成到SaveLoadManagerService中
    showSuccess('已删除');
  } catch {
    showError('删除失败');
  } finally {
    contextMenu.value.visible = false;
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

// 展示辅助
function displayAttr(v: number | null | undefined): string {
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : '—';
}

// 获取基础值/当前值格式的属性显示
function getAttributeBaseCurrentValue(name: string): string {
  try {
    // 获取基础属性值
    const baseValue = getAttributeValue(name, 0);
    // 获取当前属性值（包含装备加成等）
    const currentValue = getMvuAttributeDisplayValue(name);

    // 如果当前值包含数字，提取数字部分
    const currentNum = Number(String(currentValue).replace(/[^\d]/g, ''));
    const baseNum = Number(baseValue);

    // 如果两个值都有效，显示为 "基础值/当前值" 格式
    if (Number.isFinite(baseNum) && Number.isFinite(currentNum)) {
      return `${baseNum}/${currentNum}`;
    }

    // 回退到原来的显示方式
    return String(currentValue || baseValue || '—');
  } catch (error) {
    console.error('[PlayingRoot] 获取属性基础当前值失败:', error);
    return '—';
  }
}

// 获取当前属性值（只显示当前值，不显示斜杠）
function getCurrentAttributeValue(name: string): string {
  try {
    // 获取当前属性值（包含装备加成等）
    const currentValue = getMvuAttributeDisplayValue(name);

    // 如果当前值包含数字，提取数字部分
    const currentNum = Number(String(currentValue).replace(/[^\d]/g, ''));

    // 如果当前值有效，只显示当前值
    if (Number.isFinite(currentNum)) {
      return String(currentNum);
    }

    // 回退到原来的显示方式
    return String(currentValue || '—');
  } catch (error) {
    console.error('[PlayingRoot] 获取当前属性值失败:', error);
    return '—';
  }
}

function itemName(it: any): string {
  try {
    if (!it) return '未知物品';
    if (typeof it === 'string') return it || '未知物品';
    if (typeof it.name === 'string' && it.name) return it.name;
  } catch {}
  return '未知物品';
}

function equipmentText(it: any, label: string): string {
  const name = itemName(it);
  if (!it || name === '未知物品') return `未装备${label}`;
  return name;
}

// 简易图标（内联 SVG）
function icon(name: string): string {
  const base =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';
  const close = '</svg>';
  const paths: Record<string, string> = {
    weapon: '<path d="M3 21l6-6M7 17l7-7 3 3-7 7z"/><path d="M14 7l3-3 3 3-3 3"/>',
    armor: '<path d="M12 2l7 4v6c0 5-3 8-7 10-4-2-7-5-7-10V6l7-4z"/>',
    accessory: '<circle cx="12" cy="8" r="4"/><path d="M6 21c2-3 14-3 12 0"/>',
    other: '<rect x="4" y="4" width="16" height="16" rx="3"/>',
    力量: '<path d="M5 12h4l1-4 3 10 2-6h4"/>',
    敏捷: '<path d="M4 20l16-16M14 4h6v6"/>',
    智力: '<circle cx="12" cy="12" r="4"/><path d="M2 12h4M18 12h4M12 2v4M12 18v4"/>',
    体质: '<rect x="6" y="6" width="12" height="12" rx="6"/>',
    魅力: '<path d="M12 21s-6-4-6-9a6 6 0 1112 0c0 5-6 9-6 9z"/>',
    幸运: '<path d="M12 2v20M2 12h20"/>',
    意志: '<path d="M12 3l3 7h7l-5.5 4 2 7-6.5-4.5L6.5 21l2-7L3 10h7z"/>',
  };
  const p = paths[name] || paths.other;
  return base + p + close;
}

function attrIcon(name: string): string {
  return icon(name);
}

// 读取 MVU 数据到面板（使用新的统计数据绑定服务）
async function loadUserPanel(): Promise<void> {
  try {
    // 用户创建角色优先使用 <user> 宏；若无则从 MVU stat_data.<user>.name 读取；再退回默认
    const macroName = (window as any).substitudeMacros?.('<user>') || (window as any).substitudeMacros?.(userKey) || '';
    let mvuName = '';
    // 通过 useStatData 获取角色名称，而不是直接使用 statDataBinding
    if (getAttributeValue) {
      mvuName = getAttributeValue('name', '') || '';
    }
    characterName.value = String(macroName || mvuName || '玩家');
  } catch (error) {
    console.error('[PlayingRoot] 获取角色名称失败:', error);
    characterName.value = '玩家';
  }
}

// 监听消息变化自动更新缓存（滚动由 usePlayingLogic 处理）
watch(messages, () => {
  try {
    collectUiMessages();
  } catch {}
});

onMounted(async () => {
  // 加载游戏设置
  try {
    await loadSettings();
  } catch (error) {
    console.warn('[PlayingRoot] 游戏设置加载失败:', error);
  }

  // 注册状态管理协调
  try {
    // 注册各个组合式函数到状态管理协调机制
    if (typeof registerPlayingLogic === 'function') {
      registerPlayingLogic(loadUserPanel, loadMvuData, loadGameStateData);
    }
    if (typeof registerStatData === 'function') {
      registerStatData();
    }
    if (typeof registerSaveLoad === 'function') {
      registerSaveLoad();
    }
    if (typeof registerGameSettings === 'function') {
      registerGameSettings();
    }
  } catch (error) {
    console.warn('[PlayingRoot] 状态管理协调注册失败:', error);
  }

  // 设置角色创建事件监听器
  try {
    if (typeof setupCharacterCreationListeners === 'function') {
      setupCharacterCreationListeners();
    }
  } catch (error) {
    console.warn('[PlayingRoot] 角色创建事件监听器设置失败:', error);
  }

  // 监听游戏状态变化，在切换到 PLAYING 时清空消息
  const gameStateManager = (window as any).__RPG_GAME_STATE_MANAGER__;
  if (gameStateManager) {
    const unsubscribe = gameStateManager.onPhaseChange((newPhase: string) => {
      if (newPhase === 'playing') {
        clearMessages();
      }
    });

    // 将清理函数存储到变量中，在顶层的onUnmounted中调用
    gameStateUnsubscribe.value = unsubscribe;
  }

  // 使用usePlayingLogic的initialize方法统一管理初始化逻辑
  await initialize(onDialogLoaded, loadUserPanel, loadMvuData, loadGameStateData, updateFromPlayingLogic);
});
onUnmounted(() => {
  // 清理游戏状态监听器
  try {
    if (gameStateUnsubscribe.value && typeof gameStateUnsubscribe.value === 'function') {
      gameStateUnsubscribe.value();
    }
  } catch (error) {
    console.warn('[PlayingRoot] 清理游戏状态监听器失败:', error);
  }

  // 清理角色创建事件监听器
  try {
    if (typeof cleanupCharacterCreationListeners === 'function') {
      cleanupCharacterCreationListeners();
    }
  } catch (error) {
    console.warn('[PlayingRoot] 清理角色创建事件监听器失败:', error);
  }

  // usePlayingLogic已经处理了清理逻辑，这里不需要重复处理
});
</script>

<style scoped>
@import '../index.css';

/* PlayingRoot组件特定样式 - 通用样式已移至index.css */

/* 装备栏样式 */
.equip-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}

.equip-info {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.equip-name {
  flex: 1;
  font-size: 14px;
  color: #374151;
}

.equip-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 4px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  color: #374151;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.unequip-btn {
  color: #dc2626;
  border-color: #fecaca;
}

.unequip-btn:hover {
  background: #fef2f2;
  border-color: #fca5a5;
}

/* 指令队列按钮样式 */
.command-queue-btn {
  position: relative;
}

/* 确保小说内容区域可以正常滚动 */
.novel-content {
  /* 允许垂直滚动 */
  overflow-y: auto;
  /* 隐藏水平滚动 */
  overflow-x: hidden;
  /* 设置最小高度以确保滚动 */
  min-height: 200px;
  /* 确保容器有明确的高度限制 */
  max-height: calc(100vh - 200px);
  /* 强制显示滚动条 */
  scrollbar-width: thin;
}

/* 用户头像样式 - 100px正方形 */
.user_avatar {
  width: 100px !important;
  height: 100px !important;
  border-radius: 8px;
}

.custom-avatar img {
  width: 100px !important;
  height: 100px !important;
  border-radius: 8px;
}

/* 角色标题样式 */
.character-title {
  text-align: center;
  margin-top: 8px;
  font-size: 16px;
  font-weight: bold;
  color: #374151;
}

/* 角色基本信息样式 */
.character-info {
  margin-top: 12px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  font-size: 13px;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-label {
  color: #6b7280;
  font-weight: 500;
}

.info-value {
  color: #374151;
  font-weight: 600;
}

/* 中心标题横幅样式 */
.center-header {
  position: relative;
  margin-bottom: 16px;
  transition: all 0.3s ease;
}

.event-banner {
  position: relative;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  min-height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.event-banner:hover {
  background: rgba(255, 255, 255, 0.95);
  border-color: #d1d5db;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.event-label {
  font-size: 16px;
  color: #374151;
  font-weight: 700;
  text-align: center;
  white-space: nowrap;
}

.event-expanded {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  padding: 8px 12px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  z-index: 10;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.event-name {
  font-size: 13px;
  color: #374151;
  text-align: center;
  line-height: 1.4;
  word-break: break-word;
}

/* 右侧边栏头部样式 */
.right-sidebar-header {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}

.right-sidebar-header .fs-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  color: #374151;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.right-sidebar-header .fs-btn:hover {
  background: #e5e7eb;
  border-color: #9ca3af;
}

.right-sidebar-header .fs-btn svg {
  width: 16px;
  height: 16px;
}

/* 右侧边栏内容向下移动 */
.right-sidebar .menu-category {
  margin-top: 8px;
}

/* 设置弹窗样式 */
.settings-modal {
  max-width: 500px;
  width: 90vw;
  max-height: 85vh;
}

.modal-header {
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 12px;
}

.close-btn {
  flex-shrink: 0;
}

.setting-group {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.8);
}

.setting-header h3 {
  margin: 0 0 2px 0;
  line-height: 1.3;
}

.setting-header p {
  margin: 0;
  line-height: 1.3;
}

.setting-item {
  margin-bottom: 12px;
}

.setting-item:last-child {
  margin-bottom: 0;
}

.setting-item input[type='number'] {
  transition: all 0.2s ease;
  font-size: 14px;
}

.setting-item input[type='number']:focus {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(236, 72, 153, 0.15);
}

.setting-item input[type='number']:invalid {
  border-color: #ef4444;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.1);
}

/* 响应式优化 */
@media (max-height: 600px) {
  .settings-modal {
    max-height: 90vh;
  }

  .modal-body {
    max-height: 60vh !important;
  }
}

@media (max-width: 480px) {
  .settings-modal {
    width: 95vw;
    padding: 16px;
  }

  .modal-header {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }

  .close-btn {
    align-self: flex-end;
  }
}
</style>
