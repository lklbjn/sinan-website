import {http, getToken} from '@/lib/http'
import type {
    BookmarkResp,
    SnBookmark,
    AddBookmarkReq,
    EditBookmarkReq,
    BookmarkQueryParams,
    SpaceResp,
    AddSpaceReq,
    EditSpaceReq,
    SortUpdateReq,
    SpaceBookmarkStatsResp,
    SpaceQueryParams,
    TagResp,
    AddTagReq,
    EditTagReq,
    TagStatsResp,
    TagBookmarkStatsResp,
    TagQueryParams,
    ReceivedBookmarkResp,
    AddReceivedBookmarkReq,
    EditReceivedBookmarkReq,
    ReceivedBookmarkStatsResp,
    ReceivedBookmarkQueryParams, UserInfo, Page, ImportBookmarkResp, SpaceRespSimple, SpaceDragSortParams,
    TagDragSortParams, UserRegister, UserLoginResp, UserLoginReq, UserKeyResp, CreateUserKeyReq, ChangePasswordReq,
    ForgotPasswordReq, ResetPasswordReq,
    UpdateShareBookmarkReq, RemoveShareBookmarkReq, SearchCollectionUserReq, GetShareUrl, CollectionUserInfoResp,
    CollectionSpaceReq,PasskeyRegistrationReq,ChangePasskeyReq,PasskeyResp,
    WebsiteAnalysisRequest, WebsiteAnalysisResponse, ResourceUsageInfo,
    CreateFeedbackReq, FeedbackCreateResp
} from '@/types/api'

export class GithubAPI {
    static getRedirect() {
        return http.get<String>('/user/github/oauth2/redirect')
    }

    static doLogin(code: string) {
        return http.get<UserLoginResp>('/user/github/oauth2/login', {params: {code}})
    }
}

export class PasskeyAPI{
    static getRegistrationOptions() {
        return http.get<String>('/user/passkey/registration/options')
    }

    static verifyRegistration(params: PasskeyRegistrationReq) {
        return http.post<String>('/user/passkey/registration', params)
    }

    static getAssertionOptions() {
        return http.get<String>('/user/passkey/login/options')
    }

    static verifyAssertion(credential: string) {
        return http.post<UserLoginResp>('/user/passkey/login', credential)
    }

    // 获取用户的所有Passkey凭证
    static getPasskeys() {
        return http.get<PasskeyResp[]>('/user/passkeys')
    }

    // 更新Passkey描述
    static updatePasskeyDescription(data: ChangePasskeyReq) {
        return http.patch<string>(`/user/passkey/describe`, data)
    }

    // 删除Passkey凭证
    static deletePasskey(passkeyId: string) {
        return http.delete<string>(`/user/passkey/${passkeyId}`)
    }

    // 注册新的Passkey
    static registerPasskey(name: string, description?: string) {
        return http.post<PasskeyResp>('/user/passkey/register', { name, description })
    }
}

// 用户认证相关API
export class UserAPI {
    static doLogin(params: UserLoginReq) {
        return http.post<UserLoginResp>('/user/login', params)
    }

    static doRegister(params: UserRegister) {
        return http.post<UserLoginResp>('/user/register', params)
    }

    static info() {
        return http.get<UserInfo>('/user/info')
    }

    static async export() {
        try {
            // 设置文件名，包含当前日期
            const date = new Date().toISOString().split('T')[0]
            const filename = `bookmarks-export-${date}.json`

            // 使用专门的下载方法
            await http.download('/user/export', filename)

            return {success: true}
        } catch (error) {
            console.error('Export failed:', error)
            throw error
        }
    }

    static import(file: File) {
        return http.upload<any>('/user/import', file)
    }

    static clear() {
        return http.delete('/user/clear')
    }

    // 修改密码
    static changePassword(data: ChangePasswordReq) {
        return http.post<string>('/user/change-password', data)
    }

    // 忘记密码 - 发送重置邮件
    static forgotPassword(data: ForgotPasswordReq) {
        return http.post<string>('/user/forgot-password', data)
    }

