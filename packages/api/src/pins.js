import { JSONResponse, notFound } from './utils/json-response.js'
import { normalizeCid } from './utils/normalize-cid.js'
import { getPins, PIN_OK_STATUS, waitAndUpdateOkPins } from './utils/pin.js'
import {
  getEffectivePinStatus,
  psaStatusesToDBStatuses,
  ERROR_CODE,
  ERROR_STATUS,
  INVALID_CID,
  INVALID_MATCH,
  INVALID_META,
  INVALID_NAME,
  INVALID_ORIGINS,
  INVALID_REQUEST_ID,
  INVALID_REPLACE,
  INVALID_STATUS,
  INVALID_TIMESTAMP,
  INVALID_LIMIT,
  REQUIRED_CID,
  REQUIRED_REQUEST_ID,
  UNPERMITTED_MATCH
} from './utils/psa.js'

/**
 * @typedef {import('./utils/psa').apiPinStatus} apiPinStatus
 */

/**
 *
 * Service API Pin object definition
 * @typedef {Object} PsaPin
 * @property {string} cid
 * @property {string} [name]
 * @property {Array.<string>} [origins]
 * @property {object} [meta]
 */

/**
 *
 * Service API Pin Status definition
 * @typedef {Object} PsaPinStatusResponse
 * @property {string} requestId
 * @property {apiPinStatus} status
 * @property {string} created
 * @property {Array<string>} delegates
 * @property {string} [info]
 *
 * @property {PsaPin} pin
 */

/**
 * @typedef {{ error: { reason: string, details?: string } }} PinDataError
 */

const MATCH_OPTIONS = ['exact', 'iexact', 'partial', 'ipartial']
const STATUS_OPTIONS = ['queued', 'pinning', 'pinned', 'failed']

/**
 * @param {import('./user').AuthenticatedRequest} request
 * @param {import('./env').Env} env
 * @param {import('./index').Ctx} ctx
 * @return {Promise<JSONResponse>}
 */
export async function pinPost (request, env, ctx) {
  const pinData = await request.json()
  const { cid, name, origins, meta } = pinData
  let normalizedCid

  // Require cid
  if (!cid) {
    return new JSONResponse(
      { error: { reason: ERROR_STATUS, details: REQUIRED_CID } },
      { status: ERROR_CODE }
    )
  }

  // Validate cid
  try {
    normalizedCid = normalizeCid(cid)
  } catch (err) {
    return new JSONResponse(
      { error: { reason: ERROR_STATUS, details: INVALID_CID } },
      { status: ERROR_CODE }
    )
  }

  // Validate name
  if (name && typeof name !== 'string') {
    return new JSONResponse(
      { error: { reason: ERROR_STATUS, details: INVALID_NAME } },
      { status: ERROR_CODE }
    )
  }

  // Validate origins
  if (origins && !Array.isArray(origins)) {
    return new JSONResponse(
      { error: { reason: ERROR_STATUS, details: INVALID_ORIGINS } },
      { status: ERROR_CODE }
    )
  }

  // Validate meta
  if (meta) {
    if (typeof meta !== 'object' || Array.isArray(meta) || Object.entries(meta).some(([, v]) => typeof v !== 'string')) {
      return new JSONResponse(
        { error: { reason: ERROR_STATUS, details: INVALID_META } },
        { status: ERROR_CODE }
      )
    }
  }

  const { authToken } = request.auth
  const requestId = request.params ? request.params.requestId : null

  if (requestId) {
    if (typeof requestId !== 'string') {
      return new JSONResponse(
        { error: { reason: ERROR_STATUS, details: INVALID_REQUEST_ID } },
        { status: ERROR_CODE }
      )
    }

    return replacePin(pinData, requestId, authToken._id, env, ctx)
  }

  return createPin(normalizedCid, pinData, authToken._id, env, ctx)
}

/**
 * @param {string} normalizedCid
 * @param {Object} pinData
 * @param {string} authTokenId
 * @param {import('./env').Env} env
 * @param {import('./index').Ctx} ctx
 * @return {Promise<JSONResponse>}
 */
