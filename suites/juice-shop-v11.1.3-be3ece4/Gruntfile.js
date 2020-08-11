/*
 * Copyright (c) 2014-2020 Bjoern Kimminich.
 * SPDX-License-Identifier: MIT
 */

'use strict'

module.exports = function (grunt) {
  var node = grunt.option('node') || process.env.nodejs_version || process.env.TRAVIS_NODE_VERSION || ''
  var platform = grunt.option('platform') || process.env.TRAVIS_CPU_ARCH === 'amd64' ? 'x64' : (process.env.TRAVIS_CPU_ARCH || '')
  var os = grunt.option('os') || process.env.TRAVIS_OS_NAME === 'windows' ? 'win32' : (process.env.TRAVIS_OS_NAME === 'osx' ? 'darwin' : (process.env.TRAVIS_OS_NAME || ''))

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    replace_json: {
      manifest: {
        src: 'package.json',
        changes: {
          'engines.node': (node || '<%= pkg.engines.node %>'),
          os: (os ? [os] : '<%= pkg.os %>'),
          cpu: (platform ? [platform] : '<%= pkg.cpu %>')
        }
      }
    },

    compress: {
      pckg: {
        options: {
          mode: os === 'linux' ? 'tgz' : 'zip',
          archive: 'dist/<%= pkg.name %>-<%= pkg.version %>' + (node ? ('_node' + node) : '') + (os ? ('_' + os) : '') + (platform ? ('_' + platform) : '') + (os === 'linux' ? '.tgz' : '.zip')
        },
        files: [
          {
            src: [
              'LICENSE',
              '*.md',
              'app.js',
              'server.js',
              'package.json',
              'ctf.key',
              'swagger.yml',
              'config.schema.yml',
              'config/*.yml',
              'data/*.js',
              'data/static/**',
              'encryptionkeys/**',
              'frontend/dist/frontend/**',
              'ftp/**',
              'i18n/.gitkeep',
              'lib/**',
              'models/*.js',
              'node_modules/**',
              'routes/*.js',
              'uploads/complaints/.gitkeep',
              'views/**'
            ],
            dest: 'juice-shop_<%= pkg.version %>/'
          }
        ]
      }
    }
  })

  grunt.registerTask('checksum', 'Create .md5 checksum files', function () {
    const fs = require('fs')
    const crypto = require('crypto')
    fs.readdirSync('dist/').forEach(file => {
      const buffer = fs.readFileSync('dist/' + file)
      const md5 = crypto.createHash('md5')
      md5.update(buffer)
      const md5Hash = md5.digest('hex')
      const md5FileName = 'dist/' + file + '.md5'
      grunt.file.write(md5FileName, md5Hash)
      grunt.log.write(`Checksum ${md5Hash} written to file ${md5FileName}.`).verbose.write('...').ok()
      grunt.log.writeln()
    })
  })

  grunt.loadNpmTasks('grunt-replace-json')
  grunt.loadNpmTasks('grunt-contrib-compress')
  grunt.registerTask('package', ['replace_json:manifest', 'compress:pckg', 'checksum'])
}
