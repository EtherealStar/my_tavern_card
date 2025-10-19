<!-- @ts-nocheck -->
<!-- AI注意：忽略所有"找不到名称"报错，这些变量在composables中定义 -->
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
            <!-- 武器栏位 -->
            <div
              class="equip-row"
              :class="{ equipped: isEquipmentEquipped('weapon'), clickable: true }"
              @click="openEquipmentDetail('weapon')"
              title="点击查看装备详情"
            >
              <div class="equip-icon" v-html="icon('weapon')"></div>
              <div class="equip-info">
                <div class="equip-name">
                  {{ getEquipmentDisplayInfo('weapon').name }}
                  <span v-if="isEquipmentEquipped('weapon')" class="mvu-data-indicator" title="来自 MVU 数据">📊</span>
                </div>
                <div class="equip-status">
                  <span v-if="isEquipmentEquipped('weapon')" class="status-equipped">已装备</span>
                  <span v-else class="status-unequipped">未装备</span>
                </div>
              </div>
            </div>

            <!-- 防具栏位 -->
            <div
              class="equip-row"
              :class="{ equipped: isEquipmentEquipped('armor'), clickable: true }"
              @click="openEquipmentDetail('armor')"
              title="点击查看装备详情"
            >
              <div class="equip-icon" v-html="icon('armor')"></div>
              <div class="equip-info">
                <div class="equip-name">
                  {{ getEquipmentDisplayInfo('armor').name }}
                  <span v-if="isEquipmentEquipped('armor')" class="mvu-data-indicator" title="来自 MVU 数据">📊</span>
                </div>
                <div class="equip-status">
                  <span v-if="isEquipmentEquipped('armor')" class="status-equipped">已装备</span>
                  <span v-else class="status-unequipped">未装备</span>
                </div>
              </div>
            </div>

            <!-- 饰品栏位 -->
            <div
              class="equip-row"
              :class="{ equipped: isEquipmentEquipped('accessory'), clickable: true }"
              @click="openEquipmentDetail('accessory')"
              title="点击查看装备详情"
            >
              <div class="equip-icon" v-html="icon('accessory')"></div>
              <div class="equip-info">
                <div class="equip-name">
                  {{ getEquipmentDisplayInfo('accessory').name }}
                  <span v-if="isEquipmentEquipped('accessory')" class="mvu-data-indicator" title="来自 MVU 数据"
                    >📊</span
                  >
                </div>
                <div class="equip-status">
                  <span v-if="isEquipmentEquipped('accessory')" class="status-equipped">已装备</span>
                  <span v-else class="status-unequipped">未装备</span>
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
              :title="`指令队列 (${queueLength})`"
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
                v-if="queueLength > 0"
                class="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white"
              >
                {{ queueLength > 9 ? '9+' : queueLength }}
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
              <!-- 测试战斗按钮：紧邻发送按钮 -->
              <button class="btn" @click="onTestBattle">测试战斗</button>
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
            <button class="menu-btn" @click="openRelations">
              <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              关系
            </button>
            <button class="menu-btn" @click="openEnemies">
              <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  d="M4 3a1 1 0 00-1 1v2a1 1 0 001 1h1l2 3v4l-2 2v1h10v-1l-2-2V10l2-3h1a1 1 0 001-1V4a1 1 0 00-1-1H4z"
                />
              </svg>
              敌人
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
      <button class="block w-full rounded px-3 py-1 text-left text-green-600 hover:bg-green-50" @click="editCurrent">
        编辑
      </button>
      <button
        v-if="contextMenu.canRegenerate"
        class="block w-full rounded px-3 py-1 text-left text-blue-600 hover:bg-blue-50"
        @click="regenerateCurrent"
      >
        重新生成
      </button>
      <button
        v-if="contextMenu.canDelete"
        class="block w-full rounded px-3 py-1 text-left text-red-600 hover:bg-red-50"
        @click="deleteCurrent"
      >
        删除
      </button>
    </div>

    <!-- 存档弹窗 -->
    <SaveDialog v-if="showSaveDialog" mode="playing" @close="() => (showSaveDialog = false)" @loaded="onDialogLoaded" />

    <!-- 指令队列弹窗 -->
    <CommandQueueDialog
      v-if="showCommandQueueDialog"
      :visible="showCommandQueueDialog"
      @close="() => (showCommandQueueDialog = false)"
    />

    <!-- 装备详情弹窗 -->
    <EquipmentDetailDialog
      v-if="showEquipmentDetail"
      :visible="showEquipmentDetail"
      :equipment-type="selectedEquipmentType"
      :equipment="selectedEquipment"
      :inventory-items="selectedInventoryItems"
      @close="closeEquipmentDetail"
    />

    <!-- 物品栏弹窗 -->
    <InventoryDialog
      v-if="showInventoryDialog"
      :visible="showInventoryDialog"
      :inventory="displayInventory"
      @close="closeInventoryDialog"
      @selectItem="onSelectItem"
    />

    <!-- 关系人物弹窗 -->
    <div
      v-if="showRelations"
      class="modal-mask fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <div
        class="modal-card relationships-modal max-h-[90vh] w-full max-w-6xl transform animate-[subtleGlow_4s_ease-in-out_infinite_alternate] overflow-y-auto rounded-3xl bg-gradient-to-br from-white via-pink-50 to-white p-8 shadow-[var(--rune-glow)]"
      >
        <!-- 标题栏和关闭按钮 -->
        <div class="modal-header relative mb-6 flex items-center justify-between">
          <div class="modal-title text-2xl font-bold text-purple-800">✦ 关系人物 ✦</div>
          <button
            class="close-btn flex h-8 w-8 items-center justify-center rounded-full bg-pink-100 text-pink-600 transition-all duration-200 hover:scale-110 hover:bg-pink-200 hover:text-pink-700"
            @click="closeRelations"
            title="关闭关系弹窗"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- 关系人物列表 -->
        <div class="modal-body">
          <!-- 加载状态 -->
          <div v-if="relationshipCharactersLoading" class="flex items-center justify-center py-8">
            <div class="flex items-center gap-3 text-purple-600">
              <div class="h-6 w-6 animate-spin rounded-full border-2 border-purple-300 border-t-purple-600"></div>
              <span>正在加载关系人物...</span>
            </div>
          </div>

          <!-- 错误状态 -->
          <div v-else-if="relationshipCharactersError" class="flex items-center justify-center py-8">
            <div class="text-center text-red-600">
              <div class="mb-2 text-lg">⚠️</div>
              <div>{{ relationshipCharactersError }}</div>
              <button
                class="mt-3 rounded-lg bg-pink-500 px-4 py-2 text-sm text-white hover:bg-pink-600"
                @click="getRelationshipCharacters"
              >
                重试
              </button>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-else-if="relationshipCharacters.length === 0" class="flex items-center justify-center py-8">
            <div class="text-center text-gray-500">
              <div class="mb-2 text-4xl">👥</div>
              <div class="text-lg">暂无关系人物</div>
              <div class="text-sm">在游戏中建立关系后，这里会显示相关人物</div>
            </div>
          </div>

          <!-- 关系人物网格 -->
          <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div
              v-for="character in relationshipCharacters"
              :key="character.id"
              class="character-card group cursor-pointer rounded-xl border border-pink-200 bg-white/80 p-4 transition-all duration-300 hover:border-pink-400 hover:bg-white hover:shadow-lg"
              @click="openCharacterDetail(character)"
            >
              <!-- 人物头像区域 -->
              <div class="mb-3 flex items-center gap-3">
                <div
                  class="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-pink-200 to-purple-200 text-lg"
                >
                  {{ character.name.charAt(0) || '?' }}
                </div>
                <div class="flex-1">
                  <div class="font-semibold text-gray-800">{{ character.name }}</div>
                  <div class="text-sm text-gray-500">{{ character.gender }} · {{ character.race }}</div>
                </div>
              </div>

              <!-- 好感度 -->
              <div class="mb-3">
                <div class="mb-1 flex items-center justify-between text-sm">
                  <span class="text-gray-600">好感度</span>
                  <span class="font-medium text-pink-600">{{ character.affinity || 0 }}</span>
                </div>
                <div class="h-2 rounded-full bg-gray-200">
                  <div
                    class="h-2 rounded-full bg-gradient-to-r from-pink-400 to-purple-500 transition-all duration-500"
                    :style="{ width: `${Math.min(((character.affinity || 0) / 100) * 100, 100)}%` }"
                  ></div>
                </div>
              </div>

              <!-- 主要属性 -->
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div class="flex justify-between">
                  <span class="text-gray-500">力量</span>
                  <span class="font-medium">{{ character.attributes?.力量 || 0 }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500">敏捷</span>
                  <span class="font-medium">{{ character.attributes?.敏捷 || 0 }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500">防御</span>
                  <span class="font-medium">{{ character.attributes?.防御 || 0 }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500">魅力</span>
                  <span class="font-medium">{{ character.attributes?.魅力 || 0 }}</span>
                </div>
              </div>

              <!-- 点击提示 -->
              <div class="mt-3 text-center text-xs text-gray-400 group-hover:text-pink-500">点击查看详情</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 敌人列表弹窗 -->
    <div
      v-if="showEnemies"
      class="modal-mask fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <div
        class="modal-card relationships-modal max-h-[90vh] w-full max-w-6xl transform animate-[subtleGlow_4s_ease-in-out_infinite_alternate] overflow-y-auto rounded-3xl bg-gradient-to-br from-white via-pink-50 to-white p-8 shadow-[var(--rune-glow)]"
      >
        <div class="modal-header relative mb-6 flex items-center justify-between">
          <div class="modal-title text-2xl font-bold text-purple-800">✦ 敌人列表 ✦</div>
          <button
            class="close-btn flex h-8 w-8 items-center justify-center rounded-full bg-pink-100 text-pink-600 transition-all duration-200 hover:scale-110 hover:bg-pink-200 hover:text-pink-700"
            @click="closeEnemies"
            title="关闭敌人弹窗"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <div v-if="enemiesLoading" class="flex items-center justify-center py-8">
            <div class="flex items-center gap-3 text-purple-600">
              <div class="h-6 w-6 animate-spin rounded-full border-2 border-purple-300 border-t-purple-600"></div>
              <span>正在加载敌人...</span>
            </div>
          </div>

          <div v-else-if="enemiesError" class="flex items-center justify-center py-8">
            <div class="text-center text-red-600">
              <div class="mb-2 text-lg">⚠️</div>
              <div>{{ enemiesError }}</div>
              <button
                class="mt-3 rounded-lg bg-pink-500 px-4 py-2 text-sm text-white hover:bg-pink-600"
                @click="getEnemies()"
              >
                重试
              </button>
            </div>
          </div>

          <div v-else-if="enemiesList.length === 0" class="flex items-center justify-center py-8">
            <div class="text-center text-gray-500">
              <div class="mb-2 text-4xl">👾</div>
              <div class="text-lg">暂无在场敌人</div>
              <div class="text-sm">触发战斗或事件后，这里会显示敌人</div>
            </div>
          </div>

          <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div
              v-for="enemy in enemiesList"
              :key="enemy.id"
              class="character-card group cursor-pointer rounded-xl border border-pink-200 bg-white/80 p-4 transition-all duration-300 hover:border-pink-400 hover:bg-white hover:shadow-lg"
              @click="openEnemyDetail(enemy)"
            >
              <div class="mb-3 flex items-center gap-3">
                <div
                  class="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-pink-200 to-purple-200 text-lg"
                >
                  {{ (enemy.variantId || '?').toString().charAt(0) || '?' }}
                </div>
                <div class="flex-1">
                  <div class="font-semibold text-gray-800">{{ enemy.variantId || '未知敌人' }}</div>
                  <div class="text-sm text-gray-500">{{ enemy.gender }} · {{ enemy.race }}</div>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-2 text-xs">
                <div class="flex justify-between" v-for="attrName in attrOrder" :key="attrName">
                  <span class="text-gray-500">{{ attrName }}</span>
                  <span class="font-medium">{{ enemy.attributes?.[attrName] || 0 }}</span>
                </div>
              </div>

              <div class="mt-3 text-center text-xs text-gray-400 group-hover:text-pink-500">点击查看详情</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 敌人详情弹窗 -->
    <div
      v-if="showEnemyDetail"
      class="modal-mask fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <div
        class="modal-card character-detail-modal max-h-[90vh] w-full max-w-4xl transform animate-[subtleGlow_4s_ease-in-out_infinite_alternate] overflow-y-auto rounded-3xl bg-gradient-to-br from-white via-pink-50 to-white p-8 shadow-[var(--rune-glow)]"
      >
        <div class="modal-header relative mb-6 flex items-center justify-between">
          <div class="modal-title text-2xl font-bold text-purple-800">✦ 敌人详情 ✦</div>
          <button
            class="close-btn flex h-8 w-8 items-center justify-center rounded-full bg-pink-100 text-pink-600 transition-all duration-200 hover:scale-110 hover:bg-pink-200 hover:text-pink-700"
            @click="closeEnemyDetail"
            title="关闭详情弹窗"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <div v-if="enemyDetailLoading" class="flex items-center justify-center py-8">
            <div class="flex items-center gap-3 text-purple-600">
              <div class="h-6 w-6 animate-spin rounded-full border-2 border-purple-300 border-t-purple-600"></div>
              <span>正在加载敌人详情...</span>
            </div>
          </div>

          <div v-else-if="selectedEnemy" class="character-detail-body">
            <div class="mb-6 rounded-xl border border-pink-200 bg-white/80 p-6">
              <div class="mb-4 flex items-center gap-4">
                <div
                  class="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-pink-200 to-purple-200 text-2xl font-bold"
                >
                  {{ (selectedEnemy.variantId || '?').toString().charAt(0) || '?' }}
                </div>
                <div class="flex-1">
                  <h3 class="text-xl font-bold text-gray-800">{{ selectedEnemy.variantId || '未知敌人' }}</h3>
                  <p class="text-sm text-gray-500">
                    {{ selectedEnemy.gender || '未知' }} · {{ selectedEnemy.race || '未知' }}
                  </p>
                </div>
              </div>
            </div>

            <div class="mb-6 rounded-xl border border-pink-200 bg-white/80 p-6">
              <h4 class="mb-4 text-lg font-semibold text-gray-800">属性信息</h4>
              <div class="attributes-grid grid grid-cols-2 gap-4 md:grid-cols-4">
                <div v-for="attrName in attrOrder" :key="attrName" class="attribute-item">
                  <div class="flex items-center gap-2">
                    <div class="attr-icon" v-html="attrIcon(attrName)"></div>
                    <span class="text-sm text-gray-600">{{ attrName }}</span>
                  </div>
                  <div class="text-lg font-bold text-gray-800">{{ selectedEnemy.attributes?.[attrName] || 0 }}</div>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="flex items-center justify-center py-8">
            <div class="text-center text-red-600">
              <div class="mb-2 text-lg">⚠️</div>
              <div>无法加载敌人详情</div>
              <button
                class="mt-3 rounded-lg bg-pink-500 px-4 py-2 text-sm text-white hover:bg-pink-600"
                @click="closeEnemyDetail"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 编辑对话框 -->
    <div
      v-if="showEditDialog"
      class="modal-mask fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <div
        class="modal-card edit-dialog max-h-[90vh] w-full max-w-4xl transform animate-[subtleGlow_4s_ease-in-out_infinite_alternate] rounded-3xl bg-gradient-to-br from-white via-pink-50 to-white p-8 shadow-[var(--rune-glow)]"
      >
        <!-- 标题栏和关闭按钮 -->
        <div class="modal-header relative mb-6 flex items-center justify-between">
          <div class="modal-title text-2xl font-bold text-purple-800">✦ 编辑消息 ✦</div>
          <button
            class="close-btn flex h-8 w-8 items-center justify-center rounded-full bg-pink-100 text-pink-600 transition-all duration-200 hover:scale-110 hover:bg-pink-200 hover:text-pink-700"
            @click="cancelEdit"
            title="关闭编辑"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- 编辑内容 -->
        <div class="modal-body">
          <div class="mb-4">
            <label class="mb-2 block text-sm font-medium text-purple-700">消息内容</label>
            <textarea
              v-model="editContent"
              class="w-full rounded-lg border border-pink-200 px-3 py-2 text-sm focus:border-pink-400 focus:ring-1 focus:ring-pink-300"
              rows="10"
              placeholder="请输入消息内容..."
            ></textarea>
          </div>

          <!-- 操作按钮 -->
          <div class="flex justify-end gap-3">
            <button
              class="rounded-lg bg-gray-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:scale-105 hover:bg-gray-600 focus:ring-2 focus:ring-gray-300 focus:outline-none"
              @click="cancelEdit"
            >
              取消
            </button>
            <button
              class="rounded-lg bg-pink-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:scale-105 hover:bg-pink-600 focus:ring-2 focus:ring-pink-300 focus:outline-none"
              @click="saveEdit"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 人物详情弹窗 -->
    <div
      v-if="showCharacterDetail"
      class="modal-mask fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <div
        class="modal-card character-detail-modal max-h-[90vh] w-full max-w-4xl transform animate-[subtleGlow_4s_ease-in-out_infinite_alternate] overflow-y-auto rounded-3xl bg-gradient-to-br from-white via-pink-50 to-white p-8 shadow-[var(--rune-glow)]"
      >
        <!-- 标题栏和关闭按钮 -->
        <div class="modal-header relative mb-6 flex items-center justify-between">
          <div class="modal-title text-2xl font-bold text-purple-800">✦ 人物详情 ✦</div>
          <button
            class="close-btn flex h-8 w-8 items-center justify-center rounded-full bg-pink-100 text-pink-600 transition-all duration-200 hover:scale-110 hover:bg-pink-200 hover:text-pink-700"
            @click="closeCharacterDetail"
            title="关闭详情弹窗"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- 人物详情内容 -->
        <div class="modal-body">
          <!-- 加载状态 -->
          <div v-if="characterDetailLoading" class="flex items-center justify-center py-8">
            <div class="flex items-center gap-3 text-purple-600">
              <div class="h-6 w-6 animate-spin rounded-full border-2 border-purple-300 border-t-purple-600"></div>
              <span>正在加载人物详情...</span>
            </div>
          </div>

          <!-- 人物详情内容 -->
          <div v-else-if="selectedCharacter" class="character-detail-body">
            <!-- 人物基本信息 -->
            <div class="mb-6 rounded-xl border border-pink-200 bg-white/80 p-6">
              <div class="mb-4 flex items-center gap-4">
                <div
                  class="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-pink-200 to-purple-200 text-2xl font-bold"
                >
                  {{ selectedCharacter.name?.charAt(0) || '?' }}
                </div>
                <div class="flex-1">
                  <h3 class="text-xl font-bold text-gray-800">{{ selectedCharacter.name || '未知角色' }}</h3>
                  <p class="text-sm text-gray-500">
                    {{ selectedCharacter.gender || '未知' }} · {{ selectedCharacter.race || '未知' }} ·
                    {{ selectedCharacter.age || '未知' }}岁
                  </p>
                </div>
              </div>

              <!-- 好感度 -->
              <div class="mb-4">
                <div class="mb-2 flex items-center justify-between text-sm">
                  <span class="text-gray-600">好感度</span>
                  <span class="font-medium text-pink-600">{{ selectedCharacter.affinity || 0 }}</span>
                </div>
                <div class="h-3 rounded-full bg-gray-200">
                  <div
                    class="h-3 rounded-full bg-gradient-to-r from-pink-400 to-purple-500 transition-all duration-500"
                    :style="{ width: `${Math.min(((selectedCharacter.affinity || 0) / 100) * 100, 100)}%` }"
                  ></div>
                </div>
              </div>
            </div>

            <!-- 属性信息 -->
            <div class="mb-6 rounded-xl border border-pink-200 bg-white/80 p-6">
              <h4 class="mb-4 text-lg font-semibold text-gray-800">属性信息</h4>
              <div class="attributes-grid grid grid-cols-2 gap-4 md:grid-cols-4">
                <div v-for="attrName in attrOrder" :key="attrName" class="attribute-item">
                  <div class="flex items-center gap-2">
                    <div class="attr-icon" v-html="attrIcon(attrName)"></div>
                    <span class="text-sm text-gray-600">{{ attrName }}</span>
                  </div>
                  <div class="text-lg font-bold text-gray-800">
                    {{ selectedCharacter.attributes?.[attrName] || 0 }}
                  </div>
                </div>
              </div>
            </div>

            <!-- 装备信息 -->
            <div v-if="selectedCharacter.equipment" class="mb-6 rounded-xl border border-pink-200 bg-white/80 p-6">
              <h4 class="mb-4 text-lg font-semibold text-gray-800">装备信息</h4>
              <div class="equipment-grid grid grid-cols-1 gap-4 md:grid-cols-3">
                <div v-if="selectedCharacter.equipment.weapon" class="equipment-item">
                  <div class="flex items-center gap-3">
                    <div class="equip-icon" v-html="icon('weapon')"></div>
                    <div>
                      <div class="text-sm text-gray-600">武器</div>
                      <div class="font-medium text-gray-800">
                        {{ selectedCharacter.equipment.weapon.name || '未知武器' }}
                      </div>
                    </div>
                  </div>
                </div>
                <div v-if="selectedCharacter.equipment.armor" class="equipment-item">
                  <div class="flex items-center gap-3">
                    <div class="equip-icon" v-html="icon('armor')"></div>
                    <div>
                      <div class="text-sm text-gray-600">防具</div>
                      <div class="font-medium text-gray-800">
                        {{ selectedCharacter.equipment.armor.name || '未知防具' }}
                      </div>
                    </div>
                  </div>
                </div>
                <div v-if="selectedCharacter.equipment.accessory" class="equipment-item">
                  <div class="flex items-center gap-3">
                    <div class="equip-icon" v-html="icon('accessory')"></div>
                    <div>
                      <div class="text-sm text-gray-600">饰品</div>
                      <div class="font-medium text-gray-800">
                        {{ selectedCharacter.equipment.accessory.name || '未知饰品' }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 人物背景信息 -->
            <div class="mb-6 rounded-xl border border-pink-200 bg-white/80 p-6">
              <h4 class="mb-4 text-lg font-semibold text-gray-800">背景信息</h4>
              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div class="info-item">
                  <div class="text-sm font-medium text-gray-600">出身背景</div>
                  <div class="text-sm text-gray-800">{{ selectedCharacter.background || '未知' }}</div>
                </div>
                <div class="info-item">
                  <div class="text-sm font-medium text-gray-600">性格特征</div>
                  <div class="text-sm text-gray-800">{{ selectedCharacter.personality || '未知' }}</div>
                </div>
                <div class="info-item">
                  <div class="text-sm font-medium text-gray-600">服装描述</div>
                  <div class="text-sm text-gray-800">{{ selectedCharacter.outfit || '未知' }}</div>
                </div>
                <div class="info-item">
                  <div class="text-sm font-medium text-gray-600">关系状态</div>
                  <div class="text-sm text-gray-800">{{ selectedCharacter.relationship || '陌生人' }}</div>
                </div>
              </div>
            </div>

            <!-- 当前状态 -->
            <div class="mb-6 rounded-xl border border-pink-200 bg-white/80 p-6">
              <h4 class="mb-4 text-lg font-semibold text-gray-800">当前状态</h4>
              <div class="space-y-3">
                <div class="info-item">
                  <div class="text-sm font-medium text-gray-600">当前想法</div>
                  <div class="text-sm text-gray-800">{{ selectedCharacter.thoughts || '未知' }}</div>
                </div>
                <div v-if="selectedCharacter.events && selectedCharacter.events.length > 0" class="info-item">
                  <div class="text-sm font-medium text-gray-600">事件记录</div>
                  <div class="text-sm text-gray-800">
                    <ul class="list-inside list-disc space-y-1">
                      <li v-for="(event, index) in selectedCharacter.events" :key="index">
                        {{ event }}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <!-- 其他信息 -->
            <div class="rounded-xl border border-pink-200 bg-white/80 p-6">
              <h4 class="mb-4 text-lg font-semibold text-gray-800">其他信息</h4>
              <div class="text-sm text-gray-600">
                <p>角色ID: {{ selectedCharacter.id || '未知' }}</p>
                <p v-if="selectedCharacter.others && selectedCharacter.others !== '未知'">
                  其他信息: {{ selectedCharacter.others }}
                </p>
                <p v-if="selectedCharacter.description">描述: {{ selectedCharacter.description }}</p>
                <p v-else-if="!selectedCharacter.others || selectedCharacter.others === '未知'">暂无其他描述信息</p>
              </div>
            </div>
          </div>

          <!-- 错误状态 -->
          <div v-else class="flex items-center justify-center py-8">
            <div class="text-center text-red-600">
              <div class="mb-2 text-lg">⚠️</div>
              <div>无法加载人物详情</div>
              <button
                class="mt-3 rounded-lg bg-pink-500 px-4 py-2 text-sm text-white hover:bg-pink-600"
                @click="closeCharacterDetail"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { updateUserKey } from 'shared/constants';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useSaveLoad } from '同层游玩RPG_remake/composables/useSaveLoad';
import { useBattleConfig } from '../composables/useBattleConfig';
import { useGameServices } from '../composables/useGameServices';
import { useGameSettings } from '../composables/useGameSettings';
import { useGameStateManager } from '../composables/useGameStateManager';
import { usePlayingLogic } from '../composables/usePlayingLogic';
import { useStatData } from '../composables/useStatData';
import CommandQueueDialog from './CommandQueueDialog.vue';
import EquipmentDetailDialog from './EquipmentDetailDialog.vue';
import InventoryDialog from './InventoryDialog.vue';
import SaveDialog from './SaveDialog.vue';
// 移除 Pinia stores，使用本地状态管理

// 使用 useGameServices 提供的 UI 反馈方法
const { showSuccess, showError, showWarning, showInfo } = useGameServices();

// 使用游戏设置管理
const {
  shouldStream,
  smartHistorySettings,
  loadSettings,
  saveSettings,
  updateSmartHistorySettings,
  resetSettings,
  registerGameSettings,
  cleanupGameSettings,
} = useGameSettings();

// 使用状态管理器
const gameStateManager = useGameStateManager();

const {
  isNarrow,
  leftOpen,
  rightOpen,
  streamingHtml,
  isStreaming,
  isSending,
  messages,
  rootRef,
  scrollToBottom,
  initialize,
  cleanup,
  generateMessage,
  addUserMessage,
  deleteMessage,
  filterEphemeralMessages,
  clearMessages,
  stopGeneration,
  regenerateMessage,
  editMessage,
  registerPlayingLogic,
} = usePlayingLogic();

const {
  currentAttributes,
  equipment,
  inventory,
  currentDate,
  currentTime,
  currentLocation,
  currentRandomEvent,
  relationships,
  isRandomEventActive,
  gender,
  race,
  age,
  enemiesList,
  enemiesLoading,
  enemiesError,
  getEnemies,
  getEnemy,
  relationshipCharacters,
  relationshipCharactersLoading,
  relationshipCharactersError,
  loadGameStateData,
  getAttributeDisplay,
  isAttributeModified,
  isMvuAttributeModified,
  getAttributeDeltaValue,
  getEquipmentDisplayInfo,
  isEquipmentEquipped,
  getEquipmentDetail,
  getRelationshipCharacters,
  getRelationshipCharacter,
  registerStatData,
  updateFromPlayingLogic,
} = useStatData();

const {
  loadToUI,
  loadSaveWithFeedback,
  createNewSaveWithManualMode,
  deleteSelectedSaves,
  refreshSaveList,
  createNewEmptySave,
  getCurrentSaveInfo,
  checkSaveAvailability,
  registerSaveLoad,
  cleanupSaveLoad,
  isLoading: saveLoadIsLoading,
  isSaving: saveLoadIsSaving,
} = useSaveLoad();

// 游戏设置现在通过 useGameSettings 组合式函数管理

// 本地指令队列状态 - 这些应该通过专门的组合式函数管理
const commandQueue = ref<any[]>([]);
const queueLength = computed(() => commandQueue.value.length);

// 本地指令队列方法
const executeBeforeMessage = async () => {
  console.log('[PlayingRoot] 执行指令队列');
  return true;
};

// 使用战斗配置服务
const { startBattle } = useBattleConfig();

// 清理函数存储
const gameStateUnsubscribe = ref<(() => void) | null>(null);
const fullscreenUnsubscribe = ref<(() => void) | null>(null);

// 所有状态和方法都从 usePlayingLogic 中获取，无需重复定义

// 这些方法应该通过组合式函数提供
const setupCommandQueueListeners = () => {
  console.log('[PlayingRoot] 设置指令队列监听器');
};

const isSaveLoadAvailable = () => {
  return true;
};

// 类型定义
type Role = 'user' | 'assistant' | 'system';
type AttrName = '力量' | '敏捷' | '防御' | '体质' | '魅力' | '幸运' | '意志';
type Paragraph = {
  id: string;
  html: string;
  role: Role;
  ephemeral?: boolean;
};

const setupCharacterCreationListeners = () => {
  console.log('[PlayingRoot] 设置角色创建监听器');
};

const cleanupCharacterCreationListeners = () => {
  console.log('[PlayingRoot] 清理角色创建监听器');
};

// 从 useStatData 获取游戏状态数据 - 直接使用ref对象，纯ref架构
// currentDate, currentTime, currentLocation, currentRandomEvent, gender, race, age 已从 useStatData 解构获取

const inputText = ref<string>('');
const showSettings = ref<boolean>(false);
const showSaveDialog = ref<boolean>(false);
const showInventoryDialog = ref<boolean>(false);
const showCommandQueueDialog = ref<boolean>(false);
const showRelations = ref<boolean>(false);
const showEnemies = ref<boolean>(false);
const showCharacterDetail = ref<boolean>(false);
const showEnemyDetail = ref<boolean>(false);
const selectedCharacter = ref<any>(null);
const selectedEnemy = ref<any>(null);
const characterDetailLoading = ref<boolean>(false);
const enemyDetailLoading = ref<boolean>(false);

// 角色名称变量 - 只使用宏获取
const characterName = ref<string>('');

// 自定义头像URL
const customAvatarUrl = ref<string>('');

const showEquipmentDetail = ref<boolean>(false);
const selectedEquipmentType = ref<'weapon' | 'armor' | 'accessory'>('weapon');
const selectedEquipment = ref<any>(null);
const selectedInventoryItems = ref<any[]>([]);
const showEditDialog = ref<boolean>(false);
const editContent = ref<string>('');
const editingMessage = ref<any>(null);
const showEventDetails = ref<boolean>(false);

// 右键菜单
const contextMenu = ref<{
  visible: boolean;
  x: number;
  y: number;
  target?: any;
  canRegenerate?: boolean;
  canDelete?: boolean;
  isLatestMessage?: boolean;
}>({
  visible: false,
  x: 0,
  y: 0,
  canRegenerate: false,
  canDelete: false,
  isLatestMessage: false,
});

const attrOrder = ref<string[]>(['力量', '敏捷', '防御', '体质', '魅力', '幸运', '意志']);

const displayInventory = computed(() => {
  const result: Record<string, any[]> = {
    weapons: [],
    armors: [],
    accessories: [],
    others: [],
  };

  if (inventory.value && typeof inventory.value === 'object') {
    ['weapons', 'armors', 'accessories', 'others'].forEach(category => {
      const items = inventory.value[category];
      if (Array.isArray(items)) {
        result[category] = items
          .filter(item => item && item.name && item.name.trim() !== '')
          .map(item => ({
            ...item,
            fromMvu: true,
          }));
      }
    });
  }

  return result;
});

const isMvuDataLoaded = computed(() => {
  // 通过检查数据是否存在来判断MVU数据是否已加载
  return currentAttributes.value && Object.keys(currentAttributes.value).length > 0;
});
const loadMvuData = async () => {
  try {
    // 检查是否有待处理的存档数据
    const pendingSaveData = (window as any).__RPG_PENDING_SAVE_DATA__;
    if (pendingSaveData) {
      // 如果有待处理的存档数据，使用 useSaveLoad 的 loadToUI 方法
      const uiContext = {
        messages,
        streamingHtml,
        isStreaming,
        isSending,
        scrollToBottom,
        nextTick,
      };
      await loadToUI(pendingSaveData.slotId, uiContext);

      // 清理待处理数据
      (window as any).__RPG_PENDING_SAVE_DATA__ = undefined;
    } else {
      // 否则使用 useStatData 的方法
      await loadGameStateData();
    }
  } catch (err) {
    console.error('[PlayingRoot] 加载MVU数据失败:', err);
  }
};

// MVU 属性相关函数现在直接通过 useStatData 获取，移除重复定义

// 为了向后兼容，添加 getCurrentAttributeValue 方法
const getCurrentAttributeValue = (name: string) => {
  return getAttributeDisplay(name);
};

// 库存相关方法现在通过 useStatData 获取，移除重复定义

const getEnglishAttributeName = (chineseName: string): string => {
  const mapping: Record<string, string> = {
    力量: 'strength',
    敏捷: 'agility',
    防御: 'defense',
    体质: 'constitution',
    魅力: 'charisma',
    幸运: 'luck',
    意志: 'willpower',
  };
  return mapping[chineseName] || chineseName;
};

const getAttributeValue = (name: string, defaultValue: any = null) => {
  return getCurrentAttributeValue(name) || defaultValue;
};

// 添加缺失的UI方法
const openRelations = async () => {
  try {
    showRelations.value = true;
    if (relationshipCharacters.value.length === 0) {
      await getRelationshipCharacters();
    }
  } catch (error) {
    console.error('[PlayingRoot] 打开关系弹窗失败:', error);
    showError('获取关系人物数据失败');
  }
};

const closeRelations = () => {
  showRelations.value = false;
};

const openEnemies = async () => {
  try {
    showEnemies.value = true;
    if (!enemiesList.value || enemiesList.value.length === 0) {
      await getEnemies();
    }
  } catch (error) {
    console.error('[PlayingRoot] 打开敌人弹窗失败:', error);
    showError('获取敌人数据失败');
  }
};

const closeEnemies = () => {
  showEnemies.value = false;
};

const openCharacterDetail = async (character: any) => {
  try {
    selectedCharacter.value = character;
    showCharacterDetail.value = true;
    characterDetailLoading.value = true;
    if (character.id) {
      const detailedCharacter = await getRelationshipCharacter(character.id);
      if (detailedCharacter) {
        selectedCharacter.value = detailedCharacter;
      }
    }
  } catch (error) {
    console.error('[PlayingRoot] 打开人物详情失败:', error);
    showError('获取人物详情失败');
  } finally {
    characterDetailLoading.value = false;
  }
};

const closeCharacterDetail = () => {
  showCharacterDetail.value = false;
  selectedCharacter.value = null;
  characterDetailLoading.value = false;
};

const openEnemyDetail = async (enemy: any) => {
  try {
    selectedEnemy.value = enemy;
    showEnemyDetail.value = true;
    enemyDetailLoading.value = true;
    if (enemy.id) {
      const detailed = await getEnemy(enemy.id);
      if (detailed) selectedEnemy.value = detailed;
    }
  } catch (error) {
    console.error('[PlayingRoot] 打开敌人详情失败:', error);
    showError('获取敌人详情失败');
  } finally {
    enemyDetailLoading.value = false;
  }
};

const closeEnemyDetail = () => {
  showEnemyDetail.value = false;
  selectedEnemy.value = null;
  enemyDetailLoading.value = false;
};

const openInventoryDialog = () => {
  showInventoryDialog.value = true;
};

const closeInventoryDialog = () => {
  showInventoryDialog.value = false;
};

const onSelectItem = (item: any) => {
  console.log('[PlayingRoot] 选择了物品:', item);
  showInfo(`选择了物品: ${item.name || '未知物品'}`);
};

const openEquipmentDetail = async (type: 'weapon' | 'armor' | 'accessory') => {
  try {
    selectedEquipmentType.value = type;
    const equipmentDetail = await getEquipmentDetail(type);
    selectedEquipment.value = equipmentDetail;
    // 从 displayInventory 中获取对应类型的物品
    let inventoryItems: any[] = [];
    switch (type) {
      case 'weapon':
        inventoryItems = displayInventory.value.weapons || [];
        break;
      case 'armor':
        inventoryItems = displayInventory.value.armors || [];
        break;
      case 'accessory':
        inventoryItems = displayInventory.value.accessories || [];
        break;
    }
    selectedInventoryItems.value = inventoryItems;
    showEquipmentDetail.value = true;
  } catch (error) {
    console.error('[PlayingRoot] 打开装备详情失败:', error);
    showError('获取装备详情失败');
  }
};

const closeEquipmentDetail = () => {
  showEquipmentDetail.value = false;
  selectedEquipmentType.value = 'weapon';
  selectedEquipment.value = null;
  selectedInventoryItems.value = [];
};

const openSettings = () => {
  showSettings.value = true;
};

const onDialogLoaded = async (data: any) => {
  try {
    // 使用 useSaveLoad 的 loadToUI 方法，这会自动处理：
    // 1. 从 SaveLoadManagerService 获取存档数据
    // 2. 恢复 UI 消息
    // 3. 恢复 MVU 快照
    // 4. 更新游戏状态
    const uiContext = {
      messages,
      streamingHtml,
      isStreaming,
      isSending,
      scrollToBottom,
      nextTick,
    };

    await loadToUI(data.slotId, uiContext);
    showSaveDialog.value = false;
  } catch (error) {
    console.error('[PlayingRoot] 读档失败:', error);
    showError('读档失败');
  }
};

// 右键菜单相关方法
const copyCurrent = async () => {
  try {
    const t = String(contextMenu.value?.target?.html ?? '').replace(/<[^>]+>/g, '');
    await navigator.clipboard.writeText(t);
    showSuccess('已复制');
  } catch {
    showError('复制失败');
  } finally {
    contextMenu.value.visible = false;
  }
};

const editCurrent = async () => {
  try {
    const target = contextMenu.value.target;
    if (!target) return;
    editContent.value = target.html ? target.html.replace(/<[^>]+>/g, '').trim() : target.content || '';
    editingMessage.value = target;
    showEditDialog.value = true;
  } catch (error) {
    console.error('[PlayingRoot] 打开编辑失败:', error);
    showError('打开编辑失败');
  } finally {
    contextMenu.value.visible = false;
  }
};

const regenerateCurrent = async () => {
  try {
    const target = contextMenu.value.target;
    if (!target) return;
    try {
      await regenerateMessage(target.id);
      showSuccess('重新生成成功');
    } catch (error) {
      showError('重新生成失败');
    }
  } catch (error) {
    console.error('[PlayingRoot] 重新生成失败:', error);
    showError('重新生成失败');
  } finally {
    contextMenu.value.visible = false;
  }
};

const deleteCurrent = async () => {
  try {
    const target = contextMenu.value.target;
    if (!target) return;
    if (!confirm('确定要删除这条消息吗？此操作不可恢复。')) {
      contextMenu.value.visible = false;
      return;
    }
    try {
      await deleteMessage(target.id);
      showSuccess('消息已删除');
    } catch (error) {
      showError('删除消息失败');
    }
  } catch (error) {
    console.error('[PlayingRoot] 删除消息失败:', error);
    showError('删除消息失败');
  } finally {
    contextMenu.value.visible = false;
  }
};

const saveEdit = async () => {
  try {
    if (!editingMessage.value || !editContent.value.trim()) {
      showError('编辑内容不能为空');
      return;
    }
    try {
      await editMessage(editingMessage.value.id, editContent.value.trim());
      showSuccess('编辑保存成功');
      showEditDialog.value = false;
    } catch (error) {
      showError('编辑保存失败');
    }
  } catch (error) {
    console.error('[PlayingRoot] 编辑保存失败:', error);
    showError('编辑保存失败');
  }
};

const cancelEdit = () => {
  showEditDialog.value = false;
  editContent.value = '';
  editingMessage.value = null;
};

// 图标相关方法
const icon = (name: string): string => {
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
    防御: '<path d="M12 2l7 4v6c0 5-3 8-7 10-4-2-7-5-7-10V6l7-4z"/>',
    体质: '<rect x="6" y="6" width="12" height="12" rx="6"/>',
    魅力: '<path d="M12 21s-6-4-6-9a6 6 0 1112 0c0 5-6 9-6 9z"/>',
    幸运: '<path d="M12 2v20M2 12h20"/>',
    意志: '<path d="M12 3l3 7h7l-5.5 4 2 7-6.5-4.5L6.5 21l2-7L3 10h7z"/>',
  };
  const p = paths[name] || paths.other;
  return base + p + close;
};

const attrIcon = (name: string): string => {
  return icon(name);
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

// 存档相关方法 - 这些应该通过 useSaveLoad 组合式函数提供
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
    // 使用 useSaveLoad 的 loadSaveWithFeedback 方法
    const result = await loadSaveWithFeedback(slotId);

    if (result.success && result.data) {
      // 使用 useSaveLoad 的 loadToUI 方法进行完整的读档流程
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

    // 使用 useSaveLoad 的 deleteSelectedSaves 方法
    const success = await deleteSelectedSaves([slotId]);
    if (success) {
      showSuccess('已删除');
    } else {
      showError('删除失败');
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

// 重置智能历史管理设置 - 现在通过 useGameSettings 组合式函数提供
function resetSmartHistorySettings() {
  resetSettings();
  showSuccess('智能历史管理设置已重置为默认值');
}

async function onSend() {
  if (!canSend.value || isBusy.value) return;
  const text = inputText.value.trim();
  if (!text) return;

  inputText.value = '';

  // 用户发送新一条消息时，清理上一次的临时错误消息
  filterEphemeralMessages();

  // 先执行指令队列
  const commandQueueSuccess = await executeBeforeMessage();
  if (!commandQueueSuccess) {
    showWarning('部分指令执行失败，但继续发送消息');
  }

  // 然后执行原有的消息发送逻辑
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

// 触发一次MVP战斗
async function onTestBattle() {
  try {
    // 启动妖怪战斗（普通难度）
    const success = await startBattle('yokai_battle', undefined, {
      returnToPrevious: true,
      silent: false,
    });

    if (!success) {
      showError('启动战斗失败');
    }
  } catch (e) {
    console.error('[PlayingRoot] 启动测试战斗失败:', e);
    showError('启动战斗失败');
  }
}

function onScroll() {}

function onContextMenu(item: Paragraph) {
  // 检查是否可以重新生成（只有AI消息可以重新生成）
  const canRegenerate = item.role === 'assistant';

  // 检查是否为最新消息（只有最新消息可以删除）
  const isLatestMessage = messages.value.length > 0 && messages.value[messages.value.length - 1].id === item.id;

  // 检查是否可以删除（只有最新消息可以删除，不管是用户输入、AI消息还是报错消息）
  const canDelete = isLatestMessage;

  contextMenu.value = {
    visible: true,
    x: (window as any).event?.clientX ?? 0,
    y: (window as any).event?.clientY ?? 0,
    target: item,
    canRegenerate,
    canDelete,
    isLatestMessage,
  };
  try {
    document.addEventListener('click', hideMenuOnce, { once: true });
  } catch {}
}

function hideMenuOnce() {
  contextMenu.value.visible = false;
}

async function toggleFullscreen() {
  try {
    const rpgRoot = document.getElementById('rpg-root');
    if (!rpgRoot) return;

    // 使用浏览器的实际全屏状态来判断，而不是CSS类
    const isFullscreen = !!document.fullscreenElement;

    if (isFullscreen) {
      // 退出全屏
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } else {
      // 进入全屏
      try {
        await rpgRoot.requestFullscreen();
      } catch {
        // 浏览器全屏失败，使用CSS全屏
        rpgRoot.classList.add('fullscreen');
      }
    }
  } catch {
    // 忽略错误
  }
}

// 添加全屏状态监听器
function setupFullscreenListener(): (() => void) | null {
  const rpgRoot = document.getElementById('rpg-root');
  if (!rpgRoot) return null;

  const handleFullscreenChange = () => {
    if (document.fullscreenElement) {
      // 进入全屏
      rpgRoot.classList.add('fullscreen');
    } else {
      // 退出全屏
      rpgRoot.classList.remove('fullscreen');
    }
  };

  // 监听全屏状态变化
  document.addEventListener('fullscreenchange', handleFullscreenChange);

  // 返回清理函数
  return () => {
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
  };
}

// 展示辅助
function displayAttr(v: number | null | undefined): string {
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : '—';
}

// 获取基础值/当前值格式的属性显示
function getAttributeBaseCurrentValue(name: string): string {
  try {
    // 获取基础属性值 - 使用英文属性名
    const englishName = getEnglishAttributeName(name);
    const baseValue = getAttributeValue(englishName, 0);

    // 获取当前属性值（包含装备加成等）- 使用更新后的函数
    const currentValue = getAttributeDisplay(name);

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

// 获取当前属性值（只显示当前值，不显示斜杠） - 已在上方定义

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

// 物品相关工具方法 - 这些应该通过专门的组合式函数提供

// 读取角色名称 - 只使用宏获取
async function loadUserPanel(): Promise<void> {
  try {
    // 更新用户键
    const currentUserKey = updateUserKey();

    // 只使用宏获取角色名称
    const macroName = (window as any).substitudeMacros?.(currentUserKey);
    characterName.value = String(macroName || '');
  } catch (error) {
    console.error('[PlayingRoot] 获取角色名称失败:', error);
    characterName.value = '';
  }
}

// 监听消息变化自动更新缓存（滚动由 usePlayingLogic 处理）
watch(messages, async () => {
  try {
    collectUiMessages();
    // 每次消息更新时，重新加载游戏状态数据，确保时间地点等信息同步更新
    await loadGameStateData();
  } catch {}
});

onMounted(async () => {
  // 注册状态管理器到全局
  try {
    (window as any).__RPG_GAME_STATE_MANAGER__ = gameStateManager;
    console.log('[PlayingRoot] 状态管理器已注册到全局');
  } catch (error) {
    console.error('[PlayingRoot] 状态管理器注册失败:', error);
  }

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
    // 注册 useSaveLoad 的状态管理协调
    try {
      registerSaveLoad();
    } catch (error) {
      console.warn('[PlayingRoot] useSaveLoad 状态管理协调注册失败:', error);
    }
    if (typeof registerGameSettings === 'function') {
      registerGameSettings();
    }
    // 设置指令队列事件监听器
    if (typeof setupCommandQueueListeners === 'function') {
      setupCommandQueueListeners();
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
  // 移除对 gameStateStore.currentPhase 的监听，因为不再使用 Pinia
  // 如果需要监听游戏状态变化，可以在这里添加本地状态监听

  // 设置全屏状态监听器
  try {
    fullscreenUnsubscribe.value = setupFullscreenListener();
  } catch (error) {
    console.warn('[PlayingRoot] 全屏监听器设置失败:', error);
  }

  // 使用usePlayingLogic的initialize方法统一管理初始化逻辑
  await initialize(onDialogLoaded, loadUserPanel, loadMvuData, loadGameStateData, updateFromPlayingLogic);
});
onUnmounted(() => {
  // 清理状态管理器
  try {
    (window as any).__RPG_GAME_STATE_MANAGER__ = undefined;
    console.log('[PlayingRoot] 状态管理器已从全局清理');
  } catch (error) {
    console.warn('[PlayingRoot] 清理状态管理器失败:', error);
  }

  // 清理游戏状态监听器
  try {
    if (gameStateUnsubscribe.value && typeof gameStateUnsubscribe.value === 'function') {
      gameStateUnsubscribe.value();
    }
  } catch (error) {
    console.warn('[PlayingRoot] 清理游戏状态监听器失败:', error);
  }

  // 清理全屏状态监听器
  try {
    if (fullscreenUnsubscribe.value && typeof fullscreenUnsubscribe.value === 'function') {
      fullscreenUnsubscribe.value();
    }
  } catch (error) {
    console.warn('[PlayingRoot] 清理全屏监听器失败:', error);
  }

  // 清理角色创建事件监听器
  try {
    if (typeof cleanupCharacterCreationListeners === 'function') {
      cleanupCharacterCreationListeners();
    }
  } catch (error) {
    console.warn('[PlayingRoot] 清理角色创建事件监听器失败:', error);
  }

  // 调用 usePlayingLogic 的清理方法
  try {
    cleanup();
  } catch (error) {
    console.warn('[PlayingRoot] 清理游玩逻辑失败:', error);
  }

  // 清理 useSaveLoad 的状态管理协调
  try {
    cleanupSaveLoad();
  } catch (error) {
    console.warn('[PlayingRoot] useSaveLoad 状态管理协调清理失败:', error);
  }

  // 清理游戏设置的状态管理协调
  try {
    cleanupGameSettings();
  } catch (error) {
    console.warn('[PlayingRoot] 游戏设置状态管理协调清理失败:', error);
  }
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
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: rgba(255, 255, 255, 0.8);
  transition: all 0.3s ease;
  cursor: pointer;
}

.equip-row:hover {
  background: rgba(255, 255, 255, 0.95);
  border-color: #d1d5db;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.equip-row.equipped {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.05);
}

.equip-row.equipped:hover {
  border-color: #059669;
  background: rgba(16, 185, 129, 0.1);
}

.equip-row.clickable {
  cursor: pointer;
}

.equip-row.clickable:hover {
  background: rgba(255, 255, 255, 0.95);
  border-color: #d1d5db;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.equip-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.equip-name {
  font-size: 14px;
  color: #374151;
  font-weight: 500;
  line-height: 1.4;
}

.equip-status {
  display: flex;
  align-items: center;
  gap: 4px;
}

.status-equipped {
  font-size: 12px;
  color: #059669;
  font-weight: 600;
  padding: 2px 6px;
  background: rgba(16, 185, 129, 0.1);
  border-radius: 4px;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.status-unequipped {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
  padding: 2px 6px;
  background: rgba(107, 114, 128, 0.1);
  border-radius: 4px;
  border: 1px solid rgba(107, 114, 128, 0.2);
}

.equip-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
  border-radius: 6px;
  border: 1px solid #d1d5db;
  flex-shrink: 0;
}

.equip-icon svg {
  width: 18px;
  height: 18px;
  color: #6b7280;
}

.equip-row.equipped .equip-icon {
  background: linear-gradient(135deg, #d1fae5, #a7f3d0);
  border-color: #10b981;
}

.equip-row.equipped .equip-icon svg {
  color: #059669;
}

/* 装备栏位悬停效果 */
.equip-row::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(139, 92, 246, 0.1));
  border-radius: 8px;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.equip-row:hover::before {
  opacity: 1;
}

.equip-row {
  position: relative;
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
  overflow: hidden;
  position: relative;
  background-size: cover;
  background-position: center;
}

.custom-avatar img {
  width: 100px !important;
  height: 100px !important;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  background-size: cover;
  background-position: center;
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

/* 关系人物弹窗样式 */
.relationships-modal {
  max-width: 800px;
  width: 90vw;
  max-height: 85vh;
}

.affinity-section {
  border: 1px solid #e5e7eb;
}

/* 响应式优化 */
@media (max-height: 600px) {
  .settings-modal,
  .relationships-modal {
    max-height: 90vh;
  }

  .modal-body {
    max-height: 60vh !important;
  }
}

@media (max-width: 480px) {
  .settings-modal,
  .relationships-modal {
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

  .character-detail-body {
    grid-template-columns: 1fr !important;
  }

  .attributes-grid {
    grid-template-columns: repeat(3, 1fr) !important;
  }
}

/* 人物详情新增样式 */
.info-item {
  margin-bottom: 8px;
}

.info-item:last-child {
  margin-bottom: 0;
}

/* 事件记录列表样式 */
.list-disc {
  list-style-type: disc;
}

.list-inside {
  list-style-position: inside;
}

/* 背景信息网格样式 */
.grid.grid-cols-1.gap-4.md\\:grid-cols-2 {
  gap: 16px;
}

@media (min-width: 768px) {
  .grid.grid-cols-1.gap-4.md\\:grid-cols-2 {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
