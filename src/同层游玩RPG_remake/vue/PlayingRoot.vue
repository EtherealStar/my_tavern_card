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
            <div class="event-display">{{ currentEvent }}</div>
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

        <!-- 经验条 -->
        <div class="exp-panel">
          <div class="rpg-title">
            经验值
            <span v-if="isMvuDataLoaded" class="mvu-indicator" title="MVU 数据已加载"></span>
          </div>
          <div class="exp-content">
            <div class="exp-info">
              <div class="exp-level">
                <span class="exp-label">等级</span>
                <span class="exp-value">{{ expBarData.currentLevel }}</span>
                <span v-if="expBarData.isMaxLevel" class="max-level-badge">满级</span>
              </div>
              <div class="exp-text">
                <span class="exp-current">{{ expBarData.currentLevelExp }}</span>
                <span class="exp-separator">/</span>
                <span class="exp-required">{{ expBarData.expRequiredForNextLevel }}</span>
              </div>
            </div>
            <div class="exp-bar-container">
              <div class="exp-bar-background">
                <div
                  class="exp-bar-fill"
                  :class="{ 'max-level': expBarData.isMaxLevel }"
                  :style="{ width: `${expBarData.expProgress * 100}%` }"
                ></div>
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
              <div class="event-name">{{ currentEvent || '无' }}</div>
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
            class="pointer-events-none absolute inset-0 animate-[spellCharge_4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-[var(--color-muted-beige)] to-transparent opacity-0 group-focus-within:opacity-100"
          ></div>

          <div class="relative z-10 flex items-center gap-3 p-4">
            <!-- 指令队列按钮 -->
            <button
              class="command-queue-btn theme-button"
              @click="showCommandQueueDialog = true"
              :title="`指令队列 (${queueLength})`"
            >
              <svg class="theme-icon h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              class="input theme-input flex-1 resize-none rounded-2xl border-2 px-4 py-2 backdrop-blur-sm transition-all duration-300 focus:outline-none"
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

              <!-- 动态战斗按钮：当有敌人battle_end为false时显示 -->
              <div v-if="showBattleButton" class="battle-buttons">
                <div v-for="enemy in availableEnemies" :key="enemy.id" class="mb-1">
                  <button class="btn battle-btn w-full" @click="startDynamicBattle(enemy.id)" :disabled="isBusy">
                    <span class="flex items-center gap-2">
                      <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      与 {{ enemy.name || enemy.id }} 战斗
                    </span>
                  </button>
                </div>
              </div>

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
                  d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"
                />
              </svg>
              关系
            </button>
            <button class="menu-btn" @click="openEnemies">
              <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a1 1 0 10-1.415-1.414 3 3 0 01-4.242 0 1 1 0 00-1.415 1.414 5 5 0 007.072 0z"
                  clip-rule="evenodd"
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
            <button class="menu-btn" @click="showSaveDialog = true">
              <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z"
                />
              </svg>
              存档
            </button>
            <button class="menu-btn" @click="showReadingSettings = true">
              <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"
                />
              </svg>
              阅读
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
      class="drawer-toggle left theme-drawer-button fixed top-1/2 left-4 z-50 -translate-y-1/2 transform rounded-full p-2 text-white shadow-lg transition-all duration-300 hover:scale-110"
      @click="leftOpen = !leftOpen"
    >
      ◀
    </button>
    <button
      v-if="isNarrow && !rightOpen"
      class="drawer-toggle right theme-drawer-button fixed top-1/2 right-4 z-50 -translate-y-1/2 transform rounded-full p-2 text-white shadow-lg transition-all duration-300 hover:scale-110"
      @click="rightOpen = !rightOpen"
    >
      ▶
    </button>

    <Teleport :to="modalTarget">
      <div
        v-if="showSettings"
        class="modal-mask fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      >
        <div
          class="modal-card settings-modal transform animate-[subtleGlow_4s_ease-in-out_infinite_alternate] rounded-3xl bg-gradient-to-br from-white via-[var(--color-muted-beige)] to-white p-6 shadow-[var(--rune-glow)] transition-all duration-500 hover:scale-105"
        >
          <!-- 标题栏和关闭按钮 -->
          <div class="modal-header relative mb-4 flex items-center justify-between">
            <div class="modal-title text-xl font-bold" style="color: var(--text-primary)">✦ 系统设置 ✦</div>
            <button
              class="close-btn theme-close-btn flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 hover:scale-110"
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
                class="theme-setting-label flex cursor-pointer items-center gap-2 rounded-lg p-3 transition-colors"
              >
                <input v-model="shouldStream" type="checkbox" class="theme-checkbox h-4 w-4 rounded" />
                <span class="text-sm font-medium" style="color: var(--text-primary)">流式传输</span>
              </label>
            </div>

            <!-- 流式生成时自动滚动设置 -->
            <div class="setting-group">
              <label
                class="theme-setting-label flex cursor-pointer items-center gap-2 rounded-lg p-3 transition-colors"
              >
                <input v-model="autoScrollDuringStreaming" type="checkbox" class="theme-checkbox h-4 w-4 rounded" />
                <span class="text-sm font-medium" style="color: var(--text-primary)">流式生成时自动滚动</span>
              </label>
              <p class="mt-1 px-3 text-xs" style="color: var(--text-secondary)">
                开启后，AI 生成文本时会自动滚动到底部；关闭后，仅在生成完成时滚动
              </p>
            </div>

            <!-- 智能历史管理设置 -->
            <div class="setting-group">
              <div class="setting-header mb-2">
                <h3 class="text-base font-semibold" style="color: var(--text-primary)">智能历史管理</h3>
                <p class="text-xs" style="color: var(--text-secondary)">控制存档消息的处理方式和数量限制</p>
              </div>

              <div class="grid grid-cols-1 gap-3">
                <!-- 助手消息限制 -->
                <div class="setting-item">
                  <label class="mb-1 block text-xs font-medium" style="color: var(--text-primary)">助手消息限制</label>
                  <input
                    v-model.number="smartHistorySettings.assistantMessageLimit"
                    type="number"
                    min="1"
                    max="1000"
                    class="theme-input-small w-full rounded-md border px-2 py-1.5 text-sm"
                  />
                  <p class="mt-0.5 text-xs" style="color: var(--text-secondary)">最多保留的助手消息数量 (1-1000)</p>
                </div>

                <!-- 用户消息限制 -->
                <div class="setting-item">
                  <label class="mb-1 block text-xs font-medium" style="color: var(--text-primary)">用户消息限制</label>
                  <input
                    v-model.number="smartHistorySettings.userMessageLimit"
                    type="number"
                    min="1"
                    max="1000"
                    class="theme-input-small w-full rounded-md border px-2 py-1.5 text-sm"
                  />
                  <p class="mt-0.5 text-xs" style="color: var(--text-secondary)">最多保留的用户消息数量 (1-1000)</p>
                </div>

                <!-- 短摘要阈值 -->
                <div class="setting-item">
                  <label class="mb-1 block text-xs font-medium" style="color: var(--text-primary)">短摘要阈值</label>
                  <input
                    v-model.number="smartHistorySettings.shortSummaryThreshold"
                    type="number"
                    min="1"
                    max="100"
                    class="theme-input-small w-full rounded-md border px-2 py-1.5 text-sm"
                  />
                  <p class="mt-0.5 text-xs" style="color: var(--text-secondary)">超过此数量时使用短摘要 (1-100)</p>
                </div>

                <!-- 长摘要阈值 -->
                <div class="setting-item">
                  <label class="mb-1 block text-xs font-medium" style="color: var(--text-primary)">长摘要阈值</label>
                  <input
                    v-model.number="smartHistorySettings.longSummaryThreshold"
                    type="number"
                    min="1"
                    max="100"
                    class="theme-input-small w-full rounded-md border px-2 py-1.5 text-sm"
                  />
                  <p class="mt-0.5 text-xs" style="color: var(--text-secondary)">超过此数量时使用长摘要 (1-100)</p>
                </div>
              </div>

              <!-- 确定按钮 -->
              <div class="mt-3 flex justify-end">
                <button
                  class="theme-primary-button rounded-lg px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:scale-105 focus:ring-2 focus:outline-none"
                  @click="showSettings = false"
                >
                  确定
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

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

    <!-- 阅读设置弹窗 -->
    <ReadingSettingsDialog v-if="showReadingSettings" @close="() => (showReadingSettings = false)" />

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
    <Teleport :to="modalTarget">
      <div
        v-if="showRelations"
        class="modal-mask fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      >
        <div
          class="modal-card relationships-modal max-h-[90vh] w-full max-w-6xl transform animate-[subtleGlow_4s_ease-in-out_infinite_alternate] overflow-y-auto border-2 p-8 shadow-[var(--rune-glow)] transition-all duration-500 hover:scale-105"
          style="border-radius: 0; background: var(--bg-surface); border-color: var(--border-color)"
        >
          <!-- 标题栏和关闭按钮 -->
          <div class="modal-header relative mb-6 flex items-center justify-between">
            <div class="modal-title text-2xl font-bold" style="color: var(--text-primary)">✦ 关系人物 ✦</div>
            <button
              class="close-btn flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200"
              style="background: var(--button-bg); color: var(--button-text); border: 2px solid var(--border-color)"
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
              <div class="flex items-center gap-3" style="color: var(--text-secondary)">
                <div
                  class="h-6 w-6 animate-spin rounded-full border-2"
                  style="border-color: var(--color-border-light); border-top-color: var(--color-primary)"
                ></div>
                <span>正在加载关系人物...</span>
              </div>
            </div>

            <!-- 错误状态 -->
            <div v-else-if="relationshipCharactersError" class="flex items-center justify-center py-8">
              <div class="text-center" style="color: var(--color-primary)">
                <div class="mb-2 text-lg">⚠️</div>
                <div>{{ relationshipCharactersError }}</div>
                <button
                  class="mt-3 px-4 py-2 text-sm text-white transition-all"
                  style="background: var(--color-primary); border-radius: 6px; border: 1px solid var(--color-primary)"
                  @click="getRelationshipCharacters"
                >
                  重试
                </button>
              </div>
            </div>

            <!-- 空状态 -->
            <div v-else-if="relationshipCharacters.length === 0" class="flex items-center justify-center py-8">
              <div class="text-center" style="color: var(--text-secondary)">
                <div class="mb-2 text-4xl">👥</div>
                <div class="text-lg">暂无关系人物</div>
                <div class="text-sm">在游戏中建立关系后，这里会显示相关人物</div>
              </div>
            </div>

            <!-- 关系人物列表 - 横向卡片布局 -->
            <div v-else class="flex flex-col gap-3">
              <div
                v-for="character in relationshipCharacters"
                :key="character.id"
                class="relationship-card group cursor-pointer border p-4 transition-all duration-300"
                style="border-radius: 6px"
                @click="openCharacterDetail(character)"
              >
                <div class="flex items-center gap-4">
                  <!-- 左侧：头像区域 -->
                  <div class="avatar-container flex-shrink-0">
                    <div
                      v-if="character.avatarUrl"
                      class="character-avatar"
                      :style="{ backgroundImage: `url(${character.avatarUrl})` }"
                    ></div>
                    <div v-else class="character-avatar-placeholder">
                      <span class="avatar-letter">{{ character.name?.charAt(0) || '?' }}</span>
                    </div>
                  </div>

                  <!-- 右侧：信息区域 -->
                  <div class="flex flex-1 flex-col gap-2">
                    <!-- 人物名称和基本信息 -->
                    <div class="character-header">
                      <div class="character-name">{{ character.name || '未知角色' }}</div>
                      <div class="character-meta">
                        <span class="meta-tag">{{ character.gender || '未知' }}</span>
                        <span class="meta-separator">·</span>
                        <span class="meta-tag">{{ character.race || '未知' }}</span>
                      </div>
                    </div>

                    <!-- 好感度区域 -->
                    <div class="affinity-section">
                      <div class="affinity-header">
                        <span class="affinity-label">好感度</span>
                        <span class="affinity-value" :class="getAffinityClass(character.affinity)">
                          {{ character.affinity || 0 }}
                        </span>
                      </div>
                      <div class="affinity-bar-bg">
                        <div
                          class="affinity-bar-fill"
                          :class="getAffinityClass(character.affinity)"
                          :style="{ width: `${getAffinityProgress(character.affinity)}%` }"
                        ></div>
                      </div>
                    </div>
                  </div>

                  <!-- 右侧箭头指示 -->
                  <div class="flex-shrink-0 transition-all group-hover:translate-x-1" style="color: var(--text-muted)">
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 敌人列表弹窗 -->
    <Teleport :to="modalTarget">
      <div
        v-if="showEnemies"
        class="modal-mask fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      >
        <div
          class="modal-card relationships-modal max-h-[90vh] w-full max-w-6xl transform animate-[subtleGlow_4s_ease-in-out_infinite_alternate] overflow-y-auto border-2 border-[var(--border-color)] bg-gradient-to-br from-white via-[var(--color-muted-beige)] to-white p-8 shadow-[var(--rune-glow)] transition-all duration-500 hover:scale-105"
          style="border-radius: 0"
        >
          <div class="modal-header relative mb-6 flex items-center justify-between">
            <div class="modal-title text-2xl font-bold" style="color: var(--text-primary)">✦ 敌人列表 ✦</div>
            <button
              class="close-btn flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200"
              style="background: var(--button-bg); color: var(--button-text); border: 2px solid var(--border-color)"
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
              <div class="flex items-center gap-3" style="color: var(--text-secondary)">
                <div
                  class="h-6 w-6 animate-spin rounded-full border-2"
                  style="border-color: var(--color-border-light); border-top-color: var(--color-primary)"
                ></div>
                <span>正在加载敌人...</span>
              </div>
            </div>

            <div v-else-if="enemiesError" class="flex items-center justify-center py-8">
              <div class="text-center" style="color: var(--color-primary)">
                <div class="mb-2 text-lg">⚠️</div>
                <div>{{ enemiesError }}</div>
                <button
                  class="mt-3 px-4 py-2 text-sm text-white transition-all"
                  style="background: var(--color-primary); border-radius: 6px; border: 1px solid var(--color-primary)"
                  @click="getEnemies()"
                >
                  重试
                </button>
              </div>
            </div>

            <div v-else-if="enemiesList.length === 0" class="flex items-center justify-center py-8">
              <div class="text-center" style="color: var(--text-secondary)">
                <div class="mb-2 text-4xl">👾</div>
                <div class="text-lg">暂无在场敌人</div>
                <div class="text-sm">触发战斗或事件后，这里会显示敌人</div>
              </div>
            </div>

            <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div
                v-for="enemy in enemiesList"
                :key="enemy.id"
                class="character-card group cursor-pointer border p-4 transition-all duration-300"
                style="border-radius: 6px; border-color: var(--color-border-light); background: var(--panel-bg)"
                @click="openEnemyDetail(enemy)"
              >
                <div class="mb-3 flex items-center gap-3">
                  <div
                    class="flex h-12 w-12 items-center justify-center rounded-full text-lg"
                    style="
                      background: var(--color-muted-beige);
                      border: 1px solid var(--border-color);
                      color: var(--text-primary);
                    "
                  >
                    {{ (enemy.variantId || '?').toString().charAt(0) || '?' }}
                  </div>
                  <div class="flex-1">
                    <div class="font-semibold" style="color: var(--text-primary)">
                      {{ enemy.variantId || '未知敌人' }}
                    </div>
                    <div class="text-sm" style="color: var(--text-secondary)">{{ enemy.race }}</div>
                  </div>
                </div>

                <div class="mt-3 text-center text-xs" style="color: var(--text-muted)">点击查看详情</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 敌人详情弹窗 -->
    <Teleport :to="modalTarget">
      <div
        v-if="showEnemyDetail"
        class="modal-mask fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      >
        <div
          class="modal-card character-detail-modal max-h-[90vh] w-full max-w-4xl transform animate-[subtleGlow_4s_ease-in-out_infinite_alternate] overflow-y-auto border-2 border-[var(--border-color)] bg-gradient-to-br from-white via-[var(--color-muted-beige)] to-white p-8 shadow-[var(--rune-glow)] transition-all duration-500 hover:scale-105"
          style="border-radius: 0"
        >
          <div class="modal-header relative mb-6 flex items-center justify-between">
            <div class="modal-title text-2xl font-bold" style="color: var(--text-primary)">✦ 敌人详情 ✦</div>
            <button
              class="close-btn flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200"
              style="background: var(--button-bg); color: var(--button-text); border: 2px solid var(--border-color)"
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
              <div class="flex items-center gap-3" style="color: var(--text-secondary)">
                <div
                  class="h-6 w-6 animate-spin rounded-full border-2"
                  style="border-color: var(--color-border-light); border-top-color: var(--color-primary)"
                ></div>
                <span>正在加载敌人详情...</span>
              </div>
            </div>

            <div v-else-if="selectedEnemy" class="character-detail-body">
              <div
                class="mb-6 border p-6"
                style="border-radius: 6px; border-color: var(--color-border-light); background: var(--panel-bg)"
              >
                <div class="mb-4 flex items-center gap-4">
                  <div
                    class="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold"
                    style="
                      background: var(--color-muted-beige);
                      border: 1px solid var(--border-color);
                      color: var(--text-primary);
                    "
                  >
                    {{ (selectedEnemy.variantId || '?').toString().charAt(0) || '?' }}
                  </div>
                  <div class="flex-1">
                    <h3 class="text-xl font-bold" style="color: var(--text-primary)">
                      {{ selectedEnemy.variantId || '未知敌人' }}
                    </h3>
                    <p class="text-sm" style="color: var(--text-secondary)">
                      {{ selectedEnemy.race || '未知' }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="flex items-center justify-center py-8">
              <div class="text-center" style="color: var(--color-primary)">
                <div class="mb-2 text-lg">⚠️</div>
                <div>无法加载敌人详情</div>
                <button
                  class="mt-3 px-4 py-2 text-sm text-white transition-all"
                  style="background: var(--color-primary); border-radius: 6px; border: 1px solid var(--color-primary)"
                  @click="closeEnemyDetail"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 编辑对话框 -->
    <Teleport :to="modalTarget">
      <div
        v-if="showEditDialog"
        class="modal-mask fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      >
        <div
          class="modal-card edit-dialog max-h-[90vh] w-full max-w-4xl transform animate-[subtleGlow_4s_ease-in-out_infinite_alternate] rounded-3xl bg-gradient-to-br from-white via-[var(--color-muted-beige)] to-white p-8 shadow-[var(--rune-glow)]"
        >
          <!-- 标题栏和关闭按钮 -->
          <div class="modal-header relative mb-6 flex items-center justify-between">
            <div class="modal-title text-2xl font-bold" style="color: var(--text-primary)">✦ 编辑消息 ✦</div>
            <button
              class="close-btn theme-close-btn flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 hover:scale-110"
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
              <label class="mb-2 block text-sm font-medium" style="color: var(--text-primary)">消息内容</label>
              <textarea
                v-model="editContent"
                class="theme-input-small w-full rounded-lg border px-3 py-2 text-sm"
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
                class="theme-primary-button rounded-lg px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:scale-105 focus:ring-2 focus:outline-none"
                @click="saveEdit"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 人物详情弹窗 -->
    <Teleport :to="modalTarget">
      <div
        v-if="showCharacterDetail"
        class="modal-mask fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      >
        <div
          class="modal-card character-detail-modal max-h-[90vh] w-full max-w-4xl transform animate-[subtleGlow_4s_ease-in-out_infinite_alternate] overflow-y-auto rounded-3xl bg-gradient-to-br from-white via-[var(--color-muted-beige)] to-white p-8 shadow-[var(--rune-glow)]"
        >
          <!-- 标题栏和关闭按钮 -->
          <div class="modal-header relative mb-6 flex items-center justify-between">
            <div class="modal-title text-2xl font-bold" style="color: var(--text-primary)">✦ 人物详情 ✦</div>
            <button
              class="close-btn theme-close-btn flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 hover:scale-110"
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
              <div class="flex items-center gap-3" style="color: var(--text-secondary)">
                <div class="theme-spinner h-6 w-6 animate-spin rounded-full border-2"></div>
                <span>正在加载人物详情...</span>
              </div>
            </div>

            <!-- 人物详情内容 - 左右布局 -->
            <div v-else-if="selectedCharacter" class="character-detail-layout">
              <!-- 左侧：大头像区域 -->
              <div class="detail-left-panel">
                <div class="detail-avatar-container">
                  <div
                    v-if="selectedCharacter.avatarUrl"
                    class="detail-avatar"
                    :style="{ backgroundImage: `url(${selectedCharacter.avatarUrl})` }"
                  ></div>
                  <div v-else class="detail-avatar-placeholder">
                    <span class="detail-avatar-letter">{{ selectedCharacter.name?.charAt(0) || '?' }}</span>
                  </div>
                  <!-- 头像上传按钮 -->
                  <button class="avatar-upload-btn" @click="handleAvatarUpload(selectedCharacter)" title="上传头像">
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span>上传头像</span>
                  </button>
                </div>
              </div>

              <!-- 右侧：详细信息面板 -->
              <div class="detail-right-panel">
                <!-- 人物名称和标签 -->
                <div class="detail-header">
                  <h3 class="detail-character-name">{{ selectedCharacter.name || '未知角色' }}</h3>
                  <div class="detail-tags">
                    <span class="detail-tag">{{ selectedCharacter.gender || '未知' }}</span>
                    <span class="detail-tag">{{ selectedCharacter.race || '未知' }}</span>
                    <span v-if="selectedCharacter.age" class="detail-tag">{{ selectedCharacter.age }}岁</span>
                  </div>
                </div>

                <!-- 好感度显著展示 -->
                <div class="detail-affinity-section">
                  <div class="detail-affinity-header">
                    <span class="detail-affinity-label">好感度</span>
                    <span class="detail-affinity-value" :class="getAffinityClass(selectedCharacter.affinity)">
                      {{ selectedCharacter.affinity || 0 }}
                    </span>
                  </div>
                  <div class="detail-affinity-bar-bg">
                    <div
                      class="detail-affinity-bar-fill"
                      :class="getAffinityClass(selectedCharacter.affinity)"
                      :style="{ width: `${getAffinityProgress(selectedCharacter.affinity)}%` }"
                    ></div>
                  </div>
                  <div class="detail-affinity-description">
                    {{ getAffinityDescription(selectedCharacter.affinity) }}
                  </div>
                </div>

                <!-- 人物详细信息分区 -->
                <div class="detail-info-sections">
                  <!-- 背景故事 -->
                  <div v-if="selectedCharacter.background" class="detail-info-block">
                    <div class="detail-info-title">背景故事</div>
                    <div class="detail-info-content">{{ selectedCharacter.background }}</div>
                  </div>

                  <!-- 性格特征 -->
                  <div v-if="selectedCharacter.personality" class="detail-info-block">
                    <div class="detail-info-title">性格特征</div>
                    <div class="detail-info-content">{{ selectedCharacter.personality }}</div>
                  </div>

                  <!-- 服装描述 -->
                  <div v-if="selectedCharacter.outfit" class="detail-info-block">
                    <div class="detail-info-title">服装描述</div>
                    <div class="detail-info-content">{{ selectedCharacter.outfit }}</div>
                  </div>

                  <!-- 装备信息 -->
                  <div v-if="selectedCharacter.equipment" class="detail-info-block">
                    <div class="detail-info-title">装备信息</div>
                    <div class="detail-equipment-grid">
                      <div v-if="selectedCharacter.equipment.weapon" class="detail-equipment-item">
                        <div class="equipment-icon" v-html="icon('weapon')"></div>
                        <div class="equipment-text">
                          <div class="equipment-label">武器</div>
                          <div class="equipment-name">{{ selectedCharacter.equipment.weapon.name || '未知' }}</div>
                        </div>
                      </div>
                      <div v-if="selectedCharacter.equipment.armor" class="detail-equipment-item">
                        <div class="equipment-icon" v-html="icon('armor')"></div>
                        <div class="equipment-text">
                          <div class="equipment-label">防具</div>
                          <div class="equipment-name">{{ selectedCharacter.equipment.armor.name || '未知' }}</div>
                        </div>
                      </div>
                      <div v-if="selectedCharacter.equipment.accessory" class="detail-equipment-item">
                        <div class="equipment-icon" v-html="icon('accessory')"></div>
                        <div class="equipment-text">
                          <div class="equipment-label">饰品</div>
                          <div class="equipment-name">{{ selectedCharacter.equipment.accessory.name || '未知' }}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- 关系状态 -->
                  <div class="detail-info-block">
                    <div class="detail-info-title">关系状态</div>
                    <div class="detail-info-content">{{ selectedCharacter.relationship || '陌生人' }}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 错误状态 -->
            <div v-else class="flex items-center justify-center py-8">
              <div class="text-center text-gray-500">
                <div class="mb-2 text-2xl">⚠️</div>
                <div>无法加载人物详情</div>
                <button
                  class="theme-primary-button mt-3 rounded-lg px-4 py-2 text-sm text-white"
                  @click="selectedCharacter = null"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { updateUserKey } from 'shared/constants';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useBattleConfig } from '../composables/useBattleConfig';
