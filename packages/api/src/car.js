/* eslint-env serviceworker */
import { gql } from '@web3-storage/db'
import { CarReader } from '@ipld/car'
import { Block } from 'multiformats/block'
import * as raw from 'multiformats/codecs/raw'
import * as cbor from '@ipld/dag-cbor'
import * as pb from '@ipld/dag-pb'
import { GATEWAY, LOCAL_ADD_THRESHOLD, DAG_SIZE_CALC_LIMIT, MAX_BLOCK_SIZE } from './constants.js'
import { JSONResponse } from './utils/json-response.js'
import { toPinStatusEnum } from './utils/pin.js'

const CREATE_UPLOAD = gql`
  mutation CreateUpload($data: CreateUploadInput!) {
    createUpload(data: $data) {
      content {
        _id
        dagSize
      }
    }
  }
`

const UPDATE_DAG_SIZE = gql`
  mutation UpdateContentDagSize($content: ID!, $dagSize: Long!) {
    updateContentDagSize(content: $content, dagSize: $dagSize) {
      _id
    }
  }
`

// Duration between status check polls in ms.
const PIN_STATUS_CHECK_INTERVAL = 50
// Max time in ms to spend polling for an OK status.
const MAX_PIN_STATUS_CHECK_TIME = 5000
// Pin statuses considered OK.
const PIN_OK_STATUS = ['Pinned', 'Pinning', 'PinQueued']

// TODO: ipfs should let us ask the size of a CAR file.
// This consumes the CAR response from ipfs to find the content-length.
export async function carHead (request, env, ctx) {
  // cache the thing. can't cache a HEAD request, so make a new one.
  const get = new Request(request.url, { method: 'GET' })
  // add the router params
  get.params = request.params
  const res = await carGet(get, env, ctx)
  const size = await sizeOf(res)
  const headers = new Headers(res.headers)
  headers.set('Content-Length', size)
  // skip the body, it's a HEAD.
  return new Response(null, { headers })
}

export async function carGet (request, env, ctx) {
  const cache = caches.default
  let res = await cache.match(request)

  if (res) {
    return res
  }

  const {
    params: { cid }
  } = request
  // gateway does not support `carversion` yet.
  // using it now means we can skip the cache if it is supported in the future
  const url = new URL(`/api/v0/dag/export?arg=${cid}&carversion=1`, GATEWAY)
  res = await fetch(url, { method: 'POST' })
  if (!res.ok) {
    // bail early. dont cache errors.
    return res
  }
  // Clone the response so that it's no longer immutable. Ditch the original headers.
  // Note: keeping the original headers seems to prevent the carHead function from setting Content-Length
  res = new Response(res.body)
  res.headers.set('Content-Type', 'application/car')
  // cache for 1 year, the max max-age value.
  res.headers.set('Cache-Control', 'public, max-age=31536000')
  // without the content-disposition, firefox describes them as DMS files.
  res.headers.set('Content-Disposition', `attachment; filename="${cid}.car"`)
  // always https pls.
  res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload"')
  // // compress if asked for? is it worth it?
  // if (request.headers.get('Accept-Encoding').match('gzip')) {
  //   headers['Content-Encoding'] = 'gzip'
  // }
  ctx.waitUntil(cache.put(request, res.clone()))
  return res
}

/**
 * Post a CAR file.
 *
 * @param {import('./user').AuthenticatedRequest} request
 * @param {import('./env').Env} env
 * @param {import('./index').Ctx} ctx
 */
