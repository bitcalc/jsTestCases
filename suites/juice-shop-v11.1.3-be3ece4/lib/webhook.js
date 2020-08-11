/*
 * Copyright (c) 2014-2020 Bjoern Kimminich.
 * SPDX-License-Identifier: MIT
 */

const request = require('request')
const colors = require('colors/safe')
const logger = require('../lib/logger')
const utils = require('../lib/utils')
const os = require('os')
const config = require('config')

exports.notify = (challenge, webhook = process.env.SOLUTIONS_WEBHOOK) => {
  request.post(webhook, {
    json: {
      solution:
        {
          challenge: challenge.key,
          evidence: null,
          issuedOn: new Date().toISOString()
        },
      issuer: {
        hostName: os.hostname(),
        os: `${os.type()} (${os.release()})`,
        appName: config.get('application.name'),
        config: process.env.NODE_ENV || 'default',
        version: utils.version()
      }
    }
  }, (error, res) => {
    if (error) {
      logger.error('Webhook notification failed: ' + colors.red(error.message))
      throw error
    }
    logger.info(`Webhook ${colors.bold(webhook)} notified about ${colors.cyan(challenge.key)} being solved: ${res.statusCode < 400 ? colors.green(res.statusCode) : colors.red(res.statusCode)}`)
  })
}