import { useCommandQueue } from '../composables/useCommandQueue';
import { useGameSettings } from '../composables/useGameSettings';
import { useGameStateManager } from '../composables/useGameStateManager';
import { usePlayingLogic } from '../composables/usePlayingLogic';
import { useSaveLoad } from '../composables/useSaveLoad';
import { useStatData } from '../composables/useStatData';
import CommandQueueDialog from './CommandQueueDialog.vue';
import EquipmentDetailDialog from './EquipmentDetailDialog.vue';
import InventoryDialog from './InventoryDialog.vue';
import ReadingSettingsDialog from './ReadingSettingsDialog.vue';
import SaveDialog from './SaveDialog.vue';
const notifySuccess = (title: string, message?: string) => {
  console.info('[PlayingRoot]', title, message ?? '');
};
const notifyError = (title: string, message?: string) => {
  console.warn('[PlayingRoot]', title, message ?? '');
};
const notifyWarning = (title: string, message?: string) => {
  console.info('[PlayingRoot]', title, message ?? '');
};
const notifyInfo = (title: string, message?: string) => {
  console.info('[PlayingRoot]', title, message ?? '');
};

// 使用游戏设置管理
const {
  shouldStream,
  autoScrollDuringStreaming,
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
  currentEvent,
  relationships,
  isRandomEventActive,
  gender,
  race,
  age,
  enemiesList,
  enemiesLoading,
  enemiesError,
  enemiesBattleStatus,
  getEnemies,
  getEnemy,
  getEnemyBattleStatus,
  getAllEnemiesBattleStatus,
  updateEnemiesBattleStatus,
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
  // 新增库存相关
  displayInventory,
  getTotalInventoryCount,
  getDisplayInventoryItems,
  // 新增属性相关
  getCurrentAttributeValue,
  displayAttr,
  getAttributeBaseCurrentValue,
  // 新增工具方法
  itemName,
  equipmentText,
  // 经验值相关
  expBarData,
  refreshExpBarData,
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
  renameSaveWithFeedback,
  loadGame,
  addUserMessage: addSaveUserMessage,
  addAssistantMessage,
  deleteMessage: deleteSaveMessage,
  updateMessageContent,
  getLastMessage,
  registerSaveLoad,
  cleanupSaveLoad,
  isLoading: saveLoadIsLoading,
  isSaving: saveLoadIsSaving,
} = useSaveLoad();

