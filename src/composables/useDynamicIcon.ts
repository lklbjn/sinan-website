import { computed } from 'vue'
import { useDarkMode } from './useDarkMode'

export const useDynamicIcon = () => {
  const { isDark } = useDarkMode()

  const iconPath = computed(() => {
    return isDark.value ?   '/icon.svg':'/icon-white.svg'
  })

  return {
    iconPath,
    isDark
  }
}