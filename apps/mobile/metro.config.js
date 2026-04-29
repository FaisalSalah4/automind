const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')
const path = require('path')

const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, '../..')
const mobileNodeModules = path.resolve(projectRoot, 'node_modules')

const config = getDefaultConfig(projectRoot)

config.watchFolders = [monorepoRoot]
config.resolver.nodeModulesPaths = [
  mobileNodeModules,
  path.resolve(monorepoRoot, 'node_modules'),
]

// Force React 19 (mobile's local copy) instead of hoisted React 18 from web app
const reactPackages = new Set([
  'react',
  'react-dom',
  'react-native-renderer',
  'scheduler',
])

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const base = moduleName.split('/')[0]
  if (reactPackages.has(base) || reactPackages.has(moduleName)) {
    try {
      const resolved = require.resolve(moduleName, { paths: [mobileNodeModules] })
      return { filePath: resolved, type: 'sourceFile' }
    } catch (_) {
      // fall through to default resolution
    }
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = withNativeWind(config, { input: './global.css' })