// 游戏设置现在通过 useGameSettings 组合式函数管理

// 指令队列状态现在通过 useCommandQueue 组合式函数管理

// 使用战斗配置服务
const { startBattle, startTestBattle, startDynamicBattle: startDynamicBattleFromConfig } = useBattleConfig();

// 使用指令队列组合式函数
const {
  queue: commandQueue,
  queueLength,
  isEmpty: isQueueEmpty,
  isExecuting: isQueueExecuting,
  executeBeforeMessage,
  setupEventListeners: setupCommandQueueListeners,
  cleanupEventListeners: cleanupCommandQueueListeners,
} = useCommandQueue();

// 清理函数存储
const gameStateUnsubscribe = ref<(() => void) | null>(null);
const fullscreenUnsubscribe = ref<(() => void) | null>(null);

// 所有状态和方法都从 usePlayingLogic 中获取，无需重复定义

// 这些方法应该通过组合式函数提供

// 类型定义
type Role = 'user' | 'assistant' | 'system';
type Paragraph = {
  id: string;
  html: string;
  role: Role;
  ephemeral?: boolean;
};

// 从 useStatData 获取游戏状态数据 - 直接使用ref对象，纯ref架构
// currentDate, currentTime, currentLocation, currentEvent, gender, race, age 已从 useStatData 解构获取