    // 重置密码
    static resetPassword(data: ResetPasswordReq) {
        return http.post<string>('/user/reset-password', data)
    }

    // 修改用户名
    static changeUsername(newUsername: string) {
        return http.post<string>('/user/change-username', { newUsername })
    }

    // 获取密码状态
    static passwordState() {
        return http.get<boolean>('/user/password/status')
    }

    // 创建用户Key
    static createKey(data: CreateUserKeyReq) {
        return http.post<UserKeyResp>('/user/key', data)
    }

    // 获取用户的所有Key
    static getKeys() {
        return http.get<UserKeyResp[]>('/user/keys')
    }

    // 删除用户Key
    static deleteKey(keyId: string) {
        return http.delete<string>(`/user/key/${keyId}`)
    }

    // 上传用户头像
    static uploadAvatar(file: File) {
        const formData = new FormData()
        formData.append('file', file)
        return http.post<string>('/user/upload/avatar', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        })
    }

    // 获取用户头像URL (静态方法，直接返回URL)
    static getAvatarUrl(fileName: string) {
        return `/api/user/avatars/${fileName}`
    }

}

// 书签相关API
export class BookmarkAPI {

    static incrementUsage(bookmarkId: string) {
        return http.post(`/bookmark/${bookmarkId}/increment-usage`)
    }

    static noSpaceBookmark() {
        return http.get<BookmarkResp[]>('/bookmark/no-namespace')
    }

    // 获取最常使用的书签
    static getBookmarkById(id: string) {
        return http.get<BookmarkResp[]>(`/bookmark/${id}`)
    }

    // 获取最常使用的书签
    static getMostVisited(params: BookmarkQueryParams) {
        return http.get<BookmarkResp[]>('/bookmark/most-visited', {params})
    }

    // 搜索书签
    static search(params: { query: string; limit?: number }) {
        return http.get<BookmarkResp[]>('/bookmark/search', {params})
    }

    // 上传书签图标
    static uploadIcon(file: File) {
        const formData = new FormData()
        formData.append('file', file)
        return http.post<string>('/bookmark/upload/icon', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        })
    }

    // 新增书签
    static create(data: AddBookmarkReq) {
        return http.post<SnBookmark>('/bookmark', data)
    }

    // 编辑书签
    static update(data: EditBookmarkReq) {
        return http.put<SnBookmark>('/bookmark', data)
    }

    // 删除书签
    static delete(id: string) {
        return http.delete<string>('/bookmark', null, {params: {id}})
    }

    // 给书签加星标
    static addStar(id: string) {
        return http.post<string>('/bookmark/star', null, {params: {id}})
    }

    // 取消书签星标
    static removeStar(id: string) {
        return http.delete<string>('/bookmark/star', {params: {id}})
    }

    // 切换书签星标状态
    static toggleStar(id: string) {
        return http.put<string>('/bookmark/star', null, {params: {id}})
    }

    // 获取星标书签
    static getStarred(limit: number) {
        return http.get<BookmarkResp[]>('/bookmark/starred', {params: {limit}})
    }

    // 根据空间ID获取书签列表
    static getBySpaceId(spaceId: string, search?: string) {
        return http.get<BookmarkResp[]>(`/bookmark/space/${spaceId}`, {params: {search}})
    }

    // 获取空间的书签统计信息
    static getSpaceStats(spaceId: string) {
        return http.get<SpaceBookmarkStatsResp>(`/bookmark/space/${spaceId}/stats`)
    }

    // 根据标签ID获取关联的书签列表
    static getByTagId(tagId: string, search?: string) {
        return http.get<BookmarkResp[]>(`/bookmark/tag/${tagId}`, {params: {search}})
    }

    // 获取标签的书签统计信息
    static getTagStats(tagId: string) {
        return http.get<TagBookmarkStatsResp>(`/bookmark/tag/${tagId}/stats`)
    }

    // 导入Chrome书签
    static importChrome(file: File) {
        return http.upload<ImportBookmarkResp>('/bookmark/import/chrome', file)
    }

    // 检查重复书签
    static checkDuplicates(level: number) {
        return http.get<any>('/bookmark/duplicates', { params: { level } })
    }

    // 忽略组相关API
    // 获取用户的所有忽略组
    static getIgnoredGroups() {
        return http.get<string[]>('/bookmark/ignored-groups')
    }

    // 添加忽略组
    static addIgnoredGroup(groupName: string) {
        return http.post<string>('/bookmark/ignored-groups', { groupName })
    }

    // 移除忽略组
    static removeIgnoredGroup(groupName: string) {
        return http.delete<string>(`/bookmark/ignored-groups/${encodeURIComponent(groupName)}`)
    }

    // 批量设置忽略组
    static setIgnoredGroups(groupNames: string[]) {
        return http.put<string>('/bookmark/ignored-groups', { groupNames })
    }
}

