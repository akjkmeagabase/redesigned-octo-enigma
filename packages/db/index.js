import { gql } from 'graphql-request'

import { FaunaClient } from './fauna/client.js'
import { PostgresClient } from './postgres/client.js'

const ENDPOINT = 'https://graphql.fauna.com/graphql'

// TODO: Deprecate with fauna
export { gql }

export class DBClient {
  constructor ({ endpoint = ENDPOINT, token, postgres = false }) {
    if (postgres) {
      this._client = new PostgresClient({ endpoint, token })
      this._isPostgres = true
    } else {
      this._client = new FaunaClient({ endpoint, token })
    }
  }

  /**
   * Upsert user.
   *
   * @param {import('./db-client-types').UpsertUserInput} user
   * @return {import('./db-client-types').UpsertUserOutput}
   */
  upsertUser (user) {
    return this._client.upsertUser(user)
  }

  /**
   * Get user by its issuer.
   *
   * @param {string} issuer
   * @return {Promise<import('./db-client-types').UserOutput>}
   */
  getUser (issuer) {
    return this._client.getUser(issuer)
  }

  /**
   * Get used storage in bytes.
   *
   * @param {number} userId
   * @returns {Promise<number>}
   */
  getUsedStorage (userId) {
    return this._client.getUsedStorage(userId)
  }

  /**
   * Create upload with content and pins.
   *
   * @param {import('./db-client-types').CreateUploadInput} data
   * @returns {Promise<import('./db-client-types').CreateUploadOutput>}
   */
  createUpload (data) {
    return this._client.createUpload(data)
  }

  /**
   * Get upload with user, auth_keys, content and pins.
   *
   * @param {string} cid
   * @param {number} userId
   * @returns {Promise<import('./db-client-types').UploadItemOutput>}
   */
  getUpload (cid, userId) {
    return this._client.getUpload(cid, userId)
  }

  /**
   * List uploads of a given user.
   *
   * @param {number} userId
   * @param {import('./db-client-types').ListUploadsOptions} [opts]
   * @returns {Promise<Array<import('./db-client-types').UploadItemOutput>>}
   */
  listUploads (userId, opts = {}) {
    return this._client.listUploads(userId, opts)
  }

  /**
   * Rename an upload.
   *
   * @param {number} userId
   * @param {string} cid
   * @param {string} name
   */
  renameUpload (userId, cid, name) {
    return this._client.renameUpload(userId, cid, name)
  }

  /**
   * Delete a user upload.
   *
   * @param {number} userId
   * @param {string} cid
   */
  deleteUpload (userId, cid) {
    return this._client.deleteUpload(userId, cid)
  }

  /**
   * Get content status of a given cid.
   *
   * @param {string} cid
   * @returns {Promise<import('./db-client-types').ContentItemOutput>}
   */
  getStatus (cid) {
    return this._client.getStatus(cid)
  }

  /**
   * Get backups for a given upload.
   *
   * @param {number} uploadId
   * @return {Promise<Array<import('./db-client-types').BackupOutput>>}
   */
  getBackups (uploadId) {
    return this._client.getBackups(uploadId)
  }

  /**
   * Upsert pin.
   *
   * @param {string} cid
   * @param {import('./db-client-types').PinItemOutput} pin
   * @return {Promise<number>}
   */
  upsertPin (cid, pin) {
    return this._client.upsertPin(cid, pin)
  }

  /**
   * Upsert given pin status.
   *
   * @param {Array<import('./db-client-types').PinsUpsertInput>} pins
   */
  upsertPins (pins) {
    return this._client.upsertPins(pins)
  }

  /**
   * Get Pins for a cid
   *
   * @param {string} cid
   * @return {Promise<Array<import('./db-client-types').PinItemOutput>>}
   */
  getPins (cid) {
    return this._client.getPins(cid)
  }

  /**
   * Get All Pin requests.
   *
   * @param {Object} [options]
   * @param {number} [options.size = 600]
   * @return {Promise<Array<import('../db-client-types').PinRequestItemOutput>>}
   */
  getPinRequests () {
    return this._client.getPinRequests()
  }

  /**
   * Delete pin requests with provided ids.
   *
   * @param {Array<number>} ids
   * @return {Promise<void>}
   */
  deletePinRequests (ids) {
    return this._client.deletePinRequests(ids)
  }

  /**
   * Create pin sync requests.
   *
   * @param {Array<number>} pinSyncRequests
   */
  createPinSyncRequests (pinSyncRequests) {
    return this._client.createPinSyncRequests(pinSyncRequests)
  }

  /**
   * Get All Pin Sync requests.
   *
   * @param {Object} [options]
   * @param {string} [options.to]
   * @param {string} [options.afer]
   * @return {Promise<Array<import('../db-client-types').PinSyncRequestOutput>>}
   */
  getPinSyncRequests (options) {
    return this._client.getPinSyncRequests(options)
  }

  /**
   * Delete pin sync requests with provided ids.
   *
   * @param {Array<number>} ids
   * @return {Promise<void>}
   */
  deletePinSyncRequests (ids) {
    return this._client.deletePinSyncRequests(ids)
  }

  /**
   * Get deals for a cid
   *
   * @param {string} cid
   * @return {Promise<import('./db-client-types').Deal[]>}
   */
  getDeals (cid) {
    return this._client.getDeals(cid)
  }

  /**
   * Get deals for multiple cids
   *
   * @param {string[]} cids
   * @return {Promise<Record<string, import('./db-client-types').Deal[]>>}
   */
  getDealsForCids (cids = []) {
    return this._client.getDealsForCids(cids)
  }

  /**
   * Create a new auth key.
   *
   * @param {import('./db-client-types').CreateAuthKeyInput} key
   * @return {Promise<import('./db-client-types').CreateAuthKeyOutput>}
   */
  createKey ({ name, secret, user }) {
    return this._client.createKey({ name, secret, user })
  }

  /**
   * Get key with issuer and secret.
   *
   * @param {string} issuer
   * @param {string} secret
   * @return {Promise<import('./db-client-types').AuthKey>}
   */
  getKey (issuer, secret) {
    return this._client.getKey(issuer, secret)
  }

  /**
   * List auth keys of a given user.
   *
   * @param {number} userId
   * @return {Promise<Array<import('./db-client-types').AuthKeyItemOutput>>}
   */
  listKeys (userId) {
    return this._client.listKeys(userId)
  }

  /**
   * Delete auth key with given id.
   *
   * @param {number} userId
   * @param {number} keyId
   */
  deleteKey (userId, keyId) {
    return this._client.deleteKey(userId, keyId)
  }

  /**
   * Get metrics for a given key.
   *
   * @param {string} key
   */
  getMetricsValue (key) {
    return this._client.getMetricsValue(key)
  }

  /**
   * @template T
   * @template V
   * @param {import('graphql-request').RequestDocument} document
   * @param {V} variables
   * @returns {Promise<T>}
   */
  query (document, variables) {
    if (this._isPostgres) {
      throw new Error('query is only compatible with fauna')
    }
    return this._client.query(document, variables)
  }
}
