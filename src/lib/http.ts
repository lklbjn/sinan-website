import axios from 'axios'
import type {AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig} from 'axios'
import type {
    ApiResponse
} from '@/types/api'


export interface RequestConfig extends AxiosRequestConfig {
    skipInterceptor?: boolean
    showErrorMessage?: boolean
}

class HttpClient {
    private instance: AxiosInstance
    private baseURL: string

    constructor(baseURL: string = '') {
        this.baseURL = baseURL || import.meta.env.VITE_API_BASE_URL || '/api'
        this.instance = axios.create({
            baseURL: this.baseURL,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json'
            }
        })

        this.setupInterceptors()
    }

    private setupInterceptors() {
        this.instance.interceptors.request.use(
            (config: InternalAxiosRequestConfig) => {
                const token = this.getToken()
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`
                }
                return config
            },
            (error) => {
                return Promise.reject(error)
            }
        )

        this.instance.interceptors.response.use(
            (response: AxiosResponse) => {
                // 检查API响应中的code字段是否为-401
                if (response.data && response.data.code === -401) {
                    this.handleUnauthorized()
                    return Promise.reject(new Error('Unauthorized'))
                }
                return response
            },
            (error) => {
                this.handleResponseError(error)
                return Promise.reject(error)
            }
        )
    }

    private getToken(): string | null {
        const getCookie = (name: string): string | null => {
            const nameEQ = name + "="
            const ca = document.cookie.split(';')
            for (let i = 0; i < ca.length; i++) {
                let c = ca[i]
                while (c.charAt(0) === ' ') c = c.substring(1, c.length)
                if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
            }
            return null
        }

        return getCookie('satoken') || localStorage.getItem('token') || sessionStorage.getItem('token')
    }

    private handleResponseError(error: any) {
        if (error.response) {
            const {status, data} = error.response

            // 检查API响应中的code字段是否为-401
            if (data && data.code === -401) {
                this.handleUnauthorized()
                return
            }

            switch (status) {
                case 401:
                    this.handleUnauthorized()
                    break
                case 403:
                    console.error('权限不足')
                    break
                case 404:
                    console.error('请求的资源不存在')
                    break
                case 500:
                    console.error('服务器内部错误')
                    break
                default:
                    console.error(data?.message || '请求失败')
            }
        } else if (error.request) {
            console.error('网络错误，请检查网络连接')
        } else {
            console.error('请求配置错误')
        }
    }

    private handleUnauthorized() {
        const removeCookie = (name: string) => {
            document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/;'
        }

        // 清除所有认证相关的存储
        removeCookie('satoken')
        localStorage.removeItem('token')
        sessionStorage.removeItem('token')

        // 跳转到auth页面
        window.location.href = '/auth'
    }

    public setToken(token: string, persistent: boolean = false) {
        if (persistent) {
            localStorage.setItem('token', token)
        } else {
            sessionStorage.setItem('token', token)
        }
    }

    public removeToken() {
        const removeCookie = (name: string) => {
            document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/;'
        }

        removeCookie('satoken')
        localStorage.removeItem('token')
        sessionStorage.removeItem('token')
    }

    public get<T = any>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
        return this.instance.get(url, config).then(response => response.data)
    }

    public post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
        return this.instance.post(url, data, config).then(response => response.data)
    }

    public put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
        return this.instance.put(url, data, config).then(response => response.data)
    }

    public patch<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
        return this.instance.patch(url, data, config).then(response => response.data)
    }

    public delete<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
        // axios.delete 需要将 data 放在 config.data 中
        const mergedConfig = {
            ...config,
            data: data
        }
        return this.instance.delete(url, mergedConfig).then(response => response.data)
    }

    public upload<T = any>(url: string, file: File, onProgress?: (progress: number) => void): Promise<ApiResponse<T>> {
        const formData = new FormData()
        formData.append('file', file)

        return this.instance.post(url, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            },
            onUploadProgress: (progressEvent) => {
                if (onProgress && progressEvent.total) {
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
                    onProgress(progress)
                }
            }
        }).then(response => response.data)
    }

    public download(url: string, filename?: string, config?: RequestConfig): Promise<void> {
        return this.instance.get(url, {
            ...config,
            responseType: 'blob'
        }).then(response => {
            // 获取响应的内容类型，如果没有则根据文件扩展名推断
            const contentType = response.headers['content-type'] || this.getContentTypeFromFilename(filename)
            const blob = new Blob([response.data], {type: contentType})
            const downloadUrl = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = downloadUrl
            link.download = filename || 'download'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(downloadUrl)
        })
    }

    private getContentTypeFromFilename(filename?: string): string {
        if (!filename) return 'application/octet-stream'

        const extension = filename.split('.').pop()?.toLowerCase()
        switch (extension) {
            case 'json':
                return 'application/json'
            case 'csv':
                return 'text/csv'
            case 'txt':
                return 'text/plain'
            case 'pdf':
                return 'application/pdf'
            case 'zip':
                return 'application/zip'
            default:
                return 'application/octet-stream'
        }
    }

    public request<T = any>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
        return this.instance.request(config)
    }
}

export const http = new HttpClient()

// 导出getToken函数供其他模块使用
export const getToken = (): string | null => {
    const getCookie = (name: string): string | null => {
        const nameEQ = name + "="
        const ca = document.cookie.split(';')
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i]
            while (c.charAt(0) === ' ') c = c.substring(1, c.length)
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
        }
        return null
    }

    return getCookie('satoken') || localStorage.getItem('token') || sessionStorage.getItem('token')
}

export default http