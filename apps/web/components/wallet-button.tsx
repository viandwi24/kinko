'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { WalletIcon, ChevronDownIcon, CopyIcon, LogOutIcon } from 'lucide-react'
import { toast } from 'sonner'

function shortenAddress(address: string) {
  return `${address.slice(0, 4)}…${address.slice(-4)}`
}

export function WalletButton() {
  const { publicKey, connected, disconnect, connecting } = useWallet()
  const { setVisible } = useWalletModal()

  if (!connected || !publicKey) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-8 rounded-xl border-primary/20 bg-primary/5 text-sm font-medium hover:bg-primary/10 hover:border-primary/30"
        onClick={() => setVisible(true)}
        disabled={connecting}
      >
        <WalletIcon className="size-3.5 mr-1.5" />
        {connecting ? 'Connecting…' : 'Connect Wallet'}
      </Button>
    )
  }

  function handleCopy() {
    navigator.clipboard.writeText(publicKey!.toBase58())
    toast.success('Address copied')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 rounded-xl border-primary/20 bg-primary/5 font-mono text-sm hover:bg-primary/10 hover:border-primary/30"
        >
          <span className="size-2 rounded-full bg-green-400 mr-1.5" />
          {shortenAddress(publicKey.toBase58())}
          <ChevronDownIcon className="size-3 ml-1.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-2xl border-primary/10 bg-card/90 backdrop-blur-sm w-48">
        <DropdownMenuItem
          className="rounded-xl text-sm cursor-pointer"
          onClick={handleCopy}
        >
          <CopyIcon className="size-3.5 mr-2 text-muted-foreground" />
          Copy address
        </DropdownMenuItem>
        <DropdownMenuItem
          className="rounded-xl text-sm cursor-pointer"
          onClick={() => setVisible(true)}
        >
          <WalletIcon className="size-3.5 mr-2 text-muted-foreground" />
          Change wallet
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-primary/10" />
        <DropdownMenuItem
          className="rounded-xl text-sm cursor-pointer text-destructive focus:text-destructive"
          onClick={() => disconnect()}
        >
          <LogOutIcon className="size-3.5 mr-2" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
