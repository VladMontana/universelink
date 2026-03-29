<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal analytics-modal">
      <div class="analytics-header">
        <div>
          <h2 class="modal-title">Аналитика</h2>
          <span class="analytics-code">{{ baseUrl }}/{{ analyticsLink?.short_code }}</span>
        </div>
        <button class="close-btn" aria-label="Закрыть аналитику" @click="emit('close')">
          <X :size="16" aria-hidden="true" />
        </button>
      </div>

      <div v-if="analyticsLoading" class="analytics-loading">Загружаем данные…</div>

      <template v-else-if="analyticsData">
        <div class="analytics-stats">
          <div class="analytics-stat">
            <span class="analytics-stat-val">{{ analyticsData.total_clicks }}</span>
            <span class="analytics-stat-label">Всего переходов</span>
          </div>
          <div v-if="analyticsLink?.max_clicks" class="analytics-stat">
            <span class="analytics-stat-val">{{ analyticsLink.max_clicks - analyticsData.total_clicks }}</span>
            <span class="analytics-stat-label">Осталось</span>
          </div>
          <div v-if="analyticsLink?.expires_at" class="analytics-stat">
            <span class="analytics-stat-val">{{ formatExpiry(analyticsLink.expires_at) }}</span>
            <span class="analytics-stat-label">Истекает</span>
          </div>
        </div>

        <div class="analytics-visuals">
          <div class="chart-card">
            <div class="chart-card-title">Переходы по дням</div>
            <VChart class="analytics-chart" :option="timelineChartOption" autoresize />
          </div>

          <div class="chart-card">
            <div class="chart-card-title">Браузеры</div>
            <VChart class="analytics-chart" :option="browserChartOption" autoresize />
          </div>
        </div>

        <div class="analytics-clicks-header">
          <span>Последние переходы</span>
          <span class="analytics-clicks-count">{{ analyticsData.clicks.length }}</span>
        </div>

        <div class="analytics-clicks-list">
          <div v-if="analyticsData.clicks.length === 0" class="analytics-empty">
            Переходов пока нет
          </div>
          <div
            v-for="(click, i) in visibleClicks"
            :key="i"
            class="analytics-click-item"
          >
            <div class="click-icon">→</div>
            <div class="click-info">
              <span class="click-agent">{{ truncateAgent(click.user_agent) }}</span>
              <span class="click-ip">{{ click.ip_address || 'неизвестно' }}</span>
            </div>
            <span class="click-time">{{ formatClickTime(click.clicked_at) }}</span>
          </div>

          <button
            v-if="hiddenClicksCount > 0 && !showAllClicks"
            class="analytics-more-btn"
            type="button"
            @click="showAllClicks = true"
          >
            Показать ещё {{ hiddenClicksCount }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, PieChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'

use([CanvasRenderer, LineChart, PieChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent])

const props = defineProps({
  baseUrl: { type: String, required: true },
  analyticsLink: { type: Object, default: null },
  analyticsData: { type: Object, default: null },
  analyticsLoading: { type: Boolean, required: true },
  formatExpiry: { type: Function, required: true },
  truncateAgent: { type: Function, required: true },
  formatClickTime: { type: Function, required: true },
})

const emit = defineEmits(['close'])
const MAX_VISIBLE_CLICKS = 120
const showAllClicks = ref(false)

watch(
  () => props.analyticsData?.clicks,
  () => {
    showAllClicks.value = false
  }
)

function getCssVar(name, fallback) {
  if (typeof window === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

function detectBrowser(agent) {
  if (!agent) return 'Другое'
  if (agent.includes('Edg')) return 'Edge'
  if (agent.includes('Chrome')) return 'Chrome'
  if (agent.includes('Firefox')) return 'Firefox'
  if (agent.includes('Safari')) return 'Safari'
  return 'Другое'
}

const clicksByDay = computed(() => {
  const clicks = [...(props.analyticsData?.clicks || [])].sort((a, b) => {
    return new Date(a.clicked_at).getTime() - new Date(b.clicked_at).getTime()
  })
  const map = new Map()
  const dayFormatter = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short' })

  for (const click of clicks) {
    const day = dayFormatter.format(new Date(click.clicked_at))
    map.set(day, (map.get(day) || 0) + 1)
  }

  return [...map.entries()].map(([label, value]) => ({ label, value }))
})

const clicksByBrowser = computed(() => {
  const clicks = props.analyticsData?.clicks || []
  const map = new Map()

  for (const click of clicks) {
    const name = detectBrowser(click.user_agent)
    map.set(name, (map.get(name) || 0) + 1)
  }

  return [...map.entries()].map(([name, value]) => ({ name, value }))
})

const visibleClicks = computed(() => {
  const clicks = props.analyticsData?.clicks || []
  if (showAllClicks.value || clicks.length <= MAX_VISIBLE_CLICKS) return clicks
  return clicks.slice(0, MAX_VISIBLE_CLICKS)
})

const hiddenClicksCount = computed(() => {
  const clicks = props.analyticsData?.clicks || []
  return Math.max(0, clicks.length - visibleClicks.value.length)
})

const timelineChartOption = computed(() => {
  const muted = getCssVar('--muted', '#64748b')
  const border = getCssVar('--border', 'rgba(255,255,255,0.08)')
  const purple = getCssVar('--purple2', '#a855f7')
  const text = getCssVar('--text', '#e2e8f0')

  const points = clicksByDay.value

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: getCssVar('--bg2', '#0f1525'),
      borderColor: border,
      textStyle: { color: text, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 },
    },
    grid: { left: 12, right: 12, top: 24, bottom: 18, containLabel: true },
    xAxis: {
      type: 'category',
      data: points.map((point) => point.label),
      boundaryGap: false,
      axisLine: { lineStyle: { color: border } },
      axisLabel: { color: muted, fontSize: 11, margin: 10 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: border } },
      axisLine: { show: false },
      axisLabel: { color: muted, fontSize: 11 },
    },
    series: [
      {
        type: 'line',
        smooth: true,
        showSymbol: false,
        sampling: 'lttb',
        progressive: 400,
        animationDuration: points.length > 120 ? 200 : 500,
        animationDurationUpdate: points.length > 120 ? 150 : 350,
        lineStyle: { width: 2.5, color: purple },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: `${purple}66` },
              { offset: 1, color: `${purple}08` },
            ],
          },
        },
        data: points.map((point) => point.value),
      },
    ],
  }
})

const browserChartOption = computed(() => {
  const muted = getCssVar('--muted', '#64748b')
  const border = getCssVar('--border', 'rgba(255,255,255,0.08)')
  const text = getCssVar('--text', '#e2e8f0')

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: getCssVar('--bg2', '#0f1525'),
      borderColor: border,
      textStyle: { color: text, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 },
    },
    legend: {
      bottom: 0,
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { color: muted, fontSize: 11 },
    },
    color: ['#a855f7', '#7c3aed', '#34d399', '#fbbf24', '#64748b'],
    series: [
      {
        type: 'pie',
        radius: ['52%', '74%'],
        center: ['50%', '42%'],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: getCssVar('--bg2', '#0f1525'), borderWidth: 2 },
        label: { show: false },
        animationDuration: clicksByBrowser.value.length > 8 ? 150 : 350,
        animationDurationUpdate: clicksByBrowser.value.length > 8 ? 120 : 260,
        emphasis: { scale: true, scaleSize: 4 },
        data: clicksByBrowser.value,
      },
    ],
  }
})
</script>
