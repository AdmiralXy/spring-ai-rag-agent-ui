/* tslint:disable */
/* eslint-disable */

declare global {
  export interface CreateChatRq {
    ragSpace: string
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

  export interface ChatHistoryRs {
    chatId: string
    messages: ChatMessage[]
  }

  export interface CreateChatRs {
    chatId: string
    title: string
  }

  export interface GetChatsRs {
    chats: Page<Chat>
  }

  export interface AddToSpaceRq {
    text: string
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

  export interface ChatMessage {
    role: string
    content: string
  }

  export interface Page<T> extends Slice<T> {
    totalPages: number
    totalElements: number
  }

  export interface Chat {
    id: string
    title: string
    ragSpace: string
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
    size: number
    content: T[]
    number: number
    pageable: Pageable
    numberOfElements: number
    sort: Sort
    first: boolean
    last: boolean
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
