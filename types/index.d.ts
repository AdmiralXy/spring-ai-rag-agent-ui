/* tslint:disable */
/* eslint-disable */

declare global {
  export interface ModelInfoRs {
    label: string
    value: string
    provider?: ChatModelProvider
    /** The model supports thinking (reasoning effort levels) */
    thinking?: boolean
    /** The model accepts images (screenshots can be attached) */
    vision?: boolean
    /** The built-in model every user has; read-only */
    builtin?: boolean
  }

  export interface UserRs {
    id: string
    email: string
    /** An upload password is set, folders can be uploaded */
    uploadKeySet: boolean
  }

  export interface AuthRs {
    token: string
    user: UserRs
  }

  export interface AuthConfigRs {
    registrationEnabled: boolean
  }

  export type ThinkingLevel = 'off' | 'low' | 'medium' | 'high'

  export interface ModelsListRs {
    models: ModelInfoRs[]
  }

  export interface CreateChatRq {
    ragSpaces: string[]
  }

  export interface GetDocumentsRs {
    documents: RagDocument[]
  }

  export interface AddToSpaceRs {
    docId: string
  }

  export interface CreateSpaceRq {
    name: string
  }

  export interface PromptTemplate {
    id: string
    name: string
    content: string
  }

  export interface GetPromptTemplatesRs {
    templates: PromptTemplate[]
  }

  export interface CreatePromptTemplateRq {
    name: string
    content: string
  }

  export interface UpdatePromptTemplateRq {
    name: string
    content: string
  }

  export interface FileRs {
    id: string
    name: string
    extension: string
    fileName: string
    contentType: string
    size: number
    createdAt: string
  }

  export interface GetFilesRs {
    files: {
      content: FileRs[]
      page: PageMetadata
    }
  }

  export interface UploadFileRq {
    name: string
    extension: string
    content: string
  }

  export interface UploadEncryptionConfig {
    version: number
    kdf: string
    kdfIterations: number
    kdfSalt: string
    hkdf: string
    hkdfInfo: string
    cipher: string
    keySaltLength: number
    ivLength: number
    tagLength: number
    /** The user has set an upload password */
    keyConfigured: boolean
  }

  export interface UploadConfigRs {
    chunkSize: number
    maxTotalSize: number
    maxFiles: number
    maxRequestSize: number
    maxBatchChunks: number
    encryption: UploadEncryptionConfig
  }

  /** Plaintext of the create-session request; encrypted, never sent as is. */
  export interface UploadManifest {
    name: string
    files: { path: string; size: number }[]
  }

  export interface CreateUploadRq {
    version: number
    keySalt: string
    iv: string
    data: string
  }

  export interface UploadChunkRq {
    iv: string
    data: string
  }

  export interface UploadChunkItemRq extends UploadChunkRq {
    fileIndex: number
    chunkIndex: number
  }

  export interface UploadChunksRq {
    chunks: UploadChunkItemRq[]
  }

  export interface UploadSessionFileRs {
    index: number
    size: number
    chunkCount: number
  }

  export interface CreateUploadRs {
    uploadId: string
    chunkSize: number
    expiresAt: string
    files: UploadSessionFileRs[]
  }

  export interface UploadSessionFileStatusRs extends UploadSessionFileRs {
    receivedChunks: number[]
  }

  export interface UploadStatusRs {
    uploadId: string
    keySalt: string
    chunkSize: number
    expiresAt: string
    files: UploadSessionFileStatusRs[]
  }

  export interface ChatHistoryRs {
    chatId: string
    messages: ChatMessage[]
  }

  export interface CreateChatRs {
    chatId: string
    modelId?: string
    modelName?: string
    title: string
  }

  export interface GetChatsRs {
    chats: Page<Chat>
  }

  export interface AddToSpaceRq {
    text: string
    batch: boolean
    providerType: 'text' | 'confluence' | 'git'
    auth?: ProviderAuth
    git?: GitUploadOptions
  }

  export interface ProviderAuth {
    login: string
    password: string
  }

  export interface GitUploadOptions {
    branch: string
    folder: string
  }

  export interface GitInfoRq {
    url: string
    login?: string
    password?: string
  }

  export interface GitInfoRs {
    branches: string[]
    folders: string[]
  }

  export interface CreateSpaceRs {
    id: string
    name: string
    createdAt: Date
  }

  export interface GetSpacesRs {
    spaces: Page<Space>
  }

  export interface RagDocument {
    id: string
    content: string
    metadata: RagDocumentMetadata
  }

  export interface RagDocumentMetadata {
    doc: string
    chunk: string
    space: string
    number: number
    total: number
    distance?: number
  }

  /** Image attached to a user message (base64 data without the `data:` prefix) */
  export interface ChatAttachment {
    mimeType: string
    data: string
    name?: string
  }

  export interface ChatMessage {
    /** Server id; known once the message is stored (needed to delete it) */
    id?: string
    role: string
    content: string
    /** Structured output (text, thinking, tool steps, errors, notices) */
    parts?: ChatMessagePart[]
    /** Images of a user message */
    attachments?: ChatAttachment[]
    /** Client-only: answer produced by the agent */
    agent?: boolean
    /** Client-only: the answer is still streaming */
    pending?: boolean
    /** Client-only: the backend rejected the message before storing it */
    rejected?: boolean
    /** Client-only: transient agent status (retrying, compacting...) */
    status?: string
    /** Summary of a finished agent run (agent answers) */
    stats?: AgentRunStats
    createdAt?: string
  }

  export type ChatMessagePartType = 'text' | 'thinking' | 'tool' | 'error' | 'notice'

  export interface ChatMessagePart {
    type: ChatMessagePartType
    text?: string
    toolId?: string
    name?: string
    title?: string
    input?: string
    output?: string
    isError?: boolean
    parentId?: string
  }

  export interface AgentRunStats {
    numTurns: number
    durationMs: number
    costUsd: number
    usage?: {
      inputTokens: number
      outputTokens: number
      cacheReadTokens: number
      cacheCreationTokens: number
    } | null
    interrupted?: boolean
  }

  export interface WorkspaceEntry {
    path: string
    type: 'file' | 'dir'
    size: number
    modifiedAt: string
    collapsed?: boolean
  }

  export interface WorkspaceListing {
    entries: WorkspaceEntry[]
    truncated: boolean
  }

  export interface Page<T> extends Slice<T> {
    page?: PageMetadata
    totalPages?: number
    totalElements?: number
  }

  export interface PageMetadata {
    size: number
    number: number
    totalElements: number
    totalPages: number
  }

  export interface Chat {
    id: string
    title: string
    modelId?: string
    modelName?: string
    ragSpaces: string[]
    createdAt?: string
    /** Last activity, chats are sorted by it */
    updatedAt?: string
  }

  export type ChatModelProvider = 'OPENAI' | 'ANTHROPIC' | 'AGENT'

  export interface ChatModelSettings {
    id: string
    provider: ChatModelProvider
    label: string
    name: string
    baseUrl: string
    apiKey: string
    streaming: boolean
    systemPrompt: string
    priority: number
    temperature: number
    maxContextTokens: number
    thinking: boolean
    /** Max tokens of one answer, 0 = provider default */
    maxOutputTokens: number
    /** The model accepts images */
    vision: boolean
    /** The built-in model every user has; its details are hidden and it cannot be changed */
    builtin?: boolean
  }

  export interface UpsertChatModelRq {
    provider: ChatModelProvider
    label: string
    name: string
    baseUrl: string
    apiKey: string
    streaming: boolean
    systemPrompt: string
    priority: number
    temperature: number
    maxContextTokens: number
    thinking: boolean
    /** Max tokens of one answer, 0 = provider default */
    maxOutputTokens: number
    /** The model accepts images */
    vision: boolean
  }

  export interface GetChatModelsSettingsRs {
    models: ChatModelSettings[]
  }

  export interface EmbeddingsModelSettings {
    provider: 'OPENAI'
    baseUrl: string
    apiKey: string
    name: string
    dimensions: number
    maxDocumentTokens: number
    /** Chunks stored in the spaces of the user with the current model (read-only) */
    indexedChunks?: number
    /** Confirms deleting those chunks when the model, URL or dimensions change */
    resetDocuments?: boolean
  }

  export interface SummarizerModelSettings {
    provider: ChatModelProvider
    name: string
    baseUrl: string
    apiKey: string
    systemPrompt: string
  }

  export interface UpdateChatModelRq {
    modelId: string
  }

  export interface Space {
    id: string
    name: string
    createdAt: Date
  }

  export interface Pageable {
    offset: number
    pageNumber: number
    pageSize: number
    unpaged: boolean
    paged: boolean
    sort: Sort
  }

  export interface Sort extends Streamable<Order>, Serializable {
    unsorted: boolean
    sorted: boolean
  }

  export interface Serializable {}

  export interface Slice<T> extends Streamable<T> {
    size?: number
    content: T[]
    number?: number
    pageable?: Pageable
    numberOfElements?: number
    sort?: Sort
    first?: boolean
    last?: boolean
  }

  export interface Streamable<T> extends Iterable<T>, Supplier<Stream<T>> {
    empty: boolean
  }

  export interface Order extends Serializable {
    direction: Direction
    property: string
    ignoreCase: boolean
    nullHandling: NullHandling
    ascending: boolean
    descending: boolean
  }

  export interface Iterable<T> {}

  export interface Supplier<T> {}

  export interface Stream<T> extends BaseStream<T, Stream<T>> {}

  export interface BaseStream<T, S> extends AutoCloseable {
    parallel: boolean
  }

  export interface AutoCloseable {}

  export type Direction = 'ASC' | 'DESC'

  export type NullHandling = 'NATIVE' | 'NULLS_FIRST' | 'NULLS_LAST'
}

export {}
