/* global Response caches */

import { gql } from '@web3-storage/db'
import { METRICS_CACHE_MAX_AGE } from './constants.js'

/**
 * Retrieve metrics in prometheus exposition format.
 * https://prometheus.io/docs/instrumenting/exposition_formats/
 * @returns {Promise<string>}
 */
export async function metricsGet (request, env, ctx) {
  const cache = caches.default
  let res = await cache.match(request)

  if (res) {
    return res
  }

  const { findMetrics } = await env.db.query(gql`
    query findMetrics {
      findMetrics {
        usersTotal,
        uploadsTotal,
        contentTotalBytes,
        pinsTotal,
        pinsTotalBytes,
        pinsQueuedTotal,
        pinsPinningTotal,
        pinsPinnedTotal,
        pinsFailedTotal
      }
    }
    `)

  const metrics = [
    '# HELP web3storage_users_total Total users registered.',
    '# TYPE web3storage_users_total counter',
    `web3storage_users_total ${findMetrics.usersTotal}`,

    '# HELP web3storage_uploads_total Total number of user uploads.',
    '# TYPE web3storage_uploads_total counter',
    `web3storage_uploads_total ${findMetrics.uploadsTotal}`,

    '# HELP web3storage_content_bytes_total Total bytes of all unique DAGs stored.',
    '# TYPE web3storage_content_bytes_total counter',
    `web3storage_content_bytes_total ${findMetrics.contentTotalBytes}`,

    '# HELP web3storage_pins_total Total number of pins on the IPFS Cluster',
    '# TYPE web3storage_pins_total counter',
    `web3storage_pins_total ${findMetrics.pinsTotal}`,

    '# HELP web3storage_pins_bytes_total Total size in bytes of pins on the IPFS Cluster',
    '# TYPE web3storage_pins_bytes_total counter',
    `web3storage_pins_bytes_total ${findMetrics.pinsTotalBytes}`,

    '# HELP web3storage_pins_status_queued_total Total number of pins that are queued.',
    '# TYPE web3storage_pins_status_queued_total counter',
    `web3storage_pins_status_queued_total ${findMetrics.pinsQueuedTotal}`,

    '# HELP web3storage_pins_status_pinning_total Total number of pins that are pinning.',
    '# TYPE web3storage_pins_status_pinning_total counter',
    `web3storage_pins_status_pinning_total ${findMetrics.pinsPinningTotal}`,

    '# HELP web3storage_pins_status_pinned_total Total number of pins that are pinned.',
    '# TYPE web3storage_pins_status_pinned_total counter',
    `web3storage_pins_status_pinned_total ${findMetrics.pinsPinnedTotal}`,

    '# HELP web3storage_pins_status_failed_total Total number of pins that are failed.',
    '# TYPE web3storage_pins_status_failed_total counter',
    `web3storage_pins_status_failed_total ${findMetrics.pinsFailedTotal}`
  ].join('\n')

  res = new Response(metrics, {
    headers: {
      // cache metrics response
      'Cache-Control': `public, max-age=${METRICS_CACHE_MAX_AGE}`
    }
  })

  ctx.waitUntil(cache.put(request, res.clone()))

  return res
}
