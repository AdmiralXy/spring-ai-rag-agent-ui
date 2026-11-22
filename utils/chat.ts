/** New chats are titled with a timestamp until the summarizer names them. */
export function displayChatTitle(title?: string | null): string {
  if (!title || /^\d{10,}$/.test(title.trim())) return 'New chat'
  return title
}
