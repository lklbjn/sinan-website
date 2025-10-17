import { ref } from 'vue'
import type { NotificationType } from '@/components/ui/notification/Notification.vue'

// 全局通知状态
const notificationContainerRef = ref<any>(null)

export const useNotification = () => {
  const show = (
    message: string,
    type: NotificationType = 'info',
    title?: string,
    duration?: number
  ) => {
    if (notificationContainerRef.value) {
      return notificationContainerRef.value.addNotification(message, type, title, duration)
    } else {
      // 如果通知容器还没有初始化，使用 alert 作为后备
      if (type === 'error') {
        console.error(title ? `${title}: ${message}` : message)
      } else {
        console.log(title ? `${title}: ${message}` : message)
      }
    }
  }

  const success = (message: string, title?: string, duration?: number) => {
    return show(message, 'success', title, duration)
  }

  const error = (message: string, title?: string, duration?: number) => {
    return show(message, 'error', title, duration)
  }

  const warning = (message: string, title?: string, duration?: number) => {
    return show(message, 'warning', title, duration)
  }

  const info = (message: string, title?: string, duration?: number) => {
    return show(message, 'info', title, duration)
  }

  return {
    show,
    success,
    error,
    warning,
    info
  }
}

// 设置通知容器引用
export const setNotificationContainer = (ref: any) => {
  notificationContainerRef.value = ref
}