// 通用响应结构
export interface ApiResponse<T = any> {
    code: number
    message: string
    description: string
    data: T
    date: number
    flag: boolean
    messageId: string
}

export interface Page<T = any> {
    records: T[],
    total: number
    size: number,
    current: number,
    pages: number,
}

export interface CollectionUserInfoResp {
    userId: string
    avatar: string
    name: string
    collectedAt: string
}

// SaToken信息
export interface SaTokenInfo {
    tokenName: string
    tokenValue: string
    isLogin: boolean
    loginId: any
    loginType: string
    tokenTimeout: number
    sessionTimeout: number
    tokenSessionTimeout: number
    tokenActiveTimeout: number
    loginDeviceType: string
    tag: string
}

export interface UserInfo {
    name: string,
    email: string,
    avatar: string
}

export interface UserLoginResp {
    userInfo: UserInfo
    tokenInfo: SaTokenInfo
}

export interface UserRegister {
    username: string,
    email: string
    password: string
}

export interface UserLoginReq {
    credential: string
    password: string
}

export interface ForgotPasswordReq {
    email: string
}

export interface ResetPasswordReq {
    code: string
    newPassword: string
    confirmPassword: string
}

export interface ChangePasswordReq {
    currentPassword: string
    newPassword: string
}

// 书签相关类型
export interface BookmarkResp {
    id: string
    spaceId: string
    namespaceId?: string // 兼容不同的字段名
    name: string
    description: string
    url: string
    icon: number | string
    subscribed: boolean
    num: number
    star: boolean
    ignoreDuplicate?: boolean
    tags?: TagResp[]
}

export interface SnBookmark {
    id: string
    userId: string
    namespaceId: string
    name: string
    description: string
    url: string
    icon: number | string
    num: number
    star: boolean
    createTime: string
    updateTime: string
    deleted: number
}

export interface AddBookmarkReq {
    name: string
    url: string
    description?: string
    namespaceId?: string
    tagsIds?: string[]
    newTags?: { name: string; color: string }[]
    newSpace?: { name: string }
}

export interface EditBookmarkReq {
    id: string
    name?: string
    url?: string
    icon?:string
    description?: string
    namespaceId?: string
    tags?: string[]
}

// 空间相关类型
export interface SpaceResp {
    id: string
    name: string
    icon: string
    sort: number
    shared: boolean
    key: string
    description: string
    createTime: string
    updateTime: string
}


export interface SpaceRespSimple {
    id: string
    name: string
    icon: string
}

export interface AddSpaceReq {
    name: string
    icon?: string
    sort?: number
    description?: string
}

export interface EditSpaceReq {
    id: string
    name?: string
    icon?: string
    sort?: number
    description?: string
}

export interface SortUpdateReq {
    id: string
    sort: number
}

export interface SpaceBookmarkStatsResp {
    spaceId: string
    totalCount: number
}

// 标签相关类型
export interface TagResp {
    id: string
    name: string
    color: string
    sort: number
    description: string
    createTime: string
    updateTime: string
}

export interface AddTagReq {
    name: string
    color: string
    description?: string
}

export interface EditTagReq {
    id: string
    name?: string
    color: string
    description?: string
}

export interface TagStatsResp {
    totalCount: number
}

export interface TagBookmarkStatsResp {
    tagId: string
    totalCount: number
}

// 接收书签相关类型
export interface ReceivedBookmarkResp {
    id: string
    namespaceId: string
    group: string
    name: string
    description: string
    url: string
    icon: number | string
    tag: string
    state: number // 1=待确认，2=已确认，3=已删除
    createTime: string
    updateTime: string
}

export interface AddReceivedBookmarkReq {
    name: string
    url: string
    description?: string
    namespaceId?: string
    group?: string
    icon?: number | string
    tag?: string
}

export interface EditReceivedBookmarkReq {
    id: string
    name?: string
    url?: string
    description?: string
    namespaceId?: string
    group?: string
    icon?: number | string
    tag?: string
}

