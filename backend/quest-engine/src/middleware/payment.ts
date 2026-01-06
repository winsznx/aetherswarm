import { Request, Response, NextFunction } from 'express';
import { ethers } from 'ethers';

interface PaymentConfig {
  facilitatorURL: string;
  payTo: string | undefined;
  asset: string;
  network: string;
  scheme: string;
}

interface PaymentProof {
  signature: string;
  payer: string;
  payTo: string;
  amount: string;
  nonce: string;
}

// In-memory payment tracking (use Redis in production)
const processedPayments = new Set<string>();

/**
 * Verify EIP-712 payment signature
 */
async function verifyPaymentSignature(proof: PaymentProof, chainId: number = 137): Promise<boolean> {
  try {
    // Reconstruct EIP-712 typed data
    const domain = {
      name: 'x402',
      version: '1',
      chainId,
      verifyingContract: proof.payTo
    };

    const types = {
      Payment: [
        { name: 'payTo', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'nonce', type: 'uint256' }
      ]
    };

    const message = {
      payTo: proof.payTo,
      amount: proof.amount,
      nonce: proof.nonce
    };

    // Recover signer from signature
    const recoveredAddress = ethers.verifyTypedData(domain, types, message, proof.signature);

    // Verify signer matches payer
    const isValid = recoveredAddress.toLowerCase() === proof.payer.toLowerCase();

    if (isValid) {
      console.log(`✅ [x402] Payment verified: ${proof.payer} → ${proof.payTo} (${ethers.formatUnits(proof.amount, 6)} USDC)`);
    } else {
      console.log(`❌ [x402] Invalid signature: expected ${proof.payer}, got ${recoveredAddress}`);
    }

    return isValid;
  } catch (error) {
    console.error('[x402] Signature verification failed:', error);
    return false;
  }
}

/**
 * x402 Payment Middleware
 * Implements HTTP 402 Payment Required flow with EIP-712 verification
 */
export const paymentMiddleware = (config: PaymentConfig) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Check for payment proof header
    const paymentHeader = req.headers['x-payment'] || req.headers['authorization'];

    if (!paymentHeader) {
      // Return 402 Payment Required with payment requirements
      console.log(`[x402] Payment required for ${req.path}`);
      res.status(402).json({
        maxAmountRequired: '0.01', // 0.01 USDC
        payTo: config.payTo,
        asset: config.asset,
        network: config.network,
        scheme: config.scheme,
        facilitatorURL: config.facilitatorURL,
        chainId: 137 // Polygon
      });
      return;
    }

    try {
      // Parse payment proof
      const proof: PaymentProof = typeof paymentHeader === 'string'
        ? JSON.parse(paymentHeader)
        : paymentHeader;

      // Check for replay attacks (nonce reuse)
      const paymentId = `${proof.payer}-${proof.nonce}`;
      if (processedPayments.has(paymentId)) {
        console.log(`❌ [x402] Replay attack detected: ${paymentId}`);
        res.status(403).json({ error: 'Payment already processed (replay attack)' });
        return;
      }

      // Verify signature
      const isValid = await verifyPaymentSignature(proof);
      if (!isValid) {
        res.status(403).json({ error: 'Invalid payment signature' });
        return;
      }

      // Verify amount
      const requiredAmount = ethers.parseUnits('0.01', 6); // 0.01 USDC (6 decimals)
      const paidAmount = BigInt(proof.amount);
      if (paidAmount < requiredAmount) {
        console.log(`❌ [x402] Insufficient payment: ${ethers.formatUnits(paidAmount, 6)} < 0.01 USDC`);
        res.status(403).json({ error: 'Insufficient payment amount' });
        return;
      }

      // Mark payment as processed
      processedPayments.add(paymentId);

      // Attach payment info to request for logging
      (req as any).x402Payment = {
        payer: proof.payer,
        amount: ethers.formatUnits(proof.amount, 6),
        asset: config.asset,
        timestamp: Date.now()
      };

      console.log(`✅ [x402] Payment accepted: ${proof.payer} paid ${ethers.formatUnits(proof.amount, 6)} USDC`);

      // Payment verified, proceed to route
      next();
    } catch (error) {
      console.error('[x402] Payment verification error:', error);
      res.status(400).json({ error: 'Invalid payment format' });
    }
  };
};

/**
 * Get payment statistics (for admin/monitoring)
 */
export function getPaymentStats() {
  return {
    totalPayments: processedPayments.size,
    processedNonces: Array.from(processedPayments)
  };
}
