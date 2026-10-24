import type { FieldControlProps } from '@/components/common/form-field'
import { ensSuffixes, walletTypeLabels, walletTypes, type WalletType } from '@/contracts/account'
import { networkIds, networkLabels, type NetworkId } from '@/contracts/nft'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

export function NetworkSelect({
  value,
  onChange,
  control,
}: {
  value: NetworkId | undefined
  onChange: (value: NetworkId) => void
  control: FieldControlProps
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as NetworkId)}>
      <SelectTrigger {...control} className="w-full">
        <SelectValue placeholder="Selecione uma rede" />
      </SelectTrigger>
      <SelectContent>
        {networkIds.map((id) => (
          <SelectItem key={id} value={id}>
            {networkLabels[id]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function WalletTypeSelect({
  value,
  onChange,
  control,
}: {
  value: WalletType | undefined
  onChange: (value: WalletType) => void
  control: FieldControlProps
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as WalletType)}>
      <SelectTrigger {...control} className="w-full">
        <SelectValue placeholder="Selecione uma carteira" />
      </SelectTrigger>
      <SelectContent>
        {walletTypes.map((id) => (
          <SelectItem key={id} value={id}>
            {walletTypeLabels[id]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** ".eth ▾ [ name ]" — suffix select + label input. */
export function EnsInput({
  suffix,
  onSuffixChange,
  inputProps,
  control,
  className,
}: {
  suffix: (typeof ensSuffixes)[number] | undefined
  onSuffixChange: (value: (typeof ensSuffixes)[number]) => void
  inputProps: React.ComponentProps<'input'>
  control: FieldControlProps
  className?: string
}) {
  return (
    <div className={cn('flex gap-3', className)}>
      <Select value={suffix} onValueChange={(next) => onSuffixChange(next as (typeof ensSuffixes)[number])}>
        <SelectTrigger className="w-[92px] shrink-0" aria-label="Sufixo ENS">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ensSuffixes.map((item) => (
            <SelectItem key={item} value={item}>
              {item}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input {...control} {...inputProps} placeholder="seunome" autoComplete="off" />
    </div>
  )
}
