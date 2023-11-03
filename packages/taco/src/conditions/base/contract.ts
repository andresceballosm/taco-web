import { ethers } from 'ethers';
import { z } from 'zod';

import { ETH_ADDRESS_REGEXP } from '../const';

import { rpcConditionSchema } from './rpc';
import { ParamOrContextParamSchema, returnValueTestSchema } from './shared';

// TODO: Consider replacing with `z.unknown`:
//    Since Solidity types are tied to Solidity version, we may not be able to accurately represent them in Zod.
//    Alternatively, find a TS Solidity type lib.
const EthBaseTypes: [string, ...string[]] = [
  'bool',
  'string',
  'address',
  ...Array.from({ length: 32 }, (_v, i) => `bytes${i + 1}`), // bytes1 through bytes32
  'bytes',
  ...Array.from({ length: 32 }, (_v, i) => `uint${8 * (i + 1)}`), // uint8 through uint256
  ...Array.from({ length: 32 }, (_v, i) => `int${8 * (i + 1)}`), // int8 through int256
];

const functionAbiVariableSchema = z
  .object({
    name: z.string(),
    type: z.enum(EthBaseTypes),
    internalType: z.enum(EthBaseTypes), // TODO: Do we need to validate this?
  })
  .strict();

const functionAbiSchema = z
  .object({
    name: z.string(),
    type: z.literal('function'),
    inputs: z.array(functionAbiVariableSchema).min(0),
    outputs: z.array(functionAbiVariableSchema).nonempty(),
    stateMutability: z.union([z.literal('view'), z.literal('pure')]),
  })
  .strict()
  .refine(
    (functionAbi) => {
      let asInterface;
      try {
        // `stringify` here because ethers.utils.Interface doesn't accept a Zod schema
        asInterface = new ethers.utils.Interface(JSON.stringify([functionAbi]));
      } catch (e) {
        return false;
      }

      const functionsInAbi = Object.values(asInterface.functions || {});
      return functionsInAbi.length === 1;
    },
    {
      message: '"functionAbi" must contain a single function definition',
      path: ['functionAbi'],
    },
  )
  .refine(
    (functionAbi) => {
      const asInterface = new ethers.utils.Interface(
        JSON.stringify([functionAbi]),
      );
      const nrOfInputs = asInterface.fragments[0].inputs.length;
      return functionAbi.inputs.length === nrOfInputs;
    },
    {
      message: '"parameters" must have the same length as "functionAbi.inputs"',
      path: ['parameters'],
    },
  );

export type FunctionAbiProps = z.infer<typeof functionAbiSchema>;

export const ContractConditionType = 'contract';

export const contractConditionSchema = rpcConditionSchema
  .extend({
    conditionType: z
      .literal(ContractConditionType)
      .default(ContractConditionType),
    contractAddress: z.string().regex(ETH_ADDRESS_REGEXP).length(42),
    standardContractType: z.enum(['ERC20', 'ERC721']).optional(),
    method: z.string(),
    functionAbi: functionAbiSchema.optional(),
    parameters: z.array(ParamOrContextParamSchema),
    returnValueTest: returnValueTestSchema.extend({
      value: ParamOrContextParamSchema,
    }),
  })
  // Adding this custom logic causes the return type to be ZodEffects instead of ZodObject
  // https://github.com/colinhacks/zod/issues/2474
  .refine(
    // A check to see if either 'standardContractType' or 'functionAbi' is set
    (data) => Boolean(data.standardContractType) !== Boolean(data.functionAbi),
    {
      message:
        "At most one of the fields 'standardContractType' and 'functionAbi' must be defined",
      path: ['standardContractType'],
    },
  );

export type ContractConditionProps = z.infer<typeof contractConditionSchema>;
