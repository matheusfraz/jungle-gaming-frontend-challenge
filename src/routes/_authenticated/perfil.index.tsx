import { createFileRoute } from '@tanstack/react-router'
import { ProfilePage } from '@/features/account/components/profile-form'

export const Route = createFileRoute('/_authenticated/perfil/')({
  component: ProfilePage,
})
