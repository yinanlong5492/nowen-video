import type { NavigateFunction } from 'react-router-dom'

export function createDeleteWithNavigate(
  handleDelete: (deleteFiles: boolean) => Promise<void>,
  navigate: NavigateFunction,
  onClose: () => void
) {
  return async (deleteFiles: boolean) => {
    await handleDelete(deleteFiles)
    navigate(-1)
    onClose()
  }
}