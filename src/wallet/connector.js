/**
 * Web3 Wallet Connector
 * 
 * Handles progressive Web3 wallet integration
 * Supports MetaMask, WalletConnect, and other EIP-1193 providers
 */

const { ethers } = require('ethers');

class Web3Wallet {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.address = null;
    this.chainId = null;
    this.isConnected = false;
    
    // Event callbacks
    this.onConnect = null;
    this.onDisconnect = null;
    this.onAccountsChanged = null;
    this.onChainChanged = null;
  }

  /**
   * Check if wallet is available
   * @returns {boolean}
   */
  static isAvailable() {
    return typeof window !== 'undefined' && !!window.ethereum;
  }

  /**
   * Connect to wallet
   * @returns {Promise<Object>} Connection result
   */
  async connect() {
    try {
      if (!Web3Wallet.isAvailable()) {
        throw new Error('No Web3 wallet detected. Please install MetaMask or another wallet.');
      }

      // Create provider
      this.provider = new ethers.BrowserProvider(window.ethereum);

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      // Get signer
      this.signer = await this.provider.getSigner();
      this.address = accounts[0];
      this.chainId = await this.provider.getNetwork().then(n => Number(n.chainId));
      this.isConnected = true;

      // Setup event listeners
      this.setupEventListeners();

      const result = {
        address: this.address,
        chainId: this.chainId,
        isConnected: true
      };

      if (this.onConnect) {
        this.onConnect(result);
      }

      return result;
    } catch (error) {
      console.error('[Wallet] Connection error:', error);
      throw error;
    }
  }

  /**
   * Disconnect wallet
   */
  async disconnect() {
    this.provider = null;
    this.signer = null;
    this.address = null;
    this.chainId = null;
    this.isConnected = false;

    if (this.onDisconnect) {
      this.onDisconnect();
    }
  }

  /**
   * Setup wallet event listeners
   */
  setupEventListeners() {
    if (!window.ethereum) return;

    // Account changed
    window.ethereum.on('accountsChanged', (accounts) => {
      if (accounts.length === 0) {
        this.disconnect();
      } else {
        this.address = accounts[0];
        
        if (this.onAccountsChanged) {
          this.onAccountsChanged(accounts[0]);
        }
      }
    });

    // Chain changed
    window.ethereum.on('chainChanged', (chainId) => {
      this.chainId = parseInt(chainId, 16);
      
      if (this.onChainChanged) {
        this.onChainChanged(this.chainId);
      }
    });
  }

  /**
   * Sign a message
   * @param {string} message - Message to sign
   * @returns {Promise<string>} Signature
   */
  async signMessage(message) {
    if (!this.isConnected || !this.signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const signature = await this.signer.signMessage(message);
      return signature;
    } catch (error) {
      console.error('[Wallet] Sign message error:', error);
      throw error;
    }
  }

  /**
   * Sign typed data (EIP-712)
   * @param {Object} domain - EIP-712 domain
   * @param {Object} types - EIP-712 types
   * @param {Object} value - Data to sign
   * @returns {Promise<string>} Signature
   */
  async signTypedData(domain, types, value) {
    if (!this.isConnected || !this.signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const signature = await this.signer.signTypedData(domain, types, value);
      return signature;
    } catch (error) {
      console.error('[Wallet] Sign typed data error:', error);
      throw error;
    }
  }

  /**
   * Get wallet balance
   * @returns {Promise<string>} Balance in ETH
   */
  async getBalance() {
    if (!this.isConnected || !this.provider || !this.address) {
      throw new Error('Wallet not connected');
    }

    try {
      const balance = await this.provider.getBalance(this.address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('[Wallet] Get balance error:', error);
      throw error;
    }
  }

  /**
   * Send transaction
   * @param {Object} tx - Transaction object
   * @returns {Promise<ethers.TransactionResponse>} Transaction response
   */
  async sendTransaction(tx) {
    if (!this.isConnected || !this.signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const response = await this.signer.sendTransaction(tx);
      return response;
    } catch (error) {
      console.error('[Wallet] Send transaction error:', error);
      throw error;
    }
  }

  /**
   * Get TerraCare token balance
   * @param {string} tokenAddress - Token contract address
   * @returns {Promise<string>} Token balance
   */
  async getTokenBalance(tokenAddress) {
    if (!this.isConnected || !this.provider || !this.address) {
      throw new Error('Wallet not connected');
    }

    const erc20Abi = [
      'function balanceOf(address owner) view returns (uint256)',
      'function decimals() view returns (uint8)',
      'function symbol() view returns (string)'
    ];

    try {
      const contract = new ethers.Contract(tokenAddress, erc20Abi, this.provider);
      const [balance, decimals, symbol] = await Promise.all([
        contract.balanceOf(this.address),
        contract.decimals(),
        contract.symbol()
      ]);

      return {
        balance: ethers.formatUnits(balance, decimals),
        rawBalance: balance.toString(),
        decimals,
        symbol
      };
    } catch (error) {
      console.error('[Wallet] Get token balance error:', error);
      throw error;
    }
  }

  /**
   * Switch to a different chain
   * @param {number} chainId - Chain ID to switch to
   * @param {Object} chainConfig - Optional chain configuration for adding new chain
   */
  async switchChain(chainId, chainConfig = null) {
    if (!window.ethereum) {
      throw new Error('No Web3 wallet detected');
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }]
      });
    } catch (error) {
      // Chain not added, try to add it
      if (error.code === 4902 && chainConfig) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: `0x${chainId.toString(16)}`,
            chainName: chainConfig.name,
            nativeCurrency: {
              name: chainConfig.currencyName,
              symbol: chainConfig.currencySymbol,
              decimals: chainConfig.decimals || 18
            },
            rpcUrls: chainConfig.rpcUrls,
            blockExplorerUrls: chainConfig.blockExplorerUrls
          }]
        });
      } else {
        throw error;
      }
    }
  }

  /**
   * Get authentication message for signing
   * @returns {string} Message to sign
   */
  static getAuthMessage() {
    const timestamp = Date.now();
    return `Sign this message to authenticate with Terracare Messenger\n\nTimestamp: ${timestamp}`;
  }

  /**
   * Get wallet info
   * @returns {Object} Wallet information
   */
  getInfo() {
    return {
      address: this.address,
      chainId: this.chainId,
      isConnected: this.isConnected
    };
  }
}

module.exports = {
  Web3Wallet
};
