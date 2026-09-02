// Shared EVM wallet-provider access, extracted from the pattern already used
// for SIWE sign-in in Nav.svelte — needed here too for sending a real
// transaction (claiming an achievement) from the browser.
import { appKit } from '$lib/appkit';

export type MaybeEthereum = {
	request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

/** EVM wallet provider from AppKit's own authorized connection, falling back to window.ethereum. Null if not connected, or connected via Solana. */
export function getEvmWalletProvider(): { address: string; provider: MaybeEthereum } | null {
	if (!appKit) return null;
	const account = appKit.getAccount?.();
	if (!account?.address) return null;
	if ((account as Record<string, unknown>).type === 'solana') return null;

	const walletProvider = appKit.getWalletProvider?.() as unknown;
	const w = window as Window & { ethereum?: MaybeEthereum };
	const evm = (walletProvider as MaybeEthereum)?.request ? (walletProvider as MaybeEthereum) : w.ethereum;
	if (!evm?.request) return null;
	return { address: account.address, provider: evm };
}

// 0G Chain — Galileo testnet. Public network parameters, safe to hardcode
// client-side (mirrors ACHIEVEMENTS_RPC_URL server-side).
const ZERO_G_TESTNET = {
	chainId: '0x40DA', // 16602
	chainName: '0G-Galileo-Testnet',
	nativeCurrency: { name: '0G', symbol: 'OG', decimals: 18 },
	rpcUrls: ['https://evmrpc-testnet.0g.ai'],
	blockExplorerUrls: ['https://chainscan-galileo.0g.ai']
};

/**
 * AppKit deliberately never pushes a `defaultNetwork` at connect time (see
 * appkit.ts) — sign-in is chain-agnostic. But claiming an achievement is a
 * real transaction against a contract that only exists on 0G, so whatever
 * chain the wallet happens to be on (often Ethereum mainnet by default)
 * has to be switched before signing, or the wallet just signs against the
 * wrong network. Throws if the user rejects the switch/add prompt.
 */
export async function ensureZeroGTestnet(provider: MaybeEthereum): Promise<void> {
	try {
		await provider.request({
			method: 'wallet_switchEthereumChain',
			params: [{ chainId: ZERO_G_TESTNET.chainId }]
		});
	} catch (err) {
		const code = (err as { code?: number })?.code;
		if (code !== 4902) throw err; // 4902 = chain not added to wallet yet
		await provider.request({
			method: 'wallet_addEthereumChain',
			params: [ZERO_G_TESTNET]
		});
	}
}
