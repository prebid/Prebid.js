/**
 * This function detectWalletsPresence checks if any known crypto wallet providers are
 * available on the window object (indicating they're installed or injected into the browser).
 * It returns 1 if at least one wallet is detected, otherwise 0
 * The _wallets array can be customized with more entries as desired.
 * @returns {number}
 */
export const detectWalletsPresence = function () {
  const _wallets = [
    "ethereum",
    "web3",
    "cardano",
    "BinanceChain",
    "solana",
    "tron",
    "tronLink",
    "tronWeb",
    "tronLink",
    "starknet_argentX",
    "walletLinkExtension",
    "coinbaseWalletExtension",
    "__venom",
    "martian",
    "razor",
    "razorWallet",
    "ic", // plug wallet,
    "cosmos",
    "ronin",
    "starknet_braavos",
    "XverseProviders",
    "compass",
    "solflare",
    "solflareWalletStandardInitialized",
    "sender",
    "rainbow",
  ];
  return _wallets.some((prop) => typeof window[prop] !== "undefined") ? 1 : 0;
};
