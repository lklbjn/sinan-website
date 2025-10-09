<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { GithubAPI } from '@/services/api'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const errorMessage = ref('')

const saveToken = (token: string) => {
  // 使用localStorage保存token，更安全且易于管理
  localStorage.setItem('token', token)
  // 为了向后兼容，也可以保存到cookie，但主要使用localStorage
  const expires = new Date()
  expires.setTime(expires.getTime() + (7 * 24 * 60 * 60 * 1000))
  document.cookie = `satoken=${token};expires=${expires.toUTCString()};path=/`
}

onMounted(async () => {
  // 获取URL中的code参数
  const code = route.query.code as string
  
  if (!code) {
    errorMessage.value = '授权码缺失，请重新登录'
    loading.value = false
    setTimeout(() => {
      router.push('/auth')
    }, 2000)
    return
  }
  
  try {
    // 使用code调用后端登录接口
    const response = await GithubAPI.doLogin(code)
    
    if (response.flag && response.data?.tokenInfo?.tokenValue) {
      // 保存token
      saveToken(response.data.tokenInfo.tokenValue)
      
      // 保存用户信息到localStorage
      if (response.data.userInfo) {
        localStorage.setItem('userInfo', JSON.stringify(response.data.userInfo))
      }
      
      // 跳转到首页
      router.push('/')
    } else {
      errorMessage.value = response.message || '登录失败，请重试'
      setTimeout(() => {
        router.push('/auth')
      }, 2000)
    }
  } catch (error: any) {
    console.error('GitHub登录失败:', error)
    errorMessage.value = error.response?.data?.message || 'GitHub登录失败，请重试'
    setTimeout(() => {
      router.push('/auth')
    }, 2000)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="flex min-h-screen items-center justify-center">
    <div class="flex flex-col items-center gap-4 text-center">
      <div v-if="loading" class="flex flex-col items-center gap-4">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p class="text-lg">正在处理GitHub登录...</p>
      </div>
      
      <div v-else-if="errorMessage" class="flex flex-col items-center gap-4">
        <div class="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-900/50 dark:text-red-200">
          {{ errorMessage }}
        </div>
        <p class="text-sm text-muted-foreground">即将跳转到登录页面...</p>
      </div>
      
      <div v-else class="flex flex-col items-center gap-4">
        <div class="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-800 dark:bg-green-900/50 dark:text-green-200">
          登录成功！
        </div>
        <p class="text-sm text-muted-foreground">正在跳转到首页...</p>
      </div>
    </div>
  </div>
</template>