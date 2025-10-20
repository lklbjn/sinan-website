<template>
  <Teleport to="body">
    <div class="fixed z-50 pointer-events-none">
      <Notification
        v-for="notification in notifications"
        :key="notification.id"
        :id="notification.id"
        :title="notification.title"
        :message="notification.message"
        :type="notification.type"
        :duration="notification.duration"
        :position="notification.position"
        @remove="() => removeNotification(notification.id)"
      />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Notification from './Notification.vue'
import type { NotificationType } from './Notification.vue'

interface NotificationItem {
  id: string
  title?: string
  message: string
  type: NotificationType
  duration?: number
  position?: { top: number; right: number }
}

const notifications = ref<NotificationItem[]>([])

let notificationId = 0

const addNotification = (
  message: string,
  type: NotificationType = 'info',
  title?: string,
  duration?: number,
  position?: { top: number; right: number }
) => {
  const id = `notification-${++notificationId}`

  const newNotification: NotificationItem = {
    id,
    title,
    message,
    type,
    duration,
    position
  }

  notifications.value.push(newNotification)

  return id
}

const removeNotification = (id: string) => {
  const index = notifications.value.findIndex(n => n.id === id)
  if (index > -1) {
    notifications.value.splice(index, 1)
  }
}

// 暴露方法给全局使用
defineExpose({
  addNotification,
  removeNotification
})
</script>