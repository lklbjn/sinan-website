<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { ref } from "vue"
import { cn } from "@/lib/utils"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UserAPI } from '@/services/api'
import { encryptPasswordWithSalt } from '@/lib/crypto'

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()

const emit = defineEmits<{
  'switch-to-login': []
}>()

const username = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const saveToken = (token: string) => {
  // 使用localStorage保存token，更安全且易于管理
  localStorage.setItem('token', token)
  // 为了向后兼容，也可以保存到cookie，但主要使用localStorage
  const expires = new Date()
  expires.setTime(expires.getTime() + (7 * 24 * 60 * 60 * 1000))
  document.cookie = `satoken=${token};expires=${expires.toUTCString()};path=/`
}

const validateForm = () => {
  if (!username.value || !email.value || !password.value || !confirmPassword.value) {
    errorMessage.value = '请填写所有必填字段'
    return false
  }

  if (password.value !== confirmPassword.value) {
    errorMessage.value = '两次输入的密码不一致'
    return false
  }

  if (password.value.length < 6) {
    errorMessage.value = '密码长度至少为6位'
    return false
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.value)) {
    errorMessage.value = '请输入有效的邮箱地址'
    return false
  }

  return true
}

const handleRegister = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  if (!validateForm()) {
    return
  }

  loading.value = true
  
  try {
    console.log('开始注册...')
    
    // 加密密码
    const encryptedPassword = await encryptPasswordWithSalt(password.value)
    console.log('密码已加密')
    
    const response = await UserAPI.doRegister({
      username: username.value,
      email: email.value,
      password: encryptedPassword
    })

    console.log('注册响应:', response)
    console.log('响应结构调试:', {
      flag: response.flag,
      data: response.data,
      SaTokenInfo: response.data?.tokenInfo,
      tokenValue: response.data?.tokenInfo?.tokenValue
    })

    if (response.flag) {
      if (response.data?.tokenInfo?.tokenValue) {
        successMessage.value = '注册成功！正在跳转到首页...'
        
        // 保存token到cookie
        saveToken(response.data.tokenInfo.tokenValue)
        console.log('Token已保存到cookie:', response.data.tokenInfo.tokenValue)
        
        // 保存用户信息到localStorage
        if (response.data.userInfo) {
          localStorage.setItem('userInfo', JSON.stringify(response.data.userInfo))
          console.log('用户信息已保存到localStorage:', response.data.userInfo)
        }
        
        // 直接跳转到首页
        console.log('准备跳转到首页...')
        setTimeout(() => {
          console.log('执行跳转')
          try {
            window.location.href = '/'
          } catch (error) {
            console.error('跳转失败，尝试备用方法:', error)
            window.location.replace('/')
          }
        }, 1000)
      } else {
        console.error('注册成功但未获取到token:', response.data)
        errorMessage.value = '注册成功但未获取到认证信息，请重试'
      }
    } else {
      console.warn('注册失败:', response)
      errorMessage.value = response.message || '注册失败'
    }
  } catch (error: any) {
    console.error('注册失败:', error)
    errorMessage.value = error.response?.data?.message || '注册失败，请重试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <form :class="cn('flex flex-col gap-6', props.class)" @submit.prevent="handleRegister">
    <div class="flex flex-col items-center gap-2 text-center">
      <h1 class="text-2xl font-bold">
        创建新账户
      </h1>
      <p class="text-muted-foreground text-sm text-balance">
        请填写以下信息来创建您的账户
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
      
      <div class="grid gap-3">
        <Label for="username">用户名</Label>
        <Input 
          id="username" 
          type="text" 
          placeholder="请输入您的用户名" 
          required 
          v-model="username" 
        />
      </div>
      
      <div class="grid gap-3">
        <Label for="email">邮箱</Label>
        <Input 
          id="email" 
          type="email" 
          placeholder="请输入您的邮箱" 
          required 
          v-model="email" 
        />
      </div>
      
      <div class="grid gap-3">
        <Label for="password">密码</Label>
        <Input 
          id="password" 
          type="password" 
          placeholder="请输入密码（至少6位）" 
          required 
          v-model="password" 
        />
      </div>
      
      <div class="grid gap-3">
        <Label for="confirmPassword">确认密码</Label>
        <Input 
          id="confirmPassword" 
          type="password" 
          placeholder="请再次输入密码" 
          required 
          v-model="confirmPassword" 
        />
      </div>
      
      <Button type="submit" class-name="w-full" :disabled="loading">
        {{ loading ? '注册中...' : '注册' }}
      </Button>
      
      <div class="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
        <span class="bg-background text-muted-foreground relative z-10 px-2">
          或者继续使用
        </span>
      </div>
      
      <Button variant="outline" class-name="w-full">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path
            d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
            fill="currentColor"
          />
        </svg>
        使用 GitHub 注册
      </Button>
    </div>
    <div class="text-center text-sm">
      已有账户？
      <a href="#" class="underline underline-offset-4" @click.prevent="emit('switch-to-login')">
        立即登录
      </a>
    </div>
  </form>
</template>