// 空间相关API
export class SpaceAPI {

    static dragSortSpaces(params: SpaceDragSortParams) {
        return http.put<String>('/space/drag-sort', params)
    }

    // 获取用户的所有空间
    static getAll(params?: SpaceQueryParams) {
        return http.get<Page<SpaceResp>>('/space', {params})
    }

    static getAllList() {
        return http.get<Page<SpaceRespSimple>>('/space/all')
    }

    // 新增空间
    static create(data: AddSpaceReq) {
        return http.post<SpaceResp>('/space', data)
    }

    // 编辑空间
    static update(data: EditSpaceReq) {
        return http.put<SpaceResp>('/space', data)
    }

    // 根据ID获取空间详情
    static getById(id: string) {
        return http.get<SpaceResp>(`/space/${id}`)
    }

    // 删除空间
    static delete(id: string) {
        return http.delete<string>(`/space/${id}`)
    }

    // 批量更新空间排序
    static updateSort(data: SortUpdateReq[]) {
        return http.put<string>('/space/sort', data)
    }
}

// 标签相关API
export class TagAPI {

    static dragSortTags(params: TagDragSortParams) {
        return http.put<String>('/tag/drag-sort', params)
    }

    //获取全部列表
    static getAllList() {
        return http.get<TagResp[]>('/tag/all')
    }

    // 获取用户的所有标签
    static getAll(params?: TagQueryParams) {
        return http.get<Page<TagResp>>('/tag', {params})
    }

    // 新增标签
    static create(data: AddTagReq) {
        return http.post<TagResp>('/tag', data)
    }

    // 编辑标签
    static update(data: EditTagReq) {
        return http.put<TagResp>('/tag', data)
    }

    // 根据ID获取标签详情
    static getById(id: string) {
        return http.get<TagResp>(`/tag/${id}`)
    }

    // 删除标签
    static delete(id: string) {
        return http.delete<string>(`/tag/${id}`)
    }

    // 获取用户标签统计信息
    static getStats() {
        return http.get<TagStatsResp>('/tag/stats')
    }
}

// 接收书签相关API
export class ReceivedBookmarkAPI {
    // 获取用户的接收书签列表
    static getAll(params?: ReceivedBookmarkQueryParams) {
        return http.get<Page<ReceivedBookmarkResp>>('/received/bookmark', {params})
    }

    // 新增接收书签
    static create(data: AddReceivedBookmarkReq) {
        return http.post<ReceivedBookmarkResp>('/received/bookmark', data)
    }

    // 编辑接收书签
    static update(data: EditReceivedBookmarkReq) {
        return http.put<ReceivedBookmarkResp>('/received/bookmark', data)
    }

    // 根据ID获取接收书签详情
    static getById(id: string) {
        return http.get<ReceivedBookmarkResp>(`/received/bookmark/${id}`)
    }

    // 删除接收书签（状态改为3）
    static delete(id: string) {
        return http.delete<string>(`/received/bookmark/${id}`)
    }

    // 确认接收书签并转为正式书签
    static confirm(id: string) {
        return http.post<string>(`/received/bookmark/${id}/confirm`)
    }

    // 获取接收书签统计信息
    static getStats() {
        return http.get<ReceivedBookmarkStatsResp>('/received/bookmark/stats')
    }
}

