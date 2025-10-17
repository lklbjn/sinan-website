<script setup lang="ts">
import { ref, onMounted } from 'vue'
import NotificationContainer from '@/components/ui/notification/NotificationContainer.vue'
import { setNotificationContainer } from '@/composables/useNotification'

const notificationContainerRef = ref(null)

onMounted(() => {
  setNotificationContainer(notificationContainerRef.value)
})
</script>

<template>
  <main>
    <RouterView/>
    <NotificationContainer ref="notificationContainerRef" />
  </main>
</template>

<style scoped>

</style>
