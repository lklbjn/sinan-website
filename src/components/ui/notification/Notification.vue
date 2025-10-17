<template>
  <Transition
    name="notification"
    appear
    @after-leave="emit('remove')"
  >
    <div
      v-if="visible"
      :class="[
        'fixed z-50 flex items-center gap-3 p-4 rounded-lg shadow-lg border max-w-sm mx-4',
        variantClasses
      ]"
      :style="{ top: position.top + 'px', right: position.right + 'px' }"
    >
      <!-- 图标 -->
      <div class="flex-shrink-0">
        <component :is="iconComponent" class="h-5 w-5" />
      </div>

      <!-- 内容 -->
      <div class="flex-1 min-w-0">
        <h4 v-if="title" class="text-sm font-medium mb-1">{{ title }}</h4>
        <p class="text-sm break-words">{{ message }}</p>
      </div>

      <!-- 关闭按钮 -->
      <button
        @click="close"
        class="flex-shrink-0 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        aria-label="关闭"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { CheckCircle, AlertCircle, AlertTriangle, XCircle } from 'lucide-vue-next'

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

interface Props {
  id: string
  title?: string
  message: string
  type: NotificationType
  duration?: number
  position?: { top: number; right: number }
}

interface Emits {
  (e: 'remove'): void
}

const props = withDefaults(defineProps<Props>(), {
  duration: 5000,
  position: () => ({ top: 20, right: 20 })
})

const emit = defineEmits<Emits>()

const visible = ref(true)
let timer: number | null = null

// 根据类型获取图标
const iconComponent = computed(() => {
  const iconMap = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: AlertCircle
  }
  return iconMap[props.type]
})

// 根据类型获取样式类
const variantClasses = computed(() => {
  const classMap = {
    success: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200',
    error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200',
    info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200'
  }
  return classMap[props.type]
})

const close = () => {
  visible.value = false
}

onMounted(() => {
  if (props.duration > 0) {
    timer = window.setTimeout(() => {
      close()
    }, props.duration)
  }
})

// 清理定时器
const cleanup = () => {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

// 组件卸载时清理
onUnmounted(() => {
  cleanup()
})
</script>

<style scoped>
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>