export interface ReceivedBookmarkStatsResp {
    pendingCount: number
    confirmedCount: number
    deletedCount: number
    totalCount: number
}

// 查询参数类型
export interface BookmarkQueryParams {
    limit?: number
    search?: string
}

export interface SpaceQueryParams {
    page?: number
    size?: number
    search?: string
}

export interface SpaceDragSortParams {
    draggedSpaceId?: string,
    targetIndex?: string,
    sortedSpaceIds?: string[],
}

export interface TagQueryParams {
    page?: number
    size?: number
    search?: string
}

export interface TagDragSortParams {
    sortedTagIds?: string[],
    draggedTagId?: string,
    targetIndex?: string,
}

export interface ReceivedBookmarkQueryParams {
    search?: string
    state?: number
    page?: number
    size?: number
}

export interface ImportBookmarkResp {
    successCount: number
    failCount: number
    totalCount: number
    message: string
}

// 忽略组相关类型
export interface IgnoredGroupResp {
    groupName: string
    createdAt: string
    updatedAt: string
}

export interface AddIgnoredGroupReq {
    groupName: string
}

export interface SetIgnoredGroupsReq {
    groupNames: string[]
}

// 用户Key相关类型
export interface UserKeyResp {
    id: string
    userId: string
    accessKey: string
    keyName?: string
    description?: string
    createTime: string
    updateTime: string
}

export interface CreateUserKeyReq {
    keyName?: string
    description?: string
}

export interface ChangePasswordReq {
    currentPassword: string
    newPassword: string
    confirmPassword: string
}

export interface UpdateShareBookmarkReq {
    spaceId: string
    enable: boolean
    key?: string
}

export interface SearchCollectionUserReq {
    page?: number
    size?: number
    spaceId?: string
}

export interface RemoveShareBookmarkReq {
    spaceId: string
    userId: string
}

export interface CollectionSpaceReq {
    spaceId: string
    password: string
}

export interface GetShareUrl {
    spaceId: string
}

export interface PasskeyRegistrationReq {
    credential: string
    describe: string
}

export interface PasskeyResp {
    id: string
    describe?: string
    createTime: string
    lastUsed: string
}

export interface ChangePasskeyReq{
    id: string
    describe: string
}

export interface PasskeyRegistrationReq {
    credential: string
    describe: string
}

export interface Credential {
  id: string;
  [key: string]: any;
}

// 网站分析相关类型
export interface WebsiteAnalysisRequest {
    url: string
    spaces?: string[]
    tags?: string[]
}

export interface WebsiteAnalysisResponse {
    url: string
    name: string
    description: string
    spaces: string
    tags: string[]
}

export interface ResourceUsageInfo {
    usageCount: number
    resourceLimit: number
    hasResource: boolean
    remaining?: number
    usagePercentage?: number
    displayName?: string
    resourceType?: string
}

// 新的网站分析响应类型
export interface NewWebsiteAnalysisResponse {
    url: string
    name: string
    description: string
    spaces: string
    tags: string[]
}

// 流式分析事件类型
export interface StreamAnalysisStatusEvent {
    type: 'status'
    message: string
    timestamp: number
}

export interface StreamAnalysisBasicInfoEvent {
    type: 'basic_info'
    message: string
    data: {
        url: string
        name: string
        description: string
    }
    timestamp: number
}

export interface StreamAnalysisResultEvent {
    type: 'result'
    message: string
    data: NewWebsiteAnalysisResponse
    timestamp: number
}

export interface StreamAnalysisErrorEvent {
    type: 'error'
    message: string
    timestamp: number
}

export type StreamAnalysisEvent =
    | StreamAnalysisStatusEvent
    | StreamAnalysisBasicInfoEvent
    | StreamAnalysisResultEvent
    | StreamAnalysisErrorEvent

// 反馈相关类型
export interface CreateFeedbackReq {
    contact: string  // 联系方式（邮箱或手机号）
    content: string  // 反馈内容
}

export interface FeedbackCreateResp {
    feedbackId: string  // 反馈ID
    message: string     // 成功消息
}