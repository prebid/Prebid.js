export function getWalletPresence() {
  return {
    ada: typeof window !== 'undefined' && !!window.cardano,
    bnb: typeof window !== 'undefined' && !!window.BinanceChain,
    eth: typeof window !== 'undefined' && !!window.ethereum,
    sol: typeof window !== 'undefined' && !!window.solana,
    tron: typeof window !== 'undefined' && !!window.tron,
  };
}

function tryCatch(fn, fallback) {
  try {
    return fn();
  } catch (e) {
    return fallback;
  }
}

export function getWalletProviderFlags() {
  return {
    ada: tryCatch(getAdaWalletProviderFlags, []),
    bnb: tryCatch(getBnbWalletProviderFlags, []),
    eth: tryCatch(getEthWalletProviderFlags, []),
    sol: tryCatch(getSolWalletProviderFlags, []),
    tron: tryCatch(getTronWalletProviderFlags, []),
  };
}

function getAdaWalletProviderFlags() {
  const flags = [];
  if (typeof window === 'undefined') return flags;
  if (window.cardano) {
    const allWalletProviderFlags = [
      'eternl',
      'yoroi',
      'nufi',
      'flint',
      'exodus',
      'lace',
      'nami',
      'gerowallet',
      'typhon',
      'begin',
    ];
    for (const flag of allWalletProviderFlags) {
      if (window.cardano[flag]) flags.push(flag);
    }
  }
  return flags;
}

function getBnbWalletProviderFlags() {
  const flags = [];
  if (typeof window === 'undefined') return flags;
  if (window.BinanceChain) {
    const allWalletProviderFlags = [
      'isTrustWallet',
      'isCoin98',
      'isKaiWallet',
      'isMetaMask',
      'isNifyWallet',
    ];
    for (const flag of allWalletProviderFlags) {
      if (window.BinanceChain[flag]) flags.push(flag);
    }
    // Coin98 adds additional flags
    if (flags.includes('isCoin98') && flags.includes('isKaiWallet')) {
      flags.splice(flags.indexOf('isKaiWallet'), 1);
    }
    if (flags.includes('isCoin98') && flags.includes('isNifyWallet')) {
      flags.splice(flags.indexOf('isNifyWallet'), 1);
    }
    if (flags.includes('isCoin98') && flags.includes('isMetaMask')) {
      flags.splice(flags.indexOf('isMetaMask'), 1);
    }
  }
  return flags;
}

function getEthWalletProviderFlags() {
  const flags = [];
  if (typeof window === 'undefined') return flags;
  if (window.ethereum) {
    const allWalletProviderFlags = [
      'isApexWallet',
      'isAvalanche',
      'isBackpack',
      'isBifrost',
      'isBitKeep',
      'isBitski',
      'isBlockWallet',
      'isBraveWallet',
      'isCoinbaseWallet',
      'isDawn',
      'isEnkrypt',
      'isExodus',
      'isFrame',
      'isFrontier',
      'isGamestop',
      'isHyperPay',
      'isImToken',
      'isKuCoinWallet',
      'isMathWallet',
      'isMetaMask',
      'isOkxWallet',
      'isOKExWallet',
      'isOneInchAndroidWallet',
      'isOneInchIOSWallet',
      'isOpera',
      'isPhantom',
      'isPortal',
      'isRabby',
      'isRainbow',
      'isStatus',
      'isTally',
      'isTokenPocket',
      'isTokenary',
      'isTrust',
      'isTrustWallet',
      'isXDEFI',
      'isZerion',
    ];
    for (const flag of allWalletProviderFlags) {
      if (window.ethereum[flag]) flags.push(flag);
    }
    // Filter MetaMask lookalikes
    if (
      flags.includes('isMetaMask') &&
      [
        'isApexWallet',
        'isAvalanche',
        'isBitKeep',
        'isBlockWallet',
        'isKuCoinWallet',
        'isMathWallet',
        'isOKExWallet',
        'isOkxWallet',
        'isOneInchAndroidWallet',
        'isOneInchIOSWallet',
        'isOpera',
        'isPhantom',
        'isPortal',
        'isRabby',
        'isTokenPocket',
        'isTokenary',
        'isZerion',
      ].some((f) => flags.includes(f))
    ) {
      flags.splice(flags.indexOf('isMetaMask'), 1);
    }
  }
  return flags;
}

function getSolWalletProviderFlags() {
  const flags = [];
  if (typeof window === 'undefined') return flags;
  if (window.solana) {
    const allWalletProviderFlags = ['isPhantom', 'isNufi'];
    for (const flag of allWalletProviderFlags) {
      if (window.solana[flag]) flags.push(flag);
    }
    if (flags.includes('isNufi') && flags.includes('isPhantom')) {
      flags.splice(flags.indexOf('isPhantom'), 1);
    }
  }
  if (window.solflare) flags.push('isSolflare');
  if (window.backpack) flags.push('isBackpack');
  return flags;
}

function getTronWalletProviderFlags() {
  const flags = [];
  if (typeof window === 'undefined') return flags;
  if (window.tron) {
    const allWalletProviderFlags = ['isTronLink'];
    for (const flag of allWalletProviderFlags) {
      if (window.tron[flag]) flags.push(flag);
    }
  }
  return flags;
}