async function createPin (normalizedCid, pinData, authTokenId, env, ctx) {
  const { cid, origins } = pinData

  // deal with empty strings
  const pinName = pinData.name || undefined
  const pinMeta = pinData.meta || undefined

  await env.cluster.pin(cid, {
    name: pinName,
    origins
  })
  const pins = await getPins(cid, env.cluster)

  const pinRequestData = {
    sourceCid: cid,
    contentCid: normalizedCid,
    authKey: authTokenId,
    meta: pinMeta,
    name: pinName,
    origins,
    pins
  }

  const pinRequest = await env.db.createPsaPinRequest(pinRequestData)

  /** @type {PsaPinStatusResponse} */
  const pinStatus = getPinStatus(pinRequest)

  /** @type {(() => Promise<any>)[]} */
  const tasks = []

  if (!pins.some(p => PIN_OK_STATUS.includes(p.status))) {
    tasks.push(
      waitAndUpdateOkPins.bind(
        null,
        normalizeCid,
        env.cluster,
        env.db)
    )
  }

  if (ctx.waitUntil) {
    tasks.forEach(t => ctx.waitUntil(t()))
  }

  return new JSONResponse(pinStatus)
}

/**
 * @param {import('./user').AuthenticatedRequest} request
 * @param {import('./env').Env} env
 * @param {import('./index').Ctx} ctx
 */
export async function pinGet (request, env, ctx) {
  if (typeof request.params.requestId !== 'string') {
    return new JSONResponse(
      { error: { reason: ERROR_STATUS, details: INVALID_REQUEST_ID } },
      { status: ERROR_CODE }
    )
  }

  const { authToken } = request.auth

  /** @type { import('../../db/db-client-types.js').PsaPinRequestUpsertOutput } */
  let pinRequest

  try {
    pinRequest = await env.db.getPsaPinRequest(authToken._id, request.params.requestId)
  } catch (e) {
    console.error(e)
    // TODO catch different exceptions
    // TODO notFound error paylod does not strictly comply to spec.
    return notFound()
  }

  /** @type { PsaPinStatusResponse } */
  const pin = getPinStatus(pinRequest)
  return new JSONResponse(pin)
}

/**
 * List all the pins matching optional filters.
 * When no filter is specified, only successful pins are returned.
 *
 * @param {import('./user').AuthenticatedRequest} request
 * @param {import('./env').Env} env
 * @param {import('./index').Ctx} ctx
 */
export async function pinsGet (request, env, ctx) {
  const url = new URL(request.url)
  const urlParams = new URLSearchParams(url.search)
  const params = Object.fromEntries(urlParams)

  const result = parseSearchParams(params)
  if (result.error) {
    return new JSONResponse(result.error, { status: 400 })
  }

  let pinRequests
  const opts = result.data

  try {
    pinRequests = await env.db.listPsaPinRequests(request.auth.authToken._id, opts)
  } catch (e) {
    console.error(e)
    return notFound()
  }

  const pins = pinRequests.results.map((pinRequest) => getPinStatus(pinRequest))

  return new JSONResponse({
    count: pinRequests.count,
    results: pins
  })
}

/**
 * Parse the list options
 *
 * @param {*} params
 * @returns
 */
