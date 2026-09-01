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