const inputText = ref<string>('');
const showSettings = ref<boolean>(false);
const showReadingSettings = ref<boolean>(false);
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
const modalTarget = ref<string | HTMLElement>('body');

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

const attrOrder = ref<string[]>(['力量', '智力', '敏捷', '防御', '体质', '魅力', '意志', '幸运']);

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

// 添加缺失的UI方法
const openRelations = async () => {
  try {
    showRelations.value = true;
    // 每次打开关系面板都刷新一次，保证新增角色能实时显示
    await getRelationshipCharacters();
  } catch (error) {
    console.error('[PlayingRoot] 打开关系弹窗失败:', error);
    // 获取关系人物数据失败
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
    // showError('获取敌人数据失败');
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
    // showError('获取人物详情失败');
  } finally {
    characterDetailLoading.value = false;
  }
};

const closeCharacterDetail = () => {
  showCharacterDetail.value = false;
  selectedCharacter.value = null;
  characterDetailLoading.value = false;
};

// 好感度相关方法
const getAffinityProgress = (affinity: number): number => {
  // 将好感度 [-200, 200] 映射到 [0, 100]
  const value = affinity || 0;
  return Math.max(0, Math.min(100, ((value + 200) / 400) * 100));
};

const getAffinityClass = (affinity: number): string => {
  const value = affinity || 0;
  if (value >= 150) return 'affinity-love';
  if (value >= 100) return 'affinity-close';
  if (value >= 50) return 'affinity-friend';
  if (value >= 0) return 'affinity-neutral';
  if (value >= -50) return 'affinity-dislike';
  if (value >= -100) return 'affinity-hostile';
  return 'affinity-hate';
};

