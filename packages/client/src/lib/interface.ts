import type { UnixFSEntry } from 'ipfs-car/unpack'
import type { CID } from 'multiformats'
export type { CID, UnixFSEntry }
import type { CarReader } from '@ipld/car/api'
import type { BlockDecoder } from 'multiformats/codecs/interface'

/**
 * Define nominal type of U based on type of T. Similar to Opaque types in Flow
 */
export type Tagged<T, Tag> = T & { tag?: Tag }


export interface Service {
  endpoint: URL
  token?: string
  wallet?: WalletAuthProvider
}

export interface PublicService {
  endpoint: URL
}

/**
 * CID in string representation.
 */
export type CIDString = Tagged<string, CID>

export interface API {
  /**
   * Stores files and returns a corresponding CID.
   */
  put(
    service: Service,
    files: Iterable<Filelike>,
    options?: PutOptions
  ): Promise<CIDString>

  /**
   * Uploads a CAR ([Content Addressed Archive](https://github.com/ipld/specs/blob/master/block-layer/content-addressable-archives.md)) file to web3.storage.
   */
  putCar(
    service: Service,
    car: CarReader,
    options?: PutCarOptions
  ): Promise<CIDString>

  /**
   * Get files for a root CID packed as a CAR file
   */
  get(service: Service, cid: CIDString): Promise<Web3Response | null>

  /**
   * Remove a users record of an upload. Does not make CID unavailable.
   */
  delete(service: Service, cid: CIDString): Promise<CIDString>

  /**
   * Get info on Filecoin deals and IPFS pins that a CID is replicated in.
   */
  status(service: Service, cid: CIDString): Promise<Status | undefined>

  /**
   * Find all uploads for this account. Use a `for await...of` loop to fetch them all.
   * @example
   * Fetch all the uploads
   * ```js
   * const uploads = []
   * for await (const item of client.list()) {
   *    uploads.push(item)
   * }
   * ```
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of}
   */
  list(service: Service, opts: {before?: string, maxResults?: number}):  AsyncIterable<Upload>
}

export interface Filelike {
  /**
   * Name of the file. May include path information.
   */
  name: string
  /**
   * Returns a ReadableStream which upon reading returns the data contained
   * within the File.
   */
  stream: () => ReadableStream
}

export type PutOptions = {
  /**
   * Callback called after the data has been assembled into a DAG, but before
   * any upload requests begin. It is passed the CID of the root node of the
   * graph.
   */
  onRootCidReady?: (cid: CIDString) => void
  /**
   * Callback called after each chunk of data has been uploaded. By default,
   * data is split into chunks of around 10MB. It is passed the actual chunk
   * size in bytes.
   */
  onStoredChunk?: (size: number) => void
  /**
   * Maximum times to retry a failed upload. Default: 5
   */
  maxRetries?: number
  /**
   * Should input files be wrapped with a directory? Default: true
   *
   * It is enabled by default as it preserves the input filenames in DAG;
   * the filenames become directory entries in the generated wrapping dir.
   *
   * The trade off is your root CID will be that of the wrapping dir,
   * rather than the input file itself.
   *
   * For a single file e.g. `cat.png` it's IPFS path would be
   * `<wrapping dir cid>/cat.png` rather than just `<cid for cat.png>`
   *
   * Wrapping with a directory is required when passing multiple files
   * that do not share the same root.
   */
  wrapWithDirectory?: boolean
  /**
   * Human readable name for this upload, for use in file listings.
   */
  name?: string
}

export type PutCarOptions = {
  /**
   * Human readable name for this upload, for use in file listings.
   */
   name?: string
  /**
   * Callback called after each chunk of data has been uploaded. By default,
   * data is split into chunks of around 10MB. It is passed the actual chunk
   * size in bytes.
   */
   onStoredChunk?: (size: number) => void
  /**
   * Maximum times to retry a failed upload. Default: 5
   */
   maxRetries?: number
   /**
    * Additional IPLD block decoders. Used to interpret the data in the CAR file
    * and split it into multiple chunks. Note these are only required if the CAR
    * file was not encoded using the default encoders: `dag-pb`, `dag-cbor` and
    * `raw`.
    */
   decoders?: BlockDecoder<any, any>[]
}

export interface Web3File extends File {
  /**
   * Content Identifier for the file data.
   */
  cid: CIDString
}

export interface Web3Response extends Response {
  unixFsIterator: () => AsyncIterable<UnixFSEntry>
  files: () => Promise<Array<Web3File>>
}

export interface Pin {
  /**
   * Libp2p peer ID of the node pinning the data.
   */
  peerId: string
  /**
   * Human readable name for the peer pinning the data.
   */
  peerName: string
  /**
   * Approximate geographical region of the node pinning the data.
   */
  region: string
  /**
   * Pinning status on this peer.
   */
  status: 'Pinned' | 'Pinning' | 'PinQueued'
  /**
   * Updated date in [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) format.
   */
  updated: string
}

