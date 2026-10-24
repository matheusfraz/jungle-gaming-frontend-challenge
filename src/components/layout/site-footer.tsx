import { useState, type FormEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { newsletterInputSchema } from '@/contracts/commerce'
import { errorMessage, httpClient, isApiError } from '@/lib/http/client'
import { cn } from '@/lib/utils'
import { FacebookIcon, InstagramIcon, LinkedinIcon, TwitterIcon, YoutubeIcon } from '@/components/common/icons'
import { WalletBadges } from '@/components/common/wallet-badges'

const features = [
  { letter: 'W', title: 'Segurança da carteira', text: 'Proteja sua carteira e colecione arte digital verificada com confiança.' },
  { letter: 'C', title: 'Criadores em destaque', text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.' },
  { letter: 'D', title: 'Alertas de lançamentos', text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.' },
]

const socials = [
  { label: 'Facebook', href: 'https://www.facebook.com/', Icon: FacebookIcon },
  { label: 'Instagram', href: 'https://www.instagram.com/', Icon: InstagramIcon },
  { label: 'X (Twitter)', href: 'https://x.com/', Icon: TwitterIcon },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/', Icon: LinkedinIcon },
  { label: 'YouTube', href: 'https://www.youtube.com/', Icon: YoutubeIcon },
]

function Newsletter() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string>()
  const mutation = useMutation({
    mutationFn: (value: string) => httpClient.post('/newsletter', { email: value }),
    onSuccess: () => setEmail(''),
    onError: (err) => setError(isApiError(err) ? err.fieldErrors.email ?? err.message : errorMessage(err)),
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const parsed = newsletterInputSchema.safeParse({ email })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message)
      return
    }
    setError(undefined)
    mutation.mutate(parsed.data.email)
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3" aria-labelledby="newsletter-title">
      <h2 id="newsletter-title" className="text-base leading-tight font-bold">
        Antecipe-se ao próximo lançamento
      </h2>
      <div className="flex">
        <label htmlFor="newsletter-email" className="sr-only">
          E-mail para receber lançamentos
        </label>
        <input
          id="newsletter-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="digite seu e-mail..."
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'newsletter-error' : 'newsletter-hint'}
          className="h-10 min-w-0 flex-1 rounded-l-sm bg-secondary px-3 text-sm placeholder:text-subtle"
        />
        <button
          type="submit"
          disabled={mutation.isPending}
          className="h-10 rounded-r-sm bg-primary px-4 text-base font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {mutation.isPending ? 'Enviando…' : 'Enviar'}
        </button>
      </div>
      {error ? (
        <p id="newsletter-error" role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : mutation.isSuccess ? (
        <p role="status" className="text-xs text-success">
          Pronto! Você receberá nossos próximos lançamentos.
        </p>
      ) : null}
      <p id="newsletter-hint" className="text-xs leading-5 text-muted-foreground">
        Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
      </p>
    </form>
  )
}

export function SiteFooter() {
  return (
    <footer className="mt-16 flex flex-col">
      <div className="container-page">
        <section aria-label="Por que a Kurio" className="grid gap-8 bg-card px-6 py-8 sm:px-10 lg:grid-cols-[1fr_1fr_1fr_1.25fr]">
          {features.map((feature, index) => (
            <div
              key={feature.letter}
              className={cn('flex flex-col gap-3 lg:pr-6', index > 0 && 'lg:border-l lg:border-primary lg:pl-6')}
            >
              <span
                aria-hidden
                className="inline-flex size-16 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground"
              >
                {feature.letter}
              </span>
              <h2 className="text-base font-bold">{feature.title}</h2>
              <p className="text-sm leading-6 text-muted-foreground">{feature.text}</p>
            </div>
          ))}
          <div className="lg:border-l lg:border-primary lg:pl-6">
            <Newsletter />
          </div>
        </section>

        <div className="grid gap-3 bg-band px-6 py-6 text-sm sm:grid-cols-2 sm:px-10 lg:grid-cols-4 lg:items-center">
          <p className="font-extrabold tracking-[0.2em]">KURIO</p>
          <p className="leading-6">Feito para colecionadores, criadores e cultura</p>
          <a href="mailto:contato@email.com" className="hover:text-primary">
            contato@email.com
          </a>
          <a href="tel:+551140028922" className="hover:text-primary">
            +55 11 4002 8922
          </a>
        </div>

        <div className="grid gap-8 bg-card px-6 py-8 text-sm sm:grid-cols-2 sm:px-10 lg:grid-cols-4">
          <nav aria-labelledby="footer-profile">
            <h2 id="footer-profile" className="mb-3 text-base font-bold">
              Meu perfil
            </h2>
            <ul className="flex flex-col gap-2.5">
              <li><Link to="/perfil" className="hover:text-primary">Meu perfil</Link></li>
              <li><Link to="/perfil/$section" params={{ section: 'colecao' }} className="hover:text-primary">Minha coleção</Link></li>
              <li><Link to="/perfil/$section" params={{ section: 'atividade' }} className="hover:text-primary">Atividade</Link></li>
              <li><Link to="/perfil/$section" params={{ section: 'estudio' }} className="hover:text-primary">Estúdio do criador</Link></li>
              <li><Link to="/perfil/favoritos" className="hover:text-primary">Lista de interesse</Link></li>
            </ul>
          </nav>
          <nav aria-labelledby="footer-help">
            <h2 id="footer-help" className="mb-3 text-base font-bold">
              Central de ajuda
            </h2>
            <ul className="flex flex-col gap-2.5">
              {['Central de ajuda', 'Como comprar NFTs', 'Carteira e segurança', 'Política do mercado', 'Denunciar item'].map((label) => (
                <li key={label}>
                  <Link to="/ajuda" className="hover:text-primary">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-labelledby="footer-collections">
            <h2 id="footer-collections" className="mb-3 text-base font-bold">
              Coleções
            </h2>
            <ul className="flex flex-col gap-2.5">
              {(
                [
                  ['digital-art', 'Arte digital'],
                  ['photography', 'Fotografia'],
                  ['music', 'Música'],
                  ['3d-art', 'Arte 3D'],
                  ['utility', 'Utilidade'],
                ] as const
              ).map(([id, label]) => (
                <li key={id}>
                  <Link to="/mercado" search={{ categories: [id] }} className="hover:text-primary">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="mb-3 text-base font-bold">Redes sociais</h2>
              <ul className="flex gap-2">
                {socials.map(({ label, href, Icon }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex size-8 items-center justify-center rounded-sm border border-primary text-primary hover:bg-primary/10"
                    >
                      <Icon />
                      <span className="sr-only">{label} (abre em nova aba)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="mb-3 text-base font-bold">Carteiras compatíveis</h2>
              <WalletBadges />
            </div>
          </div>
        </div>
      </div>
      <p className="py-6 text-center text-xs tracking-wide">© 2026 Kurio. Propriedade digital para todos.</p>
    </footer>
  )
}
