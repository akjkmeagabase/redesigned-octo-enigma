const nextConfig = {
  trailingSlash: true,
  reactStrictMode: true,
  eslint: {
    // Warning: Dangerously allow production builds to successfully complete even if
    // your project has ESLint errors.
    // TODO: Remove me when all the ts errors are figured out.
    ignoreDuringBuilds: true,
  },
  // typescript: {
  //   ignoreBuildErrors: true,
  // },
  webpack: function(config) {

    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    })

    return config
  },
  exportPathMap: async function () {
    return {
      '/ipfs-404.html': { page: '/404' },
    }
  },
}

const withTM = require('next-transpile-modules')([
  'react-children-utilities', 
  'rehype-slug',
  'character-entities-html4',
  'hast-util-has-property',
  'hast-util-heading-rank',
  'hast-util-is-element',
  'hast-util-to-string',
  'hast-util-to-html',
  'hast-util-whitespace',
  'stringify-entities'
])
module.exports = withTM(nextConfig)
