import { MessageKit, PublicKey, SecretKey } from '@nucypher/nucypher-core';
import { Ciphertext, DkgPublicKey, encrypt } from 'ferveo-wasm';

import { ConditionSet } from '../conditions';
import { Keyring } from '../keyring';
import { toBytes } from '../utils';

export class Enrico {
  public readonly encryptingKey: PublicKey | DkgPublicKey;
  private readonly keyring: Keyring;
  public conditions?: ConditionSet;

  constructor(
    encryptingKey: PublicKey | DkgPublicKey,
    verifyingKey?: SecretKey,
    conditions?: ConditionSet
  ) {
    this.encryptingKey = encryptingKey;
    this.keyring = new Keyring(verifyingKey ?? SecretKey.random());
    this.conditions = conditions;
  }

  public get verifyingKey(): PublicKey {
    return this.keyring.publicKey;
  }

  public encryptMessagePre(
    plaintext: Uint8Array | string,
    withConditions?: ConditionSet
  ): MessageKit {
    if (!withConditions) {
      withConditions = this.conditions;
    }

    if (!(this.encryptingKey instanceof PublicKey)) {
      throw new Error('Wrong key type. Use encryptMessageCbd instead.');
    }

    return new MessageKit(
      this.encryptingKey,
      plaintext instanceof Uint8Array ? plaintext : toBytes(plaintext),
      withConditions ? withConditions.toWASMConditions() : null
    );
  }

  public encryptMessageCbd(
    plaintext: Uint8Array | string,
    withConditions?: ConditionSet
  ): { ciphertext: Ciphertext; aad: Uint8Array } {
    if (!withConditions) {
      withConditions = this.conditions;
    }

    if (!(this.encryptingKey instanceof DkgPublicKey)) {
      throw new Error('Wrong key type. Use encryptMessagePre instead.');
    }

    const aad = toBytes(withConditions?.toJson() ?? '');
    const ciphertext = encrypt(
      plaintext instanceof Uint8Array ? plaintext : toBytes(plaintext),
      aad,
      this.encryptingKey
    );
    return { ciphertext, aad };
  }
}
