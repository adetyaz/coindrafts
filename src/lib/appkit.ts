import { createAppKit } from '@reown/appkit';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { SolanaAdapter } from '@reown/appkit-adapter-solana';
import {
	mainnet,
	arbitrum,
	base,
	polygon,
	optimism,
	sepolia,
	baseSepolia,
	// 0G — the chain the app's compute/storage story is built on, so it belongs
	// in the wallet even before any on-chain feature ships. zeroGTestnet is
	// 16602 (Galileo); zeroGMainnet is 16661.
	zeroGMainnet,
	zeroGTestnet,
	// Solana. The adapter was already registered below, but no Solana network
	// was ever listed here — AppKit needs the networks too, so Solana wallets
	// could never actually be selected despite `users.chainType` supporting them.
	solana,
	solanaDevnet
} from '@reown/appkit/networks';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { PUBLIC_REOWN_PROJECT_ID } from '$env/static/public';

const PROJECT_ID = PUBLIC_REOWN_PROJECT_ID;

type AppKitInstance = ReturnType<typeof createAppKit>;

declare global {
	var __coindraftAppKit: AppKitInstance | undefined;
}

let instance: AppKitInstance | null = null;

if (typeof window !== 'undefined') {
	if (!globalThis.__coindraftAppKit) {
		// EVM chains for the Wagmi adapter — 0G included.
		const evmNetworks = [
			mainnet,
			zeroGMainnet,
			zeroGTestnet,
			arbitrum,
			base,
			polygon,
			optimism,
			sepolia,
			baseSepolia
		] as const;

		// Solana chains for the Solana adapter.
		const solanaNetworks = [solana, solanaDevnet] as const;

		const wagmiAdapter = new WagmiAdapter({
			projectId: PROJECT_ID,
			networks: [...evmNetworks]
		});

		const solanaAdapter = new SolanaAdapter({
			wallets: [new PhantomWalletAdapter(), new SolflareWalletAdapter()]
		});

		globalThis.__coindraftAppKit = createAppKit({
			projectId: PROJECT_ID,
			adapters: [wagmiAdapter, solanaAdapter],
			// Both families are listed so users can pick either. Previously this
			// was EVM-only, which left the Solana adapter unreachable.
			networks: [...evmNetworks, ...solanaNetworks],
			// No `defaultNetwork` on purpose. Setting one makes AppKit push the
			// wallet toward that chain and prompt to switch — which is pure friction
			// here, because **nothing in CoinDraft is on-chain**. Sign-in is a SIWE
			// signature; the chain id is recorded but never acted on. Whatever
			// network the wallet is already on is fine, and asking to change it
			// makes the app look like it wants a transaction when it doesn't.
			metadata: {
				name: 'CoinDraft',
				description: 'Fantasy crypto draft platform',
				url: 'https://coindraft.io',
				icons: ['https://coindraft.io/icon.png']
			},
			features: {
				analytics: false,
				email: false,
				socials: false
			}
		});
	}

	instance = globalThis.__coindraftAppKit;
}

export const appKit = instance;