const getAffinityDescription = (affinity: number): string => {
  const value = affinity || 0;
  if (value >= 150) return '深爱 - 愿意为你付出一切';
  if (value >= 100) return '亲密 - 非常信任和依赖你';
  if (value >= 50) return '友好 - 愿意与你交流和帮助';
  if (value >= 0) return '普通 - 保持基本的礼貌';
  if (value >= -50) return '不喜 - 对你有些反感';
  if (value >= -100) return '敌对 - 非常讨厌你';
  return '仇恨 - 恨不得你消失';
};

// 头像上传处理
const handleAvatarUpload = async (character: any) => {
  try {
    // 创建隐藏的文件输入
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;

      // 验证文件大小（限制为2MB）
      if (file.size > 2 * 1024 * 1024) {
        // showError('图片大小不能超过 2MB');
        return;
      }

      // 读取文件为 base64
      const reader = new FileReader();
      reader.onload = async (event: any) => {
        try {
          const base64Url = event.target?.result;
          if (!base64Url) return;

          // 更新角色头像
          character.avatarUrl = base64Url;

          // 保存到 MVU 变量（如果需要持久化）
          // TODO: 实现保存到 MVU 变量的逻辑
          // await saveMvuRelationshipAvatar(character.id, base64Url);

          // showSuccess('头像上传成功');
        } catch (error) {
          console.error('[PlayingRoot] 保存头像失败:', error);
          // showError('头像保存失败');
        }
      };

      reader.onerror = () => {
        // showError('读取图片失败');
      };

      reader.readAsDataURL(file);
    };

    input.click();
  } catch (error) {
    console.error('[PlayingRoot] 头像上传失败:', error);
    // showError('头像上传失败');
  }
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
    // showError('获取敌人详情失败');
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
  // showInfo(`选择了物品: ${item.name || '未知物品'}`);
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
    // showError('获取装备详情失败');
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
    // showError('读档失败');
  }
};

