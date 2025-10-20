<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { ref, onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import { cn } from "@/lib/utils"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UserAPI } from '@/services/api'
import { encryptPasswordWithSalt } from '@/lib/crypto'
import type { ResetPasswordReq } from '@/types/api'

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()

const route = useRoute()
const router = useRouter()

const resetCode = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const isResetComplete = ref(false)

const validateForm = () => {
  if (!newPassword.value || !confirmPassword.value) {
    errorMessage.value = '请填写所有密码字段'
    return false
  }

  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = '两次输入的密码不一致'
    return false
  }

  if (newPassword.value.length < 6) {
    errorMessage.value = '密码长度至少为6位'
    return false
  }

  return true
}

const handleResetPassword = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  if (!validateForm()) {
    return
  }

  if (!resetCode.value) {
    errorMessage.value = '重置代码无效，请重新点击邮件中的链接'
    return
  }

  loading.value = true

  try {
    // 加密密码
    const encryptedPassword = await encryptPasswordWithSalt(newPassword.value)

    const requestData: ResetPasswordReq = {
      code: resetCode.value,
      newPassword: encryptedPassword,
      confirmPassword: encryptedPassword
    }

    const response = await UserAPI.resetPassword(requestData)

    if (response.flag) {
      isResetComplete.value = true
      successMessage.value = response.data || '密码重置成功！您现在可以使用新密码登录了。'

      // 3秒后自动跳转到登录页
      setTimeout(() => {
        router.push('/auth')
      }, 3000)
    } else {
      errorMessage.value = response.message || '密码重置失败，请重试'
    }
  } catch (error: any) {
    console.error('Reset password failed:', error)
    if (error.response?.status === 400) {
      errorMessage.value = '重置代码已过期或无效，请重新申请密码重置'
    } else if (error.response?.status === 404) {
      errorMessage.value = '重置代码不存在'
    } else {
      errorMessage.value = error.response?.data?.message || '密码重置失败，请重试'
    }
  } finally {
    loading.value = false
  }
}

const goToLogin = () => {
  router.push('/auth')
}

// 从URL参数中获取重置代码
onMounted(() => {
  const code = route.query.code as string
  if (code) {
    resetCode.value = code
  } else {
    errorMessage.value = '缺少重置代码，请重新点击邮件中的链接'
  }
})
</script>

<template>
  <div :class="cn('flex flex-col gap-6 w-full max-w-sm mx-auto', props.class)">
    <div class="flex flex-col items-center gap-2 text-center">
      <h1 class="text-2xl font-bold">
        重置密码
      </h1>
      <p class="text-muted-foreground text-sm text-balance">
        请输入您的新密码
      </p>
    </div>

    <div class="grid gap-6">
      <!-- 错误消息显示 -->
      <div v-if="errorMessage" class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/50 dark:text-red-200">
        {{ errorMessage }}
      </div>

      <!-- 成功消息显示 -->
      <div v-if="successMessage" class="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/50 dark:text-green-200">
        {{ successMessage }}
      </div>

      <!-- 重置成功状态 -->
      <div v-if="isResetComplete" class="space-y-4">
        <div class="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/50 dark:text-green-200">
          <div class="flex items-center gap-2 mb-2">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            <span class="font-medium">密码重置成功！</span>
          </div>
          <p class="mb-3">
            您的密码已成功重置。页面将在3秒后自动跳转到登录页面。
          </p>
        </div>

        <Button
          type="button"
          @click="goToLogin"
          class="w-full"
        >
          立即登录
        </Button>
      </div>

      <!-- 重置密码表单 -->
      <form v-else @submit.prevent="handleResetPassword" class="space-y-4">
        <div class="grid gap-3">
          <Label for="newPassword">新密码</Label>
          <Input
            id="newPassword"
            type="password"
            placeholder="请输入新密码（至少6位）"
            required
            v-model="newPassword"
            :disabled="loading"
          />
        </div>

        <div class="grid gap-3">
          <Label for="confirmPassword">确认新密码</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="请再次输入新密码"
            required
            v-model="confirmPassword"
            :disabled="loading"
          />
        </div>

        <Button type="submit" class="w-full" :disabled="loading || !resetCode">
          {{ loading ? '重置中...' : '重置密码' }}
        </Button>

        <div class="text-center">
          <Button
            type="button"
            variant="ghost"
            @click="goToLogin"
            class="text-sm"
          >
            返回登录
          </Button>
        </div>
      </form>
    </div>
  </div>
</template>