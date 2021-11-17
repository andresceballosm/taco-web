import { ContractTransaction, ethers } from 'ethers';
import { hexlify } from 'ethers/lib/utils';

import {
  PolicyManager,
  PolicyManager__factory,
} from '../../types/ethers-contracts';
import { TransactingPower } from '../crypto/powers';
import { ChecksumAddress } from '../types';

import { CONTRACTS, DEFAULT_WAIT_N_CONFIRMATIONS } from './constants';

export class PolicyManagerAgent {
  public static async createPolicy(
    policyId: Uint8Array,
    transactingPower: TransactingPower,
    valueInWei: number,
    expirationTimestamp: number,
    nodeAddresses: Array<ChecksumAddress>,
    ownerAddress?: ChecksumAddress
  ): Promise<ContractTransaction> {
    const PolicyManager = await this.connect(transactingPower.signer);

    // TODO: Call fails due to "UNPREDICTABLE_GAS_LIMIT" error, hard-coding `gasLimit` for now
    // const estimatedGas = await PolicyManager.estimateGas.createPolicy(
    //   policyId,
    //   ownerAddress ?? transactingPower.account,
    //   expirationTimestamp,
    //   nodeAddresses
    // );
    const overrides = {
      // gasLimit: estimatedGas.toNumber(),
      gasLimit: 200_000,
      value: valueInWei,
    };
    const tx = await PolicyManager.createPolicy(
      hexlify(policyId),
      ownerAddress ?? (await transactingPower.signer.getAddress()),
      expirationTimestamp,
      nodeAddresses,
      overrides
    );
    await tx.wait(DEFAULT_WAIT_N_CONFIRMATIONS);
    return tx;
  }

  public static async revokePolicy(
    policyId: Uint8Array,
    transactingPower: TransactingPower
  ): Promise<ContractTransaction> {
    const PolicyManager = await this.connect(transactingPower.signer);
    const estimatedGas = await PolicyManager.estimateGas.revokePolicy(policyId);
    const overrides = {
      gasLimit: estimatedGas.toNumber(),
      // gasLimit: 200_000,
    };
    const tx = await PolicyManager.revokePolicy(hexlify(policyId), overrides);
    await tx.wait(DEFAULT_WAIT_N_CONFIRMATIONS);
    return tx;
  }

  private static async connect(
    signer: ethers.providers.JsonRpcSigner
  ): Promise<PolicyManager> {
    const network = await signer.provider.getNetwork();
    const contractAddress = CONTRACTS[network.name].POLICYMANAGER;
    return PolicyManager__factory.connect(contractAddress, signer);
  }
}