// 右键菜单相关方法
const copyCurrent = async () => {
  try {
    const t = String(contextMenu.value?.target?.html ?? '').replace(/<[^>]+>/g, '');
    await navigator.clipboard.writeText(t);
    // showSuccess('已复制');
  } catch {
    // showError('复制失败');
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
    // showError('打开编辑失败');
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
      // showSuccess('重新生成成功');
    } catch (error) {
      // showError('重新生成失败');
    }
  } catch (error) {
    console.error('[PlayingRoot] 重新生成失败:', error);
    // showError('重新生成失败');
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
      // showSuccess('消息已删除');
    } catch (error) {
      // showError('删除消息失败');
    }
  } catch (error) {
    console.error('[PlayingRoot] 删除消息失败:', error);
    // showError('删除消息失败');
  } finally {
    contextMenu.value.visible = false;
  }
};

const saveEdit = async () => {
  try {
    if (!editingMessage.value || !editContent.value.trim()) {
      // showError('编辑内容不能为空');
      return;
    }
    try {
      await editMessage(editingMessage.value.id, editContent.value.trim());
      // showSuccess('编辑保存成功');
      showEditDialog.value = false;
    } catch (error) {
      // showError('编辑保存失败');
    }
  } catch (error) {
    console.error('[PlayingRoot] 编辑保存失败:', error);
    // showError('编辑保存失败');
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
    智力: '<path d="M9 12l2 2 4-4M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c1.5 0 2.9.37 4.12 1.02"/>',
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

// attrIcon 函数已移除，直接使用 icon 函数

// 容器类名
const containerClass = computed(() => ({
  'narrow-layout': isNarrow.value,
  'left-open': leftOpen.value,
  'right-open': rightOpen.value,
}));

const canSend = computed(() => {
  const hasText = inputText.value.trim().length > 0;
  const hasActiveBattle = Object.values(enemiesBattleStatus.value).some(status => !status);
  return hasText && !hasActiveBattle; // 有文本且没有进行中的战斗
});

// 判断是否显示战斗按钮
const showBattleButton = computed(() => {
  return Object.values(enemiesBattleStatus.value).some(status => !status);
});

// 获取可以进行战斗的敌人列表
const availableEnemies = computed(() => {
  return enemiesList.value.filter(enemy => !enemiesBattleStatus.value[enemy.id]);
});

const isBusy = computed(() => isSending.value || isStreaming.value);

// 渲染列表：简化逻辑，分隔线现在直接在用户消息后显示
type RenderItem = {
  type: 'paragraph';
  key: string;
  html: string;
  role: Role;
  id: string;
  ephemeral?: boolean;
  pending?: boolean;
};
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
      pending: 'pending' in m ? Boolean((m as any).pending) : undefined,
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

async function onSend() {
  if (!canSend.value || isBusy.value) return;
  const text = inputText.value.trim();
  if (!text) return;

  inputText.value = '';

  // 用户发送新一条消息时，清理上一次的临时错误消息
  filterEphemeralMessages();

  // 先执行指令队列
  try {
    const queueExecuted = await executeBeforeMessage();
    if (!queueExecuted) {
      console.warn('[PlayingRoot] 指令队列执行失败');
    }
  } catch (error) {
    console.error('[PlayingRoot] 指令队列执行失败:', error);
    // showError('指令队列执行失败');
  }

  // 然后执行原有的消息发送逻辑
  try {
    // 使用统一的生成函数，自动处理MVU数据、消息保存和UI更新
    const success = await generateMessage(text, shouldStream.value);
    if (!success) {
      // showError('生成失败', '请重试');
    }
  } catch (error) {
    console.error('[PlayingRoot] 生成消息失败:', error);
    // showError('生成失败', '请求发送异常');
  }
}

// 触发一次MVP战斗
async function onTestBattle() {
  try {
    // 启动测试战斗（调试模式）
    const success = await startTestBattle('yokai_battle', undefined, {
      returnToPrevious: true,
      silent: false,
    });

    if (!success) {
      // showError('启动战斗失败');
    }
  } catch (e) {
    console.error('[PlayingRoot] 启动测试战斗失败:', e);
    // showError('启动战斗失败');
  }
}

// 启动动态战斗
async function startDynamicBattle(enemyId: string) {
  try {
    const success = await startDynamicBattleFromConfig(enemyId, {
      returnToPrevious: true,
      silent: false,
    });

    if (!success) {
      // showError('启动动态战斗失败');
    }
  } catch (error) {
    console.error('[PlayingRoot] 启动动态战斗失败:', error);
    // showError('启动动态战斗失败');
  }
}

function onScroll() {}

function onContextMenu(item: RenderItem) {
  const actualMessage = messages.value.find(m => m.id === item.id) as any | undefined;
  const role = (actualMessage?.role ?? item.role) as Role;
  const isPending = actualMessage ? 'pending' in actualMessage && actualMessage.pending : Boolean(item.pending);

  // 检查是否可以重新生成（只有AI消息且非待保存状态可以重新生成）
  const canRegenerate = role === 'assistant' && !isPending;

  // 检查是否为最新消息（只有最新消息可以删除）
  const latestMessageId = messages.value.length > 0 ? messages.value[messages.value.length - 1].id : undefined;
  const isLatestMessage = latestMessageId === (actualMessage?.id ?? item.id);

  // 检查是否可以删除（只有最新消息可以删除，不管是用户输入、AI消息还是报错消息）
  const canDelete = isLatestMessage && !isPending;

  contextMenu.value = {
    visible: true,
    x: (window as any).event?.clientX ?? 0,
    y: (window as any).event?.clientY ?? 0,
    target: actualMessage ?? item,
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
      modalTarget.value = 'body';
    } else {
      // 进入全屏
      try {
        await rpgRoot.requestFullscreen();
        modalTarget.value = rpgRoot;
      } catch {
        // 浏览器全屏失败，使用CSS全屏
        rpgRoot.classList.add('fullscreen');
        modalTarget.value = rpgRoot;
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
      modalTarget.value = document.fullscreenElement as HTMLElement;
    } else {
      // 退出全屏
      rpgRoot.classList.remove('fullscreen');
      modalTarget.value = 'body';
    }
  };

  // 监听全屏状态变化
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  handleFullscreenChange();

  // 返回清理函数
  return () => {
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
  };
}

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
    // 同时刷新经验条数据
    await refreshExpBarData();
  } catch {}
});