export interface Deal {
  /**
   * On-chain ID of the deal.
   */
  dealId: number
  /**
   * Address of the provider storing this data.
   */
  storageProvider: string
  /**
   * Current deal status.
   */
  status: 'Queued' | 'Published' | 'Active'
  /**
   * Filecoin [Piece CID](https://spec.filecoin.io/systems/filecoin_files/piece/) of the data in the deal.
   */
  pieceCid: string
  /**
   * CID of the data aggregated in this deal.
   */
  dataCid: string
  /**
   * Selector for extracting stored data from the aggregated data root.
   */
  dataModelSelector: string
  /**
   * Date when the deal will become active in [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) format.
   */
  activation: string
  /**
   * Creation date in [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) format.
   */
  created: string
  /**
   * Updated date in [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) format.
   */
  updated: string
}

export interface Status {
  /**
   * Content Identifier for the data.
   */
  cid: CIDString
  /**
   * Total size of the DAG in bytes.
   */
  dagSize: number
  /**
   * Creation date in [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) format.
   */
  created: string
  /**
   * IPFS peers this data is being pinned on.
   */
  pins: Array<Pin>
  /**
   * Filecoin deals this data appears in.
   */
  deals: Array<Deal>
}

export interface Upload extends Status {
  name: string
}

/**
 * Blockchains currently supported for wallet-based authentication.
 */
export type SupportedBlockchain = 'solana'

/**
 * Types of key pair supported for wallet-based authentication.
 */
export type SupportedKeyType = 'ed25519'

/**
 * Chain-specific context information (e.g. recent block hash).
 */
export interface ChainContext {
  blockchain: SupportedBlockchain,
  timestamp: Date,
}

export type Permission = 'PUT' // in the future: 'DELETE' | 'TAG', etc
export type ResourceType = 'CID' // in the future: 'NAMESPACE', etc.
export type ResourceId = string

/**
 * Describes the permission scope of the request (e.g. what resource it is attempting to access and how).
 * The client must include this in the {@link WalletAuthenticationPayload} and sign it with a wallet key,
 * and it must match the endpoint and resource that are actually used. E.g. if the user puts CID 'bafy123...',
 * in their RequestScope but tries to upload CID 'bafy321...' instead, the request will fail.
 * 
 */
export interface RequestScope {
  permission: Permission
  resourceType: ResourceType
  resourceId: ResourceId
}

/**
 * Context information for the Solana blockchain.
 */
export interface SolanaChainContext extends ChainContext {
  blockchain: 'solana'
  recentBlockhash: string,
  network: 'mainnet' | 'devnet' | 'testnet'
}

/**
 * In-memory representation of the payload to be signed as part of wallet authentication.
 */
export interface WalletAuthenticationPayload {
  scope: RequestScope,

  /**
   * Public key encoded as a CID using the identity multihash codec.
   */
  publicKey: CID,

  /**
   * Chain-specific context information.
   */
  context: ChainContext,
}

/**
 * Tagged Uint8Array containing a serialized {@link WalletAuthenticationPayload}.
 */
export type EncodedWalletAuthenticationPayload = Tagged<Uint8Array, WalletAuthenticationPayload>

/**
 * Uint8Array containing the signature of a {@link WalletAuthenticationPayload}.
 */
export type WalletAuthenticationPayloadSignature = Uint8Array

/**
 * Callback function that is invoked during wallet-based authentication. Must return a signature
 * compatible with the {@link WalletAuthProvider.keyType}.
 */
export type MessageSigner = (payload: Uint8Array) => Promise<WalletAuthenticationPayloadSignature>

/**
 * Interface for providing wallet-based authentication for uploads.
 * 
 * Wallet authenticated uploads are specific to one CID, in contrast to API tokens which can be used
 * to upload anything.
 * 
 */
export interface WalletAuthProvider {
  /** String enum identifier for the blockchain the wallet belongs to. */
  blockchain: SupportedBlockchain

  /** 
   * String enum identifier for a specific deployment of the blockchain (e.g. "mainnet", "testnet", etc.) 
   * Values will be specific to each blockchain. 
   */
  network: string 

  /** String enum identifier for the type of key pair used by the wallet. */
  keyType: SupportedKeyType

  /** Raw bytes of public key. */
  publicKey: Uint8Array

  /**
   * Callback function that is invoked during wallet-based authentication. Must return a signature
   * compatible with {@link keyType}.
   */
  signMessage: MessageSigner

  /**
   * Callback function that is invoked during wallet-based authentication. Returns chain-specific context
   * information that is included in the signed auth payload.
   */
  getChainContext(): Promise<ChainContext>
}
