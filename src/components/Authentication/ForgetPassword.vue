<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { ref } from "vue"
import { cn } from "@/lib/utils"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UserAPI } from '@/services/api'
import type { ForgotPasswordReq } from '@/types/api'

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()

const emit = defineEmits<{
  'switch-to-login': []
}>()

const email = ref('')
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const isEmailSent = ref(false)

const validateEmail = () => {
  if (!email.value) {
    errorMessage.value = '请输入邮箱地址'
    return false
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.value)) {
    errorMessage.value = '请输入有效的邮箱地址'
    return false
  }

  return true
}

const handleForgotPassword = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  if (!validateEmail()) {
    return
  }

  loading.value = true

  try {
    const requestData: ForgotPasswordReq = {
      email: email.value
    }

    const response = await UserAPI.forgotPassword(requestData)

    if (response.flag) {
      isEmailSent.value = true
      successMessage.value = response.data || '重置密码邮件已发送！请检查您的邮箱并点击邮件中的链接重置密码。'
    } else {
      errorMessage.value = response.message || '发送重置邮件失败，请重试'
    }
  } catch (error: any) {
    console.error('Forgot password failed:', error)
    if (error.response?.status === 404) {
      errorMessage.value = '该邮箱地址未注册'
    } else {
      errorMessage.value = error.response?.data?.message || '发送重置邮件失败，请重试'
    }
  } finally {
    loading.value = false
  }
}

const handleResendEmail = () => {
  isEmailSent.value = false
  successMessage.value = ''
  handleForgotPassword()
}
</script>

<template>
  <form :class="cn('flex flex-col gap-6', props.class)" @submit.prevent="handleForgotPassword">
    <div class="flex flex-col items-center gap-2 text-center">
      <h1 class="text-2xl font-bold">
        忘记密码
      </h1>
      <p class="text-muted-foreground text-sm text-balance">
        请输入您的邮箱地址，我们将发送重置密码链接给您
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

      <!-- 邮件已发送状态 -->
      <div v-if="isEmailSent" class="space-y-4">
        <div class="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
          <div class="flex items-center gap-2 mb-2">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
            <span class="font-medium">邮件已发送</span>
          </div>
          <p class="mb-3">
            我们已向 <strong>{{ email }}</strong> 发送了重置密码的链接。
          </p>
          <p class="text-xs opacity-80">
            请检查您的邮箱（包括垃圾邮件文件夹），点击邮件中的链接即可重置密码。
            链接将在24小时后失效。
          </p>
        </div>

        <div class="flex flex-col gap-3">
          <Button
            type="button"
            variant="outline"
            @click="handleResendEmail"
            :disabled="loading"
          >
            {{ loading ? '重新发送中...' : '重新发送邮件' }}
          </Button>

          <Button
            type="button"
            variant="ghost"
            @click="emit('switch-to-login')"
          >
            返回登录
          </Button>
        </div>
      </div>

      <!-- 输入邮箱表单 -->
      <div v-else class="space-y-4">
        <div class="grid gap-3">
          <Label for="email">邮箱地址</Label>
          <Input
            id="email"
            type="email"
            placeholder="请输入您注册时使用的邮箱"
            required
            v-model="email"
            :disabled="loading"
          />
        </div>

        <Button type="submit" class="w-full" :disabled="loading">
          {{ loading ? '发送中...' : '发送重置链接' }}
        </Button>

        <div class="text-center">
          <Button
            type="button"
            variant="ghost"
            @click="emit('switch-to-login')"
            class="text-sm"
          >
            返回登录
          </Button>
        </div>
      </div>
    </div>
  </form>
</template>