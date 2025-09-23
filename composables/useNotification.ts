import { NotificationType } from '~/types/notification'

export default function useNotification() {
  const notify = ({
    title,
    message,
    type = NotificationType.INFO,
    duration = 5000
  }: {
    title?: string
    message: string
    type: NotificationType
    duration?: number
  }) => {
    const toast = useToast()

    toast.add({
      title: title || getDefaultTitle(type),
      duration: duration,
      description: message.charAt(0).toUpperCase() + message.slice(1),
      color: getColor(type)
    })
  }

  return { notify }
}

const getColor = (
  notificationType: NotificationType
): 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral' | undefined => {
  switch (notificationType) {
    case NotificationType.INTERNAL_ERROR:
      return 'error'
    case NotificationType.ERROR:
      return 'error'
    case NotificationType.WARNING:
      return 'info'
    case NotificationType.INFO:
      return 'success'
    case NotificationType.SUCCESS:
      return 'secondary'
    default:
      return 'secondary'
  }
}

const getDefaultTitle = (notificationType: NotificationType) => {
  switch (notificationType) {
    case NotificationType.INTERNAL_ERROR:
      return 'Ошибка'
    case NotificationType.ERROR:
      return 'Ошибка'
    case NotificationType.WARNING:
      return 'Предупреждение'
    case NotificationType.INFO:
      return 'Информация'
    case NotificationType.SUCCESS:
      return 'Успешно'
    default:
      return 'Информация'
  }
}