onMounted(async () => {
  // 注册状态管理器到全局
  try {
    (window as any).__RPG_GAME_STATE_MANAGER__ = gameStateManager;
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
    try {
      setupCommandQueueListeners();
    } catch (error) {
      console.warn('[PlayingRoot] 指令队列监听器设置失败:', error);
    }
  } catch (error) {
    console.warn('[PlayingRoot] 状态管理协调注册失败:', error);
  }

  // 设置角色创建事件监听器
  // TODO: 实现角色创建事件监听器设置

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

  // 初始化敌人战斗状态
  try {
    await updateEnemiesBattleStatus();
  } catch (error) {
    console.warn('[PlayingRoot] 初始化敌人战斗状态失败:', error);
  }
});
onUnmounted(() => {
  // 清理状态管理器
  try {
    (window as any).__RPG_GAME_STATE_MANAGER__ = undefined;
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
  // TODO: 实现角色创建事件监听器清理

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

  // 清理指令队列事件监听器
  try {
    cleanupCommandQueueListeners();
  } catch (error) {
    console.warn('[PlayingRoot] 指令队列监听器清理失败:', error);
  }

  modalTarget.value = 'body';
});
</script>

<style scoped>
@import '../index.css';

/* PlayingRoot组件特定样式 - 通用样式已移至index.css */

/* 主题颜色样式 - 替换粉色/紫色 */
.theme-button {
  border: 2px solid var(--border-color);
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.theme-button:hover,
.theme-button:focus {
  border-color: var(--color-primary);
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 0 20px rgba(199, 62, 58, 0.3);
  outline: none;
}

.theme-icon {
  color: var(--text-secondary);
}

.theme-input {
  border-color: var(--border-color);
  background: rgba(255, 255, 255, 0.9);
  color: var(--text-primary);
}

.theme-input::placeholder {
  color: var(--text-secondary);
  opacity: 0.5;
}

.theme-input:focus {
  border-color: var(--color-primary);
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 0 20px rgba(199, 62, 58, 0.3);
  outline: none;
}

.theme-drawer-button {
  background: var(--color-primary);
}

.theme-drawer-button:hover {
  background: #b22f2c;
}

.theme-close-btn {
  background: var(--color-muted-beige);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.theme-close-btn:hover {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.theme-setting-label {
  background: var(--color-muted-beige);
}

.theme-setting-label:hover {
  background: rgba(232, 227, 216, 0.8);
}

.theme-checkbox {
  border-color: var(--border-color);
  accent-color: var(--color-primary);
}

.theme-checkbox:checked {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
}

.theme-input-small {
  border-color: var(--border-color);
  color: var(--text-primary);
  background: white;
}

.theme-input-small:focus {
  border-color: var(--color-primary);
  outline: none;
  box-shadow: 0 0 0 3px rgba(199, 62, 58, 0.1);
}

.theme-primary-button {
  background: var(--color-primary);
}

.theme-primary-button:hover {
  background: #b22f2c;
}

.theme-primary-button:focus {
  ring-color: var(--color-primary);
}

.theme-spinner {
  border-color: var(--color-border-light);
  border-top-color: var(--color-primary);
}

/* 经验条样式 */
.exp-panel {
  margin-top: 0;
  padding: 10px;
  border-radius: 0;
  border: none;
  background: transparent;
}

.exp-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.exp-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.exp-level {
  display: flex;
  align-items: center;
  gap: 8px;
}

.exp-label {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

.exp-value {
  font-size: 16px;
  color: #374151;
  font-weight: 700;
}

.max-level-badge {
  font-size: 11px;
  color: #059669;
  font-weight: 600;
  padding: 2px 6px;
  background: rgba(16, 185, 129, 0.1);
  border-radius: 4px;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.exp-text {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #374151;
}

.exp-current {
  font-weight: 600;
  color: #059669;
}

.exp-separator {
  color: #9ca3af;
}

.exp-required {
  color: #6b7280;
}

.exp-needed {
  font-size: 11px;
  color: #6b7280;
  font-style: italic;
}

.exp-bar-container {
  width: 100%;
}

.exp-bar-background {
  width: 100%;
  height: 12px;
  background: #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
  position: relative;
}

.exp-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981 0%, #059669 100%);
  border-radius: 6px;
  transition: width 0.3s ease;
  position: relative;
  overflow: hidden;
}

.exp-bar-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%);
  animation: shimmer 2s infinite;
}

.exp-bar-fill.max-level {
  background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%);
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

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

/* 战斗按钮样式 */
.battle-buttons {
  margin-top: 8px;
}

.battle-btn {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  border: 1px solid #dc2626;
  font-size: 12px;
  padding: 6px 12px;
  transition: all 0.3s ease;
}

.battle-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(239, 68, 68, 0.3);
}

.battle-btn:disabled {
  background: #9ca3af;
  border-color: #9ca3af;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
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

/* 用户头像样式 - 80px正方形 */
.user_avatar {
  width: 80px !important;
  height: 80px !important;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  background-size: cover;
  background-position: center;
}

.custom-avatar img {
  width: 80px !important;
  height: 80px !important;
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
  margin-top: 0;
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
  max-width: 900px;
  width: 90vw;
  max-height: 85vh;
  background: var(--bg-surface) !important;
  border-color: var(--border-color) !important;
}

/* 关系人物横向卡片样式 */
.relationship-card {
  position: relative;
  overflow: hidden;
  background: var(--panel-bg);
  border-color: var(--color-border-light);
}

.relationship-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(199, 62, 58, 0.08), transparent);
  transition: left 0.5s ease;
}

.relationship-card:hover::before {
  left: 100%;
}

.relationship-card:hover {
  border-color: var(--border-color);
  box-shadow: var(--shadow-hover);
  transform: translateY(-1px);
  background: var(--bg-surface);
}

/* 头像容器 */
.avatar-container {
  width: 80px;
  height: 80px;
}

.character-avatar,
.character-avatar-placeholder {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid var(--color-border-light);
  transition: all 0.3s ease;
}

.character-avatar {
  background-size: cover;
  background-position: center;
  background-color: var(--color-muted-beige);
}

.character-avatar-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-muted-beige);
  border-color: var(--color-border-light);
}

.avatar-letter {
  font-size: 32px;
  font-weight: 700;
  color: var(--text-primary);
  text-transform: uppercase;
}

.relationship-card:hover .character-avatar,
.relationship-card:hover .character-avatar-placeholder {
  border-color: var(--border-color);
  transform: scale(1.05);
  box-shadow: var(--shadow-traditional);
  background: var(--color-muted-beige);
}

/* 角色信息样式 */
.character-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.character-name {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.character-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
}