export async function carPost (request, env, ctx) {
  const { user, authToken } = request.auth
  const { headers } = request

  let name = headers.get('x-name')
  if (!name || typeof name !== 'string') {
    name = `Upload at ${new Date().toISOString()}`
  }

  const blob = await request.blob()
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const reader = await CarReader.fromBytes(bytes)
  const chunkSize = await getBlocksSize(reader)

  // Ensure car blob.type is set; it is used by the cluster client to set the foramt=car flag on the /add call.
  const content = blob.slice(0, blob.size, 'application/car')

  const { cid } = await env.cluster.add(content, {
    metadata: { size: content.size.toString() },
    // When >2.5MB, use local add, because waiting for blocks to be sent to
    // other cluster nodes can take a long time. Replication to other nodes
    // will be done async by bitswap instead.
    local: blob.size > LOCAL_ADD_THRESHOLD
  })

  /** @type {ReturnType<toPins>} */
  let pins
  // Retrieve current pin status and info about the nodes pinning the content.
  // Keep querying Cluster until one of the nodes reports something other than
  // Unpinned i.e. PinQueued or Pinning or Pinned.
  const start = Date.now()
  while (true) {
    const { peerMap } = await env.cluster.status(cid)

    pins = toPins(peerMap)
    if (!pins.length) { // should not happen
      throw new Error('not pinning on any node')
    }

    const isOk = pins.some(p => PIN_OK_STATUS.includes(p.status))
    if (isOk) break

    // If it has been more than 5 seconds, take whatever status is going.
    if (Date.now() - start > MAX_PIN_STATUS_CHECK_TIME) break
    await new Promise(resolve => setTimeout(resolve, PIN_STATUS_CHECK_INTERVAL))
  }

  // Store in DB
  const { createUpload: upload } = await env.db.query(CREATE_UPLOAD, {
    data: {
      user: user._id,
      authToken: authToken?._id,
      cid,
      name,
      type: 'Car',
      chunkSize,
      pins
    }
  })

  // Partial CARs are chunked at ~10MB so anything less than this is probably complete.
  if (ctx.waitUntil && upload.content.dagSize == null && blob.size < DAG_SIZE_CALC_LIMIT) {
    ctx.waitUntil((async () => {
      let dagSize
      try {
        dagSize = await getDagSize(reader)
      } catch (err) {
        console.error(`could not determine DAG size: ${err.stack}`)
        return
      }
      await env.db.query(UPDATE_DAG_SIZE, { content: upload.content._id, dagSize })
    })())
  }

  return new JSONResponse({ cid })
}

export async function carPut (request, env, ctx) {
  return new Response(`${request.method} /car no can has`, { status: 501 })
}

export async function sizeOf (response) {
  const reader = response.body.getReader()
  let size = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    // this should be ok up to about 9 Petabytes.
    // Number.MAX_SAFE_INTEGER = 9,007,199,254,740,991
    size += value.byteLength
  }
  return size
}

/**
 * Returns the sum of all block sizes in the received Car.
 * @param {CarReader} reader
 */
async function getBlocksSize (reader) {
  let size = 0
  for await (const block of reader.blocks()) {
    const blockSize = block.bytes.byteLength
    if (blockSize > MAX_BLOCK_SIZE) {
      throw new Error(`block too big: ${blockSize} > ${MAX_BLOCK_SIZE}`)
    }
    size += blockSize
  }
  return size
}

/**
 * Returns the DAG size of the CAR but only if the graph is complete.
 * @param {CarReader} reader
 */
async function getDagSize (reader) {
  const decoders = [pb, raw, cbor]
  const [rootCid] = await reader.getRoots()

  const getBlock = async cid => {
    const rawBlock = await reader.get(cid)
    if (!rawBlock) throw new Error(`missing block for ${cid}`)
    const { bytes } = rawBlock
    const decoder = decoders.find(d => d.code === cid.code)
    if (!decoder) throw new Error(`missing decoder for ${cid.code}`)
    return new Block({ cid, bytes, value: decoder.decode(bytes) })
  }

  const getSize = async cid => {
    const block = await getBlock(cid)
    let size = block.bytes.byteLength
    for (const [, cid] of block.links()) {
      size += await getSize(cid)
    }
    return size
  }

  return getSize(rootCid)
}

/**
 * @param {import('@nftstorage/ipfs-cluster').StatusResponse['peerMap']} peerMap
 */
function toPins (peerMap) {
  return Object.entries(peerMap).map(([peerId, { peerName, status }]) => ({
    status: toPinStatusEnum(status),
    location: { peerId, peerName }
  }))
}