export class ShareAPI {
    static updateShare(data: UpdateShareBookmarkReq) {
        return http.patch<string>("/space-share/update", data)
    }

    static getShareUrl(data: GetShareUrl) {
        return http.get<string>(`/space-share/share-url`, {params: data})
    }

    static getCollectionsUsers(data: SearchCollectionUserReq) {
        return http.get<Page<CollectionUserInfoResp>>(`/space-share/collection-users`, {params: data})
    }

    static cancelCollectionUser(data: RemoveShareBookmarkReq) {
        return http.delete(`/space-share/remove`, data)
    }

    static collectionSpace(data: CollectionSpaceReq) {
        return http.post<string>('/space-share/collect', data)
    }

    static removeCollectionUser(params: { spaceId: string }) {
        return http.delete(`/space-share/cancel-collect`, null, {params: params})
    }

    // 获取用户的所有空间
    static getUserCollectionSpaces(params?: SpaceQueryParams) {
        return http.get<Page<SpaceResp>>('/space-share/user-spaces', {params})
    }

}

export class FaviconAPI {
    static getFavicon(domain: string, size: number = 32) {
        return `/api/favicon/icon?domain=${encodeURIComponent(domain)}&sz=${size}`
    }
}

// 网站分析相关API
export class WebsiteAnalysisAPI {
    // 分析网站并匹配分类和标签
    static analyze(data: WebsiteAnalysisRequest) {
        return http.post<WebsiteAnalysisResponse>('/website-analysis/analyze', data)
    }

    // 查询当前用户的AI分析资源使用情况
    static getResourceUsage() {
        return http.get<ResourceUsageInfo>('/website-analysis/resource-usage')
    }

    // 使用AI分析网站并返回分类和标签建议（新接口 - SSE流式输出，使用URL参数传递token）
    static async analyzeWebsiteStream(url: string, onStatus: (message: string) => void, onBasicInfo: (data: any) => void, onResult: (data: any) => void, onError: (message: string) => void) {
        const encodedUrl = encodeURIComponent(url)
        const token = getToken()

        // 构建请求URL，将token作为参数传递（EventSource不支持自定义Header）
        let requestUrl = `/api/bookmark/analyze-website?url=${encodedUrl}`
        if (token) {
            requestUrl += `&token=${encodeURIComponent(token)}`
        }

        // 首先尝试使用EventSource（真正的SSE实现）
        try {
            const eventSource = new EventSource(requestUrl)
            let isCompleted = false

            // 监听状态事件
            eventSource.addEventListener('status', (event: any) => {
                try {
                    const data = JSON.parse(event.data)
                    onStatus(data.message)
                } catch (e) {
                    console.error('解析status事件失败:', e)
                }
            })

            // 监听基本信息事件
            eventSource.addEventListener('basic_info', (event: any) => {
                try {
                    const data = JSON.parse(event.data)
                    onStatus(data.message)
                    onBasicInfo(data.data)
                } catch (e) {
                    console.error('解析basic_info事件失败:', e)
                }
            })

            // 监听结果事件
            eventSource.addEventListener('result', (event: any) => {
                try {
                    const data = JSON.parse(event.data)
                    onStatus(data.message)
                    onResult(data.data)
                    isCompleted = true
                    eventSource.close()
                } catch (e) {
                    console.error('解析result事件失败:', e)
                }
            })

            // 监听错误事件
            eventSource.addEventListener('error', (event: any) => {
                try {
                    const data = JSON.parse(event.data)
                    onError(data.message)
                } catch (e) {
                    console.error('解析error事件失败:', e)
                    onError('分析过程中发生错误')
                }
                isCompleted = true
                eventSource.close()
            })

            // 连接错误处理
            eventSource.onerror = (error) => {
                if (!isCompleted) {
                    console.warn('EventSource连接失败，尝试fetch方式:', error)
                    eventSource.close()
                    // 降级到fetch方式
                    this.analyzeWebsiteStreamFallback(requestUrl, onStatus, onBasicInfo, onResult, onError)
                }
            }

            // 超时处理（5分钟超时）
            setTimeout(() => {
                if (!isCompleted) {
                    eventSource.close()
                    onError('请求超时，请稍后重试')
                }
            }, 5 * 60 * 1000)

        } catch (error) {
            console.warn('EventSource创建失败，使用fetch方式:', error)
            // 直接降级到fetch方式
            this.analyzeWebsiteStreamFallback(requestUrl, onStatus, onBasicInfo, onResult, onError)
        }
    }

