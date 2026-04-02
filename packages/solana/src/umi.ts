import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { keypairIdentity } from '@metaplex-foundation/umi';
import { mplCore } from '@metaplex-foundation/mpl-core';
import { mplAgentIdentity, mplAgentTools } from '@metaplex-foundation/mpl-agent-registry';
import { dasApi } from '@metaplex-foundation/digital-asset-standard-api';
import fs from 'fs';

export function createKinkoUmi(rpcEndpoint?: string, keypairPath?: string) {
  const endpoint = rpcEndpoint ?? process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';

  const umi = createUmi(endpoint)
    .use(mplCore())
    .use(mplAgentIdentity())
    .use(mplAgentTools())
    .use(dasApi());

  const kpPath = keypairPath ?? process.env.SOLANA_KEYPAIR_PATH ?? `${process.env.HOME}/.config/solana/id.json`;
  const secretKey = JSON.parse(fs.readFileSync(kpPath, 'utf-8'));
  const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(secretKey));
  umi.use(keypairIdentity(keypair));

  return umi;
}