.meta-tag {
  font-weight: 500;
  color: var(--text-secondary);
}

.meta-separator {
  color: var(--color-border-light);
}

/* 好感度区域样式 */
.affinity-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.affinity-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.affinity-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}

.affinity-value {
  font-size: 16px;
  font-weight: 700;
  transition: all 0.3s ease;
  color: var(--text-primary);
}

.affinity-bar-bg {
  height: 8px;
  background: var(--color-muted-beige);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
  border: 1px solid var(--color-border-light);
}

.affinity-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: all 0.5s ease;
  position: relative;
  overflow: hidden;
}

.affinity-bar-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%);
  animation: shimmer 2s infinite;
}

/* 好感度等级颜色 - 使用主题颜色系统 */
.affinity-love {
  color: var(--color-primary);
  background: linear-gradient(90deg, var(--color-primary), rgba(199, 62, 58, 0.8));
}

.affinity-close {
  color: var(--color-fuji-purple);
  background: linear-gradient(90deg, var(--color-fuji-purple), rgba(165, 154, 202, 0.8));
}

.affinity-friend {
  color: var(--color-kin-gold);
  background: linear-gradient(90deg, var(--color-kin-gold), rgba(212, 175, 55, 0.8));
}

.affinity-neutral {
  color: var(--text-muted);
  background: linear-gradient(90deg, var(--text-muted), rgba(102, 102, 102, 0.6));
}

.affinity-dislike {
  color: #d97706;
  background: linear-gradient(90deg, #d97706, rgba(217, 119, 6, 0.8));
}

.affinity-hostile {
  color: #dc2626;
  background: linear-gradient(90deg, #dc2626, rgba(220, 38, 38, 0.8));
}

.affinity-hate {
  color: #991b1b;
  background: linear-gradient(90deg, #991b1b, rgba(153, 27, 27, 0.8));
}

/* 敌人卡片样式 */
.character-card {
  position: relative;
  overflow: hidden;
}

.character-card:hover {
  border-color: var(--border-color);
  box-shadow: var(--shadow-hover);
  transform: translateY(-1px);
}

/* 人物详情布局 */
.character-detail-layout {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

/* 左侧面板 - 大头像 */
.detail-left-panel {
  flex-shrink: 0;
  width: 200px;
}

.detail-avatar-container {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-avatar,
.detail-avatar-placeholder {
  width: 200px;
  height: 200px;
  border-radius: 16px;
  overflow: hidden;
  border: 3px solid #e5e7eb;
  transition: all 0.3s ease;
}

.detail-avatar {
  background-size: cover;
  background-position: center;
  background-color: #f3f4f6;
}

.detail-avatar-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #fce7f3 0%, #e9d5ff 100%);
}

.detail-avatar-letter {
  font-size: 80px;
  font-weight: 700;
  color: #a855f7;
  text-transform: uppercase;
}

.avatar-upload-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 10px 16px;
  background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
  border: 1px solid #d1d5db;
  border-radius: 8px;
  color: #374151;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.avatar-upload-btn:hover {
  background: linear-gradient(135deg, #e5e7eb, #d1d5db);
  border-color: #9ca3af;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.avatar-upload-btn svg {
  flex-shrink: 0;
}

/* 右侧面板 - 详细信息 */
.detail-right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}

.detail-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e5e7eb;
}

.detail-character-name {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.detail-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.detail-tag {
  padding: 4px 12px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
}

/* 详情页好感度区域 */
.detail-affinity-section {
  padding: 16px;
  background: rgba(255, 255, 255, 0.8);
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-affinity-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detail-affinity-label {
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
}

.detail-affinity-value {
  font-size: 24px;
  font-weight: 700;
}

.detail-affinity-bar-bg {
  height: 12px;
  background: #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
  position: relative;
}

.detail-affinity-bar-fill {
  height: 100%;
  border-radius: 6px;
  transition: all 0.5s ease;
  position: relative;
  overflow: hidden;
}

.detail-affinity-bar-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%);
  animation: shimmer 2s infinite;
}

.detail-affinity-description {
  font-size: 13px;
  color: #6b7280;
  font-style: italic;
  text-align: center;
}

/* 详细信息区块 */
.detail-info-sections {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-info-block {
  padding: 16px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.detail-info-title {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
}

.detail-info-content {
  font-size: 14px;
  color: #6b7280;
  line-height: 1.6;
  white-space: pre-wrap;
}

/* 装备网格 */
.detail-equipment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.detail-equipment-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.detail-equipment-item:hover {
  background: white;
  border-color: #d1d5db;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.equipment-icon {
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

.equipment-icon svg {
  width: 18px;
  height: 18px;
  color: #6b7280;
}

.equipment-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.equipment-label {
  font-size: 11px;
  color: #9ca3af;
  font-weight: 500;
}

.equipment-name {
  font-size: 13px;
  color: #374151;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

@media (max-width: 768px) {
  /* 人物详情改为纵向布局 */
  .character-detail-layout {
    flex-direction: column;
    align-items: center;
  }

  .detail-left-panel {
    width: 160px;
  }

  .detail-avatar,
  .detail-avatar-placeholder {
    width: 160px;
    height: 160px;
  }

  .detail-avatar-letter {
    font-size: 64px;
  }

  .detail-right-panel {
    width: 100%;
  }

  /* 关系卡片调整 */
  .avatar-container {
    width: 60px;
    height: 60px;
  }

  .character-avatar,
  .character-avatar-placeholder {
    width: 60px;
    height: 60px;
  }

  .avatar-letter {
    font-size: 24px;
  }

  .character-name {
    font-size: 16px;
  }

  .affinity-value {
    font-size: 14px;
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

  /* 小屏幕进一步缩小 */
  .detail-left-panel {
    width: 120px;
  }

  .detail-avatar,
  .detail-avatar-placeholder {
    width: 120px;
    height: 120px;
  }

  .detail-avatar-letter {
    font-size: 48px;
  }

  .detail-character-name {
    font-size: 20px;
  }

  .detail-affinity-value {
    font-size: 20px;
  }

  .detail-equipment-grid {
    grid-template-columns: 1fr;
  }

  /* 关系卡片更紧凑 */
  .relationship-card {
    padding: 12px;
  }

  .avatar-container {
    width: 50px;
    height: 50px;
  }

  .character-avatar,
  .character-avatar-placeholder {
    width: 50px;
    height: 50px;
  }

  .avatar-letter {
    font-size: 20px;
  }

  .character-name {
    font-size: 14px;
  }

  .character-meta {
    font-size: 11px;
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