    // 降级方案：使用fetch实现SSE（支持双种认证方式）
    private static async analyzeWebsiteStreamFallback(requestUrl: string, onStatus: (message: string) => void, onBasicInfo: (data: any) => void, onResult: (data: any) => void, onError: (message: string) => void) {
        try {
            onStatus('正在连接分析服务（fetch模式）...')

            const token = getToken()
            const headers: Record<string, string> = {
                'Accept': 'text/event-stream, application/json, */*',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            }

            // 如果有token，添加Authorization头（双重认证支持）
            if (token) {
                headers['Authorization'] = `Bearer ${token}`
            }

            const response = await fetch(requestUrl, {
                method: 'GET',
                headers
            })

            if (!response.ok) {
                let errorMessage = `HTTP error! status: ${response.status}`

                // 特别处理406错误
                if (response.status === 406) {
                    errorMessage = '服务器不支持请求的Accept类型，请联系管理员检查SSE配置'
                } else if (response.status === 401) {
                    errorMessage = '认证失败，请重新登录'
                } else if (response.status === 403) {
                    errorMessage = '权限不足，无法访问此功能'
                } else if (response.status === 404) {
                    errorMessage = '分析接口不存在，请联系管理员'
                }

                throw new Error(errorMessage)
            }

            // 检查是否为SSE响应
            const contentType = response.headers.get('content-type')
            if (contentType && contentType.includes('text/event-stream') && response.body) {
                // 处理SSE流
                const reader = response.body.getReader()
                const decoder = new TextDecoder()

                try {
                    while (true) {
                        const { done, value } = await reader.read()
                        if (done) break

                        const chunk = decoder.decode(value, { stream: true })
                        const lines = chunk.split('\n')

                        for (const line of lines) {
                            if (line.startsWith('event: ')) {
                                continue
                            }

                            if (line.startsWith('data: ')) {
                                try {
                                    const data = JSON.parse(line.substring(6))

                                    if (data.type === 'status') {
                                        onStatus(data.message)
                                    } else if (data.type === 'basic_info') {
                                        onStatus(data.message)
                                        onBasicInfo(data.data)
                                    } else if (data.type === 'result') {
                                        onStatus(data.message)
                                        onResult(data.data)
                                        return
                                    } else if (data.type === 'error') {
                                        onError(data.message)
                                        return
                                    }
                                } catch (e) {
                                    console.error('解析SSE数据失败:', e)
                                }
                            }
                        }
                    }
                } finally {
                    reader.releaseLock()
                }
            } else {
                // 普通JSON响应，模拟流式体验
                onStatus('正在分析网站（非流式模式）...')
                const data = await response.json()

                if (data.flag && data.data) {
                    // 模拟流式事件
                    onStatus('正在获取网站信息...')
                    setTimeout(() => {
                        onBasicInfo({
                            url: data.data.url,
                            name: data.data.name,
                            description: data.data.description
                        })
                    }, 100)

                    setTimeout(() => {
                        onStatus('正在使用AI分析...')
                    }, 500)

                    setTimeout(() => {
                        onStatus('分析完成')
                        onResult(data.data)
                    }, 1000)
                } else {
                    throw new Error(data.message || '分析失败')
                }
            }

        } catch (error: any) {
            console.error('流式分析失败:', error)
            onError(error.message || '分析失败，请稍后重试')
        }
    }
}

// 反馈相关API
export class FeedbackAPI {
    // 创建反馈
    static create(data: CreateFeedbackReq) {
        return http.post<FeedbackCreateResp>('/feedback', data)
    }
}