function parseSearchParams (params) {
  const opts = {}
  const {
    cid,
    name,
    match,
    status,
    before,
    after,
    limit,
    meta
  } = params

  if (cid) {
    const cids = []
    try {
      cid.split(',').forEach((c) => {
        normalizeCid(c)
        cids.push(c)
      })
    } catch (err) {
      return {
        error: { reason: ERROR_STATUS, details: INVALID_CID },
        data: undefined
      }
    }
    opts.cid = cids
  }

  if (name) {
    if (typeof name !== 'string') {
      return {
        error: { reason: ERROR_STATUS, details: INVALID_NAME },
        data: undefined
      }
    }
    opts.name = name
  }

  if (match) {
    if (typeof match !== 'string') {
      if (!MATCH_OPTIONS.includes(match)) {
        return {
          error: { reason: ERROR_STATUS, details: UNPERMITTED_MATCH },
          data: undefined
        }
      }

      return {
        error: { reason: ERROR_STATUS, details: INVALID_MATCH },
        data: undefined
      }
    }
    opts.match = match
  }

  if (status) {
    const statuses = status.split(',')
    const isValidStatus = statuses.every(v => STATUS_OPTIONS.includes(v))

    if (!isValidStatus) {
      return {
        error: { reason: ERROR_STATUS, details: INVALID_STATUS },
        data: undefined
      }
    }
    opts.statuses = psaStatusesToDBStatuses(statuses)
  }

  if (before) {
    if (typeof before !== 'string' || !Date.parse(before)) {
      return {
        error: { reason: ERROR_STATUS, details: INVALID_TIMESTAMP },
        data: undefined
      }
    }
    opts.before = before
  }

  if (after) {
    if (typeof after !== 'string' || !Date.parse(after)) {
      return {
        error: { reason: ERROR_STATUS, details: INVALID_TIMESTAMP },
        data: undefined
      }
    }
    opts.after = after
  }

  if (limit) {
    if (!(/^\d+$/.test(limit))) {
      return {
        error: { reason: ERROR_STATUS, details: INVALID_LIMIT },
        data: undefined
      }
    }
    opts.limit = limit
  }

  if (meta) {
    if (!JSON.parse(meta) || Array.isArray(meta) || Object.entries(meta).some(([, v]) => typeof v !== 'string')) {
      return new JSONResponse(
        { error: { reason: ERROR_STATUS, details: INVALID_META } },
        { status: ERROR_CODE }
      )
    }
    opts.meta = meta
  }

  return { error: undefined, data: opts }
}

/**
 * Transform a PinRequest into a PinStatus
 *
 * @param { Object } pinRequest
 * @returns { PsaPinStatusResponse }
 */
function getPinStatus (pinRequest) {
  return {
    requestId: pinRequest._id.toString(),
    status: getEffectivePinStatus(pinRequest.pins),
    created: pinRequest.created,
    pin: {
      cid: pinRequest.sourceCid,
      ...pinRequest
    },
    // TODO(https://github.com/web3-storage/web3.storage/issues/792)
    delegates: []
  }
}

/**
 * @param {import('./user').AuthenticatedRequest} request
 * @param {import('./env').Env} env
 * @param {import('./index').Ctx} ctx
 */
export async function pinDelete (request, env, ctx) {
  const requestId = request.params.requestId
  // Don't delete pin requests that don't belong to the user
  const { authToken } = request.auth

  if (!requestId) {
    return new JSONResponse(
      { error: { reason: ERROR_STATUS, details: REQUIRED_REQUEST_ID } },
      { status: ERROR_CODE }
    )
  }

  if (typeof requestId !== 'string') {
    return new JSONResponse(
      { error: { reason: ERROR_STATUS, details: INVALID_REQUEST_ID } },
      { status: ERROR_CODE }
    )
  }

  try {
    // Update deleted_at (and updated_at) timestamp for the pin request.
    await env.db.deletePsaPinRequest(requestId, authToken._id)
  } catch (e) {
    console.error(e)
    // TODO catch different exceptions
    // TODO notFound error paylod does not strictly comply to spec.
    return notFound()
  }

  return new JSONResponse({}, { status: 202 })
}

/**
 * @param {Object} newPinData
 * @param {string} requestId
 * @param {string} authTokenId
 * @param {import('./env').Env} env
 * @param {import('./index').Ctx} ctx
 */
async function replacePin (newPinData, requestId, authTokenId, env, ctx) {
  let existingPinRequest
  try {
    existingPinRequest = await env.db.getPsaPinRequest(authTokenId, requestId)
  } catch (e) {
    return notFound()
  }

  const existingCid = existingPinRequest.sourceCid
  if (newPinData.cid === existingCid) {
    return new JSONResponse(
      { error: { reason: ERROR_STATUS, details: INVALID_REPLACE } },
      { status: ERROR_CODE }
    )
  }

  let pinStatus
  try {
    pinStatus = await createPin(existingPinRequest.contentCid, newPinData, authTokenId, env, ctx)
  } catch (e) {
    return new JSONResponse(
      { error: { reason: `DB Error: ${e}` } },
      { status: 501 }
    )
  }

  try {
    await env.db.deletePsaPinRequest(requestId, authTokenId)
  } catch (e) {
    return new JSONResponse(
      { error: { reason: `DB Error: ${e}` } },
      { status: 501 }
    )
  }

  return pinStatus
}
