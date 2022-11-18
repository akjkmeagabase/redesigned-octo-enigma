import { useEffect } from 'react'
import { isLoggedIn } from './magic.js'
import { useQuery } from 'react-query'
import { useRouter } from 'next/router'
import constants from './constants.js'

/**
 * User Hook
 *
 * @param {Object} options
 * @param {string} [options.redirectTo]
 * @param {boolean} [options.redirectIfFound]
 * @param {boolean} [options.enabled]
 * @returns
 */
export function useUser({ redirectTo, redirectIfFound, enabled } = {}) {
  const router = useRouter()
  const { status, data, error, isFetching, isLoading } = useQuery('magic-user', isLoggedIn, {
    staleTime: constants.MAGIC_TOKEN_LIFESPAN,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  })
  const user = data
  const hasUser = Boolean(user)

  useEffect(() => {
    if (!redirectTo || isLoading || isFetching) {
      return
    }
    if (
      // If redirectTo is set, redirect if the user was not found.
      (redirectTo && !redirectIfFound && !hasUser) ||
      // If redirectIfFound is also set, redirect if the user was found
      (redirectIfFound && hasUser)
    ) {
      router.push(redirectTo)
    }
  }, [redirectTo, redirectIfFound, status, isFetching, isLoading, hasUser, router, enabled])

  return { status, user, error, isFetching, isLoading }
}
